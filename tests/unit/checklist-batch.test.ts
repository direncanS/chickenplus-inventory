import { describe, expect, it } from 'vitest';
import {
  collectDirtyChecklistItems,
  countCheckedChecklistItems,
  createChecklistItemDraftState,
  hasChecklistSaveError,
  hasDirtyChecklistItems,
  isChecklistSavePending,
  markChecklistItemsSaving,
  patchChecklistItemDraft,
  reconcileChecklistBatchError,
  reconcileChecklistBatchSuccess,
} from '@/lib/utils/checklist-batch';

const sourceItems = [
  {
    id: 'item-1',
    current_stock: null,
    is_missing: false,
    is_checked: false,
  },
  {
    id: 'item-2',
    current_stock: 'voll',
    is_missing: false,
    is_checked: true,
  },
];

describe('checklist batch helpers', () => {
  it('creates local draft state from checklist items', () => {
    const result = createChecklistItemDraftState(sourceItems);

    expect(result['item-1']).toEqual({
      currentStock: '',
      isMissing: false,
      isChecked: false,
      dirty: false,
      saveState: 'idle',
      revision: 0,
    });
    expect(result['item-2'].currentStock).toBe('voll');
    expect(result['item-2'].isChecked).toBe(true);
  });

  it('patches rows optimistically and marks them dirty', () => {
    const initial = createChecklistItemDraftState(sourceItems);
    const patched = patchChecklistItemDraft(initial, 'item-1', {
      currentStock: '3',
      isChecked: true,
    });

    expect(patched['item-1']).toMatchObject({
      currentStock: '3',
      isChecked: true,
      dirty: true,
      saveState: 'idle',
      revision: 1,
    });
    expect(countCheckedChecklistItems(patched)).toBe(2);
    expect(hasDirtyChecklistItems(patched)).toBe(true);
  });

  it('collects dirty rows into one batch payload', () => {
    const initial = createChecklistItemDraftState(sourceItems);
    let patched = patchChecklistItemDraft(initial, 'item-1', {
      currentStock: '3',
      isChecked: true,
    });
    patched = patchChecklistItemDraft(patched, 'item-2', {
      isMissing: true,
    });

    const batch = collectDirtyChecklistItems(patched);

    expect(batch.itemIds).toEqual(['item-1', 'item-2']);
    expect(batch.items).toEqual([
      {
        checklistItemId: 'item-1',
        currentStock: '3',
        isMissing: false,
        isChecked: true,
      },
      {
        checklistItemId: 'item-2',
        currentStock: 'voll',
        isMissing: true,
        isChecked: true,
      },
    ]);
  });

  it('keeps newer edits dirty when an older batch succeeds', () => {
    const initial = createChecklistItemDraftState(sourceItems);
    let patched = patchChecklistItemDraft(initial, 'item-1', { currentStock: '3' });
    const sentRevisions = collectDirtyChecklistItems(patched).itemRevisions;

    patched = patchChecklistItemDraft(patched, 'item-1', { currentStock: '4' });
    const reconciled = reconcileChecklistBatchSuccess(patched, sentRevisions);

    expect(reconciled['item-1']).toMatchObject({
      currentStock: '4',
      dirty: true,
      saveState: 'idle',
      revision: 2,
    });
  });

  it('marks matching revisions as error on failed save', () => {
    const initial = createChecklistItemDraftState(sourceItems);
    const patched = patchChecklistItemDraft(initial, 'item-1', { isMissing: true });
    const batch = collectDirtyChecklistItems(patched);
    const saving = markChecklistItemsSaving(patched, batch.itemIds);
    const errored = reconcileChecklistBatchError(saving, batch.itemRevisions);

    expect(errored['item-1'].saveState).toBe('error');
    expect(errored['item-1'].dirty).toBe(true);
    expect(hasChecklistSaveError(errored)).toBe(true);
    expect(isChecklistSavePending(errored)).toBe(true);
  });

  it('clears dirty state for matching revisions after a successful save', () => {
    const initial = createChecklistItemDraftState(sourceItems);
    const patched = patchChecklistItemDraft(initial, 'item-1', { isChecked: true });
    const batch = collectDirtyChecklistItems(patched);
    const saving = markChecklistItemsSaving(patched, batch.itemIds);
    const reconciled = reconcileChecklistBatchSuccess(saving, batch.itemRevisions);

    expect(reconciled['item-1']).toMatchObject({
      isChecked: true,
      dirty: false,
      saveState: 'idle',
    });
    expect(hasDirtyChecklistItems(reconciled)).toBe(false);
  });
});
