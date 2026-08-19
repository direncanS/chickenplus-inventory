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
  PlayCircle,
  RefreshCw,
  ShoppingCart,
  Sparkles,
  Truck,
} from 'lucide-react';
import { CorrectChecklistWeekButton } from '@/components/checklist/correct-checklist-week-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { de } from '@/i18n/de';
import { createServerClient } from '@/lib/supabase/server';
import { formatDateTimeVienna, formatWeekRangeGerman, getCurrentWeekRange, getISOWeekAndYear } from '@/lib/utils/date';

type HeroVariant = 'all_done' | 'start_checklist' | 'continue_checklist' | 'pending_suggestions' | 'open_orders' | 'routine_pending';

interface HeroAction {
  variant: HeroVariant;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  count?: number;
}

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const { startDate: currentWeekStart, endDate: currentWeekEnd } = getCurrentWeekRange();
  const currentIsoWeek = getISOWeekAndYear();

  let progress = { checked: 0, total: 0 };
  let missingCount = 0;
  let waitingForOrderCount = 0;

  const [
    { data: currentWeekChecklist },
    { data: previousActiveChecklist },
    { count: openOrdersCount },
    { data: orderStatusBreakdown },
    { count: pendingRoutineCount },
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
    supabase
      .from('routine_order_instances')
      .select('id', { count: 'exact', head: true })
      .eq('iso_year', currentIsoWeek.isoYear)
      .eq('iso_week', currentIsoWeek.isoWeek)
      .eq('status', 'pending')
      .is('order_id', null),
  ]);

  if (currentWeekChecklist) {
    // Single round-trip for all checklist_items aggregates; count flags in JS.
    const { data: items } = await supabase
      .from('checklist_items')
      .select('is_checked, is_missing, is_ordered')
      .eq('checklist_id', currentWeekChecklist.id);

    const rows = items ?? [];
    let checked = 0;
    let missing = 0;
    let waiting = 0;
    for (const row of rows) {
      if (row.is_checked) checked++;
      if (row.is_missing) missing++;
      if (row.is_missing && !row.is_ordered) waiting++;
    }

    progress = { total: rows.length, checked };
    missingCount = missing;
    waitingForOrderCount = waiting;
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

  const orderBreakdown = (orderStatusBreakdown ?? []).reduce<Record<string, number>>((acc, order) => {
    acc[order.status] = (acc[order.status] ?? 0) + 1;
    return acc;
  }, {});

  const weekRangeLabel = currentWeekChecklist?.week_start_date && currentWeekChecklist?.week_end_date
    ? formatWeekRangeGerman(currentWeekChecklist.week_start_date, currentWeekChecklist.week_end_date)
    : formatWeekRangeGerman(currentWeekStart, currentWeekEnd);

  const checklistStatusKey = currentWeekChecklist?.status ?? null;

  // Determine the single most important action right now (priority order)
  const heroAction: HeroAction = (() => {
    if (!currentWeekChecklist) {
      return {
        variant: 'start_checklist',
        title: de.dashboard.heroStartChecklist,
        subtitle: de.dashboard.heroStartChecklistSub,
        cta: de.dashboard.startChecklist,
        href: '/checklist',
      };
    }
    if (currentWeekChecklist.status === 'draft' || currentWeekChecklist.status === 'in_progress') {
      return {
        variant: 'continue_checklist',
        title: de.dashboard.heroContinueChecklist,
        subtitle: de.dashboard.heroContinueChecklistSub
          .replace('{checked}', String(progress.checked))
          .replace('{total}', String(progress.total)),
        cta: de.dashboard.continueChecklist,
        href: '/checklist',
        count: progress.checked,
      };
    }
    // Checklist completed — what's next?
    if (waitingForOrderCount > 0) {
      return {
        variant: 'pending_suggestions',
        title: de.dashboard.heroPendingSuggestions.replace('{count}', String(waitingForOrderCount)),
        subtitle: de.dashboard.heroPendingSuggestionsSub,
        cta: de.orders.title,
        href: '/orders',
        count: waitingForOrderCount,
      };
    }
    if ((openOrdersCount ?? 0) > 0) {
      return {
        variant: 'open_orders',
        title: de.dashboard.heroOpenOrders.replace('{count}', String(openOrdersCount)),
        subtitle: de.dashboard.heroOpenOrdersSub,
        cta: de.orders.title,
        href: '/orders',
        count: openOrdersCount ?? 0,
      };
    }
    if ((pendingRoutineCount ?? 0) > 0) {
      return {
        variant: 'routine_pending',
        title: de.dashboard.heroRoutinePending.replace('{count}', String(pendingRoutineCount)),
        subtitle: de.dashboard.heroRoutinePendingSub.replace('{week}', String(currentIsoWeek.isoWeek)),
        cta: de.routineOrders.manage,
        href: '/orders/routine',
        count: pendingRoutineCount ?? 0,
      };
    }
    return {
      variant: 'all_done',
      title: de.dashboard.heroAllDone,
      subtitle: de.dashboard.heroAllDoneSub,
      cta: de.dashboard.viewChecklist,
      href: '/checklist',
    };
  })();

  const heroStyles: Record<HeroVariant, { bg: string; iconBg: string; icon: typeof ClipboardCheck; accent: string }> = {
    all_done: {
      bg: 'border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-white',
      iconBg: 'bg-emerald-100 text-emerald-700',
      icon: CheckCircle2,
      accent: 'text-emerald-700',
    },
    start_checklist: {
      bg: 'border-primary/30 bg-gradient-to-br from-primary/10 via-white to-white',
      iconBg: 'bg-primary text-primary-foreground',
      icon: PlayCircle,
      accent: 'text-primary',
    },
    continue_checklist: {
      bg: 'border-blue-200/80 bg-gradient-to-br from-blue-50 via-white to-white',
      iconBg: 'bg-blue-500 text-white',
      icon: ClipboardCheck,
      accent: 'text-blue-700',
    },
    pending_suggestions: {
      bg: 'border-amber-300 bg-gradient-to-br from-amber-50 via-white to-white',
      iconBg: 'bg-amber-500 text-white',
      icon: PackageOpen,
      accent: 'text-amber-800',
    },
    open_orders: {
      bg: 'border-primary/30 bg-gradient-to-br from-primary/10 via-white to-white',
      iconBg: 'bg-primary text-primary-foreground',
      icon: ShoppingCart,
      accent: 'text-primary',
    },
    routine_pending: {
      bg: 'border-amber-300 bg-gradient-to-br from-amber-50 via-white to-white',
      iconBg: 'bg-amber-500 text-white',
      icon: RefreshCw,
      accent: 'text-amber-800',
    },
  };
  const heroStyle = heroStyles[heroAction.variant];
  const HeroIcon = heroStyle.icon;

  // Compact KPI strip (smaller than hero, secondary info)
  const kpis = [
    {
      label: de.dashboard.weekProgress,
      value: currentWeekChecklist ? `${progressPercent}%` : '—',
      sub: currentWeekChecklist
        ? `${progress.checked}/${progress.total}`
        : de.dashboard.notStartedYet,
      icon: ClipboardCheck,
      tone: 'neutral' as const,
    },
    {
      label: de.dashboard.waitingForOrder,
      value: currentWeekChecklist ? String(waitingForOrderCount) : '—',
      sub: waitingForOrderCount > 0
        ? `${missingCount} ${de.checklist.missing}`
        : de.dashboard.allCaughtUp,
      icon: PackageOpen,
      tone: waitingForOrderCount > 0 ? 'amber' : 'success' as const,
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
    amber: {
      tile: 'border-amber-200/70 bg-white',
      icon: 'bg-amber-100 text-amber-700',
      value: 'text-amber-700',
    },
    success: {
      tile: 'border-emerald-200/70 bg-white',
      icon: 'bg-emerald-100 text-emerald-700',
      value: 'text-emerald-700',
    },
    neutral: {
      tile: 'border-border/70 bg-white',
      icon: 'bg-muted text-muted-foreground',
      value: 'text-foreground',
    },
  };

  return (
    <div className="space-y-4">
      {/* HERO ACTION CARD — single dominant card showing what to do next */}
      <div className={`rounded-3xl border-2 p-5 shadow-[0_24px_60px_-40px_rgba(38,32,29,0.35)] sm:p-6 ${heroStyle.bg}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-sm ${heroStyle.iconBg}`}>
              <HeroIcon className="h-7 w-7" />
            </span>
            <div className="min-w-0 space-y-1">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {de.dashboard.primaryAction}
              </p>
              <h2 className={`font-heading text-xl font-semibold tracking-tight sm:text-2xl ${heroStyle.accent}`}>
                {heroAction.title}
              </h2>
              <p className="text-sm text-muted-foreground sm:text-[0.95rem]">
                {heroAction.subtitle}
              </p>
            </div>
          </div>
          {heroAction.variant !== 'all_done' && (
            <Link href={heroAction.href} className="shrink-0">
              <Button size="lg" className="w-full sm:w-auto">
                {heroAction.cta}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          )}
          {heroAction.variant === 'all_done' && (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              <Sparkles className="h-3.5 w-3.5" />
              {de.dashboard.allCaughtUp}
            </span>
          )}
        </div>
      </div>

      {/* Compact KPI strip — secondary info, smaller weight than hero */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const tone = toneClasses[kpi.tone];
          return (
            <div
              key={kpi.label}
              className={`flex items-center gap-3 rounded-2xl border p-3 ${tone.tile}`}
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone.icon}`}>
                <kpi.icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {kpi.label}
                </p>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-xl font-semibold tabular-nums tracking-tight ${tone.value}`}>
                    {kpi.value}
                  </span>
                  <span className="truncate text-[0.7rem] text-muted-foreground">{kpi.sub}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.55fr_0.95fr]">
        {/* Wochenkontrolle detail card */}
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

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    Aktualisiert:{' '}
                    <span className="font-medium text-foreground tabular-nums">
                      {formatDateTimeVienna(currentWeekChecklist.updated_at)}
                    </span>
                  </span>
                  {missingCount > 0 ? (
                    <span className="inline-flex items-center gap-1 text-amber-700">
                      <PackageOpen className="h-3.5 w-3.5" />
                      {de.dashboard.missingProducts.replace('{count}', String(missingCount))}
                      {waitingForOrderCount > 0 && waitingForOrderCount !== missingCount && (
                        <span className="text-muted-foreground">
                          ({waitingForOrderCount} {de.dashboard.waitingForOrder.toLowerCase()})
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
                    <Button variant={heroAction.variant === 'continue_checklist' ? 'default' : 'outline'}>
                      {currentWeekChecklist.status === 'draft'
                        ? de.dashboard.startChecklist
                        : currentWeekChecklist.status === 'in_progress'
                          ? de.dashboard.continueChecklist
                          : de.dashboard.viewChecklist}
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                  {currentWeekChecklist.status === 'completed' && (
                    <Button
                      variant="outline"
                      render={<a href={`/api/export/${currentWeekChecklist.id}`} download />}
                    >
                      <FileSpreadsheet className="mr-1 h-4 w-4" />
                      {de.dashboard.exportExcel}
                    </Button>
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

        {/* Right column: status breakdown + quick actions */}
        <div className="grid gap-4">
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
              {(openOrdersCount ?? 0) > 0 || waitingForOrderCount > 0 ? (
                <div className="space-y-2.5">
                  {waitingForOrderCount > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-amber-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          {de.dashboard.waitingForOrder}
                        </span>
                        <span className="font-semibold tabular-nums">{waitingForOrderCount}</span>
                      </div>
                    </div>
                  )}
                  {[
                    { key: 'draft', label: de.orders.statusDraft, color: 'bg-amber-500' },
                    { key: 'ordered', label: de.orders.statusOrdered, color: 'bg-blue-500' },
                    { key: 'partially_delivered', label: de.orders.statusPartiallyDelivered, color: 'bg-purple-500' },
                  ].map((row) => {
                    const value = orderBreakdown[row.key] ?? 0;
                    if (value === 0 && (openOrdersCount ?? 0) === 0) return null;
                    return (
                      <div key={row.key} className="space-y-1">
                        <div className="flex items-baseline justify-between text-xs">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <span className={`h-1.5 w-1.5 rounded-full ${row.color}`} />
                            {row.label}
                          </span>
                          <span className="font-semibold tabular-nums">{value}</span>
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
