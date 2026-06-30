/**
 * Integration test: Checklist lifecycle flow
 * Strategy: Mock (Supabase local unavailable)
 * Note: Should be re-verified with real DB after local Supabase setup
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { calculateMissing } from '@/lib/utils/calculations';
import { de } from '@/i18n/de';

// -- Helpers that mirror server action logic without Supabase dependency --

interface ChecklistItem {
  id: string;
  checklist_id: string;
  min_stock_snapshot: number;
  min_stock_max_snapshot: number | null;
  current_stock: number | null;
  missing_amount_calculated: number;
  missing_amount_final: number;
  is_missing_overridden: boolean;
  is_checked: boolean;
}

type ChecklistStatus = 'draft' | 'in_progress' | 'completed';

interface Checklist {
  id: string;
  status: ChecklistStatus;
  completed_by: string | null;
  items: ChecklistItem[];
}

/** Simulates updateChecklistItem server action logic */
function simulateItemUpdate(
  checklist: Checklist,
  itemId: string,
  update: { currentStock?: number | null; isChecked?: boolean; isMissingOverridden?: boolean; missingAmountFinal?: number }
): { success: boolean; error?: string; checklist: Checklist } {
  if (checklist.status === 'completed') {
    return { success: false, error: de.errors.unauthorized, checklist };
  }

  const item = checklist.items.find((i) => i.id === itemId);
  if (!item) {
    return { success: false, error: de.errors.notFound, checklist };
  }

  const currentStock = update.currentStock !== undefined ? update.currentStock : item.current_stock;
  const missingCalculated = calculateMissing(currentStock, item.min_stock_snapshot);
  const isOverridden = update.isMissingOverridden ?? item.is_missing_overridden;
  const missingFinal = isOverridden && update.missingAmountFinal !== undefined
    ? update.missingAmountFinal
    : missingCalculated;

  const updatedItem: ChecklistItem = {
    ...item,
    current_stock: currentStock,
    missing_amount_calculated: missingCalculated,
    missing_amount_final: missingFinal,
    is_missing_overridden: isOverridden,
    is_checked: update.isChecked ?? item.is_checked,
  };

  const newItems = checklist.items.map((i) => (i.id === itemId ? updatedItem : i));

  // Auto-transition draft → in_progress
  const newStatus: ChecklistStatus = checklist.status === 'draft' ? 'in_progress' : checklist.status;

  return {
    success: true,
    checklist: { ...checklist, status: newStatus, items: newItems },
  };
}

/** Simulates completeChecklist server action logic */
function simulateComplete(checklist: Checklist): { success: boolean; error?: string; checklist: Checklist } {
  if (checklist.items.length === 0) {
    return { success: false, error: de.errors.notFound, checklist };
  }

  const allChecked = checklist.items.every((i) => i.is_checked);
  if (!allChecked) {
    return { success: false, error: de.checklist.allCheckedRequired, checklist };
  }

  const allHaveStock = checklist.items.every((i) => i.current_stock !== null);
  if (!allHaveStock) {
    return { success: false, error: de.checklist.allStockRequired, checklist };
  }

  return {
    success: true,
    checklist: { ...checklist, status: 'completed', completed_by: 'user-1' },
  };
}

// -- Tests --

