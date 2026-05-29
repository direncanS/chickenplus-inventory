import { beforeEach, describe, expect, it, vi } from 'vitest';
import { de } from '@/i18n/de';

vi.mock('server-only', () => ({}));

const { getCachedPreferredProductSuppliersMock } = vi.hoisted(() => ({
  getCachedPreferredProductSuppliersMock: vi.fn(),
}));

vi.mock('@/lib/server/cached-lookups', () => ({
  getCachedPreferredProductSuppliers: (...args: unknown[]) =>
    getCachedPreferredProductSuppliersMock(...args),
}));

type QueryResult = {
  data: unknown;
  error: { code?: string; message: string } | null;
};

function createThenableQuery(result: QueryResult) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    neq: vi.fn(() => query),
    is: vi.fn(() => query),
    single: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };

  return query;
}

function createSupabaseMock(resultsByTable: Record<string, QueryResult[]>) {
  const tableCalls: Record<string, number> = {};

  return {
    from: vi.fn((table: string) => {
      const index = tableCalls[table] ?? 0;
      tableCalls[table] = index + 1;
      const result = resultsByTable[table]?.[index];

      if (!result) {
        throw new Error(`Unexpected table call: ${table} #${index + 1}`);
      }

      return createThenableQuery(result);
    }),
  };
}

describe('getOrderSuggestions', () => {
  beforeEach(() => {
    vi.resetModules();
    getCachedPreferredProductSuppliersMock.mockReset();
  });

  it('groups missing items by preferred active supplier and keeps unassigned items visible', async () => {
    getCachedPreferredProductSuppliersMock.mockResolvedValue([
      {
        product_id: 'product-1',
        supplier: { id: 'supplier-1', name: 'Metro', is_active: true },
      },
    ]);

    const supabase = createSupabaseMock({
      checklist_items: [
        {
          data: [
            {
              id: 'item-1',
              product_id: 'product-1',
              product_name: 'Cola',
              min_stock_snapshot: 2,
              min_stock_max_snapshot: 5,
              current_stock: '3 Stück',
              products: { unit: 'koli', is_active: true },
            },
            {
              id: 'item-2',
              product_id: 'product-2',
              product_name: 'Fanta',
              min_stock_snapshot: 1,
              min_stock_max_snapshot: null,
              current_stock: null,
              products: { unit: 'koli', is_active: true },
            },
          ],
          error: null,
        },
      ],
      orders: [{ data: [], error: null }],
      checklists: [{ data: { iso_year: 2026, iso_week: 14 }, error: null }],
      routine_order_instance_items: [{ data: [], error: null }],
    });

    const { getOrderSuggestions } = await import('@/lib/server/order-suggestions');
    const result = await getOrderSuggestions(supabase as never, 'checklist-1');

    expect(result).toEqual([
      {
        supplierId: 'supplier-1',
        supplierName: 'Metro',
        items: [
          {
            checklistItemId: 'item-1',
            productId: 'product-1',
            productName: 'Cola',
            quantity: 5,
            unit: 'koli',
            currentStock: '3 Stück',
            isOrdered: false,
            orderedQuantity: null,
          },
        ],
      },
      {
        supplierId: 'unassigned',
        supplierName: de.orders.notAssigned,
        items: [
          {
            checklistItemId: 'item-2',
            productId: 'product-2',
            productName: 'Fanta',
            quantity: 1,
            unit: 'koli',
            currentStock: null,
            isOrdered: false,
            orderedQuantity: null,
          },
        ],
      },
    ]);
  });

  it('combines routine and open-order filters without reintroducing excluded products', async () => {
    getCachedPreferredProductSuppliersMock.mockResolvedValue([]);

    const supabase = createSupabaseMock({
      checklist_items: [
        {
          data: [
            {
              id: 'item-routine',
              product_id: 'product-routine',
              product_name: 'Routine Produkt',
              min_stock_snapshot: 1,
              min_stock_max_snapshot: null,
              current_stock: null,
              products: { unit: 'stueck', is_active: true },
            },
            {
              id: 'item-open-order',
              product_id: 'product-open-order',
              product_name: 'Schon bestellt',
              min_stock_snapshot: 1,
              min_stock_max_snapshot: null,
              current_stock: null,
              products: { unit: 'stueck', is_active: true },
            },
            {
              id: 'item-visible',
              product_id: 'product-visible',
              product_name: 'Noch offen',
              min_stock_snapshot: 1,
              min_stock_max_snapshot: null,
              current_stock: null,
              products: { unit: 'stueck', is_active: true },
            },
          ],
          error: null,
        },
      ],
      orders: [{ data: [{ id: 'order-1' }], error: null }],
      checklists: [{ data: { iso_year: 2026, iso_week: 14 }, error: null }],
      routine_order_instance_items: [
        { data: [{ product_id: 'product-routine' }], error: null },
      ],
      order_items: [
        { data: [{ product_id: 'product-open-order' }], error: null },
      ],
    });

    const { getOrderSuggestions } = await import('@/lib/server/order-suggestions');
    const result = await getOrderSuggestions(supabase as never, 'checklist-1');

    expect(result).toHaveLength(1);
    expect(result[0].items.map((item) => item.productId)).toEqual(['product-visible']);
  });

  it('continues normal suggestions when routine tables are not available', async () => {
    getCachedPreferredProductSuppliersMock.mockResolvedValue([]);

    const supabase = createSupabaseMock({
      checklist_items: [
        {
          data: [
            {
              id: 'item-1',
              product_id: 'product-1',
              product_name: 'Cola',
              min_stock_snapshot: 2,
              min_stock_max_snapshot: null,
              current_stock: 'Karton offen',
              products: { unit: 'koli', is_active: true },
            },
          ],
          error: null,
        },
      ],
      orders: [{ data: [], error: null }],
      checklists: [{ data: { iso_year: 2026, iso_week: 14 }, error: null }],
      routine_order_instance_items: [
        {
          data: null,
          error: {
            code: '42P01',
            message: 'relation "routine_order_instance_items" does not exist',
          },
        },
      ],
    });

    const { getOrderSuggestions } = await import('@/lib/server/order-suggestions');
    const result = await getOrderSuggestions(supabase as never, 'checklist-1');

    expect(result[0].supplierId).toBe('unassigned');
    expect(result[0].items[0]).toMatchObject({
      productName: 'Cola',
      currentStock: 'Karton offen',
    });
  });
});
