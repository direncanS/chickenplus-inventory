'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerClient } from '@/lib/supabase/server';
import { getActiveProfile } from '@/lib/supabase/auth-helpers';
import { getOrderSuggestions } from '@/lib/server/order-suggestions';
import { logAudit } from '@/lib/utils/audit';
import { logger } from '@/lib/utils/logger';
import { normalizeSuggestedOrderCount } from '@/lib/utils/order-items';
import {
  createOrderSchema,
  finalizeSuggestionGroupSchema,
  updateOrderItemsSchema,
  updateOrderStatusSchema,
} from '@/lib/validations/order';
import { de } from '@/i18n/de';
import { z } from 'zod';

type OrderedItemsRpcResult = {
  success: boolean;
  error?: 'order_not_found' | 'order_not_editable' | 'order_item_not_found' | 'invalid_ordered_quantity';
  status?: string;
  updated_items?: number;
};

type CreateOrderRpcResult = {
  success: boolean;
  error?: 'order_number_conflict' | 'invalid_ordered_quantity' | 'checklist_not_found' | 'invalid_initial_status';
  order_id?: string;
  order_number?: string;
};

type FinalizeSuggestionGroupRpcResult = {
  success: boolean;
  error?:
    | 'order_number_conflict'
    | 'invalid_ordered_quantity'
    | 'checklist_not_found'
    | 'inactive_supplier'
    | 'checklist_item_not_found';
  order_id?: string | null;
  order_number?: string | null;
};

function mapOrderedItemsRpcError(
  errorCode: OrderedItemsRpcResult['error'],
  draftOnlyMessage: string
) {
  switch (errorCode) {
    case 'order_not_found':
    case 'order_item_not_found':
      return de.errors.notFound;
    case 'order_not_editable':
      return draftOnlyMessage;
    case 'invalid_ordered_quantity':
      return de.orders.orderedQuantityInvalid;
    default:
      return de.errors.generic;
  }
}

async function persistOrderedItems(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string,
  orderId: string,
  orderedItems: Array<{ orderItemId: string; isOrdered: boolean; orderedQuantity: number | null }>,
  options?: { markOrdered?: boolean; draftOnlyMessage?: string }
) {
  const markOrdered = options?.markOrdered ?? false;
  const draftOnlyMessage = options?.draftOnlyMessage ?? de.orders.onlyDraftsCanBeEdited;

  const { data, error } = await supabase.rpc('rpc_update_order_items_ordered', {
    p_order_id: orderId,
    p_ordered_items: orderedItems.map((item) => ({
      order_item_id: item.orderItemId,
      is_ordered: item.isOrdered,
      ordered_quantity: item.orderedQuantity,
    })),
    p_mark_ordered: markOrdered,
  });

  if (error) {
    logger.error('Persist ordered items RPC error', {
      userId,
      orderId,
      markOrdered,
      error: error.message,
    });
    return { error: de.errors.generic };
  }

  const result = data as OrderedItemsRpcResult;
  if (!result.success) {
    return {
      error: mapOrderedItemsRpcError(result.error, draftOnlyMessage),
    };
  }

  return { success: true, status: result.status };
}

