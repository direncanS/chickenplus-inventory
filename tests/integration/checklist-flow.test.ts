/**
 * Integration test: Checklist lifecycle flow
 * Strategy: Mock (Supabase local unavailable)
 * Note: Should be re-verified with real DB after local Supabase setup
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { de } from '@/i18n/de';

interface ChecklistItem {
  id: string;
  checklist_id: string;
  min_stock_snapshot: number;
  min_stock_max_snapshot: number | null;
  current_stock: string | null;
  is_missing: boolean;
  is_checked: boolean;
}

type ChecklistStatus = 'draft' | 'in_progress' | 'completed';
type OrderGenerationStatus = 'idle' | 'pending' | 'running' | 'completed' | 'failed';

interface Checklist {
  id: string;
  status: ChecklistStatus;
  completed_by: string | null;
  order_generation_status: OrderGenerationStatus;
  order_generation_orders_created: number;
  order_generation_error: string | null;
  items: ChecklistItem[];
}

function simulateItemUpdate(
  checklist: Checklist,
  itemId: string,
  update: { currentStock?: string | null; isMissing?: boolean; isChecked?: boolean }
): { success: boolean; error?: string; checklist: Checklist } {
  if (checklist.status === 'completed') {
    return { success: false, error: de.errors.unauthorized, checklist };
  }

  const item = checklist.items.find((i) => i.id === itemId);
  if (!item) {
    return { success: false, error: de.errors.notFound, checklist };
  }

  const updatedItem: ChecklistItem = {
    ...item,
    current_stock: update.currentStock !== undefined ? update.currentStock : item.current_stock,
    is_missing: update.isMissing !== undefined ? update.isMissing : item.is_missing,
    is_checked: update.isChecked !== undefined ? update.isChecked : item.is_checked,
  };

  const newItems = checklist.items.map((i) => (i.id === itemId ? updatedItem : i));
  const newStatus: ChecklistStatus = checklist.status === 'draft' ? 'in_progress' : checklist.status;

  return {
    success: true,
    checklist: { ...checklist, status: newStatus, items: newItems },
  };
}

function simulateComplete(checklist: Checklist): {
  success: boolean;
  error?: string;
  orderGenerationStatus?: OrderGenerationStatus;
  checklist: Checklist;
} {
  if (checklist.items.length === 0) {
    return { success: false, error: de.errors.notFound, checklist };
  }

  const allChecked = checklist.items.every((i) => i.is_checked);
  if (!allChecked) {
    return { success: false, error: de.checklist.allCheckedRequired, checklist };
  }

  return {
    success: true,
    orderGenerationStatus: 'pending',
    checklist: {
      ...checklist,
      status: 'completed',
      completed_by: 'user-1',
      order_generation_status: 'pending',
      order_generation_orders_created: 0,
      order_generation_error: null,
    },
  };
}

function simulateBackgroundOrderGeneration(
  checklist: Checklist,
  input: { ordersCreated?: number; error?: string }
): Checklist {
  if (checklist.status !== 'completed' || checklist.order_generation_status !== 'pending') {
    return checklist;
  }

  if (input.error) {
    return {
      ...checklist,
      order_generation_status: 'failed',
      order_generation_orders_created: input.ordersCreated ?? 0,
      order_generation_error: input.error,
    };
  }

  return {
    ...checklist,
    order_generation_status: 'completed',
    order_generation_orders_created: input.ordersCreated ?? 0,
    order_generation_error: null,
  };
}

function simulateReopen(checklist: Checklist): Checklist {
  return {
    ...checklist,
    status: 'in_progress',
    completed_by: null,
    order_generation_status: 'idle',
    order_generation_orders_created: 0,
    order_generation_error: null,
  };
}

describe('Checklist lifecycle flow (mock)', () => {
  let checklist: Checklist;

  beforeEach(() => {
    checklist = {
      id: 'cl-1',
      status: 'draft',
      completed_by: null,
      order_generation_status: 'idle',
      order_generation_orders_created: 0,
      order_generation_error: null,
      items: [
        {
          id: 'item-1',
          checklist_id: 'cl-1',
          min_stock_snapshot: 5,
          min_stock_max_snapshot: 10,
          current_stock: null,
          is_missing: false,
          is_checked: false,
        },
        {
          id: 'item-2',
          checklist_id: 'cl-1',
          min_stock_snapshot: 3,
          min_stock_max_snapshot: null,
          current_stock: null,
          is_missing: false,
          is_checked: false,
        },
      ],
    };
  });

  it('full flow: create -> update items -> complete', () => {
    let result = simulateItemUpdate(checklist, 'item-1', {
      currentStock: '2 koli',
      isMissing: true,
      isChecked: true,
    });
    expect(result.success).toBe(true);
    checklist = result.checklist;

    expect(checklist.status).toBe('in_progress');
    expect(checklist.items[0].current_stock).toBe('2 koli');
    expect(checklist.items[0].is_missing).toBe(true);
    expect(checklist.items[0].is_checked).toBe(true);

    result = simulateItemUpdate(checklist, 'item-2', {
      currentStock: 'voll',
      isChecked: true,
    });
    expect(result.success).toBe(true);
    checklist = result.checklist;

    expect(checklist.items[1].current_stock).toBe('voll');
    expect(checklist.items[1].is_missing).toBe(false);
    expect(checklist.items[1].is_checked).toBe(true);

    const completeResult = simulateComplete(checklist);
    expect(completeResult.success).toBe(true);
    expect(completeResult.orderGenerationStatus).toBe('pending');
    expect(completeResult.checklist.status).toBe('completed');
    expect(completeResult.checklist.completed_by).toBe('user-1');
    expect(completeResult.checklist.order_generation_status).toBe('pending');
  });

  it('rejects complete when not all items are checked', () => {
    let result = simulateItemUpdate(checklist, 'item-1', {
      currentStock: 'voll',
      isChecked: true,
    });
    checklist = result.checklist;

    result = simulateItemUpdate(checklist, 'item-2', {
      currentStock: '3',
      isChecked: false,
    });
    checklist = result.checklist;

    const completeResult = simulateComplete(checklist);
    expect(completeResult.success).toBe(false);
    expect(completeResult.error).toBe(de.checklist.allCheckedRequired);
  });

  it('allows complete when stock values are null (stock is optional)', () => {
    let result = simulateItemUpdate(checklist, 'item-1', { isChecked: true });
    checklist = result.checklist;
    result = simulateItemUpdate(checklist, 'item-2', { isChecked: true });
    checklist = result.checklist;

    const completeResult = simulateComplete(checklist);
    expect(completeResult.success).toBe(true);
    expect(completeResult.checklist.status).toBe('completed');
    expect(completeResult.checklist.order_generation_status).toBe('pending');
  });

  it('marks background order generation as completed after completion returns', () => {
    checklist.items = checklist.items.map((item) => ({ ...item, is_checked: true }));

    const completed = simulateComplete(checklist).checklist;
    const finalChecklist = simulateBackgroundOrderGeneration(completed, { ordersCreated: 2 });

    expect(completed.order_generation_status).toBe('pending');
    expect(finalChecklist.order_generation_status).toBe('completed');
    expect(finalChecklist.order_generation_orders_created).toBe(2);
    expect(finalChecklist.order_generation_error).toBeNull();
  });

  it('marks background order generation as failed without undoing checklist completion', () => {
    checklist.items = checklist.items.map((item) => ({ ...item, is_checked: true }));

    const completed = simulateComplete(checklist).checklist;
    const finalChecklist = simulateBackgroundOrderGeneration(completed, {
      ordersCreated: 1,
      error: 'supplier rpc failed',
    });

    expect(finalChecklist.status).toBe('completed');
    expect(finalChecklist.order_generation_status).toBe('failed');
    expect(finalChecklist.order_generation_orders_created).toBe(1);
    expect(finalChecklist.order_generation_error).toBe('supplier rpc failed');
  });

  it('aborts background order generation after checklist is reopened', () => {
    checklist.items = checklist.items.map((item) => ({ ...item, is_checked: true }));

    const completed = simulateComplete(checklist).checklist;
    const reopened = simulateReopen(completed);
    const afterAbort = simulateBackgroundOrderGeneration(reopened, { ordersCreated: 3 });

    expect(reopened.status).toBe('in_progress');
    expect(reopened.order_generation_status).toBe('idle');
    expect(afterAbort.order_generation_status).toBe('idle');
    expect(afterAbort.order_generation_orders_created).toBe(0);
  });

  it('rejects update on completed checklist', () => {
    checklist.status = 'completed';

    const result = simulateItemUpdate(checklist, 'item-1', {
      currentStock: 'voll',
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe(de.errors.unauthorized);
  });

  it('is_missing toggle works correctly', () => {
    let result = simulateItemUpdate(checklist, 'item-1', {
      currentStock: 'leer',
      isMissing: true,
      isChecked: true,
    });
    expect(result.success).toBe(true);
    expect(result.checklist.items[0].is_missing).toBe(true);

    result = simulateItemUpdate(result.checklist, 'item-1', {
      isMissing: false,
    });
    expect(result.success).toBe(true);
    expect(result.checklist.items[0].is_missing).toBe(false);
  });

  it('auto-transitions from draft to in_progress on first update', () => {
    expect(checklist.status).toBe('draft');

    const result = simulateItemUpdate(checklist, 'item-1', {
      currentStock: '0',
    });
    expect(result.success).toBe(true);
    expect(result.checklist.status).toBe('in_progress');
  });

  it('stays in_progress on subsequent updates', () => {
    checklist.status = 'in_progress';

    const result = simulateItemUpdate(checklist, 'item-1', {
      currentStock: '3 koli',
    });
    expect(result.success).toBe(true);
    expect(result.checklist.status).toBe('in_progress');
  });

  it('returns error for non-existent item', () => {
    const result = simulateItemUpdate(checklist, 'non-existent', {
      currentStock: 'voll',
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe(de.errors.notFound);
  });

  it('accepts free text stock values', () => {
    const freeTextValues = ['voll', 'leer', '3 koli', 'halb', '1/2 Karton'];
    for (const val of freeTextValues) {
      const result = simulateItemUpdate(checklist, 'item-1', {
        currentStock: val,
      });
      expect(result.success).toBe(true);
      expect(result.checklist.items[0].current_stock).toBe(val);
    }
  });
});
