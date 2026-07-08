import { describe, it, expect } from 'vitest';
import { transformChecklistItems, transformOrders } from '@/lib/utils/transform';

describe('transformChecklistItems', () => {
  it('unwraps nested arrays to single objects', () => {
    const items = [
      {
        id: '1',
        checklist_id: 'c1',
        product_id: 'p1',
        product_name: 'Chicken Breast',
        min_stock_snapshot: 5,
        min_stock_max_snapshot: 10,
        current_stock: '3',
        missing_amount_calculated: 2,
        missing_amount_final: 2,
        is_missing_overridden: false,
        is_missing: false,
        is_checked: false,
        products: [
          {
            sort_order: 1,
            unit: 'kg',
            storage_locations: [{ name: 'Cold Room', code: 'KH', sort_order: 1 }],
            categories: [{ name: 'Meat', sort_order: 1 }],
          },
        ],
      },
    ];

    const result = transformChecklistItems(items);
    expect(result).toHaveLength(1);
    expect(result[0].products.sort_order).toBe(1);
    expect(result[0].products.unit).toBe('kg');
    expect(result[0].products.storage_locations).toEqual({ name: 'Cold Room', code: 'KH', sort_order: 1 });
    expect(result[0].products.categories).toEqual({ name: 'Meat', sort_order: 1 });
  });

  it('handles already-unwrapped single objects', () => {
    const items = [
      {
        id: '1',
        checklist_id: 'c1',
        product_id: 'p1',
        product_name: 'Pommes',
        min_stock_snapshot: 3,
        min_stock_max_snapshot: null,
        current_stock: '1',
        missing_amount_calculated: 2,
        missing_amount_final: 2,
        is_missing_overridden: false,
        is_checked: true,
        products: {
          sort_order: 2,
          unit: 'karton',
          storage_locations: { name: 'Storage', code: 'LG', sort_order: 2 },
          categories: { name: 'Frozen', sort_order: 2 },
        },
      },
    ];

    const result = transformChecklistItems(items);
    expect(result[0].products.storage_locations.name).toBe('Storage');
    expect(result[0].products.categories.name).toBe('Frozen');
  });

  it('handles empty array', () => {
    const result = transformChecklistItems([]);
    expect(result).toEqual([]);
  });

  it('preserves all item fields', () => {
    const items = [
      {
        id: 'item-1',
        checklist_id: 'cl-1',
        product_id: 'prod-1',
        product_name: 'Test Product',
        min_stock_snapshot: 5,
        min_stock_max_snapshot: 8,
        current_stock: '2',
        missing_amount_calculated: 3,
        missing_amount_final: 6,
        is_missing_overridden: true,
        is_missing: true,
        is_checked: false,
        products: [{
          sort_order: 1,
          unit: 'stueck',
          storage_locations: [{ name: 'A', code: 'A', sort_order: 1 }],
          categories: [{ name: 'B', sort_order: 1 }],
        }],
      },
    ];

    const result = transformChecklistItems(items);
    expect(result[0].id).toBe('item-1');
    expect(result[0].is_missing_overridden).toBe(true);
    expect(result[0].missing_amount_final).toBe(6);
    expect(result[0].current_stock).toBe('2');
  });
});

describe('transformOrders', () => {
  it('unwraps nested joins in orders', () => {
    const orders = [
      {
        id: 'o1',
        order_number: 'B-001',
        status: 'draft',
        ordered_at: null,
        delivered_at: null,
        notes: null,
        created_at: '2025-01-01T00:00:00Z',
        suppliers: [{ id: 's1', name: 'Metro' }],
        checklists: [{ iso_year: 2025, iso_week: 1 }],
        order_items: [
          {
            id: 'oi1',
            product_id: 'p1',
            quantity: '5.00',
            unit: 'koli',
            is_delivered: false,
            is_ordered: true,
            ordered_quantity: '4.00',
            products: [{ name: 'Chicken Breast' }],
          },
        ],
      },
    ];

    const result = transformOrders(orders);
    expect(result).toHaveLength(1);
    expect(result[0].suppliers).toEqual({ id: 's1', name: 'Metro' });
    expect(result[0].checklists).toEqual({ iso_year: 2025, iso_week: 1 });
    expect(result[0].order_items[0].products).toEqual({ name: 'Chicken Breast' });
    expect(result[0].order_items[0].quantity).toBe(5);
    expect(result[0].order_items[0].is_ordered).toBe(true);
    expect(result[0].order_items[0].ordered_quantity).toBe(4);
  });

  it('handles empty order_items', () => {
    const orders = [
      {
        id: 'o1',
        order_number: 'B-002',
        status: 'ordered',
        ordered_at: '2025-01-02T00:00:00Z',
        delivered_at: null,
        notes: null,
        created_at: '2025-01-01T00:00:00Z',
        suppliers: { id: 's1', name: 'Metro' },
        checklists: { iso_year: 2025, iso_week: 1 },
        order_items: [],
      },
    ];

    const result = transformOrders(orders);
    expect(result[0].order_items).toEqual([]);
  });

  it('handles null order_items', () => {
    const orders = [
      {
        id: 'o1',
        order_number: 'B-003',
        status: 'draft',
        ordered_at: null,
        delivered_at: null,
        notes: null,
        created_at: '2025-01-01T00:00:00Z',
        suppliers: { id: 's1', name: 'Supplier' },
        checklists: { iso_year: 2025, iso_week: 2 },
        order_items: undefined,
      },
    ];

    const result = transformOrders(orders);
    expect(result[0].order_items).toEqual([]);
  });

  it('handles empty array', () => {
    const result = transformOrders([]);
    expect(result).toEqual([]);
  });
});
