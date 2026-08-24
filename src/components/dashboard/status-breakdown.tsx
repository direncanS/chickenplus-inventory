import Link from 'next/link';
import { ArrowRight, CheckCircle2, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { de } from '@/i18n/de';
import {
  getChecklistAggregates,
  getCurrentWeekChecklist,
  getOpenOrdersData,
} from '@/lib/server/dashboard-data';

export async function StatusBreakdown() {
  const checklist = await getCurrentWeekChecklist();
  const [aggregates, openOrders] = await Promise.all([
    checklist
      ? getChecklistAggregates(checklist.id)
      : Promise.resolve({ total: 0, checked: 0, missing: 0, waiting: 0 }),
    getOpenOrdersData(),
  ]);

  return (
    <Card size="sm">
      <CardHeader className="gap-1">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShoppingCart className="h-4 w-4" />
          </span>
          {de.dashboard.statusBreakdown}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {openOrders.openCount > 0 || aggregates.waiting > 0 ? (
          <div className="space-y-2.5">
            {aggregates.waiting > 0 && (
              <div className="space-y-1">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-amber-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    {de.dashboard.waitingForOrder}
                  </span>
                  <span className="font-semibold tabular-nums">{aggregates.waiting}</span>
                </div>
              </div>
            )}
            {[
              { key: 'draft', label: de.orders.statusDraft, color: 'bg-amber-500' },
              { key: 'ordered', label: de.orders.statusOrdered, color: 'bg-blue-500' },
              { key: 'partially_delivered', label: de.orders.statusPartiallyDelivered, color: 'bg-purple-500' },
            ].map((row) => {
              const value = openOrders.breakdown[row.key] ?? 0;
              if (value === 0 && openOrders.openCount === 0) return null;
              return (
                <div key={row.key} className="space-y-1">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span className={`h-1.5 w-1.5 rounded-full ${row.color}`} />
                      {row.label}
                    </span>
                    <span className="font-semibold tabular-nums">{value}</span>
                  </div>
                </div>
              );
            })}
            <Link href="/orders" className="block pt-2">
              <Button variant="outline" className="w-full" size="sm">
                {de.orders.title}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-3 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            <p className="text-sm font-medium">{de.dashboard.allCaughtUp}</p>
            <Link href="/orders">
              <Button variant="outline" size="sm">
                {de.orders.title}
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
