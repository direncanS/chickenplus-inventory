import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { de } from '@/i18n/de';
import { OPEN_ORDER_STATUSES } from '@/lib/constants';
import { normalizeSuggestedOrderCount } from '@/lib/utils/order-items';

type SuggestionItemRow = {
  id: string;
  product_id: string;
  product_name: string;
  min_stock_snapshot: number | null;
  min_stock_max_snapshot: number | null;
  products: { unit: string | null; is_active: boolean } | Array<{ unit: string | null; is_active: boolean }>;
};

type ProductSupplierRow = {
  product_id: string;
  suppliers:
    | { id: string; name: string; is_active: boolean }
    | Array<{ id: string; name: string; is_active: boolean }>;
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
      min_stock_snapshot, min_stock_max_snapshot,
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

  let filteredItems = items;

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

  const filteredProductIds = [...new Set(filteredItems.map((item) => item.product_id))];
  const { data: productSuppliers, error: suppliersError } = await supabase
    .from('product_suppliers')
    .select('product_id, suppliers!inner(id, name, is_active)')
    .in('product_id', filteredProductIds)
    .eq('is_preferred', true);

  if (suppliersError) {
    throw new Error(suppliersError.message);
  }

  const supplierMap = new Map<string, OrderSuggestionGroup>();

  for (const item of filteredItems) {
    const preferredSupplier = (productSuppliers ?? []).find(
      (supplier) => supplier.product_id === item.product_id
    ) as ProductSupplierRow | undefined;
    const supplier = unwrapRelation(preferredSupplier?.suppliers);
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
      isOrdered: false,
      orderedQuantity: null,
    });
  }

  return Array.from(supplierMap.values());
}
