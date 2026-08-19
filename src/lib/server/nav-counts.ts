import { createServerClient } from '@/lib/supabase/server';
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
  };
}

/**
 * Server-side fetch for chrome (sidebar/header) badges and snapshots.
 * One Promise.all round: orders count, routine count, current-week checklist,
 * and the checklist items' check/missing flags joined by week_start_date.
 * Item counts are derived in JS (payload tiny: ~20 bytes × ~150 rows).
 */
export async function getNavCounts(): Promise<NavCounts> {
  const supabase = await createServerClient();
  const { startDate: currentWeekStart } = getCurrentWeekRange();
  const { isoWeek, isoYear } = getISOWeekAndYear();

  const [
    { count: openOrdersCount },
    { count: pendingRoutineCount },
    { data: currentWeekChecklist },
    { data: currentWeekItems },
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .in('status', ['draft', 'ordered', 'partially_delivered']),
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
      .select('is_checked, is_missing, checklists!inner(week_start_date)')
      .eq('checklists.week_start_date', currentWeekStart),
  ]);

  let progressPercent: number | null = null;
  let missingCount = 0;
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
  }

  return {
    openOrders: openOrdersCount ?? 0,
    pendingRoutine: pendingRoutineCount ?? 0,
    currentWeek: {
      isoWeek,
      isoYear,
      progressPercent,
      status: checklistStatus as NavCounts['currentWeek']['status'],
      missingCount,
    },
  };
}