async function createOrderRecord(
  supabase: Awaited<ReturnType<typeof createServerClient>> | ReturnType<typeof createAdminClient>,
  userId: string,
  input: z.infer<typeof createOrderSchema>
) {
  const { data: supplier } = await supabase
    .from('suppliers')
    .select('is_active')
    .eq('id', input.supplierId)
    .single();

  if (!supplier?.is_active) {
    return { error: de.orders.inactiveSupplier };
  }

  const { data, error } = await supabase.rpc('rpc_create_order_with_items', {
    p_supplier_id: input.supplierId,
    p_checklist_id: input.checklistId,
    p_created_by: userId,
    p_initial_status: input.initialStatus ?? 'draft',
    p_items: input.items.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
      unit: item.unit,
      is_ordered: item.isOrdered ?? false,
      ordered_quantity: item.orderedQuantity ?? null,
    })),
  });

  if (error) {
    logger.error('Create order RPC error', {
      userId,
      supplierId: input.supplierId,
      error: error.message,
    });
    return { error: de.errors.generic };
  }

  const result = data as CreateOrderRpcResult;

  if (!result.success) {
    if (result.error === 'order_number_conflict') {
      return { error: de.orders.orderNumberConflict };
    }
    if (result.error === 'invalid_ordered_quantity') {
      return { error: de.orders.orderedQuantityInvalid };
    }
    return { error: de.errors.generic };
  }

  await logAudit({
    userId,
    action: 'order_created',
    entityType: 'order',
    entityId: result.order_id!,
    details: {
      orderNumber: result.order_number,
      supplierId: input.supplierId,
      initialStatus: input.initialStatus ?? 'draft',
    },
  });

  return { success: true, orderId: result.order_id!, orderNumber: result.order_number! };
}

function mapFinalizeSuggestionGroupRpcError(errorCode: FinalizeSuggestionGroupRpcResult['error']) {
  switch (errorCode) {
    case 'inactive_supplier':
      return de.orders.inactiveSupplier;
    case 'order_number_conflict':
      return de.orders.orderNumberConflict;
    case 'invalid_ordered_quantity':
      return de.orders.orderedQuantityInvalid;
    case 'checklist_item_not_found':
    case 'checklist_not_found':
      return de.errors.notFound;
    default:
      return de.errors.generic;
  }
}

export async function generateOrderSuggestions(checklistId: string) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: de.auth.notLoggedIn };

  const profile = await getActiveProfile(supabase, user.id);
  if (!profile) return { error: de.auth.accountDeactivated };

  try {
    const data = await getOrderSuggestions(supabase, checklistId);
    return { success: true, data };
  } catch (err) {
    logger.error('Generate order suggestions failed', { userId: user.id, error: err instanceof Error ? err.message : 'Unknown' });
    return { error: de.errors.generic };
  }
}

export async function createOrder(input: z.infer<typeof createOrderSchema>) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: de.auth.notLoggedIn };

  const profile = await getActiveProfile(supabase, user.id);
  if (!profile) return { error: de.auth.accountDeactivated };

  try {
    const validated = createOrderSchema.parse(input);
    const result = await createOrderRecord(supabase, user.id, validated);

    if (result.error) {
      return { error: result.error };
    }

    revalidatePath('/orders');
    revalidatePath('/dashboard');
    return { success: true, orderNumber: result.orderNumber };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: de.errors.invalidInput };
    }
    logger.error('Create order exception', { userId: user.id, error: err instanceof Error ? err.message : 'Unknown' });
    return { error: de.errors.generic };
  }
}

