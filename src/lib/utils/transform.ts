/**
 * Transform Supabase query results where nested !inner joins are typed as arrays
 * but are actually single objects at runtime (FK relationships).
 *
 * Supabase's TypeScript inference treats all nested selects as arrays,
 * even for FK relationships that always return a single object with !inner.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

function unwrap<T>(value: T | T[]): T {
  return Array.isArray(value) ? value[0] : value;
}

function toNumber(value: number | string): number {
  return typeof value === 'number' ? value : Number(value);
}

function toNumberOrNull(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  return typeof value === 'number' ? value : Number(value);
}

// ── Checklist Items ──

export interface TransformedChecklistItem {
  id: string;
  checklist_id: string;
  product_id: string;
  product_name: string;
  min_stock_snapshot: number | null;
  min_stock_max_snapshot: number | null;
  current_stock: string | null;
  missing_amount_calculated: number | null;
  missing_amount_final: number | null;
  is_missing_overridden: boolean;
  is_missing: boolean;
  is_checked: boolean;
  products: {
    sort_order: number;
    unit: string | null;
    storage_locations: {
      name: string;
      code: string;
      sort_order: number;
    };
    categories: {
      name: string;
      sort_order: number;
    };
  };
}

export function transformChecklistItems(items: any[]): TransformedChecklistItem[] {
  return items.map((item) => {
    const product = unwrap(item.products);
    return {
      ...item,
      products: {
        sort_order: product.sort_order,
        unit: product.unit,
        storage_locations: unwrap(product.storage_locations),
        categories: unwrap(product.categories),
      },
    };
  });
}

// ── Orders ──

export interface TransformedOrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit: string;
  is_delivered: boolean;
  is_ordered: boolean;
  ordered_quantity: number | null;
  products: { name: string };
}

export interface TransformedOrder {
  id: string;
  order_number: string;
  status: string;
  ordered_at: string | null;
  delivered_at: string | null;
  notes: string | null;
  created_at: string;
  suppliers: { id: string; name: string };
  checklists: { iso_year: number; iso_week: number };
  order_items: TransformedOrderItem[];
}

export function transformOrders(orders: any[]): TransformedOrder[] {
  return orders.map((order) => ({
    ...order,
    suppliers: unwrap(order.suppliers),
    checklists: unwrap(order.checklists),
    order_items: (order.order_items ?? []).map((item: any) => ({
      ...item,
      quantity: toNumber(item.quantity),
      ordered_quantity: toNumberOrNull(item.ordered_quantity),
      products: unwrap(item.products),
    })),
  }));
}
