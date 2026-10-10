import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { de } from '@/i18n/de';
import { getISOWeekAndYear } from '@/lib/utils/date';
import {
  getChecklistAggregates,
  getCurrentWeekChecklist,
  getOpenOrdersData,
  getPendingRoutineCount,
} from '@/lib/server/dashboard-data';

type HeroVariant =
  | 'all_done'
  | 'start_checklist'
  | 'continue_checklist'
  | 'pending_suggestions'
  | 'open_orders'
  | 'routine_pending';

interface HeroAction {
  variant: HeroVariant;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
}

export async function HeroCard() {
  const checklist = await getCurrentWeekChecklist();
  const [aggregates, openOrders, pendingRoutineCount] = await Promise.all([
    checklist
      ? getChecklistAggregates(checklist.id)
      : Promise.resolve({ total: 0, checked: 0, missing: 0, waiting: 0 }),
    getOpenOrdersData(),
    getPendingRoutineCount(),
  ]);
  const currentIsoWeek = getISOWeekAndYear();

  const heroAction: HeroAction = (() => {
    if (!checklist) {
      return {
        variant: 'start_checklist',
        title: de.dashboard.heroStartChecklist,
        subtitle: de.dashboard.heroStartChecklistSub,
        cta: de.dashboard.startChecklist,
        href: '/checklist',
      };
    }
    if (checklist.status === 'draft' || checklist.status === 'in_progress') {
      return {
        variant: 'continue_checklist',
        title: de.dashboard.heroContinueChecklist,
        subtitle: de.dashboard.heroContinueChecklistSub
          .replace('{checked}', String(aggregates.checked))
          .replace('{total}', String(aggregates.total)),
        cta: de.dashboard.continueChecklist,
        href: '/checklist',
      };
    }
    if (aggregates.waiting > 0) {
      return {
        variant: 'pending_suggestions',
        title: de.dashboard.heroPendingSuggestions.replace('{count}', String(aggregates.waiting)),
        subtitle: de.dashboard.heroPendingSuggestionsSub,
        cta: de.orders.title,
        href: '/orders',
      };
    }
    if (openOrders.openCount > 0) {
      return {
        variant: 'open_orders',
        title: de.dashboard.heroOpenOrders.replace('{count}', String(openOrders.openCount)),
        subtitle: de.dashboard.heroOpenOrdersSub,
        cta: de.orders.title,
        href: '/orders',
      };
    }
    if (pendingRoutineCount > 0) {
      return {
        variant: 'routine_pending',
        title: de.dashboard.heroRoutinePending.replace('{count}', String(pendingRoutineCount)),
        subtitle: de.dashboard.heroRoutinePendingSub.replace('{week}', String(currentIsoWeek.isoWeek)),
        cta: de.routineOrders.manage,
        href: '/orders/routine',
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

  return (
    <section className="border-b border-foreground/20 pb-8 md:pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <div className="min-w-0 space-y-1">
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-primary">
              {de.dashboard.primaryAction}
            </p>
            <h2 className="max-w-2xl font-heading text-3xl leading-tight font-normal tracking-tight md:text-4xl">
              {heroAction.title}
            </h2>
            <p className="text-sm text-muted-foreground sm:text-[0.95rem]">{heroAction.subtitle}</p>
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
          <span className="inline-flex shrink-0 items-center border-l-2 border-primary pl-3 font-mono text-xs text-muted-foreground">
            {de.dashboard.allCaughtUp}
          </span>
        )}
      </div>
    </section>
  );
}
