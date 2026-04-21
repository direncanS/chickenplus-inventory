import { Suspense } from 'react';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import { requireAppViewer } from '@/lib/supabase/app-viewer';
import { RoutineSection } from '@/components/orders/routine-section';
import { OrdersSection } from '@/components/orders/orders-section';
import {
  OrdersSectionSkeleton,
  RoutineSectionSkeleton,
} from '@/components/orders/section-skeletons';

export default async function OrdersPage() {
  const supabase = await createServerClient();

  // Only the shell blocks: viewer (auth) + activeChecklist (needed by both sections).
  const [viewer, { data: activeChecklist }] = await Promise.all([
    requireAppViewer(),
    supabase
      .from('checklists')
      .select(`
        id, iso_year, iso_week, status,
        order_generation_status, order_generation_started_at, order_generation_finished_at,
        order_generation_orders_created, order_generation_error
      `)
      .in('status', ['draft', 'in_progress', 'completed'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <div className="space-y-4">
      {viewer.isAdmin && (
        <div className="flex justify-end">
          <Link
            href="/orders/routine"
            className="text-sm text-primary underline underline-offset-4 hover:text-primary/80"
          >
            Routine verwalten
          </Link>
        </div>
      )}

      <Suspense fallback={<RoutineSectionSkeleton />}>
        <RoutineSection activeChecklist={activeChecklist} />
      </Suspense>

      <Suspense fallback={<OrdersSectionSkeleton />}>
        <OrdersSection activeChecklist={activeChecklist} isAdmin={viewer.isAdmin} />
      </Suspense>
    </div>
  );
}
