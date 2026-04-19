'use client';

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
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="flex items-center gap-3 rounded-2xl border border-border/70 bg-white/85 p-3"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <card.icon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {card.label}
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-semibold tabular-nums tracking-tight">
                {card.format(card.value)}
              </span>
              {card.sublabel && (
                <span className="truncate text-[0.7rem] text-muted-foreground">{card.sublabel}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
