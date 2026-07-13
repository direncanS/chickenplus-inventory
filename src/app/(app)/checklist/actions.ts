'use server';

import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerClient } from '@/lib/supabase/server';
import { getActiveProfile } from '@/lib/supabase/auth-helpers';
import { logAudit } from '@/lib/utils/audit';
import { logger } from '@/lib/utils/logger';
import { getISOWeekAndYear } from '@/lib/utils/date';
import {
  createChecklistSchema,
  updateChecklistItemSchema,
  updateChecklistItemsBatchSchema,
  completeChecklistSchema,
  reopenChecklistSchema,
} from '@/lib/validations/checklist';
import { de } from '@/i18n/de';
import { z } from 'zod';
import { OPEN_ORDER_STATUSES } from '@/lib/constants';

type OrderGenerationStatus = 'idle' | 'pending' | 'running' | 'completed' | 'failed';

type ChecklistSupplierRow = {
  product_id: string;
  supplier_id: string;
  suppliers:
    | { id: string; name: string; is_active: boolean }
    | Array<{ id: string; name: string; is_active: boolean }>;
};

type ExistingOrderItemRow = {
  product_id: string;
  orders:
    | { checklist_id: string; status: string }
    | Array<{ checklist_id: string; status: string }>;
};

type MissingChecklistItemRow = {
  product_id: string;
  product_name: string;
  min_stock_snapshot: number | null;
  min_stock_max_snapshot: number | null;
  products:
    | { unit: string | null }
    | Array<{ unit: string | null }>;
};

type ChecklistBatchRpcResult = {
  success: boolean;
  error?: 'checklist_not_found' | 'checklist_completed' | 'item_mismatch' | 'invalid_input';
  updated_item_ids?: string[];
  failed_item_ids?: string[];
  checklist_status?: 'draft' | 'in_progress' | 'completed';
};

function unwrapRelation<T>(value: T | T[] | null | undefined): T | undefined {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
}

export async function createChecklist(input: { weekStartDate: string; weekEndDate: string }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: de.auth.notLoggedIn };

  const profile = await getActiveProfile(supabase, user.id);
  if (!profile) return { error: de.auth.accountDeactivated };

  try {
    const validated = createChecklistSchema.parse(input);
    const { weekStartDate, weekEndDate } = validated;

    // Server-side validation: weekStartDate must be a Sunday (DOW=0)
    const startDate = new Date(weekStartDate + 'T12:00:00');
    if (startDate.getDay() !== 0) {
      return { error: de.errors.invalidInput };
    }

    // weekEndDate must be exactly weekStartDate + 6 days (Saturday)
    const expectedEnd = new Date(startDate);
    expectedEnd.setDate(expectedEnd.getDate() + 6);
    const expectedEndStr = expectedEnd.toISOString().slice(0, 10);
    if (weekEndDate !== expectedEndStr) {
      return { error: de.errors.invalidInput };
    }

    // Calculate ISO week from Monday (weekStartDate + 1 day)
    const monday = new Date(startDate);
    monday.setDate(monday.getDate() + 1);
    const { isoYear, isoWeek } = getISOWeekAndYear(monday);

    const { data, error } = await supabase.rpc('rpc_create_checklist_with_snapshot', {
      p_iso_year: isoYear,
      p_iso_week: isoWeek,
      p_created_by: user.id,
      p_week_start_date: weekStartDate,
      p_week_end_date: weekEndDate,
    });

    if (error) {
      logger.error('Create checklist RPC error', { userId: user.id, error: error.message });
      return { error: de.errors.generic };
    }

    const result = data as { success: boolean; error?: string; checklist_id?: string; item_count?: number };

    if (!result.success) {
      if (result.error === 'active_checklist_exists') {
        return { error: de.checklist.activeExists };
      }
      if (result.error === 'weekly_checklist_exists') {
        return { error: de.checklist.weeklyChecklistExists };
      }
      return { error: de.errors.generic };
    }

    await logAudit({
      userId: user.id,
      action: 'checklist_created',
      entityType: 'checklist',
      entityId: result.checklist_id!,
      details: { isoYear, isoWeek, weekStartDate, weekEndDate, itemCount: result.item_count },
    });

    logger.info('Checklist created', { checklistId: result.checklist_id, week: `${isoYear}-W${isoWeek}`, weekStartDate, weekEndDate });

    revalidatePath('/checklist');
    revalidatePath('/dashboard');
    return { success: true, checklistId: result.checklist_id };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: de.errors.invalidInput };
    }
    logger.error('Create checklist failed', { userId: user.id, error: err instanceof Error ? err.message : 'Unknown' });
    return { error: de.errors.generic };
  }
}

