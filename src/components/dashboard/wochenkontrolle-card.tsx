import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  PackageOpen,
} from 'lucide-react';
import { CorrectChecklistWeekButton } from '@/components/checklist/correct-checklist-week-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { de } from '@/i18n/de';
import {
  formatDateTimeVienna,
  formatWeekRangeGerman,
  getCurrentWeekRange,
  getISOWeekAndYear,
} from '@/lib/utils/date';
import {
  getChecklistAggregates,
  getCurrentWeekChecklist,
  getPreviousActiveChecklist,
} from '@/lib/server/dashboard-data';

const statusLabels: Record<string, string> = {
  draft: de.checklist.draft,
  in_progress: de.checklist.inProgress,
  completed: de.checklist.completed,
};

const statusBadgeClass: Record<string, string> = {
  draft: 'border-border text-muted-foreground',
  in_progress: 'border-primary text-primary',
  completed: 'border-border text-foreground',
};

export async function WochenkontrolleCard() {
  const checklist = await getCurrentWeekChecklist();
  const [aggregates, previous] = await Promise.all([
    checklist
      ? getChecklistAggregates(checklist.id)
      : Promise.resolve({ total: 0, checked: 0, missing: 0, waiting: 0 }),
    checklist ? Promise.resolve(null) : getPreviousActiveChecklist(),
  ]);
  const { startDate: currentWeekStart, endDate: currentWeekEnd } = getCurrentWeekRange();
  const currentIsoWeek = getISOWeekAndYear();

  const weekRangeLabel = checklist?.week_start_date && checklist?.week_end_date
    ? formatWeekRangeGerman(checklist.week_start_date, checklist.week_end_date)
    : formatWeekRangeGerman(currentWeekStart, currentWeekEnd);
  const checklistStatusKey = checklist?.status ?? null;
  const displayIsoWeek = checklist?.iso_week ?? currentIsoWeek.isoWeek;
  const progressPercent = aggregates.total > 0 ? Math.round((aggregates.checked / aggregates.total) * 100) : 0;

  return (
    <Card className="overflow-visible border-0 bg-transparent py-0">
      <CardHeader className="gap-2 px-0">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="font-heading text-2xl font-normal">
              {de.dashboard.currentWeekChecklist}
            </CardTitle>
            <CardDescription className="font-mono text-xs">
              {weekRangeLabel} · KW {displayIsoWeek}
            </CardDescription>
            {checklist?.carried_over_at && (
              <span className="inline-flex w-fit items-center rounded-sm border border-primary/30 bg-primary/5 px-2 py-0.5 font-mono text-xs text-primary">
                {de.dashboard.carriedOver}
              </span>
            )}
          </div>
          {checklistStatusKey && (
            <Badge variant="outline" className={statusBadgeClass[checklistStatusKey]}>
              {statusLabels[checklistStatusKey]}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {checklist ? (
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-baseline justify-between text-sm">
                <span className="text-muted-foreground">{de.dashboard.weekProgress}</span>
                <span className="font-semibold tabular-nums">
                  {aggregates.checked}/{aggregates.total}
                  <span className="ml-2 text-muted-foreground">({progressPercent}%)</span>
                </span>
              </div>
              <div className="h-1.5 overflow-hidden bg-muted">
                <div
                  className="h-full bg-primary transition-[width]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>
                Aktualisiert:{' '}
                <span className="font-medium text-foreground tabular-nums">
                  {formatDateTimeVienna(checklist.updated_at)}
                </span>
              </span>
              {aggregates.missing > 0 ? (
                <span className="inline-flex items-center gap-1 text-amber-700">
                  <PackageOpen className="h-3.5 w-3.5" />
                  {de.dashboard.missingProducts.replace('{count}', String(aggregates.missing))}
                  {aggregates.waiting > 0 && aggregates.waiting !== aggregates.missing && (
                    <span className="text-muted-foreground">
                      ({aggregates.waiting} {de.dashboard.waitingForOrder.toLowerCase()})
                    </span>
                  )}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {de.dashboard.noMissingProducts}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Link href="/checklist">
                <Button
                  variant={
                    checklist.status === 'draft' || checklist.status === 'in_progress'
                      ? 'default'
                      : 'outline'
                  }
                >
                  {checklist.status === 'draft'
                    ? de.dashboard.startChecklist
                    : checklist.status === 'in_progress'
                      ? de.dashboard.continueChecklist
                      : de.dashboard.viewChecklist}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
              {checklist.status === 'completed' && (
                <Button variant="outline" nativeButton={false} render={<a href={`/api/export/${checklist.id}`} download />}>
                  <FileSpreadsheet className="mr-1 h-4 w-4" />
                  {de.dashboard.exportExcel}
                </Button>
              )}
            </div>
          </div>
        ) : previous ? (
          <div className="rounded-sm border border-primary/30 bg-primary/5 p-4">
            <p className="mb-1 font-medium">{de.dashboard.previousWeekBlocking}</p>
            <p className="mb-3 text-sm text-muted-foreground">{de.checklist.correctionHint}</p>
            <div className="flex flex-wrap gap-2">
              <Link href="/checklist">
                <Button>{de.dashboard.goToChecklist}</Button>
              </Link>
              <CorrectChecklistWeekButton
                sourceChecklistId={previous.id}
                targetWeekStart={currentWeekStart}
                targetWeekEnd={currentWeekEnd}
              />
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center">
            <p className="mb-1 font-medium">{de.dashboard.noChecklistYet}</p>
            <p className="mb-3 text-sm text-muted-foreground">{de.dashboard.noChecklistYetDescription}</p>
            <Link href="/checklist">
              <Button>{de.dashboard.goToChecklist}</Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
