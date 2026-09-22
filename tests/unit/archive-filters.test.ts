import { describe, expect, it } from 'vitest';
import {
  filterArchivedChecklists,
  getArchiveYears,
  type ArchiveChecklistSummary,
} from '@/lib/utils/archive-filters';

const archiveItems: ArchiveChecklistSummary[] = [
  {
    id: 'week-16',
    isoYear: 2026,
    isoWeek: 16,
    weekStartDate: '2026-04-12',
    weekEndDate: '2026-04-18',
    totalItems: 120,
    missingItems: 7,
  },
  {
    id: 'week-15',
    isoYear: 2026,
    isoWeek: 15,
    weekStartDate: '2026-04-05',
    weekEndDate: '2026-04-11',
    totalItems: 120,
    missingItems: 0,
  },
  {
    id: 'week-52',
    isoYear: 2025,
    isoWeek: 52,
    weekStartDate: '2025-12-21',
    weekEndDate: '2025-12-27',
    totalItems: 118,
    missingItems: 3,
  },
];

describe('archive filters', () => {
  it('returns archive years newest first', () => {
    expect(getArchiveYears(archiveItems)).toEqual([2026, 2025]);
  });

  it('filters by selected year', () => {
    expect(filterArchivedChecklists(archiveItems, { year: 2025 }).map((item) => item.id)).toEqual([
      'week-52',
    ]);
  });

  it('filters to weeks with missing items', () => {
    expect(
      filterArchivedChecklists(archiveItems, { missingOnly: true }).map((item) => item.id)
    ).toEqual(['week-16', 'week-52']);
  });

  it('searches by KW, year, and date fragments', () => {
    expect(filterArchivedChecklists(archiveItems, { query: 'kw 16' }).map((item) => item.id)).toEqual([
      'week-16',
    ]);
    expect(filterArchivedChecklists(archiveItems, { query: '2025' }).map((item) => item.id)).toEqual([
      'week-52',
    ]);
    expect(filterArchivedChecklists(archiveItems, { query: '04-11' }).map((item) => item.id)).toEqual([
      'week-15',
    ]);
  });
});