export async function finalizeSuggestionGroup(input: z.infer<typeof finalizeSuggestionGroupSchema>) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: de.auth.notLoggedIn };

  const profile = await getActiveProfile(supabase, user.id);
  if (!profile) return { error: de.auth.accountDeactivated };

  try {
    const validated = finalizeSuggestionGroupSchema.parse(input);
    const admin = createAdminClient();

    const { data: checklistItems, error: checklistItemsError } = await admin
      .from('checklist_items')
      .select(`
        id, checklist_id, product_id, product_name,
        min_stock_snapshot, min_stock_max_snapshot,
        is_missing,
        products!inner(unit, is_active)
      `)
      .in('id', validated.items.map((item) => item.checklistItemId));

    if (checklistItemsError) {
      logger.error('Finalize suggestion group item load failed', {
        userId: user.id,
        checklistId: validated.checklistId,
        error: checklistItemsError.message,
      });
      return { error: de.errors.generic };
    }

    if (!checklistItems || checklistItems.length !== validated.items.length) {
      return { error: de.errors.notFound };
    }

    const itemMap = new Map(checklistItems.map((item) => [item.id, item]));
    for (const item of checklistItems) {
      if (item.checklist_id !== validated.checklistId || !item.is_missing) {
        return { error: de.errors.unauthorized };
      }
    }

    const productIds = checklistItems.map((item) => item.product_id);
    const { data: productSuppliers, error: productSuppliersError } = await admin
      .from('product_suppliers')
      .select('product_id, supplier_id, suppliers!inner(id, name, is_active)')
      .in('product_id', productIds)
      .eq('is_preferred', true);

    if (productSuppliersError) {
      logger.error('Finalize suggestion group supplier load failed', {
        userId: user.id,
        checklistId: validated.checklistId,
        error: productSuppliersError.message,
      });
      return { error: de.errors.generic };
    }

    for (const item of checklistItems) {
      const preferredSupplier = (productSuppliers ?? []).find((supplier) => supplier.product_id === item.product_id);
      const supplier = preferredSupplier?.suppliers as unknown as { id: string; name: string; is_active: boolean } | undefined;
      const expectedSupplierId = supplier?.is_active ? supplier.id : null;

      if ((validated.supplierId ?? null) !== expectedSupplierId) {
        return { error: de.errors.unauthorized };
      }
    }

    // Keep checklist capture + optional order creation in one RPC so the
    // suggestion finalize flow cannot leave "ordered" checklist rows behind
    // when order creation fails later.
    const { data, error } = await admin.rpc('rpc_finalize_suggestion_group', {
      p_checklist_id: validated.checklistId,
      p_supplier_id: validated.supplierId,
      p_supplier_name: validated.supplierName,
      p_created_by: user.id,
      p_items: validated.items.map((item) => {
        const checklistItem = itemMap.get(item.checklistItemId)!;
        const product = checklistItem.products as unknown as { unit: string | null };

        return {
          checklist_item_id: item.checklistItemId,
          product_id: checklistItem.product_id,
          quantity: normalizeSuggestedOrderCount(
            checklistItem.min_stock_max_snapshot ?? checklistItem.min_stock_snapshot ?? 1
          ),
          unit: product.unit ?? 'stueck',
          is_ordered: item.isOrdered,
          ordered_quantity: item.orderedQuantity,
        };
      }),
    });

    if (error) {
      logger.error('Finalize suggestion group RPC failed', {
        userId: user.id,
        checklistId: validated.checklistId,
        error: error.message,
      });
      return { error: de.errors.generic };
    }

    const result = data as FinalizeSuggestionGroupRpcResult;
    if (!result.success) {
      return { error: mapFinalizeSuggestionGroupRpcError(result.error) };
    }

    if (result.order_id && result.order_number && validated.supplierId) {
      await logAudit({
        userId: user.id,
        action: 'order_created',
        entityType: 'order',
        entityId: result.order_id,
        details: {
          orderNumber: result.order_number,
          supplierId: validated.supplierId,
          initialStatus: 'ordered',
        },
      });
    }

    revalidatePath('/orders');
    revalidatePath('/dashboard');
    revalidatePath('/reports');
    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: de.errors.invalidInput };
    }

    logger.error('Finalize suggestion group exception', {
      userId: user.id,
      error: err instanceof Error ? err.message : 'Unknown',
    });
    return { error: de.errors.generic };
  }
}

export async function updateOrderItems(input: z.infer<typeof updateOrderItemsSchema>) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: de.auth.notLoggedIn };

  const profile = await getActiveProfile(supabase, user.id);
  if (!profile) return { error: de.auth.accountDeactivated };

  try {
    const validated = updateOrderItemsSchema.parse(input);

    const { data: order } = await supabase
      .from('orders')
      .select('id, status')
      .eq('id', validated.orderId)
      .single();

    if (!order) return { error: de.errors.notFound };
    if (order.status !== 'draft') {
      return { error: de.orders.onlyDraftsCanBeEdited };
    }

    const result = await persistOrderedItems(supabase, user.id, validated.orderId, validated.orderedItems, {
      draftOnlyMessage: de.orders.onlyDraftsCanBeEdited,
    });

    if (result.error) {
      return { error: result.error };
    }

    revalidatePath('/orders');
    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: de.errors.invalidInput };
    }
    logger.error('Update order items exception', {
      userId: user.id,
      error: err instanceof Error ? err.message : 'Unknown',
    });
    return { error: de.errors.generic };
  }
}

