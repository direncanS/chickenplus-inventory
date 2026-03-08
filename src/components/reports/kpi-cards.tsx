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
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} size="sm">
          <CardContent className="flex items-start gap-3">
            <div className="rounded-md bg-muted p-2">
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">{card.label}</p>
              <p className="text-xl font-semibold">{card.format(card.value)}</p>
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