export async function updateChecklistItem(input: z.infer<typeof updateChecklistItemSchema>) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: de.auth.notLoggedIn };

  const profile = await getActiveProfile(supabase, user.id);
  if (!profile) return { error: de.auth.accountDeactivated };

  try {
    const validated = updateChecklistItemSchema.parse(input);

    // Get current item to check checklist status
    const { data: item } = await supabase
      .from('checklist_items')
      .select('id, checklist_id')
      .eq('id', validated.checklistItemId)
      .single();

    if (!item) return { error: de.errors.notFound };

    // Check checklist is not completed
    const { data: checklist } = await supabase
      .from('checklists')
      .select('status')
      .eq('id', item.checklist_id)
      .single();

    if (!checklist || checklist.status === 'completed') {
      return { error: de.errors.unauthorized };
    }

    // Build update payload
    const updatePayload: Record<string, unknown> = {};
    if (validated.currentStock !== undefined) {
      updatePayload.current_stock = validated.currentStock;
    }
    if (validated.isMissing !== undefined) {
      updatePayload.is_missing = validated.isMissing;
    }
    if (validated.isChecked !== undefined) {
      updatePayload.is_checked = validated.isChecked;
    }

    // Update item
    const { data: updated, error } = await supabase
      .from('checklist_items')
      .update(updatePayload)
      .eq('id', validated.checklistItemId)
      .select('id, current_stock, is_missing, is_checked')
      .single();

    if (error) {
      logger.error('Update checklist item failed', { userId: user.id, itemId: validated.checklistItemId, error: error.message });
      return { error: de.checklist.saveFailed };
    }

    // Auto-transition draft → in_progress
    if (checklist.status === 'draft') {
      await supabase
        .from('checklists')
        .update({ status: 'in_progress' })
        .eq('id', item.checklist_id)
        .eq('status', 'draft');
    }

    // No revalidatePath for auto-save — return narrow response
    return { success: true, data: updated };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: de.errors.invalidInput, fieldErrors: err.flatten().fieldErrors };
    }
    logger.error('Update checklist item exception', { userId: user.id, error: err instanceof Error ? err.message : 'Unknown' });
    return { error: de.checklist.saveFailed };
  }
}

export async function updateChecklistItemsBatch(
  input: z.infer<typeof updateChecklistItemsBatchSchema>
) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: de.auth.notLoggedIn };

  const profile = await getActiveProfile(supabase, user.id);
  if (!profile) return { error: de.auth.accountDeactivated };

  try {
    const validated = updateChecklistItemsBatchSchema.parse(input);

    const { data, error } = await supabase.rpc('rpc_update_checklist_items_batch', {
      p_checklist_id: validated.checklistId,
      p_items: validated.items.map((item) => ({
        checklist_item_id: item.checklistItemId,
        current_stock: item.currentStock,
        is_missing: item.isMissing,
        is_checked: item.isChecked,
      })),
    });

    if (error) {
      logger.error('Batch update checklist items RPC error', {
        userId: user.id,
        checklistId: validated.checklistId,
        error: error.message,
      });
      return { error: de.checklist.saveFailed };
    }

    const result = data as ChecklistBatchRpcResult;
    if (!result.success) {
      switch (result.error) {
        case 'checklist_not_found':
        case 'item_mismatch':
          return {
            error: de.errors.notFound,
            failedItemIds: result.failed_item_ids ?? [],
            errorCode: result.error,
          };
        case 'checklist_completed':
          return {
            error: de.errors.unauthorized,
            failedItemIds: result.failed_item_ids ?? [],
            errorCode: result.error,
          };
        case 'invalid_input':
          return {
            error: de.errors.invalidInput,
            failedItemIds: result.failed_item_ids ?? [],
            errorCode: result.error,
          };
        default:
          return {
            error: de.checklist.saveFailed,
            failedItemIds: result.failed_item_ids ?? [],
          };
      }
    }

    return {
      success: true,
      updatedItemIds: result.updated_item_ids ?? [],
      checklistStatus: result.checklist_status ?? 'in_progress',
    };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: de.errors.invalidInput, fieldErrors: err.flatten().fieldErrors };
    }
    logger.error('Batch update checklist items exception', {
      userId: user.id,
      error: err instanceof Error ? err.message : 'Unknown',
    });
    return { error: de.checklist.saveFailed };
  }
}

/**
 * Auto-create orders for missing items after checklist completion.
 * Groups is_missing=true items by preferred supplier and creates draft orders.
 * Skips products without a preferred supplier or with existing open orders.
 */
