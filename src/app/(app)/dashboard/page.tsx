import Link from 'next/link';
import {
  Archive,
  BarChart3,
  ClipboardCheck,
  FileSpreadsheet,
  ShoppingCart,
  Sparkles,
} from 'lucide-react';
import { CorrectChecklistWeekButton } from '@/components/checklist/correct-checklist-week-button';
import { PageIntro } from '@/components/layout/page-intro';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { de } from '@/i18n/de';
import { createServerClient } from '@/lib/supabase/server';
import { formatDateTimeVienna, formatWeekRangeGerman, getCurrentWeekRange, getISOWeekAndYear } from '@/lib/utils/date';

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const { startDate: currentWeekStart, endDate: currentWeekEnd } = getCurrentWeekRange();

  let progress = { checked: 0, total: 0 };
  let missingCount = 0;

  const [
    { data: currentWeekChecklist },
    { data: previousActiveChecklist },
    { count: openOrdersCount },
    { data: orderStatusBreakdown },
  ] = await Promise.all([
    supabase
      .from('checklists')
      .select('id, iso_year, iso_week, checklist_date, week_start_date, week_end_date, status, created_at, updated_at')
      .eq('week_start_date', currentWeekStart)
      .maybeSingle(),
    supabase
      .from('checklists')
      .select('id, iso_year, iso_week, week_start_date, week_end_date, status')
      .neq('week_start_date', currentWeekStart)
      .in('status', ['draft', 'in_progress'])
      .order('week_start_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .in('status', ['draft', 'ordered', 'partially_delivered']),
    supabase
      .from('orders')
      .select('status')
      .in('status', ['draft', 'ordered', 'partially_delivered']),
  ]);

  if (currentWeekChecklist) {
    const [{ count: totalCount }, { count: checkedCount }, { count: missingItemsCount }] = await Promise.all([
      supabase
        .from('checklist_items')
        .select('id', { count: 'exact', head: true })
        .eq('checklist_id', currentWeekChecklist.id),
      supabase
        .from('checklist_items')
        .select('id', { count: 'exact', head: true })
        .eq('checklist_id', currentWeekChecklist.id)
        .eq('is_checked', true),
      supabase
        .from('checklist_items')
        .select('id', { count: 'exact', head: true })
        .eq('checklist_id', currentWeekChecklist.id)
        .eq('is_missing', true),
    ]);

    progress = {
      total: totalCount ?? 0,
      checked: checkedCount ?? 0,
    };
    missingCount = missingItemsCount ?? 0;
  }

  const statusLabels: Record<string, string> = {
    draft: de.checklist.draft,
    in_progress: de.checklist.inProgress,
    completed: de.checklist.completed,
  };

  const statusBadgeClass: Record<string, string> = {
    draft: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    in_progress: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
    completed: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  };

  const progressPercent = progress.total > 0 ? Math.round((progress.checked / progress.total) * 100) : 0;

  // Pending routine instances for current week
  const currentIsoWeek = getISOWeekAndYear();
  const { count: pendingRoutineCount } = await supabase
    .from('routine_order_instances')
    .select('id', { count: 'exact', head: true })
    .eq('iso_year', currentIsoWeek.isoYear)
    .eq('iso_week', currentIsoWeek.isoWeek)
    .eq('status', 'pending')
    .is('order_id', null);

  const orderBreakdown = (orderStatusBreakdown ?? []).reduce<Record<string, number>>((acc, order) => {
    acc[order.status] = (acc[order.status] ?? 0) + 1;
    return acc;
  }, {});

  const orderBreakdownParts: string[] = [];
  if (orderBreakdown.draft) orderBreakdownParts.push(`${orderBreakdown.draft} ${de.orders.statusDraft}`);
  if (orderBreakdown.ordered) orderBreakdownParts.push(`${orderBreakdown.ordered} ${de.orders.statusOrdered}`);
  if (orderBreakdown.partially_delivered) {
    orderBreakdownParts.push(`${orderBreakdown.partially_delivered} ${de.orders.statusPartiallyDelivered}`);
  }

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Wochenübersicht"
        title={de.dashboard.title}
        description="Sehen Sie den Fortschritt der aktuellen Woche, offene Bestellungen und die wichtigsten nächsten Schritte für den Betrieb."
      />

      <div className="grid gap-4 lg:grid-cols-[1.55fr_0.95fr]">
        <Card className="overflow-visible">
          <CardHeader className="gap-3">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <ClipboardCheck className="h-5 w-5" />
                  </span>
                  {de.dashboard.currentWeekChecklist}
                </CardTitle>
                {currentWeekChecklist && (
                  <CardDescription>
                    {currentWeekChecklist.week_start_date && currentWeekChecklist.week_end_date
                      ? `${formatWeekRangeGerman(currentWeekChecklist.week_start_date, currentWeekChecklist.week_end_date)} - ${de.dashboard.weekLabel} ${currentWeekChecklist.iso_week}`
                      : `${de.dashboard.weekLabel} ${currentWeekChecklist.iso_week} / ${currentWeekChecklist.iso_year}`}
                  </CardDescription>
                )}
              </div>
              {currentWeekChecklist && (
                <div className="hidden h-14 w-14 items-center justify-center rounded-2xl bg-accent/70 text-primary sm:flex">
                  <Sparkles className="h-5 w-5" />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {currentWeekChecklist ? (
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-3xl border border-border/70 bg-muted/35 p-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={statusBadgeClass[currentWeekChecklist.status]}>
                        {statusLabels[currentWeekChecklist.status]}
                      </Badge>
                    </div>
                    <p className="mt-3 text-3xl font-semibold tracking-tight">{progressPercent}%</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {progress.checked}/{progress.total} Positionen geprüft
                    </p>
                  </div>
                  <div className="rounded-3xl border border-border/70 bg-muted/35 p-4">
                    <p className="text-sm font-medium text-muted-foreground">Fehlmengen</p>
                    <p className="mt-3 text-3xl font-semibold tracking-tight text-primary">
                      {missingCount}
                    </p>
                    <p className={missingCount > 0 ? 'mt-1 text-sm text-amber-700' : 'mt-1 text-sm text-green-700'}>
                      {missingCount > 0
                        ? de.dashboard.missingProducts.replace('{count}', String(missingCount))
                        : de.dashboard.noMissingProducts}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-border/70 bg-muted/35 p-4">
                    <p className="text-sm font-medium text-muted-foreground">Letzte Aktivität</p>
                    <p className="mt-3 text-base font-semibold tracking-tight">
                      {formatDateTimeVienna(currentWeekChecklist.updated_at)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Status und Fortschritt zuletzt synchronisiert
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Fortschritt dieser Woche</span>
                    <span>{progress.checked}/{progress.total}</span>
                  </div>
                  <div className="h-4 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary via-primary to-primary/70 transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link href="/checklist">
                    <Button size="lg">
                      {currentWeekChecklist.status === 'draft'
                        ? de.dashboard.startChecklist
                        : currentWeekChecklist.status === 'in_progress'
                          ? de.dashboard.continueChecklist
                          : de.dashboard.viewChecklist}
                    </Button>
                  </Link>
                  {currentWeekChecklist.status === 'completed' && (
                    <Link href={`/api/export/${currentWeekChecklist.id}`}>
                      <Button variant="outline" size="lg">
                        {de.dashboard.exportExcel}
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ) : previousActiveChecklist ? (
              <div className="rounded-[26px] border border-amber-200/80 bg-amber-50/90 p-5 text-center">
                <p className="mb-1 font-medium">{de.dashboard.previousWeekBlocking}</p>
                <p className="mb-4 text-sm text-muted-foreground">{de.checklist.correctionHint}</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Link href="/checklist">
                    <Button>{de.dashboard.goToChecklist}</Button>
                  </Link>
                  <CorrectChecklistWeekButton
                    sourceChecklistId={previousActiveChecklist.id}
                    targetWeekStart={currentWeekStart}
                    targetWeekEnd={currentWeekEnd}
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-[26px] border border-dashed border-border bg-muted/30 p-7 text-center">
                <p className="mb-1 font-medium">{de.dashboard.noChecklistYet}</p>
                <p className="mb-4 text-sm text-muted-foreground">{de.dashboard.noChecklistYetDescription}</p>
                <Link href="/checklist">
                  <Button>{de.dashboard.goToChecklist}</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <ShoppingCart className="h-5 w-5" />
                </span>
                {de.dashboard.openOrders}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-4xl font-semibold tracking-tight">{openOrdersCount ?? 0}</span>
                  {orderBreakdownParts.length > 0 && (
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {orderBreakdownParts.join(', ')}
                    </p>
                  )}
                  {(pendingRoutineCount ?? 0) > 0 && (
                    <p className="mt-1 text-sm text-amber-700">
                      {de.routineOrders.pendingRoutineOrders.replace('{count}', String(pendingRoutineCount))}
                    </p>
                  )}
                </div>
                <Link href="/orders">
                  <Button variant="outline">{de.orders.title}</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>{de.dashboard.quickActions}</CardTitle>
              <CardDescription>Schneller Zugriff auf die wichtigsten Kontroll- und Berichtsfunktionen.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <Link href="/archive" className="rounded-3xl border border-border/70 bg-muted/35 p-4 transition-colors hover:bg-accent/50">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
                      <Archive className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-medium">{de.nav.archive}</p>
                      <p className="text-sm text-muted-foreground">Abgeschlossene Wochenkontrollen</p>
                    </div>
                  </div>
                </Link>
                <Link href="/reports" className="rounded-3xl border border-border/70 bg-muted/35 p-4 transition-colors hover:bg-accent/50">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
                      <BarChart3 className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-medium">{de.nav.reports}</p>
                      <p className="text-sm text-muted-foreground">Kennzahlen und Liefertrends</p>
                    </div>
                  </div>
                </Link>
                {currentWeekChecklist?.status === 'completed' && (
                  <Link href={`/api/export/${currentWeekChecklist.id}`} className="rounded-3xl border border-border/70 bg-muted/35 p-4 transition-colors hover:bg-accent/50">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
                        <FileSpreadsheet className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="font-medium">{de.dashboard.exportExcel}</p>
                        <p className="text-sm text-muted-foreground">Excel-Export der aktuellen Woche</p>
                      </div>
                    </div>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
