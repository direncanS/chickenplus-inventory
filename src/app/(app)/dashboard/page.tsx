import { createServerClient } from '@/lib/supabase/server';
import { de } from '@/i18n/de';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { formatDateTimeVienna } from '@/lib/utils/date';

export default async function DashboardPage() {
  const supabase = await createServerClient();

  // Fetch active checklist
  const { data: activeChecklist } = await supabase
    .from('checklists')
    .select('id, iso_year, iso_week, status, created_at, updated_at')
    .in('status', ['draft', 'in_progress'])
    .single();

  // Fetch checklist progress if active
  let progress = { checked: 0, total: 0 };
  if (activeChecklist) {
    const { data: items } = await supabase
      .from('checklist_items')
      .select('is_checked')
      .eq('checklist_id', activeChecklist.id);

    if (items) {
      progress = {
        total: items.length,
        checked: items.filter((i) => i.is_checked).length,
      };
    }
  }

  // Fetch open orders count
  const { count: openOrdersCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .in('status', ['draft', 'ordered', 'partially_delivered']);

  const statusLabels: Record<string, string> = {
    draft: de.checklist.draft,
    in_progress: de.checklist.inProgress,
    completed: de.checklist.completed,
  };

  const statusColors: Record<string, string> = {
    draft: 'secondary',
    in_progress: 'default',
    completed: 'outline',
  };

  return (
    <div className="space-y-6">
      {/* Active Checklist Card */}
      <Card>
        <CardHeader>
          <CardTitle>{de.dashboard.activeChecklist}</CardTitle>
          {activeChecklist && (
            <CardDescription>
              {de.dashboard.weekLabel} {activeChecklist.iso_week} / {activeChecklist.iso_year}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {activeChecklist ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant={statusColors[activeChecklist.status] as 'default' | 'secondary' | 'outline'}>
                  {statusLabels[activeChecklist.status]}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {de.checklist.progress
                    .replace('{checked}', String(progress.checked))
                    .replace('{total}', String(progress.total))}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{
                    width: `${progress.total > 0 ? (progress.checked / progress.total) * 100 : 0}%`,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDateTimeVienna(activeChecklist.updated_at)}
              </p>
              <Link href="/checklist">
                <Button size="sm">
                  {de.checklist.title}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="font-medium mb-1">{de.dashboard.noActiveChecklist}</p>
              <p className="text-sm text-muted-foreground mb-3">{de.dashboard.noActiveChecklistDescription}</p>
              <Link href="/checklist">
                <Button>{de.dashboard.createNew}</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Open Orders Card */}
      <Card>
        <CardHeader>
          <CardTitle>{de.dashboard.openOrders}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-bold">{openOrdersCount ?? 0}</span>
            <Link href="/orders">
              <Button variant="outline" size="sm">
                {de.orders.title}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
