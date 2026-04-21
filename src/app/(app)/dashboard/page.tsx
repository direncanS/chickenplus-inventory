import { Suspense } from 'react';
import { HeroCard } from '@/components/dashboard/hero-card';
import { KpiStrip } from '@/components/dashboard/kpi-strip';
import { WochenkontrolleCard } from '@/components/dashboard/wochenkontrolle-card';
import { StatusBreakdown } from '@/components/dashboard/status-breakdown';
import { QuickActions } from '@/components/dashboard/quick-actions';
import {
  HeroCardSkeleton,
  KpiStripSkeleton,
  StatusBreakdownSkeleton,
  WochenkontrolleCardSkeleton,
} from '@/components/dashboard/skeletons';

export default function DashboardPage() {
  return (
    <div className="space-y-4">
      <Suspense fallback={<HeroCardSkeleton />}>
        <HeroCard />
      </Suspense>

      <Suspense fallback={<KpiStripSkeleton />}>
        <KpiStrip />
      </Suspense>

      <div className="grid gap-4 lg:grid-cols-[1.55fr_0.95fr]">
        <Suspense fallback={<WochenkontrolleCardSkeleton />}>
          <WochenkontrolleCard />
        </Suspense>

        <div className="grid gap-4">
          <Suspense fallback={<StatusBreakdownSkeleton />}>
            <StatusBreakdown />
          </Suspense>
          <QuickActions />
        </div>
      </div>
    </div>
  );
}
