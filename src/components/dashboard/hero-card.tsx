import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  PackageOpen,
  PlayCircle,
  RefreshCw,
  ShoppingCart,
  Sparkles,
} from 'lucide-react';
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

const heroStyles: Record<
  HeroVariant,
  { bg: string; iconBg: string; icon: typeof ClipboardCheck; accent: string }
> = {
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

  const heroStyle = heroStyles[heroAction.variant];
  const HeroIcon = heroStyle.icon;

  return (
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
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            <Sparkles className="h-3.5 w-3.5" />
            {de.dashboard.allCaughtUp}
          </span>
        )}
      </div>
    </div>
  );
}
