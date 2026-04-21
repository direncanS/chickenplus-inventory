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

async function getOrderListPropsFromTree(tree: Awaited<ReturnType<typeof import('@/app/(app)/orders/page').default>>) {
  // Shell tree contains Suspense wrappers around async OrdersSection.
  // Locate the OrdersSection element and invoke it to unwrap the OrderList props.
  const { OrdersSection } = await import('@/components/orders/orders-section');
  const children = (tree as { props: { children: unknown[] } }).props.children;
  const flat: unknown[] = Array.isArray(children) ? children : [children];

  for (const node of flat) {
    if (!node || typeof node !== 'object') continue;
    const element = node as { type?: unknown; props?: { children?: unknown } };
    // Suspense wraps children; dig one level.
    const inner = element.props?.children;
    if (!inner || typeof inner !== 'object') continue;
    const innerElement = inner as { type?: unknown; props?: Record<string, unknown> };
    if (innerElement.type === OrdersSection) {
      const sectionTree = await OrdersSection(innerElement.props as Parameters<typeof OrdersSection>[0]);
      const sectionProps = (sectionTree as { props: Record<string, unknown> }).props;
      // OrderList is mocked as (props) => props; so sectionTree IS the props object directly.
      if ('initialSuggestions' in (sectionTree as Record<string, unknown>)) {
        return sectionTree as { initialSuggestions: unknown[]; activeChecklist: { id: string; status: string } | null };
      }
      return sectionProps as { initialSuggestions: unknown[]; activeChecklist: { id: string; status: string } | null };
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
    const props = await getOrderListPropsFromTree(tree);

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
    const props = await getOrderListPropsFromTree(tree);

    expect(getOrderSuggestionsMock).toHaveBeenCalledTimes(1);
    expect(props.activeChecklist?.status).toBe('completed');
    expect(props.initialSuggestions).toEqual(suggestions);
  });
});
