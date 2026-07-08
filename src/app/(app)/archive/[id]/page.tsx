import { createServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { ChecklistView } from '@/components/checklist/checklist-view';
import { requireAppViewer } from '@/lib/supabase/app-viewer';
import { transformChecklistItems } from '@/lib/utils/transform';

export default async function ArchiveDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerClient();
  const [viewer, { data: checklist }] = await Promise.all([
    requireAppViewer(),
    supabase
      .from('checklists')
      .select('id, iso_year, iso_week, checklist_date, status')
      .eq('id', id)
      .maybeSingle(),
  ]);

  if (!checklist) notFound();

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
    .eq('checklist_id', id)
    .order('id');

  return (
    <ChecklistView
      checklist={checklist as { id: string; iso_year: number; iso_week: number; checklist_date?: string; status: 'draft' | 'in_progress' | 'completed' }}
      items={transformChecklistItems(items ?? [])}
      isAdmin={viewer.isAdmin}
    />
  );
}