export async function updateOrderStatus(input: z.infer<typeof updateOrderStatusSchema>) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: de.auth.notLoggedIn };

  const profile = await getActiveProfile(supabase, user.id);
  if (!profile) return { error: de.auth.accountDeactivated };

  try {
    const validated = updateOrderStatusSchema.parse(input);

    // Get current order
    const { data: order } = await supabase
      .from('orders')
      .select('id, status')
      .eq('id', validated.orderId)
      .single();

    if (!order) return { error: de.errors.notFound };

    // Cancel: admin only
    if (validated.status === 'cancelled') {
      if (profile.role !== 'admin') return { error: de.errors.unauthorized };
      if (order.status === 'delivered' || order.status === 'cancelled') {
        return { error: de.orders.cannotCancel };
      }

      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', validated.orderId);

      if (error) {
        logger.error('Cancel order failed', { userId: user.id, orderId: validated.orderId, error: error.message });
        return { error: de.errors.generic };
      }

      await logAudit({
        userId: user.id,
        action: 'order_status_changed',
        entityType: 'order',
        entityId: validated.orderId,
        details: { from: order.status, to: 'cancelled' },
      });

      revalidatePath('/orders');
      return { success: true };
    }

    // Mark as ordered
    if (validated.status === 'ordered') {
      if (order.status !== 'draft') {
        return { error: de.orders.onlyDraftsCanBeOrdered };
      }

      if (validated.orderedItems && validated.orderedItems.length > 0) {
        const result = await persistOrderedItems(supabase, user.id, validated.orderId, validated.orderedItems, {
          markOrdered: true,
          draftOnlyMessage: de.orders.onlyDraftsCanBeOrdered,
        });

        if (result.error) {
          return { error: result.error };
        }
      } else {
        const { error } = await supabase
          .from('orders')
          .update({ status: 'ordered', ordered_at: new Date().toISOString() })
          .eq('id', validated.orderId);

        if (error) {
          logger.error('Mark ordered failed', { userId: user.id, orderId: validated.orderId, error: error.message });
          return { error: de.errors.generic };
        }
      }

      await logAudit({
        userId: user.id,
        action: 'order_status_changed',
        entityType: 'order',
        entityId: validated.orderId,
        details: { from: 'draft', to: 'ordered' },
      });

      revalidatePath('/orders');
      return { success: true };
    }

    // Item deliveries
    if (validated.itemDeliveries && validated.itemDeliveries.length > 0) {
      const { data, error } = await supabase.rpc('rpc_update_order_delivery', {
        p_order_id: validated.orderId,
        p_item_deliveries: validated.itemDeliveries.map((d) => ({
          order_item_id: d.orderItemId,
          is_delivered: d.isDelivered,
        })),
      });

      if (error) {
        logger.error('Update delivery failed', { userId: user.id, orderId: validated.orderId, error: error.message });
        return { error: de.errors.generic };
      }

      const result = data as { success: boolean; status: string; delivered_items: number; total_items: number };

      if (!result.success) {
        return { error: de.errors.generic };
      }

      if (result.status === 'delivered') {
        await logAudit({
          userId: user.id,
          action: 'order_delivered',
          entityType: 'order',
          entityId: validated.orderId,
        });
      } else {
        await logAudit({
          userId: user.id,
          action: 'order_status_changed',
          entityType: 'order',
          entityId: validated.orderId,
          details: { status: result.status, deliveredItems: result.delivered_items, totalItems: result.total_items },
        });
      }

      revalidatePath('/orders');
      return { success: true, status: result.status };
    }

    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: de.errors.invalidInput };
    }
    logger.error('Update order status exception', { userId: user.id, error: err instanceof Error ? err.message : 'Unknown' });
    return { error: de.errors.generic };
  }
}
