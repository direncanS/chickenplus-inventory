import { createServerClient } from '@/lib/supabase/server';
import { de } from '@/i18n/de';
import { getISOWeekAndYear } from '@/lib/utils/date';
import { CreateChecklistButton } from '@/components/checklist/create-checklist-button';
import { ChecklistView } from '@/components/checklist/checklist-view';
import { transformChecklistItems } from '@/lib/utils/transform';

export default async function ChecklistPage() {
  const supabase = await createServerClient();
  const { isoYear, isoWeek } = getISOWeekAndYear();

  // Fetch active checklist
  const { data: activeChecklist } = await supabase
    .from('checklists')
    .select('id, iso_year, iso_week, status, created_by, completed_by, created_at')
    .in('status', ['draft', 'in_progress'])
    .single();

  // Fetch user profile for role check
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single();

  const isAdmin = profile?.role === 'admin';

  if (!activeChecklist) {
    // Also check for the latest completed checklist for this week
    const { data: completedThisWeek } = await supabase
      .from('checklists')
      .select('id, iso_year, iso_week, status')
      .eq('iso_year', isoYear)
      .eq('iso_week', isoWeek)
      .eq('status', 'completed')
      .single();

    if (completedThisWeek) {
      // Show completed checklist with reopen option (admin only)
      const { data: items } = await supabase
        .from('checklist_items')
        .select(`
          id, checklist_id, product_id, product_name,
          min_stock_snapshot, min_stock_max_snapshot,
          current_stock, missing_amount_calculated, missing_amount_final,
          is_missing_overridden, is_checked,
          products!inner(
            sort_order,
            unit,
            storage_locations!inner(name, code, sort_order),
            categories!inner(name, sort_order)
          )
        `)
        .eq('checklist_id', completedThisWeek.id)
        .order('id');

      return (
        <ChecklistView
          checklist={{ ...completedThisWeek, status: 'completed' as const }}
          items={transformChecklistItems(items ?? [])}
          isAdmin={isAdmin}
        />
      );
    }

    // No checklist at all — show create button
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <p className="font-medium">{de.checklist.noActive}</p>
        <p className="text-sm text-muted-foreground">{de.checklist.noActiveDescription}</p>
        <CreateChecklistButton week={isoWeek} />
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
      is_missing_overridden, is_checked,
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
