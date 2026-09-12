import { describe, expect, it } from 'vitest';
import { countHiddenChecklistItems, matchesChecklistFilter } from '@/lib/utils/checklist-filters';

const items = [
  { isMissing: true, isChecked: false },
  { isMissing: false, isChecked: false },
  { isMissing: true, isChecked: true },
];

describe('checklist filters', () => {
  it('matches all items in all mode', () => {
    expect(items.map((item) => matchesChecklistFilter(item, 'all'))).toEqual([
      true,
      true,
      true,
    ]);
  });

  it('matches missing items only', () => {
    expect(items.map((item) => matchesChecklistFilter(item, 'missing'))).toEqual([
      true,
      false,
      true,
    ]);
  });

  it('matches unchecked items only', () => {
    expect(items.map((item) => matchesChecklistFilter(item, 'unchecked'))).toEqual([
      true,
      true,
      false,
    ]);
  });

  it('counts hidden items for active filters', () => {
    expect(countHiddenChecklistItems(items, 'all')).toBe(0);
    expect(countHiddenChecklistItems(items, 'missing')).toBe(1);
    expect(countHiddenChecklistItems(items, 'unchecked')).toBe(1);
  });
});
