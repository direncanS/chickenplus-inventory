import { beforeEach, describe, expect, it, vi } from 'vitest';
import { de } from '@/i18n/de';

const {
  createServerClientMock,
  getActiveProfileMock,
  loggerErrorMock,
} = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
  getActiveProfileMock: vi.fn(),
  loggerErrorMock: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: (...args: unknown[]) => createServerClientMock(...args),
}));

vi.mock('@/lib/supabase/auth-helpers', () => ({
  getActiveProfile: (...args: unknown[]) => getActiveProfileMock(...args),
}));

vi.mock('@/lib/utils/logger', () => ({
  logger: {
    error: (...args: unknown[]) => loggerErrorMock(...args),
  },
}));

type QueryResponse = {
  data: unknown;
  error?: { message: string } | null;
};

type QueryTrace = {
  gte: Array<[string, unknown]>;
  lte: Array<[string, unknown]>;
  in: Array<[string, unknown[]]>;
  eq: Array<[string, unknown]>;
  is: Array<[string, unknown]>;
  not: Array<[string, unknown, unknown]>;
};

function createSupabaseStub(responses: Record<string, QueryResponse>) {
  const traces = new Map<string, QueryTrace>();
  const callCount = new Map<string, number>();

  const from = vi.fn((table: string) => {
    const callIndex = (callCount.get(table) ?? 0) + 1;
    callCount.set(table, callIndex);

    const key = `${table}#${callIndex}`;
    const response = responses[key];
    if (!response) {
      throw new Error(`Unexpected query for ${key}`);
    }

    const trace: QueryTrace = {
      gte: [],
      lte: [],
      in: [],
      eq: [],
      is: [],
      not: [],
    };
    traces.set(key, trace);

    const query = {
      select: vi.fn(() => query),
      gte: vi.fn((column: string, value: unknown) => {
        trace.gte.push([column, value]);
        return query;
      }),
      lte: vi.fn((column: string, value: unknown) => {
        trace.lte.push([column, value]);
        return query;
      }),
      in: vi.fn((column: string, value: unknown[]) => {
        trace.in.push([column, value]);
        return query;
      }),
      eq: vi.fn((column: string, value: unknown) => {
        trace.eq.push([column, value]);
        return query;
      }),
      is: vi.fn((column: string, value: unknown) => {
        trace.is.push([column, value]);
        return query;
      }),
      not: vi.fn((column: string, operator: unknown, value: unknown) => {
        trace.not.push([column, operator, value]);
        return query;
      }),
      order: vi.fn(() => query),
      then: (onFulfilled?: (value: QueryResponse) => unknown, onRejected?: (reason: unknown) => unknown) =>
        Promise.resolve({
          data: response.data,
          error: response.error ?? null,
        }).then(onFulfilled, onRejected),
    };

    return query;
  });

  return {
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: '11111111-1111-4111-8111-111111111111' } },
        }),
      },
      from,
    },
    traces,
  };
}

describe('getReportData', () => {
  beforeEach(() => {
    vi.resetModules();
    createServerClientMock.mockReset();
    getActiveProfileMock.mockReset();
    loggerErrorMock.mockReset();

    getActiveProfileMock.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      role: 'staff',
      is_active: true,
    });
  });

  it('uses checklist_date as operational filter and combines supplier orders with unassigned captures', async () => {
    const { supabase, traces } = createSupabaseStub({
      'checklists#1': {
        data: [
          {
            id: 'cl-1',
            iso_year: 2026,
            iso_week: 14,
            status: 'completed',
            checklist_date: '2026-04-05',
            created_at: '2026-04-07T08:00:00Z',
          },
        ],
      },
      'checklist_items#1': {
        data: [
          {
            id: 'ci-1',
            checklist_id: 'cl-1',
            product_name: 'Cola',
            is_missing: true,
            is_checked: true,
          },
        ],
      },
      'orders#1': {
        data: [
          {
            id: 'ord-1',
            supplier_id: 'sup-1',
            status: 'ordered',
            ordered_at: '2026-04-05T10:00:00Z',
            delivered_at: null,
            created_at: '2026-04-07T09:00:00Z',
            suppliers: { name: 'Metro' },
            checklists: {
              iso_year: 2026,
              iso_week: 14,
              checklist_date: '2026-04-05',
            },
          },
        ],
      },
      'order_items#1': {
        data: [
          {
            id: 'oi-1',
            order_id: 'ord-1',
            is_delivered: false,
          },
        ],
      },
      'order_items#2': {
        data: [
          {
            id: 'oi-1',
            ordered_quantity: 6,
            products: { name: 'Cola', unit: 'koli' },
            orders: {
              ordered_at: '2026-04-05T10:00:00Z',
              created_at: '2026-04-07T09:00:00Z',
              suppliers: { name: 'Metro' },
              checklists: {
                iso_year: 2026,
                iso_week: 14,
                checklist_date: '2026-04-05',
              },
            },
          },
        ],
      },
      'checklist_items#2': {
        data: [
          {
            id: 'ci-unassigned',
            product_name: 'Papertasche',
            ordered_quantity: null,
            ordered_recorded_at: '2026-04-05T11:00:00Z',
            checklists: {
              iso_year: 2026,
              iso_week: 14,
              checklist_date: '2026-04-05',
            },
            products: { unit: 'karton' },
          },
        ],
      },
    });

    createServerClientMock.mockResolvedValue(supabase);

    const { getReportData } = await import('@/app/(app)/reports/actions');

    const result = await getReportData({
      startDate: '2026-04-01',
      endDate: '2026-04-30',
    });

    expect('success' in result && result.success).toBe(true);
    if (!('success' in result) || !result.success) {
      return;
    }

    expect(result.data.stockTrend[0].date).toBe('2026-04-05');
    expect(result.data.orderedProducts).toEqual([
      expect.objectContaining({
        recordId: 'ci-unassigned',
        source: 'unassigned_capture',
        supplierName: de.orders.notAssigned,
        checklistDate: '2026-04-05',
      }),
      expect.objectContaining({
        recordId: 'oi-1',
        source: 'supplier_order',
        supplierName: 'Metro',
        orderedQuantity: 6,
        checklistDate: '2026-04-05',
      }),
    ]);

    expect(traces.get('checklists#1')?.gte).toContainEqual(['checklist_date', '2026-04-01']);
    expect(traces.get('checklists#1')?.lte).toContainEqual(['checklist_date', '2026-04-30']);
    expect(traces.get('orders#1')?.in).toContainEqual(['checklist_id', ['cl-1']]);
    expect(traces.get('checklist_items#2')?.is).toContainEqual(['ordered_supplier_id', null]);
  });
});
