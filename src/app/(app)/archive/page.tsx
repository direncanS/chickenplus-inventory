import { createServerClient } from '@/lib/supabase/server';
import { de } from '@/i18n/de';
import { PageIntro } from '@/components/layout/page-intro';
import { getTodayVienna } from '@/lib/utils/date';
import { ArchiveBrowser, type ArchiveBrowserChecklist } from '@/components/archive/archive-browser';

export default async function ArchivePage() {
  const supabase = await createServerClient();
  const today = getTodayVienna();

  const { data: checklists } = await supabase
    .from('checklists')
    .select(`
      id, iso_year, iso_week, checklist_date, week_start_date, week_end_date, status, created_at, updated_at,
      checklist_items(id, is_missing)
    `)
    .eq('status', 'completed')
    .lt('week_end_date', today)
    .order('week_start_date', { ascending: false });

  const archiveChecklists: ArchiveBrowserChecklist[] = (checklists ?? []).map((checklist) => {
    const checklistItems = checklist.checklist_items ?? [];

    return {
      id: checklist.id,
      isoYear: checklist.iso_year,
      isoWeek: checklist.iso_week,
      weekStartDate: checklist.week_start_date,
      weekEndDate: checklist.week_end_date,
      status: 'completed',
      updatedAt: checklist.updated_at,
      totalItems: checklistItems.length,
      missingItems: checklistItems.filter((item) => item.is_missing).length,
    };
  });

  return (
    <div className="space-y-4">
      <PageIntro
        eyebrow={de.archive.eyebrow}
        title={de.archive.title}
        description={de.archive.description}
      />

      <ArchiveBrowser checklists={archiveChecklists} />
    </div>
  );
}