async function autoCreateOrdersInBackground(
  checklistId: string,
  userId: string
): Promise<{ ordersCreated: number }> {
  const supabase = createAdminClient();
  let ordersCreated = 0;

  try {
    const startedAt = new Date().toISOString();
    const { data: runningChecklist, error: statusError } = await supabase
      .from('checklists')
      .update({
        order_generation_status: 'running',
        order_generation_started_at: startedAt,
        order_generation_finished_at: null,
        order_generation_error: null,
      })
      .eq('id', checklistId)
      .eq('status', 'completed')
      .eq('order_generation_status', 'pending')
      .select('id')
      .maybeSingle();

    if (statusError) {
      throw new Error(statusError.message);
    }

    if (!runningChecklist) {
      logger.info('Background order generation aborted', {
        checklistId,
        reason: 'checklist_no_longer_pending',
      });
      return { ordersCreated: 0 };
    }

    // Get all missing items
    const { data: missingItems, error: missingItemsError } = await supabase
      .from('checklist_items')
      .select(`
        product_id, product_name, min_stock_snapshot, min_stock_max_snapshot,
        products!inner(unit)
      `)
      .eq('checklist_id', checklistId)
      .eq('is_missing', true);

    if (missingItemsError) {
      throw new Error(missingItemsError.message);
    }

    if (!missingItems || missingItems.length === 0) {
      await supabase
        .from('checklists')
        .update({
          order_generation_status: 'completed',
          order_generation_finished_at: new Date().toISOString(),
          order_generation_orders_created: 0,
          order_generation_error: null,
        })
        .eq('id', checklistId);

      revalidatePath('/checklist');
      revalidatePath('/dashboard');
      revalidatePath('/orders');
      return { ordersCreated: 0 };
    }

    const productIds = missingItems.map((i) => i.product_id);

    // Get preferred suppliers
    const { data: productSuppliers, error: preferredSuppliersError } = await supabase
      .from('product_suppliers')
      .select('product_id, supplier_id, suppliers!inner(id, name, is_active)')
      .in('product_id', productIds)
      .eq('is_preferred', true);

    if (preferredSuppliersError) {
      throw new Error(preferredSuppliersError.message);
    }

    // Check existing open orders for these products
    const { data: existingOrderItems, error: existingOrdersError } = await supabase
      .from('order_items')
      .select('product_id, orders!inner(checklist_id, status)')
      .in('product_id', productIds);

    if (existingOrdersError) {
      throw new Error(existingOrdersError.message);
    }

    const productsWithOpenOrders = new Set(
      ((existingOrderItems ?? []) as ExistingOrderItemRow[])
        .filter((o) => {
          const order = unwrapRelation(o.orders);
          return order?.checklist_id === checklistId &&
            OPEN_ORDER_STATUSES.includes(order.status as never);
        })
        .map((o) => o.product_id)
    );

    // Group by supplier
    const supplierGroups = new Map<string, {
      supplierId: string;
      items: Array<{ productId: string; quantity: number; unit: string }>;
    }>();

    for (const item of missingItems as MissingChecklistItemRow[]) {
      // Skip if product already has open order
      if (productsWithOpenOrders.has(item.product_id)) continue;

      const preferredSupplier = ((productSuppliers ?? []) as ChecklistSupplierRow[]).find(
        (ps) => ps.product_id === item.product_id
      );

      const supplier = unwrapRelation(preferredSupplier?.suppliers);

      // Skip products without active preferred supplier
      if (!supplier?.is_active) continue;

      if (!supplierGroups.has(supplier.id)) {
        supplierGroups.set(supplier.id, { supplierId: supplier.id, items: [] });
      }

      const quantity = item.min_stock_max_snapshot ?? item.min_stock_snapshot ?? 1;
      const product = unwrapRelation(item.products);

      supplierGroups.get(supplier.id)!.items.push({
        productId: item.product_id,
        quantity,
        unit: product?.unit ?? 'stueck',
      });
    }

    let backgroundError: string | null = null;

    // Create orders via RPC
    for (const [, group] of supplierGroups) {
      if (group.items.length === 0) continue;

      const { data, error } = await supabase.rpc('rpc_create_order_with_items', {
        p_supplier_id: group.supplierId,
        p_checklist_id: checklistId,
        p_created_by: userId,
        p_items: group.items.map((i) => ({
          product_id: i.productId,
          quantity: i.quantity,
          unit: i.unit,
        })),
      });

      if (error) {
        backgroundError = error.message;
        logger.error('Auto-create order failed', {
          supplierId: group.supplierId,
          checklistId,
          error: error.message,
        });
        break;
      }

      const result = data as { success: boolean; error?: string; order_id?: string; order_number?: string };

      if (!result.success) {
        backgroundError = result.error ?? 'rpc_create_order_with_items returned unsuccessful result';
        logger.error('Auto-create order returned unsuccessful result', {
          supplierId: group.supplierId,
          checklistId,
          error: backgroundError,
        });
        break;
      }

      ordersCreated++;
      await logAudit({
        userId,
        action: 'order_auto_created',
        entityType: 'order',
        entityId: result.order_id!,
        details: {
          orderNumber: result.order_number,
          supplierId: group.supplierId,
          checklistId,
          itemCount: group.items.length,
        },
      });
    }

    await supabase
      .from('checklists')
      .update({
        order_generation_status: (backgroundError ? 'failed' : 'completed') as OrderGenerationStatus,
        order_generation_finished_at: new Date().toISOString(),
        order_generation_orders_created: ordersCreated,
        order_generation_error: backgroundError ? backgroundError.slice(0, 500) : null,
      })
      .eq('id', checklistId);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown';

    logger.error('Auto-create orders exception', {
      checklistId,
      error: errorMessage,
    });

    await supabase
      .from('checklists')
      .update({
        order_generation_status: 'failed',
        order_generation_finished_at: new Date().toISOString(),
        order_generation_orders_created: ordersCreated,
        order_generation_error: errorMessage.slice(0, 500),
      })
      .eq('id', checklistId);
  } finally {
    revalidatePath('/checklist');
    revalidatePath('/dashboard');
    revalidatePath('/orders');
  }

  return { ordersCreated };
}

