import { ClipboardCheck, PackageOpen, RefreshCw, ShoppingCart } from 'lucide-react';
import { de } from '@/i18n/de';
import { getISOWeekAndYear } from '@/lib/utils/date';
import {
  getChecklistAggregates,
  getCurrentWeekChecklist,
  getOpenOrdersData,
  getPendingRoutineCount,
} from '@/lib/server/dashboard-data';

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

export async function KpiStrip() {
  const checklist = await getCurrentWeekChecklist();
  const [aggregates, openOrders, pendingRoutineCount] = await Promise.all([
    checklist
      ? getChecklistAggregates(checklist.id)
      : Promise.resolve({ total: 0, checked: 0, missing: 0, waiting: 0 }),
    getOpenOrdersData(),
    getPendingRoutineCount(),
  ]);
  const currentIsoWeek = getISOWeekAndYear();
  const progressPercent = aggregates.total > 0 ? Math.round((aggregates.checked / aggregates.total) * 100) : 0;

  const kpis = [
    {
      label: de.dashboard.weekProgress,
      value: checklist ? `${progressPercent}%` : '—',
      sub: checklist ? `${aggregates.checked}/${aggregates.total}` : de.dashboard.notStartedYet,
      icon: ClipboardCheck,
      tone: 'neutral' as const,
    },
    {
      label: de.dashboard.waitingForOrder,
      value: checklist ? String(aggregates.waiting) : '—',
      sub: aggregates.waiting > 0 ? `${aggregates.missing} ${de.checklist.missing}` : de.dashboard.allCaughtUp,
      icon: PackageOpen,
      tone: (aggregates.waiting > 0 ? 'amber' : 'success') as 'amber' | 'success',
    },
    {
      label: de.dashboard.openOrdersKpi,
      value: String(openOrders.openCount),
      sub:
        openOrders.openCount === 0
          ? de.dashboard.allCaughtUp
          : `${openOrders.breakdown.draft ?? 0} ${de.orders.statusDraft}`,
      icon: ShoppingCart,
      tone: 'neutral' as const,
    },
    {
      label: de.dashboard.routinePendingKpi,
      value: String(pendingRoutineCount),
      sub: pendingRoutineCount === 0 ? de.routineOrders.allResolved : `KW ${currentIsoWeek.isoWeek}`,
      icon: RefreshCw,
      tone: (pendingRoutineCount > 0 ? 'amber' : 'neutral') as 'amber' | 'neutral',
    },
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => {
        const tone = toneClasses[kpi.tone];
        return (
          <div key={kpi.label} className={`flex items-center gap-3 rounded-2xl border p-3 ${tone.tile}`}>
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone.icon}`}>
              <kpi.icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {kpi.label}
              </p>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-xl font-semibold tabular-nums tracking-tight ${tone.value}`}>{kpi.value}</span>
                <span className="truncate text-[0.7rem] text-muted-foreground">{kpi.sub}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
