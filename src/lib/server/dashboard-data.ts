import 'server-only';

import { cache } from 'react';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWeekRange, getISOWeekAndYear } from '@/lib/utils/date';

/**
 * Request-scoped dashboard data fetchers. Each is wrapped in React `cache()`
 * so multiple async RSC components on the dashboard can share the result
 * without triggering extra round-trips.
 */

export interface DashboardCurrentWeekChecklist {
  id: string;
  iso_year: number;
  iso_week: number;
  checklist_date: string;
  week_start_date: string;
  week_end_date: string;
  status: 'draft' | 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface DashboardPreviousActiveChecklist {
  id: string;
  iso_year: number;
  iso_week: number;
  week_start_date: string;
  week_end_date: string;
  status: 'draft' | 'in_progress' | 'completed';
}

export interface ChecklistAggregates {
  total: number;
  checked: number;
  missing: number;
  waiting: number;
}

export interface OpenOrdersData {
  openCount: number;
  breakdown: Record<string, number>;
}

export const getCurrentWeekChecklist = cache(
  async (): Promise<DashboardCurrentWeekChecklist | null> => {
    const supabase = await createServerClient();
    const { startDate } = getCurrentWeekRange();
    const { data } = await supabase
      .from('checklists')
      .select(
        'id, iso_year, iso_week, checklist_date, week_start_date, week_end_date, status, created_at, updated_at'
      )
      .eq('week_start_date', startDate)
      .maybeSingle();
    return (data ?? null) as DashboardCurrentWeekChecklist | null;
  }
);

export const getPreviousActiveChecklist = cache(
  async (): Promise<DashboardPreviousActiveChecklist | null> => {
    const supabase = await createServerClient();
    const { startDate } = getCurrentWeekRange();
    const { data } = await supabase
      .from('checklists')
      .select('id, iso_year, iso_week, week_start_date, week_end_date, status')
      .neq('week_start_date', startDate)
      .in('status', ['draft', 'in_progress'])
      .order('week_start_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data ?? null) as DashboardPreviousActiveChecklist | null;
  }
);

export const getChecklistAggregates = cache(
  async (checklistId: string): Promise<ChecklistAggregates> => {
    const supabase = await createServerClient();
    const { data: items } = await supabase
      .from('checklist_items')
      .select('is_checked, is_missing, is_ordered')
      .eq('checklist_id', checklistId);

    const rows = items ?? [];
    let checked = 0;
    let missing = 0;
    let waiting = 0;
    for (const row of rows) {
      if (row.is_checked) checked++;
      if (row.is_missing) missing++;
      if (row.is_missing && !row.is_ordered) waiting++;
    }
    return { total: rows.length, checked, missing, waiting };
  }
);

export const getOpenOrdersData = cache(async (): Promise<OpenOrdersData> => {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from('orders')
    .select('status')
    .in('status', ['draft', 'ordered', 'partially_delivered']);

  const rows = data ?? [];
  const breakdown: Record<string, number> = {};
  for (const row of rows) {
    breakdown[row.status] = (breakdown[row.status] ?? 0) + 1;
  }
  return { openCount: rows.length, breakdown };
});

export const getPendingRoutineCount = cache(async (): Promise<number> => {
  const supabase = await createServerClient();
  const { isoYear, isoWeek } = getISOWeekAndYear();
  const { count } = await supabase
    .from('routine_order_instances')
    .select('id', { count: 'exact', head: true })
    .eq('iso_year', isoYear)
    .eq('iso_week', isoWeek)
    .eq('status', 'pending')
    .is('order_id', null);
  return count ?? 0;
});
