import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  RefreshCw,
  ShoppingCart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { de } from '@/i18n/de';
import {
  getChecklistAggregates,
  getCurrentWeekChecklist,
  getOpenOrdersData,
  getPendingRoutineCount,
  getPreviousActiveChecklist,
} from '@/lib/server/dashboard-data';
import {
  buildDashboardCommandItems,
  type DashboardCommandItem,
  type DashboardCommandTone,
} from '@/lib/utils/dashboard-command';

const toneClasses: Record<DashboardCommandTone, string> = {
  primary: 'border-primary/25 bg-primary/8 text-primary',
  amber: 'border-amber-200 bg-amber-50 text-amber-900',
  blue: 'border-blue-200 bg-blue-50 text-blue-950',
  green: 'border-emerald-200 bg-emerald-50 text-emerald-950',
  neutral: 'border-border bg-muted/40 text-foreground',
};

const iconByKey: Record<DashboardCommandItem['key'], typeof ClipboardCheck> = {
  previous: AlertTriangle,
  checklist: ClipboardCheck,
  orders: ShoppingCart,
  routine: RefreshCw,
  done: CheckCircle2,
};

function translateCommand(command: DashboardCommandItem) {
  return {
    title: de.dashboard[command.titleKey as keyof typeof de.dashboard] as string,
    description: de.dashboard[command.descriptionKey as keyof typeof de.dashboard] as string,
    cta: de.dashboard[command.ctaKey as keyof typeof de.dashboard] as string,
  };
}

export async function CommandCenter() {
  const [checklist, previous, openOrders, pendingRoutineCount] = await Promise.all([
    getCurrentWeekChecklist(),
    getPreviousActiveChecklist(),
    getOpenOrdersData(),
    getPendingRoutineCount(),
  ]);

  const aggregates = checklist
    ? await getChecklistAggregates(checklist.id)
    : { total: 0, checked: 0, missing: 0, waiting: 0 };

  const commands = buildDashboardCommandItems({
    hasCurrentChecklist: Boolean(checklist),
    checklistStatus: checklist?.status ?? null,
    checkedCount: aggregates.checked,
    totalCount: aggregates.total,
    waitingMissingCount: aggregates.waiting,
    openOrdersCount: openOrders.openCount,
    pendingRoutineCount,
    hasPreviousActiveChecklist: Boolean(previous),
  });

  return (
    <Card className="overflow-visible">
      <CardHeader>
        <CardTitle>{de.dashboard.commandCenterTitle}</CardTitle>
        <CardDescription>{de.dashboard.commandCenterDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 lg:grid-cols-3">
          {commands.slice(0, 3).map((command, index) => {
            const text = translateCommand(command);
            const Icon = iconByKey[command.key];
            const isDone = command.key === 'done';

            return (
              <div
                key={`${command.key}-${index}`}
                className={`rounded-3xl border p-4 ${toneClasses[command.tone]}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/75 shadow-sm">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="rounded-full bg-white/75 px-3 py-1 text-sm font-semibold tabular-nums">
                    {command.metric}
                  </span>
                </div>
                <div className="mt-4 space-y-1">
                  <h3 className="font-heading text-base font-semibold tracking-tight">{text.title}</h3>
                  <p className="text-sm opacity-75">{text.description}</p>
                </div>
                {!isDone && (
                  <Link href={command.href} className="mt-4 inline-flex">
                    <Button variant="outline" size="sm" className="bg-white/80">
                      {text.cta}
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
