export type ChecklistItemSaveState = 'idle' | 'saving' | 'error';

export interface ChecklistItemDraftState {
  currentStock: string;
  isMissing: boolean;
  isChecked: boolean;
  dirty: boolean;
  saveState: ChecklistItemSaveState;
  revision: number;
}

export interface ChecklistItemDraftSource {
  id: string;
  current_stock: string | null;
  is_missing: boolean;
  is_checked: boolean;
}

export interface ChecklistBatchPayloadItem {
  checklistItemId: string;
  currentStock: string | null;
  isMissing: boolean;
  isChecked: boolean;
}

export function createChecklistItemDraftState(
  items: ChecklistItemDraftSource[]
): Record<string, ChecklistItemDraftState> {
  return Object.fromEntries(
    items.map((item) => [
      item.id,
      {
        currentStock: item.current_stock ?? '',
        isMissing: item.is_missing,
        isChecked: item.is_checked,
        dirty: false,
        saveState: 'idle' as const,
        revision: 0,
      },
    ])
  );
}

export function patchChecklistItemDraft(
  state: Record<string, ChecklistItemDraftState>,
  itemId: string,
  patch: Partial<Pick<ChecklistItemDraftState, 'currentStock' | 'isMissing' | 'isChecked'>>
): Record<string, ChecklistItemDraftState> {
  const current = state[itemId];
  if (!current) return state;

  return {
    ...state,
    [itemId]: {
      ...current,
      ...patch,
      dirty: true,
      saveState: 'idle',
      revision: current.revision + 1,
    },
  };
}

export function collectDirtyChecklistItems(state: Record<string, ChecklistItemDraftState>): {
  itemIds: string[];
  itemRevisions: Record<string, number>;
  items: ChecklistBatchPayloadItem[];
} {
  const dirtyEntries = Object.entries(state).filter(([, item]) => item.dirty);

  return {
    itemIds: dirtyEntries.map(([itemId]) => itemId),
    itemRevisions: Object.fromEntries(
      dirtyEntries.map(([itemId, item]) => [itemId, item.revision])
    ),
    items: dirtyEntries.map(([itemId, item]) => ({
      checklistItemId: itemId,
      currentStock: item.currentStock === '' ? null : item.currentStock,
      isMissing: item.isMissing,
      isChecked: item.isChecked,
    })),
  };
}

export function markChecklistItemsSaving(
  state: Record<string, ChecklistItemDraftState>,
  itemIds: string[]
): Record<string, ChecklistItemDraftState> {
  if (itemIds.length === 0) return state;

  const idSet = new Set(itemIds);

  return Object.fromEntries(
    Object.entries(state).map(([itemId, item]) => [
      itemId,
      idSet.has(itemId)
        ? {
            ...item,
            saveState: 'saving' as const,
          }
        : item,
    ])
  );
}

export function reconcileChecklistBatchSuccess(
  state: Record<string, ChecklistItemDraftState>,
  itemRevisions: Record<string, number>
): Record<string, ChecklistItemDraftState> {
  const itemIds = new Set(Object.keys(itemRevisions));

  return Object.fromEntries(
    Object.entries(state).map(([itemId, item]) => {
      if (!itemIds.has(itemId)) {
        return [itemId, item];
      }

      if (item.revision !== itemRevisions[itemId]) {
        return [itemId, item];
      }

      return [
        itemId,
        {
          ...item,
          dirty: false,
          saveState: 'idle' as const,
        },
      ];
    })
  );
}

export function reconcileChecklistBatchError(
  state: Record<string, ChecklistItemDraftState>,
  itemRevisions: Record<string, number>
): Record<string, ChecklistItemDraftState> {
  const itemIds = new Set(Object.keys(itemRevisions));

  return Object.fromEntries(
    Object.entries(state).map(([itemId, item]) => {
      if (!itemIds.has(itemId)) {
        return [itemId, item];
      }

      if (item.revision !== itemRevisions[itemId]) {
        return [itemId, item];
      }

      return [
        itemId,
        {
          ...item,
          dirty: true,
          saveState: 'error' as const,
        },
      ];
    })
  );
}

export function countCheckedChecklistItems(
  state: Record<string, ChecklistItemDraftState>
): number {
  return Object.values(state).filter((item) => item.isChecked).length;
}

export function hasDirtyChecklistItems(
  state: Record<string, ChecklistItemDraftState>
): boolean {
  return Object.values(state).some((item) => item.dirty);
}

export function hasChecklistSaveError(
  state: Record<string, ChecklistItemDraftState>
): boolean {
  return Object.values(state).some((item) => item.saveState === 'error');
}

export function isChecklistSavePending(
  state: Record<string, ChecklistItemDraftState>
): boolean {
  return Object.values(state).some(
    (item) => item.dirty || item.saveState === 'saving'
  );
}
