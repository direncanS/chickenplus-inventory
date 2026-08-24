import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { de } from '@/i18n/de';
import { OPEN_ORDER_STATUSES } from '@/lib/constants';
import { normalizeSuggestedOrderCount } from '@/lib/utils/order-items';
import { getCachedPreferredProductSuppliers } from '@/lib/server/cached-lookups';

type SuggestionItemRow = {
  id: string;
  product_id: string;
  product_name: string;
  min_stock_snapshot: number | null;
  min_stock_max_snapshot: number | null;
  current_stock: string | null;
  products: { unit: string | null; is_active: boolean } | Array<{ unit: string | null; is_active: boolean }>;
};

type OpenOrderRow = {
  id: string;
};

type OpenOrderItemRow = {
  product_id: string;
};

export interface OrderSuggestionItem {
  checklistItemId: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  currentStock: string | null;
  isOrdered: boolean;
  orderedQuantity: number | null;
}

export interface OrderSuggestionGroup {
  supplierId: string;
  supplierName: string;
  items: OrderSuggestionItem[];
}

function unwrapRelation<T>(value: T | T[] | null | undefined): T | undefined {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
}

/**
 * Shared read helper used by the Orders page and manual suggestion refresh.
 * Keeps grouping/business rules in one place while allowing first-render suggestions.
 */
export async function getOrderSuggestions(
  supabase: SupabaseClient,
  checklistId: string
): Promise<OrderSuggestionGroup[]> {
  const { data: rawItems, error: itemsError } = await supabase
    .from('checklist_items')
    .select(`
      id, product_id, product_name,
      min_stock_snapshot, min_stock_max_snapshot, current_stock,
      products!inner(unit, is_active)
    `)
    .eq('checklist_id', checklistId)
    .eq('is_missing', true)
    .eq('is_ordered', false);

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  const items = (rawItems ?? []) as SuggestionItemRow[];

  if (items.length === 0) {
    return [];
  }

  const productIds = [...new Set(items.map((item) => item.product_id))];
  const { data: openOrders, error: openOrdersError } = await supabase
    .from('orders')
    .select('id')
    .eq('checklist_id', checklistId)
    .in('status', OPEN_ORDER_STATUSES);

  if (openOrdersError) {
    throw new Error(openOrdersError.message);
  }

  // Routine dedup: exclude products covered by pending routine instances for this week.
  // Checklist provides iso_year/iso_week, so no extra parameter needed.
  // Note: instances with order_id IS NOT NULL are already filtered out by the
  // existing productsWithOpenOrders check below, so overlap is harmless.
  const { data: checklist } = await supabase
    .from('checklists')
    .select('iso_year, iso_week')
    .eq('id', checklistId)
    .single();

  const routineCoveredProducts = new Set<string>();
  if (checklist) {
    const { data: routineItems } = await supabase
      .from('routine_order_instance_items')
      .select(`
        product_id,
        routine_order_instances!inner(status, order_id, iso_year, iso_week)
      `)
      .eq('is_included', true)
      .eq('routine_order_instances.iso_year', checklist.iso_year)
      .eq('routine_order_instances.iso_week', checklist.iso_week)
      .neq('routine_order_instances.status', 'skipped')
      .is('routine_order_instances.order_id', null);

    for (const ri of routineItems ?? []) {
      routineCoveredProducts.add(ri.product_id);
    }
  }

  let filteredItems = items.filter(
    (item) => !routineCoveredProducts.has(item.product_id)
  );

  if (filteredItems.length === 0) {
    return [];
  }

  if ((openOrders ?? []).length > 0) {
    const openOrderIds = (openOrders as OpenOrderRow[]).map((order) => order.id);
    const { data: openOrderItems, error: openOrderItemsError } = await supabase
      .from('order_items')
      .select('product_id')
      .in('order_id', openOrderIds)
      .in('product_id', productIds);

    if (openOrderItemsError) {
      throw new Error(openOrderItemsError.message);
    }

    const productsWithOpenOrders = new Set(
      (openOrderItems as OpenOrderItemRow[] | null | undefined)?.map((item) => item.product_id) ?? []
    );

    filteredItems = items.filter((item) => !productsWithOpenOrders.has(item.product_id));
  }

  if (filteredItems.length === 0) {
    return [];
  }

  // Cached lookup — avoids a DB round-trip on every /orders render.
  const allPreferredSuppliers = await getCachedPreferredProductSuppliers();
  const preferredByProduct = new Map<string, { id: string; name: string; is_active: boolean }>();
  for (const entry of allPreferredSuppliers) {
    preferredByProduct.set(entry.product_id, entry.supplier);
  }

  const supplierMap = new Map<string, OrderSuggestionGroup>();

  for (const item of filteredItems) {
    const supplier = preferredByProduct.get(item.product_id);
    const supplierId = supplier?.is_active ? supplier.id : 'unassigned';
    const supplierName = supplier?.is_active ? supplier.name : de.orders.notAssigned;

    if (!supplierMap.has(supplierId)) {
      supplierMap.set(supplierId, {
        supplierId,
        supplierName,
        items: [],
      });
    }

    const product = unwrapRelation(item.products);
    supplierMap.get(supplierId)!.items.push({
      checklistItemId: item.id,
      productId: item.product_id,
      productName: item.product_name,
      quantity: normalizeSuggestedOrderCount(
        item.min_stock_max_snapshot ?? item.min_stock_snapshot ?? 1
      ),
      unit: product?.unit ?? 'stueck',
      currentStock: item.current_stock ?? null,
      isOrdered: false,
      orderedQuantity: null,
    });
  }

  return Array.from(supplierMap.values());
}
