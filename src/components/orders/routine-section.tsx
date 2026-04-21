import { createServerClient } from '@/lib/supabase/server';
import { getISOWeekAndYear } from '@/lib/utils/date';
import { WeeklyRoutineDashboard } from '@/components/routine-orders/weekly-routine-dashboard';

interface Props {
  activeChecklist: {
    id: string;
    iso_year: number;
    iso_week: number;
    status: string;
  } | null;
}

export async function RoutineSection({ activeChecklist }: Props) {
  const supabase = await createServerClient();
  const canShowChecklistSuggestions = activeChecklist?.status === 'completed';
  const currentWeek = activeChecklist
    ? { isoYear: activeChecklist.iso_year, isoWeek: activeChecklist.iso_week }
    : getISOWeekAndYear();

  const [{ data: routineInstances }, { count: routineCount }, checklistItemsResult] = await Promise.all([
    supabase
      .from('routine_order_instances')
      .select(`
        id, routine_order_id, checklist_id, order_id, iso_year, iso_week,
        scheduled_date, status, confirmed_by, confirmed_at, notes,
        routine_orders!inner(
          id, supplier_id, day_of_week, is_active,
          suppliers!inner(id, name)
        ),
        routine_order_instance_items(
          id, product_id, default_quantity, adjusted_quantity, is_included,
          products!inner(id, name, unit)
        )
      `)
      .eq('iso_year', currentWeek.isoYear)
      .eq('iso_week', currentWeek.isoWeek)
      .order('scheduled_date'),
    supabase.from('routine_orders').select('*', { count: 'exact', head: true }).eq('is_active', true),
    canShowChecklistSuggestions
      ? supabase
          .from('checklist_items')
          .select('product_id, product_name, is_missing, missing_amount_final')
          .eq('checklist_id', activeChecklist.id)
      : Promise.resolve({
          data: [] as Array<{
            product_id: string;
            product_name: string;
            is_missing: boolean;
            missing_amount_final: number | null;
          }>,
        }),
  ]);

  const checklistItems = checklistItemsResult.data ?? [];

  return (
    <WeeklyRoutineDashboard
      instances={routineInstances ?? []}
      activeChecklist={activeChecklist}
      checklistItems={checklistItems}
      isoYear={currentWeek.isoYear}
      isoWeek={currentWeek.isoWeek}
      hasActiveRoutines={(routineCount ?? 0) > 0}
    />
  );
}
