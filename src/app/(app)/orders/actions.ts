'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/lib/supabase/server';
import { getActiveProfile } from '@/lib/supabase/auth-helpers';
import { logAudit } from '@/lib/utils/audit';
import { logger } from '@/lib/utils/logger';
import { createOrderSchema, updateOrderStatusSchema } from '@/lib/validations/order';
import { suggestedOrderQuantity } from '@/lib/utils/calculations';
import { de } from '@/i18n/de';
import { z } from 'zod';
import { OPEN_ORDER_STATUSES } from '@/lib/constants';

export async function generateOrderSuggestions(checklistId: string) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: de.auth.notLoggedIn };

  const profile = await getActiveProfile(supabase, user.id);
  if (!profile) return { error: de.auth.accountDeactivated };

  try {
    // Get checklist items with missing amounts
    const { data: items } = await supabase
      .from('checklist_items')
      .select(`
        id, product_id, product_name,
        current_stock, min_stock_snapshot, min_stock_max_snapshot,
        missing_amount_final,
        products!inner(unit, is_active)
      `)
      .eq('checklist_id', checklistId)
      .gt('missing_amount_final', 0);

    if (!items || items.length === 0) {
      return { success: true, data: [] };
    }

    // Get preferred suppliers for these products
    const productIds = items.map((i) => i.product_id);
    const { data: productSuppliers } = await supabase
      .from('product_suppliers')
      .select('product_id, supplier_id, suppliers!inner(id, name, is_active)')
      .in('product_id', productIds)
      .eq('is_preferred', true);

    // Check existing open orders for these products in this checklist
    const { data: existingOrders } = await supabase
      .from('order_items')
      .select('product_id, orders!inner(checklist_id, status)')
      .in('product_id', productIds);

    const productsWithOpenOrders = new Set(
      (existingOrders ?? [])
        .filter((o) => {
          const order = o.orders as unknown as { checklist_id: string; status: string };
          return order.checklist_id === checklistId &&
            OPEN_ORDER_STATUSES.includes(order.status as never);
        })
        .map((o) => o.product_id)
    );

    // Build suggestions grouped by supplier
    const supplierMap = new Map<string, {
      supplierId: string;
      supplierName: string;
      items: Array<{
        productId: string;
        productName: string;
        quantity: number;
        unit: string;
        hasOpenOrder: boolean;
      }>;
    }>();

    for (const item of items) {
      const product = item.products as unknown as { unit: string | null; is_active: boolean };
      const preferredSupplier = (productSuppliers ?? []).find(
        (ps) => ps.product_id === item.product_id
      );

      const supplier = preferredSupplier?.suppliers as unknown as { id: string; name: string; is_active: boolean } | undefined;
      const supplierId = supplier?.is_active ? supplier.id : 'unassigned';
      const supplierName = supplier?.is_active ? supplier.name : de.orders.notAssigned;

      if (!supplierMap.has(supplierId)) {
        supplierMap.set(supplierId, {
          supplierId,
          supplierName,
          items: [],
        });
      }

      const quantity = suggestedOrderQuantity(
        item.current_stock,
        item.min_stock_snapshot,
        item.min_stock_max_snapshot
      );

      supplierMap.get(supplierId)!.items.push({
        productId: item.product_id,
        productName: item.product_name,
        quantity,
        unit: product.unit ?? 'stueck',
        hasOpenOrder: productsWithOpenOrders.has(item.product_id),
      });
    }

    return { success: true, data: Array.from(supplierMap.values()) };
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

    // Verify supplier is active
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('is_active')
      .eq('id', validated.supplierId)
      .single();

    if (!supplier?.is_active) {
      return { error: de.orders.inactiveSupplier };
    }

    const { data, error } = await supabase.rpc('rpc_create_order_with_items', {
      p_supplier_id: validated.supplierId,
      p_checklist_id: validated.checklistId,
      p_created_by: user.id,
      p_items: validated.items.map((i) => ({
        product_id: i.productId,
        quantity: i.quantity,
        unit: i.unit,
      })),
    });

    if (error) {
      logger.error('Create order RPC error', { userId: user.id, error: error.message });
      return { error: de.errors.generic };
    }

    const result = data as { success: boolean; error?: string; order_id?: string; order_number?: string };

    if (!result.success) {
      if (result.error === 'order_number_conflict') {
        return { error: de.orders.orderNumberConflict };
      }
      return { error: de.errors.generic };
    }

    await logAudit({
      userId: user.id,
      action: 'order_created',
      entityType: 'order',
      entityId: result.order_id!,
      details: { orderNumber: result.order_number, supplierId: validated.supplierId },
    });

    revalidatePath('/orders');
    revalidatePath('/dashboard');
    return { success: true, orderNumber: result.order_number };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: de.errors.invalidInput };
    }
    logger.error('Create order exception', { userId: user.id, error: err instanceof Error ? err.message : 'Unknown' });
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

      const { error } = await supabase
        .from('orders')
        .update({ status: 'ordered', ordered_at: new Date().toISOString() })
        .eq('id', validated.orderId);

      if (error) {
        logger.error('Mark ordered failed', { userId: user.id, orderId: validated.orderId, error: error.message });
        return { error: de.errors.generic };
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
