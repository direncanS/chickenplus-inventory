import { ChecklistView } from '@/components/checklist/checklist-view';
import { CorrectChecklistWeekButton } from '@/components/checklist/correct-checklist-week-button';
import { de } from '@/i18n/de';
import { requireAppViewer } from '@/lib/supabase/app-viewer';
import { createServerClient } from '@/lib/supabase/server';
import { createChecklistForWeek } from '@/lib/utils/checklist-create';
import { formatWeekRangeGerman, getCurrentWeekRange } from '@/lib/utils/date';
import { transformChecklistItems } from '@/lib/utils/transform';

async function fetchChecklistItems(supabase: Awaited<ReturnType<typeof createServerClient>>, checklistId: string) {
  const { data: items } = await supabase
    .from('checklist_items')
    .select(`
      id, checklist_id, product_id, product_name,
      min_stock_snapshot, min_stock_max_snapshot,
      current_stock, missing_amount_calculated, missing_amount_final,
      is_missing_overridden, is_missing, is_checked,
      products!inner(
        sort_order,
        unit,
        storage_locations!inner(name, code, sort_order),
        categories!inner(name, sort_order)
      )
    `)
    .eq('checklist_id', checklistId)
    .order('id');

  return transformChecklistItems(items ?? []);
}

export default async function ChecklistPage() {
  const supabase = await createServerClient();
  const { startDate: currentWeekStart, endDate: currentWeekEnd } = getCurrentWeekRange();

  const [viewer, { data: currentWeekChecklist }] = await Promise.all([
    requireAppViewer(),
    supabase
      .from('checklists')
      .select(`
        id, iso_year, iso_week, checklist_date, week_start_date, week_end_date,
        status, created_by, completed_by, created_at,
        order_generation_status, order_generation_started_at, order_generation_finished_at,
        order_generation_orders_created, order_generation_error
      `)
      .eq('week_start_date', currentWeekStart)
      .maybeSingle(),
  ]);

  if (currentWeekChecklist) {
    const items = await fetchChecklistItems(supabase, currentWeekChecklist.id);

    return (
      <ChecklistView
        checklist={currentWeekChecklist}
        items={items}
        isAdmin={viewer.isAdmin}
      />
    );
  }

  const createResult = await createChecklistForWeek(
    supabase,
    viewer.user.id,
    currentWeekStart,
    currentWeekEnd
  );

  if (createResult.status === 'created' || createResult.status === 'already_exists') {
    const { data: refetchedChecklist } = await supabase
      .from('checklists')
      .select(`
        id, iso_year, iso_week, checklist_date, week_start_date, week_end_date,
        status, created_by, completed_by, created_at,
        order_generation_status, order_generation_started_at, order_generation_finished_at,
        order_generation_orders_created, order_generation_error
      `)
      .eq('week_start_date', currentWeekStart)
      .maybeSingle();

    if (refetchedChecklist) {
      const items = await fetchChecklistItems(supabase, refetchedChecklist.id);

      return (
        <ChecklistView
          checklist={refetchedChecklist}
          items={items}
          isAdmin={viewer.isAdmin}
        />
      );
    }
  }

  if (createResult.status === 'blocked_by_active') {
    const { data: previousActiveChecklist } = await supabase
      .from('checklists')
      .select(`
        id, iso_year, iso_week, checklist_date, week_start_date, week_end_date,
        status, created_by, completed_by, created_at,
        order_generation_status, order_generation_started_at, order_generation_finished_at,
        order_generation_orders_created, order_generation_error
      `)
      .in('status', ['draft', 'in_progress'])
      .order('week_start_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (previousActiveChecklist) {
      const items = await fetchChecklistItems(supabase, previousActiveChecklist.id);
      const previousWeekRange = formatWeekRangeGerman(
        previousActiveChecklist.week_start_date,
        previousActiveChecklist.week_end_date
      );

      return (
        <div className="space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="font-medium text-amber-800">
              {de.checklist.previousWeekIncomplete
                .replace('{week}', String(previousActiveChecklist.iso_week))
                .replace('{range}', previousWeekRange)}
            </p>
            <p className="mt-1 text-sm text-amber-700">
              {de.checklist.previousWeekIncompleteDescription}
            </p>
            <p className="mt-2 text-sm text-amber-700">
              {de.checklist.correctionHint}
            </p>
            <div className="mt-3">
              <CorrectChecklistWeekButton
                sourceChecklistId={previousActiveChecklist.id}
                targetWeekStart={currentWeekStart}
                targetWeekEnd={currentWeekEnd}
              />
            </div>
          </div>
          <ChecklistView
            checklist={previousActiveChecklist}
            items={items}
            isAdmin={viewer.isAdmin}
          />
        </div>
      );
    }
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <p className="font-medium">{de.checklist.autoCreateFailed}</p>
    </div>
  );
}
