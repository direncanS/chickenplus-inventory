/**
 * Integration test: Order suggestion grouping logic
 * Strategy: Mock (Supabase local unavailable)
 * Note: Should be re-verified with real DB after local Supabase setup
 */
import { describe, it, expect } from 'vitest';
import { suggestedOrderQuantity } from '@/lib/utils/calculations';
import { OPEN_ORDER_STATUSES } from '@/lib/constants';

// -- Types mirroring the data structures in generateOrderSuggestions --

interface ChecklistItem {
  id: string;
  product_id: string;
  product_name: string;
  current_stock: number | null;
  min_stock_snapshot: number;
  min_stock_max_snapshot: number | null;
  missing_amount_final: number;
  unit: string;
}

interface PreferredSupplier {
  product_id: string;
  supplier_id: string;
  supplier_name: string;
  is_active: boolean;
}

interface ExistingOrderItem {
  product_id: string;
  checklist_id: string;
  order_status: string;
}

interface SuggestionGroup {
  supplierId: string;
  supplierName: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unit: string;
    hasOpenOrder: boolean;
  }>;
}

const NOT_ASSIGNED = 'Nicht zugewiesen';

/**
 * Simulates generateOrderSuggestions logic without Supabase
 */
function simulateOrderSuggestions(
  checklistId: string,
  items: ChecklistItem[],
  preferredSuppliers: PreferredSupplier[],
  existingOrderItems: ExistingOrderItem[]
): SuggestionGroup[] {
  // Filter items with missing amounts > 0
  const missingItems = items.filter((i) => i.missing_amount_final > 0);
  if (missingItems.length === 0) return [];

  // Determine products with open orders
  const productsWithOpenOrders = new Set(
    existingOrderItems
      .filter(
        (o) =>
          o.checklist_id === checklistId &&
          OPEN_ORDER_STATUSES.includes(o.order_status as never)
      )
      .map((o) => o.product_id)
  );

  // Group by supplier
  const supplierMap = new Map<string, SuggestionGroup>();

  for (const item of missingItems) {
    const preferred = preferredSuppliers.find(
      (ps) => ps.product_id === item.product_id
    );

    const supplierId = preferred?.is_active ? preferred.supplier_id : 'unassigned';
    const supplierName = preferred?.is_active ? preferred.supplier_name : NOT_ASSIGNED;

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
      unit: item.unit,
      hasOpenOrder: productsWithOpenOrders.has(item.product_id),
    });
  }

  return Array.from(supplierMap.values());
}

// -- Tests --

