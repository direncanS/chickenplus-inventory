import Link from 'next/link';
import {
  Archive,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  FileSpreadsheet,
  PackageOpen,
  RefreshCw,
  ShoppingCart,
  Truck,
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
    draft: 'bg-amber-100 text-amber-800 border-amber-200',
    in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
    completed: 'bg-green-100 text-green-800 border-green-200',
  };

  const progressPercent = progress.total > 0 ? Math.round((progress.checked / progress.total) * 100) : 0;

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

  const weekRangeLabel = currentWeekChecklist?.week_start_date && currentWeekChecklist?.week_end_date
    ? formatWeekRangeGerman(currentWeekChecklist.week_start_date, currentWeekChecklist.week_end_date)
    : formatWeekRangeGerman(currentWeekStart, currentWeekEnd);

  const checklistStatusKey = currentWeekChecklist?.status ?? null;

  // Hero KPI tiles — top-of-page snapshot (mobile 2-col, desktop 4-col)
  const kpis = [
    {
      label: de.dashboard.weekProgress,
      value: currentWeekChecklist ? `${progressPercent}%` : '—',
      sub: currentWeekChecklist
        ? `${progress.checked}/${progress.total} ${de.checklist.checked.toLowerCase()}`
        : de.dashboard.notStartedYet,
      icon: ClipboardCheck,
      tone: 'primary' as const,
    },
    {
      label: de.dashboard.missingItemsKpi,
      value: currentWeekChecklist ? String(missingCount) : '—',
      sub: missingCount > 0
        ? de.dashboard.missingProducts.replace('{count}', String(missingCount))
        : de.dashboard.noMissingProducts,
      icon: PackageOpen,
      tone: missingCount > 0 ? 'amber' : 'success' as const,
    },
    {
      label: de.dashboard.openOrdersKpi,
      value: String(openOrdersCount ?? 0),
      sub: (openOrdersCount ?? 0) === 0
        ? de.dashboard.allCaughtUp
        : `${orderBreakdown.draft ?? 0} ${de.orders.statusDraft}`,
      icon: ShoppingCart,
      tone: 'neutral' as const,
    },
    {
      label: de.dashboard.routinePendingKpi,
      value: String(pendingRoutineCount ?? 0),
      sub: (pendingRoutineCount ?? 0) === 0
        ? de.routineOrders.allResolved
        : `KW ${currentIsoWeek.isoWeek}`,
      icon: RefreshCw,
      tone: (pendingRoutineCount ?? 0) > 0 ? 'amber' : 'neutral' as const,
    },
  ];

  const toneClasses: Record<string, { tile: string; icon: string; value: string }> = {
    primary: {
      tile: 'border-primary/20 bg-gradient-to-br from-primary/8 via-white to-white',
      icon: 'bg-primary/12 text-primary',
      value: 'text-foreground',
    },
    amber: {
      tile: 'border-amber-200/70 bg-gradient-to-br from-amber-50 via-white to-white',
      icon: 'bg-amber-100 text-amber-700',
      value: 'text-amber-700',
    },
    success: {
      tile: 'border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-white',
      icon: 'bg-emerald-100 text-emerald-700',
      value: 'text-emerald-700',
    },
    neutral: {
      tile: 'border-border/70 bg-white/85',
      icon: 'bg-muted text-muted-foreground',
      value: 'text-foreground',
    },
  };

  return (
    <div className="space-y-5">
      <PageIntro
        eyebrow={`KW ${currentIsoWeek.isoWeek} · ${weekRangeLabel}`}
        title={de.dashboard.title}
        description="Sehen Sie den Fortschritt der aktuellen Woche, offene Bestellungen und die wichtigsten nächsten Schritte für den Betrieb."
      />

      {/* Hero KPI strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const tone = toneClasses[kpi.tone];
          return (
            <div
              key={kpi.label}
              className={`flex flex-col gap-3 rounded-3xl border p-4 shadow-[0_10px_30px_-26px_rgba(38,32,29,0.25)] ${tone.tile}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {kpi.label}
                </span>
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone.icon}`}>
                  <kpi.icon className="h-4 w-4" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-semibold tabular-nums tracking-tight ${tone.value}`}>
                  {kpi.value}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{kpi.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.55fr_0.95fr]">
        {/* Main checklist card */}
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
            {currentWeekChecklist ? (
              <div className="space-y-4">
                {/* Progress bar with inline stats */}
                <div>
                  <div className="mb-2 flex items-baseline justify-between text-sm">
                    <span className="text-muted-foreground">{de.dashboard.weekProgress}</span>
                    <span className="font-semibold tabular-nums">
                      {progress.checked}/{progress.total}
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

                {/* Inline meta */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    {de.checklist.savingInProgress.replace('Änderungen werden ', '')
                      .replace('...', '')}
                    : <span className="font-medium text-foreground tabular-nums">
                      {formatDateTimeVienna(currentWeekChecklist.updated_at)}
                    </span>
                  </span>
                  {missingCount > 0 ? (
                    <span className="inline-flex items-center gap-1 text-amber-700">
                      <PackageOpen className="h-3.5 w-3.5" />
                      {missingCount} {de.checklist.missing}
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
                    <Button>
                      {currentWeekChecklist.status === 'draft'
                        ? de.dashboard.startChecklist
                        : currentWeekChecklist.status === 'in_progress'
                          ? de.dashboard.continueChecklist
                          : de.dashboard.viewChecklist}
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                  {currentWeekChecklist.status === 'completed' && (
                    <Link href={`/api/export/${currentWeekChecklist.id}`}>
                      <Button variant="outline">
                        <FileSpreadsheet className="mr-1 h-4 w-4" />
                        {de.dashboard.exportExcel}
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ) : previousActiveChecklist ? (
              <div className="rounded-2xl border border-amber-200/80 bg-amber-50/90 p-4">
                <p className="mb-1 font-medium">{de.dashboard.previousWeekBlocking}</p>
                <p className="mb-3 text-sm text-muted-foreground">{de.checklist.correctionHint}</p>
                <div className="flex flex-wrap gap-2">
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

        {/* Right column */}
        <div className="grid gap-4">
          {/* Status breakdown card */}
          <Card size="sm">
            <CardHeader className="gap-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ShoppingCart className="h-4 w-4" />
                </span>
                {de.dashboard.statusBreakdown}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(openOrdersCount ?? 0) > 0 ? (
                <div className="space-y-2">
                  {[
                    { key: 'draft', label: de.orders.statusDraft, color: 'bg-amber-500' },
                    { key: 'ordered', label: de.orders.statusOrdered, color: 'bg-blue-500' },
                    { key: 'partially_delivered', label: de.orders.statusPartiallyDelivered, color: 'bg-purple-500' },
                  ].map((row) => {
                    const value = orderBreakdown[row.key] ?? 0;
                    const max = openOrdersCount ?? 1;
                    const widthPercent = max > 0 ? Math.round((value / max) * 100) : 0;
                    return (
                      <div key={row.key} className="space-y-1">
                        <div className="flex items-baseline justify-between text-xs">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <span className={`h-1.5 w-1.5 rounded-full ${row.color}`} />
                            {row.label}
                          </span>
                          <span className="font-semibold tabular-nums">{value}</span>
                        </div>
                        <div className="h-1 overflow-hidden rounded-full bg-muted">
                          <div className={`h-full ${row.color} transition-all`} style={{ width: `${widthPercent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  <Link href="/orders" className="block pt-2">
                    <Button variant="outline" className="w-full" size="sm">
                      {de.orders.title}
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-3 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  <p className="text-sm font-medium">{de.dashboard.allCaughtUp}</p>
                  <Link href="/orders">
                    <Button variant="outline" size="sm">{de.orders.title}</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick actions card */}
          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-base">{de.dashboard.quickActions}</CardTitle>
              <CardDescription>Schneller Zugriff auf die wichtigsten Funktionen.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
                {[
                  { href: '/suppliers', icon: Truck, label: de.nav.suppliers, sub: 'Lieferanten und Produktzuordnung' },
                  { href: '/archive', icon: Archive, label: de.nav.archive, sub: 'Abgeschlossene Wochenkontrollen' },
                  { href: '/reports', icon: BarChart3, label: de.nav.reports, sub: 'Kennzahlen und Liefertrends' },
                  ...(currentWeekChecklist?.status === 'completed'
                    ? [{
                        href: `/api/export/${currentWeekChecklist.id}`,
                        icon: FileSpreadsheet,
                        label: de.dashboard.exportExcel,
                        sub: 'Excel-Export der aktuellen Woche',
                      }]
                    : []),
                ].map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="group flex items-center gap-3 rounded-2xl border border-border/70 bg-white/70 p-3 transition-all hover:border-primary/30 hover:bg-accent/40"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary">
                      <action.icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-tight">{action.label}</p>
                      <p className="truncate text-xs text-muted-foreground">{action.sub}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
