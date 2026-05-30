'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Archive, Download, Eye, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { de } from '@/i18n/de';
import { formatDateTimeVienna, formatWeekRangeGerman } from '@/lib/utils/date';
import {
  filterArchivedChecklists,
  getArchiveYears,
  type ArchiveChecklistSummary,
} from '@/lib/utils/archive-filters';

export interface ArchiveBrowserChecklist extends ArchiveChecklistSummary {
  status: 'completed';
  updatedAt: string;
}

interface ArchiveBrowserProps {
  checklists: ArchiveBrowserChecklist[];
}

export function ArchiveBrowser({ checklists }: ArchiveBrowserProps) {
  const [query, setQuery] = useState('');
  const [year, setYear] = useState<number | 'all'>('all');
  const [missingOnly, setMissingOnly] = useState(false);

  const years = useMemo(() => getArchiveYears(checklists), [checklists]);
  const filteredChecklists = useMemo(
    () => filterArchivedChecklists(checklists, { query, year, missingOnly }),
    [checklists, missingOnly, query, year]
  );

  const totalMissingItems = checklists.reduce((sum, checklist) => sum + checklist.missingItems, 0);
  const weeksWithMissingItems = checklists.filter((checklist) => checklist.missingItems > 0).length;

  if (checklists.length === 0) {
    return (
      <div className="surface-subtle py-12 text-center">
        <Archive className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
        <p className="mb-1 font-medium">{de.archive.noCompleted}</p>
        <p className="text-sm text-muted-foreground">{de.archive.noCompletedDescription}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <ArchiveStatCard label={de.archive.archivedWeeks} value={String(checklists.length)} />
        <ArchiveStatCard label={de.archive.weeksWithMissingItems} value={String(weeksWithMissingItems)} />
        <ArchiveStatCard label={de.archive.missingItemsTotal} value={String(totalMissingItems)} />
      </div>

      <div className="surface-panel space-y-3 p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={de.archive.searchPlaceholder}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={year === 'all' ? 'default' : 'outline'}
              onClick={() => setYear('all')}
            >
              {de.archive.allYears}
            </Button>
            {years.map((availableYear) => (
              <Button
                key={availableYear}
                type="button"
                size="sm"
                variant={year === availableYear ? 'default' : 'outline'}
                onClick={() => setYear(availableYear)}
              >
                {availableYear}
              </Button>
            ))}
            <Button
              type="button"
              size="sm"
              variant={missingOnly ? 'default' : 'outline'}
              onClick={() => setMissingOnly((current) => !current)}
            >
              {de.archive.onlyWithMissingItems}
            </Button>
          </div>
        </div>

        <p className="text-xs font-medium text-muted-foreground">
          {de.archive.filteredResult
            .replace('{shown}', String(filteredChecklists.length))
            .replace('{total}', String(checklists.length))}
        </p>
      </div>

      {filteredChecklists.length === 0 ? (
        <div className="surface-subtle py-10 text-center">
          <p className="font-medium">{de.archive.noFilterResults}</p>
          <p className="mt-1 text-sm text-muted-foreground">{de.archive.noFilterResultsDescription}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredChecklists.map((checklist) => (
            <Card key={checklist.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">
                      {checklist.weekStartDate && checklist.weekEndDate
                        ? `${formatWeekRangeGerman(checklist.weekStartDate, checklist.weekEndDate)} - ${de.dashboard.weekLabel} ${checklist.isoWeek}`
                        : `${de.dashboard.weekLabel} ${checklist.isoWeek} / ${checklist.isoYear}`}
                    </CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {de.archive.completedAt}: {formatDateTimeVienna(checklist.updatedAt)}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="w-fit border-green-200 bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400"
                  >
                    {de.checklist.completed}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      {de.archive.positionsCount.replace('{count}', String(checklist.totalItems))}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        checklist.missingItems > 0
                          ? 'border-rose-200 bg-rose-50 text-rose-700'
                          : 'border-green-200 bg-green-50 text-green-700'
                      }
                    >
                      {checklist.missingItems > 0
                        ? de.archive.missingCount.replace('{count}', String(checklist.missingItems))
                        : de.archive.noMissingItems}
                    </Badge>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                      render={<Link href={`/archive/${checklist.id}`} />}
                    >
                      <Eye className="h-4 w-4" />
                      {de.archive.viewDetails}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                      render={<a href={`/api/export/${checklist.id}`} download />}
                    >
                      <Download className="h-4 w-4" />
                      {de.archive.exportExcel}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ArchiveStatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-panel p-4">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-heading text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}
