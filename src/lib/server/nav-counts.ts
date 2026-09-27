import 'server-only';

import { unstable_cache } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentWeekRange, getISOWeekAndYear } from '@/lib/utils/date';

export interface NavCounts {
  openOrders: number;
  pendingRoutine: number;
  currentWeek: {
    isoWeek: number;
    isoYear: number;
    progressPercent: number | null;
    status: 'draft' | 'in_progress' | 'completed' | null;
    missingCount: number;
    remainingCount: number;
    orderActionCount: number;
  };
}

type NavCountsSnapshot = Omit<NavCounts, 'currentWeek'> & {
  currentWeek: Omit<NavCounts['currentWeek'], 'isoWeek' | 'isoYear'>;
};

function createEmptyNavCounts(isoWeek: number, isoYear: number): NavCounts {
  return {
    openOrders: 0,
    pendingRoutine: 0,
    currentWeek: {
      isoWeek,
      isoYear,
      progressPercent: null,
      status: null,
      missingCount: 0,
      remainingCount: 0,
      orderActionCount: 0,
    },
  };
}

const getCachedNavCountsSnapshot = unstable_cache(
  async (
    currentWeekStart: string,
    isoYear: number,
    isoWeek: number
  ): Promise<NavCountsSnapshot> => {
    const supabase = createAdminClient();

    const [
      { count: pendingRoutineCount },
      { data: currentWeekChecklist },
      { data: currentWeekItems },
      { data: currentWeekOrders },
    ] = await Promise.all([
      supabase
        .from('routine_order_instances')
        .select('id', { count: 'exact', head: true })
        .eq('iso_year', isoYear)
        .eq('iso_week', isoWeek)
        .eq('status', 'pending')
        .is('order_id', null),
      supabase
        .from('checklists')
        .select('id, status')
        .eq('week_start_date', currentWeekStart)
        .maybeSingle(),
      supabase
        .from('checklist_items')
        .select('product_id, is_checked, is_missing, is_ordered, checklists!inner(week_start_date)')
        .eq('checklists.week_start_date', currentWeekStart),
      supabase
        .from('orders')
        .select(`
          id, status,
          checklists!inner(week_start_date),
          order_items(product_id, is_delivered, is_ordered, ordered_quantity)
        `)
        .eq('checklists.week_start_date', currentWeekStart)
        .in('status', ['draft', 'ordered', 'partially_delivered']),
    ]);

    let progressPercent: number | null = null;
    let missingCount = 0;
    let remainingCount = 0;
    let orderActionCount = 0;
    const checklistStatus = currentWeekChecklist?.status ?? null;

    if (currentWeekChecklist && currentWeekItems) {
      const total = currentWeekItems.length;
      let checked = 0;
      let missing = 0;
      for (const item of currentWeekItems) {
        if (item.is_checked) checked++;
        if (item.is_missing) missing++;
      }
      progressPercent = total > 0 ? Math.round((checked / total) * 100) : 0;
      missingCount = missing;
      remainingCount = Math.max(0, total - checked);
    }

    const actionedOrders = (currentWeekOrders ?? []).filter((order) => {
      if (order.status !== 'draft') return true;
      return (order.order_items ?? []).some(
        (item) => item.is_ordered || item.ordered_quantity !== null || item.is_delivered
      );
    });
    const actionedProductIds = new Set(
      actionedOrders.flatMap((order) => (order.order_items ?? []).map((item) => item.product_id))
    );

    const waitingMissingItems = currentWeekChecklist?.status === 'completed'
      ? (currentWeekItems ?? []).filter(
          (item) => item.is_missing && !item.is_ordered && !actionedProductIds.has(item.product_id)
        ).length
      : 0;

    orderActionCount = actionedOrders.length + waitingMissingItems;

    return {
      openOrders: orderActionCount,
      pendingRoutine: pendingRoutineCount ?? 0,
      currentWeek: {
        progressPercent,
        status: checklistStatus as NavCounts['currentWeek']['status'],
        missingCount,
        remainingCount,
        orderActionCount,
      },
    };
  },
  ['nav-counts-snapshot'],
  { tags: ['nav-counts'], revalidate: 15 }
);

/**
 * Chrome-only navigation hints. A short cache keeps tab switches snappy while
 * the actual pages continue fetching authoritative checklist/order data.
 */
export async function getNavCounts(): Promise<NavCounts> {
  const { startDate: currentWeekStart } = getCurrentWeekRange();
  const { isoWeek, isoYear } = getISOWeekAndYear();

  try {
    const snapshot = await getCachedNavCountsSnapshot(currentWeekStart, isoYear, isoWeek);
    return {
      ...snapshot,
      currentWeek: {
        ...snapshot.currentWeek,
        isoWeek,
        isoYear,
      },
    };
  } catch {
    return createEmptyNavCounts(isoWeek, isoYear);
  }
}
