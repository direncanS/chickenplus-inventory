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
 * Cheap counts only — no item detail. Safe to call from layout.
 */
export async function getNavCounts(): Promise<NavCounts> {
  const supabase = await createServerClient();
  const { startDate: currentWeekStart } = getCurrentWeekRange();
  const { isoWeek, isoYear } = getISOWeekAndYear();

  const [
    { count: openOrdersCount },
    { count: pendingRoutineCount },
    { data: currentWeekChecklist },
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
  ]);

  let progressPercent: number | null = null;
  let missingCount = 0;
  const checklistStatus = currentWeekChecklist?.status ?? null;

  if (currentWeekChecklist) {
    const [{ count: totalCount }, { count: checkedCount }, { count: missingItemsCount }] = await Promise.all([
      supabase
        .from('checklist_items')
        .select('id', { count: 'exact', head: true })
        .eq('checklist_id', currentWeekChecklist.id),
      supabase
        .from('checklist_items')
        .select('id', { count: 'exact', head: true })
        .eq('checklist_id', currentWeekChecklist.id)
        .eq('is_checked', true),
      supabase
        .from('checklist_items')
        .select('id', { count: 'exact', head: true })
        .eq('checklist_id', currentWeekChecklist.id)
        .eq('is_missing', true),
    ]);

    const total = totalCount ?? 0;
    const checked = checkedCount ?? 0;
    progressPercent = total > 0 ? Math.round((checked / total) * 100) : 0;
    missingCount = missingItemsCount ?? 0;
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
