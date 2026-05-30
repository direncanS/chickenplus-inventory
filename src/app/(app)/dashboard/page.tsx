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
    <div className="mx-auto max-w-5xl space-y-4">
      <Suspense fallback={<HeroCardSkeleton />}>
        <HeroCard />
      </Suspense>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Suspense fallback={<WochenkontrolleCardSkeleton />}>
          <WochenkontrolleCard />
        </Suspense>

        <QuickActions />
      </div>
    </div>
  );
}