export async function completeChecklist(input: z.infer<typeof completeChecklistSchema>) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: de.auth.notLoggedIn };

  const profile = await getActiveProfile(supabase, user.id);
  if (!profile) return { error: de.auth.accountDeactivated };

  try {
    const validated = completeChecklistSchema.parse(input);

    // Server-side validation: fresh read of all items
    const { data: items } = await supabase
      .from('checklist_items')
      .select('is_checked')
      .eq('checklist_id', validated.checklistId);

    if (!items || items.length === 0) {
      return { error: de.errors.notFound };
    }

    const allChecked = items.every((i) => i.is_checked);
    if (!allChecked) {
      return { error: de.checklist.allCheckedRequired };
    }

    // Complete
    const { data: completedChecklist, error } = await supabase
      .from('checklists')
      .update({
        status: 'completed',
        completed_by: user.id,
        order_generation_status: 'pending',
        order_generation_started_at: null,
        order_generation_finished_at: null,
        order_generation_orders_created: 0,
        order_generation_error: null,
      })
      .eq('id', validated.checklistId)
      .in('status', ['draft', 'in_progress'])
      .select('id')
      .maybeSingle();

    if (error) {
      logger.error('Complete checklist failed', { userId: user.id, checklistId: validated.checklistId, error: error.message });
      return { error: de.errors.generic };
    }

    if (!completedChecklist) {
      logger.error('Complete checklist affected no rows', { userId: user.id, checklistId: validated.checklistId });
      return { error: de.errors.generic };
    }

    await logAudit({
      userId: user.id,
      action: 'checklist_completed',
      entityType: 'checklist',
      entityId: validated.checklistId,
      details: { itemCount: items.length },
    });

    after(async () => {
      await autoCreateOrdersInBackground(validated.checklistId, user.id);
    });

    logger.info('Checklist completed', {
      checklistId: validated.checklistId,
      orderGenerationStatus: 'pending',
    });
    revalidatePath('/checklist');
    revalidatePath('/dashboard');
    revalidatePath('/orders');
    return { success: true, orderGenerationStatus: 'pending' as const };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: de.errors.invalidInput };
    }
    logger.error('Complete checklist exception', { userId: user.id, error: err instanceof Error ? err.message : 'Unknown' });
    return { error: de.errors.generic };
  }
}

export async function reopenChecklist(input: z.infer<typeof reopenChecklistSchema>) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: de.auth.notLoggedIn };

  const profile = await getActiveProfile(supabase, user.id);
  if (!profile) return { error: de.auth.accountDeactivated };

  // Admin only
  if (profile.role !== 'admin') {
    return { error: de.errors.unauthorized };
  }

  try {
    const validated = reopenChecklistSchema.parse(input);

    const { error } = await supabase
      .from('checklists')
      .update({
        status: 'in_progress',
        completed_by: null,
        order_generation_status: 'idle',
        order_generation_started_at: null,
        order_generation_finished_at: null,
        order_generation_orders_created: 0,
        order_generation_error: null,
      })
      .eq('id', validated.checklistId)
      .eq('status', 'completed');

    if (error) {
      logger.error('Reopen checklist failed', { userId: user.id, checklistId: validated.checklistId, error: error.message });
      return { error: de.errors.generic };
    }

    await logAudit({
      userId: user.id,
      action: 'checklist_reopened',
      entityType: 'checklist',
      entityId: validated.checklistId,
    });

    logger.info('Checklist reopened', { checklistId: validated.checklistId });
    revalidatePath('/checklist');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err) {
    logger.error('Reopen checklist exception', { userId: user.id, error: err instanceof Error ? err.message : 'Unknown' });
    return { error: de.errors.generic };
  }
}
