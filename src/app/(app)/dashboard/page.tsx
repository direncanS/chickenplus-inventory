import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CorrectChecklistWeekButton } from '@/components/checklist/correct-checklist-week-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { de } from '@/i18n/de';
import { createServerClient } from '@/lib/supabase/server';
import { formatDateTimeVienna, formatWeekRangeGerman, getCurrentWeekRange } from '@/lib/utils/date';
import { Archive, BarChart3, FileSpreadsheet } from 'lucide-react';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const { startDate: currentWeekStart, endDate: currentWeekEnd } = getCurrentWeekRange();

  let progress = { checked: 0, total: 0 };
  let missingCount = 0;

  const [
    { data: currentWeekChecklist },
    { data: previousActiveChecklist },
    { count: openOrdersCount },
    { data: orderStatusBreakdown },
  ] = await Promise.all([
    supabase
      .from('checklists')
      .select('id, iso_year, iso_week, checklist_date, week_start_date, week_end_date, status, created_at, updated_at')
      .eq('week_start_date', currentWeekStart)
      .maybeSingle(),
    supabase
      .from('checklists')
      .select('id, iso_year, iso_week, week_start_date, week_end_date, status')
      .neq('week_start_date', currentWeekStart)
      .in('status', ['draft', 'in_progress'])
      .order('week_start_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .in('status', ['draft', 'ordered', 'partially_delivered']),
    supabase
      .from('orders')
      .select('status')
      .in('status', ['draft', 'ordered', 'partially_delivered']),
  ]);

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

    progress = {
      total: totalCount ?? 0,
      checked: checkedCount ?? 0,
    };
    missingCount = missingItemsCount ?? 0;
  }

  const statusLabels: Record<string, string> = {
    draft: de.checklist.draft,
    in_progress: de.checklist.inProgress,
    completed: de.checklist.completed,
  };

  const statusBadgeClass: Record<string, string> = {
    draft: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    in_progress: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
    completed: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  };

  const progressPercent = progress.total > 0 ? Math.round((progress.checked / progress.total) * 100) : 0;

  const orderBreakdown = (orderStatusBreakdown ?? []).reduce<Record<string, number>>((acc, order) => {
    acc[order.status] = (acc[order.status] ?? 0) + 1;
    return acc;
  }, {});

  const orderBreakdownParts: string[] = [];
  if (orderBreakdown.draft) orderBreakdownParts.push(`${orderBreakdown.draft} ${de.orders.statusDraft}`);
  if (orderBreakdown.ordered) orderBreakdownParts.push(`${orderBreakdown.ordered} ${de.orders.statusOrdered}`);
  if (orderBreakdown.partially_delivered) {
    orderBreakdownParts.push(`${orderBreakdown.partially_delivered} ${de.orders.statusPartiallyDelivered}`);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{de.dashboard.currentWeekChecklist}</CardTitle>
          {currentWeekChecklist && (
            <CardDescription>
              {currentWeekChecklist.week_start_date && currentWeekChecklist.week_end_date
                ? `${formatWeekRangeGerman(currentWeekChecklist.week_start_date, currentWeekChecklist.week_end_date)} - ${de.dashboard.weekLabel} ${currentWeekChecklist.iso_week}`
                : `${de.dashboard.weekLabel} ${currentWeekChecklist.iso_week} / ${currentWeekChecklist.iso_year}`}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {currentWeekChecklist ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={statusBadgeClass[currentWeekChecklist.status]}>
                  {statusLabels[currentWeekChecklist.status]}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {progressPercent}% ({progress.checked}/{progress.total})
                </span>
              </div>
              <div className="relative w-full">
                <div className="w-full bg-muted rounded-full h-3">
                  <div
                    className="bg-primary h-3 rounded-full transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
              <p className={missingCount > 0 ? 'text-sm font-medium text-amber-700' : 'text-sm font-medium text-green-700'}>
                {missingCount > 0
                  ? de.dashboard.missingProducts.replace('{count}', String(missingCount))
                  : de.dashboard.noMissingProducts}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDateTimeVienna(currentWeekChecklist.updated_at)}
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href="/checklist">
                  <Button size="sm">
                    {currentWeekChecklist.status === 'draft'
                      ? de.dashboard.startChecklist
                      : currentWeekChecklist.status === 'in_progress'
                        ? de.dashboard.continueChecklist
                        : de.dashboard.viewChecklist}
                  </Button>
                </Link>
                {currentWeekChecklist.status === 'completed' && (
                  <Link href={`/api/export/${currentWeekChecklist.id}`}>
                    <Button variant="outline" size="sm">
                      {de.dashboard.exportExcel}
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ) : previousActiveChecklist ? (
            <div className="text-center py-6">
              <p className="font-medium mb-1">{de.dashboard.previousWeekBlocking}</p>
              <p className="text-sm text-muted-foreground mb-3">{de.checklist.correctionHint}</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Link href="/checklist">
                  <Button>{de.dashboard.goToChecklist}</Button>
                </Link>
                <CorrectChecklistWeekButton
                  sourceChecklistId={previousActiveChecklist.id}
                  targetWeekStart={currentWeekStart}
                  targetWeekEnd={currentWeekEnd}
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="font-medium mb-1">{de.dashboard.noChecklistYet}</p>
              <p className="text-sm text-muted-foreground mb-3">{de.dashboard.noChecklistYetDescription}</p>
              <Link href="/checklist">
                <Button>{de.dashboard.goToChecklist}</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{de.dashboard.openOrders}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-3xl font-bold">{openOrdersCount ?? 0}</span>
              {orderBreakdownParts.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {orderBreakdownParts.join(', ')}
                </p>
              )}
            </div>
            <Link href="/orders">
              <Button variant="outline" size="sm">
                {de.orders.title}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{de.dashboard.quickActions}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <Link href="/archive">
              <div className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-muted transition-colors text-center">
                <Archive className="h-6 w-6 text-primary" />
                <span className="text-xs font-medium">{de.nav.archive}</span>
              </div>
            </Link>
            <Link href="/reports">
              <div className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-muted transition-colors text-center">
                <BarChart3 className="h-6 w-6 text-primary" />
                <span className="text-xs font-medium">{de.nav.reports}</span>
              </div>
            </Link>
            {currentWeekChecklist?.status === 'completed' && (
              <Link href={`/api/export/${currentWeekChecklist.id}`}>
                <div className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-muted transition-colors text-center">
                  <FileSpreadsheet className="h-6 w-6 text-primary" />
                  <span className="text-xs font-medium">{de.dashboard.exportExcel}</span>
                </div>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
