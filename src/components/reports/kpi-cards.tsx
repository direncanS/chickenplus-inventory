'use client';

import { de } from '@/i18n/de';
import type { ReportKPIs } from '@/types/reports';

interface KPICardsProps {
  kpis: ReportKPIs;
}

export function KPICards({ kpis }: KPICardsProps) {
  const cards = [
    {
      label: de.reports.totalChecklists,
      value: kpis.totalChecklists,
      format: (v: number) => v.toString(),
    },
    {
      label: de.reports.avgMissingProducts,
      value: kpis.avgMissingProducts,
      format: (v: number) => v.toFixed(1),
      sublabel: de.reports.perChecklist,
    },
    {
      label: de.reports.totalOrders,
      value: kpis.totalOrders,
      format: (v: number) => v.toString(),
    },
    {
      label: de.reports.deliveryRate,
      value: kpis.deliveryRate,
      format: (v: number) => `${v}%`,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="flex items-center gap-3 border-b border-border px-1 py-3"
        >
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">
              {card.label}
            </p>
            <div className="flex flex-wrap items-baseline gap-1.5">
              <span className="text-2xl font-semibold tabular-nums tracking-tight">
                {card.format(card.value)}
              </span>
              {card.sublabel && (
                <span className="text-[0.7rem] text-muted-foreground">{card.sublabel}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
