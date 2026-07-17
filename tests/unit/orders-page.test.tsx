import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createServerClientMock,
  requireAppViewerMock,
  getOrderSuggestionsMock,
  transformOrdersMock,
} = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
  requireAppViewerMock: vi.fn(),
  getOrderSuggestionsMock: vi.fn(),
  transformOrdersMock: vi.fn((orders) => orders),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: (...args: unknown[]) => createServerClientMock(...args),
}));

vi.mock('@/lib/supabase/app-viewer', () => ({
  requireAppViewer: (...args: unknown[]) => requireAppViewerMock(...args),
}));

vi.mock('@/lib/server/order-suggestions', () => ({
  getOrderSuggestions: (...args: unknown[]) => getOrderSuggestionsMock(...args),
}));

vi.mock('@/lib/utils/transform', () => ({
  transformOrders: (orders: unknown[]) => transformOrdersMock(orders),
}));

vi.mock('@/components/orders/order-list', () => ({
  OrderList: (props: unknown) => props,
}));

vi.mock('@/components/routine-orders/weekly-routine-dashboard', () => ({
  WeeklyRoutineDashboard: () => null,
}));

function createSupabaseStub(activeChecklist: unknown, orders: unknown[] = []) {
  return {
    from: vi.fn((table: string) => {
      if (table === 'checklists') {
        const query = {
          select: vi.fn(() => query),
          in: vi.fn(() => query),
          order: vi.fn(() => query),
          limit: vi.fn(() => query),
          maybeSingle: vi.fn().mockResolvedValue({
            data: activeChecklist,
            error: null,
          }),
        };

        return query;
      }

      if (table === 'orders') {
        const query = {
          select: vi.fn(() => query),
          order: vi.fn().mockResolvedValue({
            data: orders,
            error: null,
          }),
        };

        return query;
      }

      if (table === 'routine_order_instances') {
        const query = {
          select: vi.fn(() => query),
          eq: vi.fn(() => query),
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        };
        return query;
      }

      if (table === 'routine_orders') {
        const query = {
          select: vi.fn(() => query),
          eq: vi.fn(() => query),
          then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
            Promise.resolve({ count: 0, error: null }).then(resolve, reject),
        };
        return query;
      }

      if (table === 'checklist_items') {
        const query = {
          select: vi.fn(() => query),
          eq: vi.fn(() => query),
          then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
            Promise.resolve({ data: [], error: null }).then(resolve, reject),
        };
        return query;
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
  };
}

function getOrderListPropsFromTree(tree: Awaited<ReturnType<typeof import('@/app/(app)/orders/page').default>>) {
  // The tree is a div with children: PageIntro, WeeklyRoutineDashboard (null), OrderList
  // OrderList is mocked as (props) => props so its element in the tree carries props directly
  const children = (tree as { props: { children: unknown[] } }).props.children;
  const childArray = Array.isArray(children) ? children : [children];

  for (const child of childArray) {
    if (!child || typeof child !== 'object') continue;
    const obj = child as Record<string, unknown>;
    // Direct props access (mock returns props object)
    if ('initialSuggestions' in obj) return obj as { initialSuggestions: unknown[]; activeChecklist: { id: string; status: string } | null };
    // React element: props nested under .props
    if (obj.props && typeof obj.props === 'object' && 'initialSuggestions' in (obj.props as Record<string, unknown>)) {
      return obj.props as { initialSuggestions: unknown[]; activeChecklist: { id: string; status: string } | null };
    }
  }

  return undefined as never;
}

describe('OrdersPage', () => {
  beforeEach(() => {
    vi.resetModules();
    createServerClientMock.mockReset();
    requireAppViewerMock.mockReset();
    getOrderSuggestionsMock.mockReset();
    transformOrdersMock.mockClear();

    requireAppViewerMock.mockResolvedValue({ isAdmin: false });
  });

  it('does not load checklist suggestions before the checklist is completed', async () => {
    createServerClientMock.mockResolvedValue(
      createSupabaseStub({
        id: 'checklist-1',
        iso_year: 2026,
        iso_week: 14,
        status: 'in_progress',
      })
    );

    const { default: OrdersPage } = await import('@/app/(app)/orders/page');
    const tree = await OrdersPage();
    const props = getOrderListPropsFromTree(tree);

    expect(getOrderSuggestionsMock).not.toHaveBeenCalled();
    expect(props.activeChecklist?.status).toBe('in_progress');
    expect(props.initialSuggestions).toEqual([]);
  });

  it('loads checklist suggestions on first render only for completed checklists', async () => {
    const suggestions = [
      {
        supplierId: 'unassigned',
        supplierName: 'Nicht zugeordnet',
        items: [],
      },
    ];

    createServerClientMock.mockResolvedValue(
      createSupabaseStub({
        id: 'checklist-1',
        iso_year: 2026,
        iso_week: 14,
        status: 'completed',
      })
    );
    getOrderSuggestionsMock.mockResolvedValue(suggestions);

    const { default: OrdersPage } = await import('@/app/(app)/orders/page');
    const tree = await OrdersPage();
    const props = getOrderListPropsFromTree(tree);

    expect(getOrderSuggestionsMock).toHaveBeenCalledTimes(1);
    expect(props.activeChecklist?.status).toBe('completed');
    expect(props.initialSuggestions).toEqual(suggestions);
  });
});
