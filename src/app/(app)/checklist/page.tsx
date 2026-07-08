import { createServerClient } from '@/lib/supabase/server';
import { de } from '@/i18n/de';
import { getTodayVienna, getCurrentMonthRange } from '@/lib/utils/date';
import { CreateChecklistButton } from '@/components/checklist/create-checklist-button';
import { ChecklistView } from '@/components/checklist/checklist-view';
import { requireAppViewer } from '@/lib/supabase/app-viewer';
import { transformChecklistItems } from '@/lib/utils/transform';

export default async function ChecklistPage() {
  const supabase = await createServerClient();
  const todayDate = getTodayVienna();
  const { minDate, maxDate } = getCurrentMonthRange();

  const [viewer, { data: activeChecklist }] = await Promise.all([
    requireAppViewer(),
    supabase
      .from('checklists')
      .select(`
        id, iso_year, iso_week, checklist_date, status, created_by, completed_by, created_at,
        order_generation_status, order_generation_started_at, order_generation_finished_at,
        order_generation_orders_created, order_generation_error
      `)
      .in('status', ['draft', 'in_progress'])
      .maybeSingle(),
  ]);

  const isAdmin = viewer.isAdmin;

  if (!activeChecklist) {
    // Check for latest completed checklist for today
    const { data: completedToday } = await supabase
      .from('checklists')
      .select(`
        id, iso_year, iso_week, checklist_date, status,
        order_generation_status, order_generation_started_at, order_generation_finished_at,
        order_generation_orders_created, order_generation_error
      `)
      .eq('checklist_date', todayDate)
      .eq('status', 'completed')
      .maybeSingle();

    if (completedToday) {
      // Show completed checklist with reopen option (admin only)
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
        .eq('checklist_id', completedToday.id)
        .order('id');

      return (
        <ChecklistView
          checklist={{ ...completedToday, status: 'completed' as const }}
          items={transformChecklistItems(items ?? [])}
          isAdmin={isAdmin}
        />
      );
    }

    // No checklist at all — show create button with date picker
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <p className="font-medium">{de.checklist.noActive}</p>
        <p className="text-sm text-muted-foreground">{de.checklist.noActiveDescription}</p>
        <CreateChecklistButton
          todayDate={todayDate}
          minDate={minDate}
          maxDate={maxDate}
        />
      </div>
    );
  }

  // Fetch checklist items with product details
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
    .eq('checklist_id', activeChecklist.id)
    .order('id');

  return (
    <ChecklistView
      checklist={activeChecklist}
      items={transformChecklistItems(items ?? [])}
      isAdmin={isAdmin}
    />
  );
}
