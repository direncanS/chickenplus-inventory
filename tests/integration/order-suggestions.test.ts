import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OPEN_ORDER_STATUSES } from '@/lib/constants';
import { getOrderSuggestions } from '@/lib/server/order-suggestions';

vi.mock('server-only', () => ({}));

const { cachedPreferredSuppliersMock } = vi.hoisted(() => ({
  cachedPreferredSuppliersMock: vi.fn(),
}));

vi.mock('@/lib/server/cached-lookups', () => ({
  getCachedPreferredProductSuppliers: () => cachedPreferredSuppliersMock(),
}));

beforeEach(() => {
  cachedPreferredSuppliersMock.mockReset();
  cachedPreferredSuppliersMock.mockResolvedValue([]);
});

type QueryResponse = {
  data: unknown;
  error: { message: string } | null;
};

type QueryTrace = {
  selection: string | null;
  eq: Array<[string, unknown]>;
  in: Array<[string, unknown[]]>;
};

function createSupabaseStub(responses: Record<string, QueryResponse>) {
  const traces = new Map<string, QueryTrace>();

  const from = vi.fn((table: string) => {
    const response = responses[table];
    if (!response) {
      throw new Error(`Unexpected table query: ${table}`);
    }

    const trace: QueryTrace = {
      selection: null,
      eq: [],
      in: [],
    };
    traces.set(table, trace);

    const query = {
      select: vi.fn((selection: string) => {
        trace.selection = selection;
        return query;
      }),
      eq: vi.fn((column: string, value: unknown) => {
        trace.eq.push([column, value]);
        return query;
      }),
      in: vi.fn((column: string, values: unknown[]) => {
        trace.in.push([column, values]);
        return query;
      }),
      neq: vi.fn(() => query),
      is: vi.fn(() => query),
      single: vi.fn().mockResolvedValue(response),
      then: (onFulfilled?: (value: QueryResponse) => unknown, onRejected?: (reason: unknown) => unknown) =>
        Promise.resolve(response).then(onFulfilled, onRejected),
    };

    return query;
  });

  return {
    supabase: { from } as never,
    from,
    traces,
  };
}

describe('getOrderSuggestions', () => {
  it('does not re-suggest products that already belong to an open order for the same checklist', async () => {
    cachedPreferredSuppliersMock.mockResolvedValue([
      { product_id: 'product-2', supplier: { id: 'supplier-1', name: 'Metro', is_active: true } },
    ]);
    const checklistId = 'checklist-1';
    const { supabase, traces } = createSupabaseStub({
      checklists: {
        data: { iso_year: 2026, iso_week: 16 },
        error: null,
      },
      routine_order_instance_items: {
        data: [],
        error: null,
      },
      checklist_items: {
        data: [
          {
            id: 'item-1',
            product_id: 'product-1',
            product_name: 'Cola',
            min_stock_snapshot: 2,
            min_stock_max_snapshot: 5,
            products: { unit: 'koli', is_active: true },
          },
          {
            id: 'item-2',
            product_id: 'product-2',
            product_name: 'Pommesbox',
            min_stock_snapshot: 1,
            min_stock_max_snapshot: 4,
            products: { unit: 'karton', is_active: true },
          },
        ],
        error: null,
      },
      orders: {
        data: [{ id: 'order-1' }],
        error: null,
      },
      order_items: {
        data: [{ product_id: 'product-1' }],
        error: null,
      },
      product_suppliers: {
        data: [
          {
            product_id: 'product-2',
            suppliers: { id: 'supplier-1', name: 'Metro', is_active: true },
          },
        ],
        error: null,
      },
    });

    const result = await getOrderSuggestions(supabase, checklistId);

    expect(result).toEqual([
      {
        supplierId: 'supplier-1',
        supplierName: 'Metro',
        items: [
          {
            checklistItemId: 'item-2',
            productId: 'product-2',
            productName: 'Pommesbox',
            quantity: 4,
            unit: 'karton',
            currentStock: null,
            isOrdered: false,
            orderedQuantity: null,
          },
        ],
      },
    ]);

    expect(traces.get('orders')?.eq).toContainEqual(['checklist_id', checklistId]);
    expect(traces.get('orders')?.in).toContainEqual(['status', OPEN_ORDER_STATUSES]);
    expect(traces.get('order_items')?.in).toContainEqual(['order_id', ['order-1']]);
    expect(traces.get('order_items')?.in).toContainEqual(['product_id', ['product-1', 'product-2']]);
  });

  it('keeps valid suggestions and supplier grouping when no open order exists', async () => {
    cachedPreferredSuppliersMock.mockResolvedValue([
      { product_id: 'product-1', supplier: { id: 'supplier-1', name: 'Metro', is_active: true } },
    ]);
    const { supabase, from } = createSupabaseStub({
      checklists: {
        data: { iso_year: 2026, iso_week: 16 },
        error: null,
      },
      routine_order_instance_items: {
        data: [],
        error: null,
      },
      checklist_items: {
        data: [
          {
            id: 'item-1',
            product_id: 'product-1',
            product_name: 'Cola',
            min_stock_snapshot: 2,
            min_stock_max_snapshot: 5,
            products: { unit: 'koli', is_active: true },
          },
        ],
        error: null,
      },
      orders: {
        data: [],
        error: null,
      },
      product_suppliers: {
        data: [
          {
            product_id: 'product-1',
            suppliers: { id: 'supplier-1', name: 'Metro', is_active: true },
          },
        ],
        error: null,
      },
    });

    const result = await getOrderSuggestions(supabase, 'checklist-1');

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
            currentStock: null,
            isOrdered: false,
            orderedQuantity: null,
          },
        ],
      },
    ]);

    expect(from).not.toHaveBeenCalledWith('order_items');
  });

  it('preserves Nicht zugeordnet fallback after excluding products with open orders', async () => {
    const { supabase } = createSupabaseStub({
      checklists: {
        data: { iso_year: 2026, iso_week: 16 },
        error: null,
      },
      routine_order_instance_items: {
        data: [],
        error: null,
      },
      checklist_items: {
        data: [
          {
            id: 'item-1',
            product_id: 'product-1',
            product_name: 'Cola',
            min_stock_snapshot: 1,
            min_stock_max_snapshot: null,
            products: { unit: 'koli', is_active: true },
          },
          {
            id: 'item-2',
            product_id: 'product-2',
            product_name: 'Papertasche',
            min_stock_snapshot: 2,
            min_stock_max_snapshot: null,
            products: { unit: 'karton', is_active: true },
          },
        ],
        error: null,
      },
      orders: {
        data: [{ id: 'order-1' }],
        error: null,
      },
      order_items: {
        data: [{ product_id: 'product-1' }],
        error: null,
      },
      product_suppliers: {
        data: [],
        error: null,
      },
    });

    const result = await getOrderSuggestions(supabase, 'checklist-1');

    expect(result).toEqual([
      {
        supplierId: 'unassigned',
        supplierName: 'Nicht zugeordnet',
        items: [
          {
            checklistItemId: 'item-2',
            productId: 'product-2',
            productName: 'Papertasche',
            quantity: 2,
            unit: 'karton',
            currentStock: null,
            isOrdered: false,
            orderedQuantity: null,
          },
        ],
      },
    ]);
  });
});
