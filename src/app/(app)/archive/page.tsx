import { createServerClient } from '@/lib/supabase/server';
import { de } from '@/i18n/de';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { formatDateTimeVienna, formatWeekRangeGerman, getTodayVienna } from '@/lib/utils/date';

export default async function ArchivePage() {
  const supabase = await createServerClient();
  const today = getTodayVienna();

  const { data: checklists } = await supabase
    .from('checklists')
    .select('id, iso_year, iso_week, checklist_date, week_start_date, week_end_date, status, created_at, updated_at')
    .eq('status', 'completed')
    .lt('week_end_date', today)
    .order('week_start_date', { ascending: false });

  return (
    <div className="space-y-4">
      {(checklists ?? []).length === 0 && (
        <div className="text-center py-8">
          <p className="font-medium mb-1">{de.archive.noCompleted}</p>
          <p className="text-sm text-muted-foreground">{de.archive.noCompletedDescription}</p>
        </div>
      )}

      <div className="grid gap-3">
        {(checklists ?? []).map((cl) => (
          <Card key={cl.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {cl.week_start_date && cl.week_end_date
                    ? `${formatWeekRangeGerman(cl.week_start_date, cl.week_end_date)} - ${de.dashboard.weekLabel} ${cl.iso_week}`
                    : `${de.dashboard.weekLabel} ${cl.iso_week} / ${cl.iso_year}`}
                </CardTitle>
                <Badge variant="outline">{de.checklist.completed}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {de.archive.completedAt}: {formatDateTimeVienna(cl.updated_at)}
                </p>
                <div className="flex gap-2">
                  <Link href={`/archive/${cl.id}`}>
                    <Button variant="outline" size="sm">{de.archive.viewDetails}</Button>
                  </Link>
                  <Link href={`/api/export/${cl.id}`}>
                    <Button variant="outline" size="sm">{de.archive.exportExcel}</Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
