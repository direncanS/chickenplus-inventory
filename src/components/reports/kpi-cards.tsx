'use client';

import { Card, CardContent } from '@/components/ui/card';
import { de } from '@/i18n/de';
import { ClipboardCheck, AlertTriangle, ShoppingCart, TruckIcon } from 'lucide-react';
import type { ReportKPIs } from '@/types/reports';

interface KPICardsProps {
  kpis: ReportKPIs;
}

export function KPICards({ kpis }: KPICardsProps) {
  const cards = [
    {
      label: de.reports.totalChecklists,
      value: kpis.totalChecklists,
      icon: ClipboardCheck,
      format: (v: number) => v.toString(),
    },
    {
      label: de.reports.avgMissingProducts,
      value: kpis.avgMissingProducts,
      icon: AlertTriangle,
      format: (v: number) => v.toFixed(1),
      sublabel: de.reports.perChecklist,
    },
    {
      label: de.reports.totalOrders,
      value: kpis.totalOrders,
      icon: ShoppingCart,
      format: (v: number) => v.toString(),
    },
    {
      label: de.reports.deliveryRate,
      value: kpis.deliveryRate,
      icon: TruckIcon,
      format: (v: number) => `${v}%`,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} size="sm">
          <CardContent className="flex items-start gap-3">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <card.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{card.label}</p>
              <p className="text-2xl font-semibold tracking-tight">{card.format(card.value)}</p>
              {card.sublabel && (
                <p className="text-xs text-muted-foreground">{card.sublabel}</p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
