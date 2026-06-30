import { createServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { ChecklistView } from '@/components/checklist/checklist-view';
import { transformChecklistItems } from '@/lib/utils/transform';

export default async function ArchiveDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single();

  const isAdmin = profile?.role === 'admin';

  const { data: checklist } = await supabase
    .from('checklists')
    .select('id, iso_year, iso_week, status')
    .eq('id', id)
    .single();

  if (!checklist) notFound();

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
    .eq('checklist_id', id)
    .order('id');

  return (
    <ChecklistView
      checklist={checklist as { id: string; iso_year: number; iso_week: number; status: 'draft' | 'in_progress' | 'completed' }}
      items={transformChecklistItems(items ?? [])}
      isAdmin={isAdmin}
    />
  );
}