describe('Order suggestion grouping (mock)', () => {
  const checklistId = 'cl-1';

  it('groups items by preferred supplier', () => {
    const items: ChecklistItem[] = [
      { id: 'i1', product_id: 'p1', product_name: 'Hähnchenbrust', current_stock: 2, min_stock_snapshot: 5, min_stock_max_snapshot: 10, missing_amount_final: 8, unit: 'kg' },
      { id: 'i2', product_id: 'p2', product_name: 'Pommes', current_stock: 1, min_stock_snapshot: 3, min_stock_max_snapshot: null, missing_amount_final: 2, unit: 'karton' },
    ];

    const preferredSuppliers: PreferredSupplier[] = [
      { product_id: 'p1', supplier_id: 's1', supplier_name: 'Metro', is_active: true },
      { product_id: 'p2', supplier_id: 's1', supplier_name: 'Metro', is_active: true },
    ];

    const result = simulateOrderSuggestions(checklistId, items, preferredSuppliers, []);

    expect(result).toHaveLength(1);
    expect(result[0].supplierName).toBe('Metro');
    expect(result[0].items).toHaveLength(2);
    expect(result[0].items[0].quantity).toBe(8); // max(0, 10 - 2)
    expect(result[0].items[1].quantity).toBe(2); // max(0, 3 - 1)
  });

  it('puts unassigned products in "Nicht zugewiesen" group', () => {
    const items: ChecklistItem[] = [
      { id: 'i1', product_id: 'p1', product_name: 'Hähnchenbrust', current_stock: 2, min_stock_snapshot: 5, min_stock_max_snapshot: null, missing_amount_final: 3, unit: 'kg' },
    ];

    const result = simulateOrderSuggestions(checklistId, items, [], []);

    expect(result).toHaveLength(1);
    expect(result[0].supplierId).toBe('unassigned');
    expect(result[0].supplierName).toBe(NOT_ASSIGNED);
    expect(result[0].items).toHaveLength(1);
  });

  it('separates items across multiple suppliers', () => {
    const items: ChecklistItem[] = [
      { id: 'i1', product_id: 'p1', product_name: 'Hähnchenbrust', current_stock: 2, min_stock_snapshot: 5, min_stock_max_snapshot: null, missing_amount_final: 3, unit: 'kg' },
      { id: 'i2', product_id: 'p2', product_name: 'Pommes', current_stock: 0, min_stock_snapshot: 5, min_stock_max_snapshot: null, missing_amount_final: 5, unit: 'karton' },
    ];

    const preferredSuppliers: PreferredSupplier[] = [
      { product_id: 'p1', supplier_id: 's1', supplier_name: 'Metro', is_active: true },
      { product_id: 'p2', supplier_id: 's2', supplier_name: 'Transgourmet', is_active: true },
    ];

    const result = simulateOrderSuggestions(checklistId, items, preferredSuppliers, []);

    expect(result).toHaveLength(2);
    const metro = result.find((g) => g.supplierName === 'Metro');
    const trans = result.find((g) => g.supplierName === 'Transgourmet');
    expect(metro).toBeDefined();
    expect(trans).toBeDefined();
    expect(metro!.items).toHaveLength(1);
    expect(trans!.items).toHaveLength(1);
  });

  it('falls back to unassigned when preferred supplier is inactive', () => {
    const items: ChecklistItem[] = [
      { id: 'i1', product_id: 'p1', product_name: 'Hähnchenbrust', current_stock: 2, min_stock_snapshot: 5, min_stock_max_snapshot: null, missing_amount_final: 3, unit: 'kg' },
    ];

    const preferredSuppliers: PreferredSupplier[] = [
      { product_id: 'p1', supplier_id: 's1', supplier_name: 'Metro', is_active: false },
    ];

    const result = simulateOrderSuggestions(checklistId, items, preferredSuppliers, []);

    expect(result).toHaveLength(1);
    expect(result[0].supplierId).toBe('unassigned');
    expect(result[0].supplierName).toBe(NOT_ASSIGNED);
  });

  it('marks products with existing open orders', () => {
    const items: ChecklistItem[] = [
      { id: 'i1', product_id: 'p1', product_name: 'Hähnchenbrust', current_stock: 2, min_stock_snapshot: 5, min_stock_max_snapshot: null, missing_amount_final: 3, unit: 'kg' },
      { id: 'i2', product_id: 'p2', product_name: 'Pommes', current_stock: 0, min_stock_snapshot: 5, min_stock_max_snapshot: null, missing_amount_final: 5, unit: 'karton' },
    ];

    const existingOrderItems: ExistingOrderItem[] = [
      { product_id: 'p1', checklist_id: checklistId, order_status: 'ordered' },
    ];

    const result = simulateOrderSuggestions(checklistId, items, [], existingOrderItems);

    expect(result).toHaveLength(1);
    const p1 = result[0].items.find((i) => i.productId === 'p1');
    const p2 = result[0].items.find((i) => i.productId === 'p2');
    expect(p1!.hasOpenOrder).toBe(true);
    expect(p2!.hasOpenOrder).toBe(false);
  });

  it('does not mark closed orders as open', () => {
    const items: ChecklistItem[] = [
      { id: 'i1', product_id: 'p1', product_name: 'Hähnchenbrust', current_stock: 2, min_stock_snapshot: 5, min_stock_max_snapshot: null, missing_amount_final: 3, unit: 'kg' },
    ];

    const existingOrderItems: ExistingOrderItem[] = [
      { product_id: 'p1', checklist_id: checklistId, order_status: 'delivered' },
      { product_id: 'p1', checklist_id: checklistId, order_status: 'cancelled' },
    ];

    const result = simulateOrderSuggestions(checklistId, items, [], existingOrderItems);

    expect(result[0].items[0].hasOpenOrder).toBe(false);
  });

  it('ignores orders from different checklists', () => {
    const items: ChecklistItem[] = [
      { id: 'i1', product_id: 'p1', product_name: 'Hähnchenbrust', current_stock: 2, min_stock_snapshot: 5, min_stock_max_snapshot: null, missing_amount_final: 3, unit: 'kg' },
    ];

    const existingOrderItems: ExistingOrderItem[] = [
      { product_id: 'p1', checklist_id: 'other-checklist', order_status: 'ordered' },
    ];

    const result = simulateOrderSuggestions(checklistId, items, [], existingOrderItems);

    expect(result[0].items[0].hasOpenOrder).toBe(false);
  });

  it('returns empty array when no items have missing amounts', () => {
    const items: ChecklistItem[] = [
      { id: 'i1', product_id: 'p1', product_name: 'Hähnchenbrust', current_stock: 10, min_stock_snapshot: 5, min_stock_max_snapshot: null, missing_amount_final: 0, unit: 'kg' },
    ];

    const result = simulateOrderSuggestions(checklistId, items, [], []);

    expect(result).toEqual([]);
  });

  it('calculates quantity using minStockMax when available', () => {
    const items: ChecklistItem[] = [
      { id: 'i1', product_id: 'p1', product_name: 'Hähnchenbrust', current_stock: 2, min_stock_snapshot: 5, min_stock_max_snapshot: 10, missing_amount_final: 8, unit: 'kg' },
    ];

    const result = simulateOrderSuggestions(checklistId, items, [], []);

    // suggestedOrderQuantity(2, 5, 10) = max(0, 10 - 2) = 8
    expect(result[0].items[0].quantity).toBe(8);
  });

  it('calculates quantity using minStock when minStockMax is null', () => {
    const items: ChecklistItem[] = [
      { id: 'i1', product_id: 'p1', product_name: 'Hähnchenbrust', current_stock: 2, min_stock_snapshot: 5, min_stock_max_snapshot: null, missing_amount_final: 3, unit: 'kg' },
    ];

    const result = simulateOrderSuggestions(checklistId, items, [], []);

    // suggestedOrderQuantity(2, 5, null) = max(0, 5 - 2) = 3
    expect(result[0].items[0].quantity).toBe(3);
  });
});
