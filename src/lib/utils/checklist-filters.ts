export type ChecklistFilterMode = 'all' | 'missing' | 'unchecked';

export interface ChecklistFilterItem {
  isMissing: boolean;
  isChecked: boolean;
}

export function matchesChecklistFilter(
  item: ChecklistFilterItem,
  mode: ChecklistFilterMode
) {
  if (mode === 'missing') return item.isMissing;
  if (mode === 'unchecked') return !item.isChecked;
  return true;
}

export function countHiddenChecklistItems(
  items: ChecklistFilterItem[],
  mode: ChecklistFilterMode
) {
  if (mode === 'all') return 0;
  return items.filter((item) => !matchesChecklistFilter(item, mode)).length;
}
