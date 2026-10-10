import { Suspense } from 'react';
import { HeroCard } from '@/components/dashboard/hero-card';
import { WochenkontrolleCard } from '@/components/dashboard/wochenkontrolle-card';
import { QuickActions } from '@/components/dashboard/quick-actions';
import {
  HeroCardSkeleton,
  WochenkontrolleCardSkeleton,
} from '@/components/dashboard/skeletons';

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 md:space-y-12">
      <Suspense fallback={<HeroCardSkeleton />}>
        <HeroCard />
      </Suspense>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-12">
        <Suspense fallback={<WochenkontrolleCardSkeleton />}>
          <WochenkontrolleCard />
        </Suspense>

        <QuickActions />
      </div>
    </div>
  );
}
