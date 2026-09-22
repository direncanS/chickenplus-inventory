export interface ArchiveChecklistSummary {
  id: string;
  isoYear: number;
  isoWeek: number;
  weekStartDate: string | null;
  weekEndDate: string | null;
  totalItems: number;
  missingItems: number;
}

export interface ArchiveFilterOptions {
  query?: string;
  year?: number | 'all';
  missingOnly?: boolean;
}

export function getArchiveYears(checklists: ArchiveChecklistSummary[]): number[] {
  return Array.from(new Set(checklists.map((checklist) => checklist.isoYear))).sort(
    (a, b) => b - a
  );
}

export function filterArchivedChecklists<TChecklist extends ArchiveChecklistSummary>(
  checklists: TChecklist[],
  options: ArchiveFilterOptions
): TChecklist[] {
  const normalizedQuery = options.query?.trim().toLowerCase() ?? '';

  return checklists.filter((checklist) => {
    if (options.year && options.year !== 'all' && checklist.isoYear !== options.year) {
      return false;
    }

    if (options.missingOnly && checklist.missingItems === 0) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const searchable = [
      `kw ${checklist.isoWeek}`,
      `kw${checklist.isoWeek}`,
      String(checklist.isoWeek),
      String(checklist.isoYear),
      checklist.weekStartDate ?? '',
      checklist.weekEndDate ?? '',
    ]
      .join(' ')
      .toLowerCase();

    return searchable.includes(normalizedQuery);
  });
}
