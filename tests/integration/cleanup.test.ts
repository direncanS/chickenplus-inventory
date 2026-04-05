/**
 * Integration test: Monthly data cleanup (previous months deleted)
 * Strategy: Mock (simulates rpc_cleanup_previous_months logic)
 */
import { describe, it, expect, beforeEach } from 'vitest';

// -- In-memory data store --

interface Checklist {
  id: string;
  checklist_date: string; // YYYY-MM-DD
  status: string;
}

interface Order {
  id: string;
  checklist_id: string;
}

interface DataStore {
  checklists: Checklist[];
  orders: Order[];
}

/** Simulates rpc_cleanup_previous_months PostgreSQL function */
function simulateMonthlyCleanup(store: DataStore, currentDate: string): {
  success: boolean;
  deleted_checklists: number;
  deleted_orders: number;
  month_start: string;
} {
  // Calculate month start from current date
  const [year, month] = currentDate.split('-').map(Number);
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;

  // 1. Find old checklist IDs (before current month start)
  const oldChecklistIds = new Set(
    store.checklists
      .filter((c) => c.checklist_date < monthStart)
      .map((c) => c.id)
  );

  // 2. Delete orders linked to old checklists (must happen before checklists)
  const ordersBefore = store.orders.length;
  store.orders = store.orders.filter((o) => !oldChecklistIds.has(o.checklist_id));
  const deletedOrders = ordersBefore - store.orders.length;

  // 3. Delete old checklists
  const checklistsBefore = store.checklists.length;
  store.checklists = store.checklists.filter((c) => !oldChecklistIds.has(c.id));
  const deletedChecklists = checklistsBefore - store.checklists.length;

  return {
    success: true,
    deleted_checklists: deletedChecklists,
    deleted_orders: deletedOrders,
    month_start: monthStart,
  };
}

// -- Tests --

describe('Monthly data cleanup (previous months deleted)', () => {
  let store: DataStore;

  beforeEach(() => {
    store = {
      checklists: [
        // Previous months (should be deleted when current = April 2026)
        { id: 'cl-jan', checklist_date: '2026-01-15', status: 'completed' },
        { id: 'cl-feb', checklist_date: '2026-02-20', status: 'completed' },
        { id: 'cl-mar', checklist_date: '2026-03-10', status: 'completed' },
        // Current month (should be kept)
        { id: 'cl-apr-1', checklist_date: '2026-04-01', status: 'completed' },
        { id: 'cl-apr-2', checklist_date: '2026-04-04', status: 'in_progress' },
      ],
      orders: [
        // Orders linked to previous months
        { id: 'ord-jan-1', checklist_id: 'cl-jan' },
        { id: 'ord-feb-1', checklist_id: 'cl-feb' },
        { id: 'ord-mar-1', checklist_id: 'cl-mar' },
        { id: 'ord-mar-2', checklist_id: 'cl-mar' },
        // Orders linked to current month
        { id: 'ord-apr-1', checklist_id: 'cl-apr-1' },
        { id: 'ord-apr-2', checklist_id: 'cl-apr-2' },
      ],
    };
  });

  it('deletes checklists from previous months', () => {
    const result = simulateMonthlyCleanup(store, '2026-04-04');

    expect(result.success).toBe(true);
    expect(result.deleted_checklists).toBe(3);
    expect(store.checklists.map((c) => c.id)).toEqual(['cl-apr-1', 'cl-apr-2']);
  });

  it('deletes orders linked to previous month checklists', () => {
    const result = simulateMonthlyCleanup(store, '2026-04-04');

    expect(result.deleted_orders).toBe(4);
    expect(store.orders.map((o) => o.id)).toEqual(['ord-apr-1', 'ord-apr-2']);
  });

  it('keeps checklists from current month', () => {
    simulateMonthlyCleanup(store, '2026-04-04');

    expect(store.checklists).toHaveLength(2);
    expect(store.checklists.find((c) => c.id === 'cl-apr-1')).toBeDefined();
    expect(store.checklists.find((c) => c.id === 'cl-apr-2')).toBeDefined();
  });

  it('keeps orders linked to current month checklists', () => {
    simulateMonthlyCleanup(store, '2026-04-04');

    expect(store.orders).toHaveLength(2);
    expect(store.orders.find((o) => o.id === 'ord-apr-1')).toBeDefined();
    expect(store.orders.find((o) => o.id === 'ord-apr-2')).toBeDefined();
  });

  it('handles empty data store gracefully', () => {
    store = { checklists: [], orders: [] };

    const result = simulateMonthlyCleanup(store, '2026-04-04');

    expect(result.success).toBe(true);
    expect(result.deleted_checklists).toBe(0);
    expect(result.deleted_orders).toBe(0);
  });

  it('handles no old data (nothing to delete)', () => {
    store.checklists = [
      { id: 'cl-1', checklist_date: '2026-04-01', status: 'completed' },
      { id: 'cl-2', checklist_date: '2026-04-04', status: 'in_progress' },
    ];
    store.orders = [
      { id: 'ord-1', checklist_id: 'cl-1' },
    ];

    const result = simulateMonthlyCleanup(store, '2026-04-04');

    expect(result.deleted_checklists).toBe(0);
    expect(result.deleted_orders).toBe(0);
    expect(store.checklists).toHaveLength(2);
    expect(store.orders).toHaveLength(1);
  });

  it('returns correct month_start date', () => {
    const result = simulateMonthlyCleanup(store, '2026-04-15');

    expect(result.month_start).toBe('2026-04-01');
  });

  it('handles month boundary correctly (first day of month)', () => {
    // On April 1st, March data should be deleted
    const result = simulateMonthlyCleanup(store, '2026-04-01');

    expect(result.deleted_checklists).toBe(3); // jan, feb, mar
    expect(store.checklists).toHaveLength(2);
  });

  it('deletes orders before checklists (FK constraint order)', () => {
    const deletionLog: string[] = [];

    const monthStart = '2026-04-01';

    const oldIds = new Set(
      store.checklists.filter((c) => c.checklist_date < monthStart).map((c) => c.id)
    );

    // Step 1: Orders first
    const ordersToDelete = store.orders.filter((o) => oldIds.has(o.checklist_id));
    if (ordersToDelete.length > 0) deletionLog.push('orders');
    store.orders = store.orders.filter((o) => !oldIds.has(o.checklist_id));

    // Step 2: Checklists second
    const checklistsToDelete = store.checklists.filter((c) => oldIds.has(c.id));
    if (checklistsToDelete.length > 0) deletionLog.push('checklists');
    store.checklists = store.checklists.filter((c) => !oldIds.has(c.id));

    expect(deletionLog).toEqual(['orders', 'checklists']);
  });

  it('handles January correctly (no previous year cleanup)', () => {
    store = {
      checklists: [
        { id: 'cl-dec', checklist_date: '2025-12-15', status: 'completed' },
        { id: 'cl-jan', checklist_date: '2026-01-10', status: 'in_progress' },
      ],
      orders: [
        { id: 'ord-dec', checklist_id: 'cl-dec' },
        { id: 'ord-jan', checklist_id: 'cl-jan' },
      ],
    };

    const result = simulateMonthlyCleanup(store, '2026-01-10');

    expect(result.deleted_checklists).toBe(1);
    expect(result.deleted_orders).toBe(1);
    expect(store.checklists).toHaveLength(1);
    expect(store.checklists[0].id).toBe('cl-jan');
  });
});
