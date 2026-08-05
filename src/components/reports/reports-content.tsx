'use client';

import { useState, useTransition } from 'react';
import { PeriodSelector } from './period-selector';
import { KPICards } from './kpi-cards';
import { StockTrendChart } from './stock-trend-chart';
import { OrderSummaryChart } from './order-summary-chart';
import { SupplierPerformanceChart } from './supplier-performance';
import { TopMissingProducts } from './top-missing-products';
import { OrderedProductsTable } from './ordered-products-table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { de } from '@/i18n/de';
import { getReportData } from '@/app/(app)/reports/actions';
import type { ReportData, ReportPeriod, ReportDateRange } from '@/types/reports';

interface ReportsContentProps {
  initialData: ReportData;
  initialDateRange?: ReportDateRange;
}

function getDateRange(period: ReportPeriod): ReportDateRange {
  const now = new Date();
  const endDate = now.toISOString().split('T')[0];
  let startDate: string;

  switch (period) {
    case '4weeks': {
      const d = new Date(now);
      d.setDate(d.getDate() - 28);
      startDate = d.toISOString().split('T')[0];
      break;
    }
    case '1month': {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      startDate = d.toISOString().split('T')[0];
      break;
    }
    case '3months': {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      startDate = d.toISOString().split('T')[0];
      break;
    }
    default:
      startDate = endDate;
  }

  return { startDate, endDate };
}

export function ReportsContent({ initialData }: ReportsContentProps) {
  const [data, setData] = useState<ReportData>(initialData);
  const [period, setPeriod] = useState<ReportPeriod>('4weeks');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handlePeriodChange(newPeriod: ReportPeriod) {
    setPeriod(newPeriod);
    setError(null);

    const dateRange = getDateRange(newPeriod);

    startTransition(async () => {
      const result = await getReportData(dateRange);
      if ('error' in result) {
        setError(result.error);
      } else {
        setData(result.data);
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Sticky header: period selector + KPIs always visible */}
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <PeriodSelector value={period} onChange={handlePeriodChange} />
          {isPending && (
            <span className="text-xs text-muted-foreground">{de.common.loading}</span>
          )}
        </div>
        <KPICards kpis={data.kpis} />
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Collapsible detail sections — Verlauf default-open, others collapsed */}
      <div className={isPending ? 'opacity-60 pointer-events-none transition-opacity' : ''}>
        <Accordion
          multiple
          defaultValue={['verlauf']}
          className="surface-subtle divide-y divide-border/40 px-2"
        >
          <AccordionItem value="verlauf">
            <AccordionTrigger className="px-2 py-3">
              <span className="flex w-full items-center gap-2 pr-2">
                <span className="flex-1 text-sm font-semibold sm:text-base">{de.reports.stockTrend} & {de.reports.orderSummary}</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-2 pb-3">
              <div className="grid gap-4 lg:grid-cols-2">
                <StockTrendChart data={data.stockTrend} />
                <OrderSummaryChart data={data.orderSummary} />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="suppliers">
            <AccordionTrigger className="px-2 py-3">
              <span className="flex w-full items-center gap-2 pr-2">
                <span className="flex-1 text-sm font-semibold sm:text-base">{de.reports.supplierPerformance}</span>
                <Badge variant="outline" className="font-mono text-[11px]">
                  {data.supplierPerformance.length}
                </Badge>
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-2 pb-3">
              <SupplierPerformanceChart data={data.supplierPerformance} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="missing">
            <AccordionTrigger className="px-2 py-3">
              <span className="flex w-full items-center gap-2 pr-2">
                <span className="flex-1 text-sm font-semibold sm:text-base">{de.reports.topMissingProducts}</span>
                <Badge variant="outline" className="font-mono text-[11px]">
                  {data.topMissingProducts.length}
                </Badge>
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-2 pb-3">
              <TopMissingProducts data={data.topMissingProducts} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="ordered">
            <AccordionTrigger className="px-2 py-3">
              <span className="flex w-full items-center gap-2 pr-2">
                <span className="flex-1 text-sm font-semibold sm:text-base">{de.reports.orderedProducts}</span>
                <Badge variant="outline" className="font-mono text-[11px]">
                  {data.orderedProducts.length}
                </Badge>
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-2 pb-3">
              <OrderedProductsTable data={data.orderedProducts} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