describe('Checklist lifecycle flow (mock)', () => {
  let checklist: Checklist;

  beforeEach(() => {
    checklist = {
      id: 'cl-1',
      status: 'draft',
      completed_by: null,
      items: [
        {
          id: 'item-1',
          checklist_id: 'cl-1',
          min_stock_snapshot: 5,
          min_stock_max_snapshot: 10,
          current_stock: null,
          missing_amount_calculated: 0,
          missing_amount_final: 0,
          is_missing_overridden: false,
          is_checked: false,
        },
        {
          id: 'item-2',
          checklist_id: 'cl-1',
          min_stock_snapshot: 3,
          min_stock_max_snapshot: null,
          current_stock: null,
          missing_amount_calculated: 0,
          missing_amount_final: 0,
          is_missing_overridden: false,
          is_checked: false,
        },
      ],
    };
  });

  it('full flow: create → update items → complete', () => {
    // Step 1: Update item 1
    let result = simulateItemUpdate(checklist, 'item-1', {
      currentStock: 2,
      isChecked: true,
    });
    expect(result.success).toBe(true);
    checklist = result.checklist;

    // Auto-transition: draft → in_progress
    expect(checklist.status).toBe('in_progress');
    expect(checklist.items[0].current_stock).toBe(2);
    expect(checklist.items[0].missing_amount_calculated).toBe(3); // 5 - 2
    expect(checklist.items[0].missing_amount_final).toBe(3);
    expect(checklist.items[0].is_checked).toBe(true);

    // Step 2: Update item 2
    result = simulateItemUpdate(checklist, 'item-2', {
      currentStock: 1,
      isChecked: true,
    });
    expect(result.success).toBe(true);
    checklist = result.checklist;

    expect(checklist.items[1].current_stock).toBe(1);
    expect(checklist.items[1].missing_amount_calculated).toBe(2); // 3 - 1
    expect(checklist.items[1].is_checked).toBe(true);

    // Step 3: Complete
    const completeResult = simulateComplete(checklist);
    expect(completeResult.success).toBe(true);
    expect(completeResult.checklist.status).toBe('completed');
    expect(completeResult.checklist.completed_by).toBe('user-1');
  });

  it('rejects complete when not all items are checked', () => {
    // Update only item 1, leave item 2 unchecked
    let result = simulateItemUpdate(checklist, 'item-1', {
      currentStock: 5,
      isChecked: true,
    });
    checklist = result.checklist;

    result = simulateItemUpdate(checklist, 'item-2', {
      currentStock: 3,
      isChecked: false,
    });
    checklist = result.checklist;

    const completeResult = simulateComplete(checklist);
    expect(completeResult.success).toBe(false);
    expect(completeResult.error).toBe(de.checklist.allCheckedRequired);
  });

  it('rejects complete when stock values are null', () => {
    // Check items but don't set stock
    let result = simulateItemUpdate(checklist, 'item-1', { isChecked: true });
    checklist = result.checklist;
    result = simulateItemUpdate(checklist, 'item-2', { isChecked: true });
    checklist = result.checklist;

    const completeResult = simulateComplete(checklist);
    expect(completeResult.success).toBe(false);
    expect(completeResult.error).toBe(de.checklist.allStockRequired);
  });

  it('rejects update on completed checklist', () => {
    checklist.status = 'completed';

    const result = simulateItemUpdate(checklist, 'item-1', {
      currentStock: 5,
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe(de.errors.unauthorized);
  });

  it('handles override flow correctly', () => {
    // Update with override
    const result = simulateItemUpdate(checklist, 'item-1', {
      currentStock: 2,
      isChecked: true,
      isMissingOverridden: true,
      missingAmountFinal: 8, // override: order 8 instead of calculated 3
    });
    expect(result.success).toBe(true);

    const item = result.checklist.items[0];
    expect(item.missing_amount_calculated).toBe(3); // server always computes
    expect(item.missing_amount_final).toBe(8); // overridden value
    expect(item.is_missing_overridden).toBe(true);
  });

  it('auto-transitions from draft to in_progress on first update', () => {
    expect(checklist.status).toBe('draft');

    const result = simulateItemUpdate(checklist, 'item-1', {
      currentStock: 0,
    });
    expect(result.success).toBe(true);
    expect(result.checklist.status).toBe('in_progress');
  });

  it('stays in_progress on subsequent updates', () => {
    checklist.status = 'in_progress';

    const result = simulateItemUpdate(checklist, 'item-1', {
      currentStock: 3,
    });
    expect(result.success).toBe(true);
    expect(result.checklist.status).toBe('in_progress');
  });

  it('returns error for non-existent item', () => {
    const result = simulateItemUpdate(checklist, 'non-existent', {
      currentStock: 5,
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe(de.errors.notFound);
  });
});
