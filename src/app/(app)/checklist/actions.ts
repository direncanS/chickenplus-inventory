'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/lib/supabase/server';
import { getActiveProfile } from '@/lib/supabase/auth-helpers';
import { logAudit } from '@/lib/utils/audit';
import { logger } from '@/lib/utils/logger';
import { getISOWeekAndYear, isInCurrentMonth } from '@/lib/utils/date';
import { createChecklistSchema, updateChecklistItemSchema, completeChecklistSchema, reopenChecklistSchema } from '@/lib/validations/checklist';
import { de } from '@/i18n/de';
import { z } from 'zod';
import { OPEN_ORDER_STATUSES } from '@/lib/constants';

export async function createChecklist(input: { checklistDate: string }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: de.auth.notLoggedIn };

  const profile = await getActiveProfile(supabase, user.id);
  if (!profile) return { error: de.auth.accountDeactivated };

  try {
    const validated = createChecklistSchema.parse(input);
    const date = validated.checklistDate;

    // Server-side validation: date must be in current month
    if (!isInCurrentMonth(date)) {
      return { error: de.errors.invalidInput };
    }

    // Calculate ISO week from the selected date
    const { isoYear, isoWeek } = getISOWeekAndYear(new Date(date + 'T12:00:00'));

    const { data, error } = await supabase.rpc('rpc_create_checklist_with_snapshot', {
      p_iso_year: isoYear,
      p_iso_week: isoWeek,
      p_created_by: user.id,
      p_checklist_date: date,
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
      if (result.error === 'monthly_limit_reached') {
        return { error: de.checklist.monthlyLimitReached };
      }
      return { error: de.errors.generic };
    }

    await logAudit({
      userId: user.id,
      action: 'checklist_created',
      entityType: 'checklist',
      entityId: result.checklist_id!,
      details: { isoYear, isoWeek, checklistDate: date, itemCount: result.item_count },
    });

    logger.info('Checklist created', { checklistId: result.checklist_id, week: `${isoYear}-W${isoWeek}`, date });

    // After successful checklist creation, cleanup previous months (best-effort, non-blocking)
    supabase.rpc('rpc_cleanup_previous_months', { p_current_date: date }).then(({ data: cleanupData, error: cleanupError }) => {
      if (cleanupError) {
        logger.error('Cleanup previous months failed', { error: cleanupError.message });
      } else if (cleanupData) {
        const cleanupResult = cleanupData as { deleted_checklists: number; deleted_orders: number };
        if (cleanupResult.deleted_checklists > 0 || cleanupResult.deleted_orders > 0) {
          logger.info('Previous months cleaned up', cleanupResult);
          logAudit({
            userId: user.id,
            action: 'data_cleanup',
            entityType: 'system',
            entityId: 'cleanup',
            details: cleanupResult,
          });
          revalidatePath('/archive');
        }
      }
    });

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

/**
 * Auto-create orders for missing items after checklist completion.
 * Groups is_missing=true items by preferred supplier and creates draft orders.
 * Skips products without a preferred supplier or with existing open orders.
 */
async function autoCreateOrders(
  checklistId: string,
  userId: string
): Promise<{ ordersCreated: number }> {
  const supabase = await createServerClient();
  let ordersCreated = 0;

  try {
    // Get all missing items
    const { data: missingItems } = await supabase
      .from('checklist_items')
      .select('product_id, product_name, min_stock_snapshot, min_stock_max_snapshot')
      .eq('checklist_id', checklistId)
      .eq('is_missing', true);

    if (!missingItems || missingItems.length === 0) {
      return { ordersCreated: 0 };
    }

    const productIds = missingItems.map((i) => i.product_id);

    // Get preferred suppliers
    const { data: productSuppliers } = await supabase
      .from('product_suppliers')
      .select('product_id, supplier_id, suppliers!inner(id, name, is_active)')
      .in('product_id', productIds)
      .eq('is_preferred', true);

    // Check existing open orders for these products
    const { data: existingOrderItems } = await supabase
      .from('order_items')
      .select('product_id, orders!inner(checklist_id, status)')
      .in('product_id', productIds);

    const productsWithOpenOrders = new Set(
      (existingOrderItems ?? [])
        .filter((o) => {
          const order = o.orders as unknown as { checklist_id: string; status: string };
          return OPEN_ORDER_STATUSES.includes(order.status as never);
        })
        .map((o) => o.product_id)
    );

    // Group by supplier
    const supplierGroups = new Map<string, {
      supplierId: string;
      items: Array<{ productId: string; quantity: number; unit: string }>;
    }>();

    for (const item of missingItems) {
      // Skip if product already has open order
      if (productsWithOpenOrders.has(item.product_id)) continue;

      const preferredSupplier = (productSuppliers ?? []).find(
        (ps) => ps.product_id === item.product_id
      );

      const supplier = preferredSupplier?.suppliers as unknown as { id: string; name: string; is_active: boolean } | undefined;

      // Skip products without active preferred supplier
      if (!supplier?.is_active) continue;

      if (!supplierGroups.has(supplier.id)) {
        supplierGroups.set(supplier.id, { supplierId: supplier.id, items: [] });
      }

      const quantity = item.min_stock_max_snapshot ?? item.min_stock_snapshot ?? 1;

      // Get product unit
      const { data: product } = await supabase
        .from('products')
        .select('unit')
        .eq('id', item.product_id)
        .single();

      supplierGroups.get(supplier.id)!.items.push({
        productId: item.product_id,
        quantity,
        unit: product?.unit ?? 'stueck',
      });
    }

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
        logger.error('Auto-create order failed', {
          supplierId: group.supplierId,
          checklistId,
          error: error.message,
        });
        continue;
      }

      const result = data as { success: boolean; order_id?: string; order_number?: string };

      if (result.success) {
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
    }
  } catch (err) {
    logger.error('Auto-create orders exception', {
      checklistId,
      error: err instanceof Error ? err.message : 'Unknown',
    });
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
    const { error } = await supabase
      .from('checklists')
      .update({ status: 'completed', completed_by: user.id })
      .eq('id', validated.checklistId)
      .in('status', ['draft', 'in_progress']);

    if (error) {
      logger.error('Complete checklist failed', { userId: user.id, checklistId: validated.checklistId, error: error.message });
      return { error: de.errors.generic };
    }

    await logAudit({
      userId: user.id,
      action: 'checklist_completed',
      entityType: 'checklist',
      entityId: validated.checklistId,
      details: { itemCount: items.length },
    });

    // Auto-create orders for missing items (non-blocking for completion)
    const { ordersCreated } = await autoCreateOrders(validated.checklistId, user.id);

    logger.info('Checklist completed', { checklistId: validated.checklistId, ordersCreated });
    revalidatePath('/checklist');
    revalidatePath('/dashboard');
    revalidatePath('/orders');
    return { success: true, ordersCreated };
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
      .update({ status: 'in_progress', completed_by: null })
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
