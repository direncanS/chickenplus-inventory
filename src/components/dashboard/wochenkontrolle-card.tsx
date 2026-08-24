import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
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
  draft: 'bg-amber-100 text-amber-800 border-amber-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
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
  const progressPercent = aggregates.total > 0 ? Math.round((aggregates.checked / aggregates.total) * 100) : 0;

  return (
    <Card className="overflow-visible">
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ClipboardCheck className="h-4 w-4" />
              </span>
              {de.dashboard.currentWeekChecklist}
            </CardTitle>
            <CardDescription>
              {weekRangeLabel} · KW {currentIsoWeek.isoWeek}
            </CardDescription>
          </div>
          {checklistStatusKey && (
            <Badge variant="outline" className={statusBadgeClass[checklistStatusKey]}>
              {statusLabels[checklistStatusKey]}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
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
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary via-primary to-primary/70 transition-all"
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
                <Button variant="outline" render={<a href={`/api/export/${checklist.id}`} download />}>
                  <FileSpreadsheet className="mr-1 h-4 w-4" />
                  {de.dashboard.exportExcel}
                </Button>
              )}
            </div>
          </div>
        ) : previous ? (
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/90 p-4">
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
            <ClipboardList className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
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
