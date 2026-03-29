'use client';

import { useState, useTransition } from 'react';
import { PeriodSelector } from './period-selector';
import { KPICards } from './kpi-cards';
import { StockTrendChart } from './stock-trend-chart';
import { OrderSummaryChart } from './order-summary-chart';
import { SupplierPerformanceChart } from './supplier-performance';
import { TopMissingProducts } from './top-missing-products';
import { OrderedProductsTable } from './ordered-products-table';
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
      <div className="flex items-center justify-between">
        <PeriodSelector value={period} onChange={handlePeriodChange} />
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className={isPending ? 'opacity-60 pointer-events-none transition-opacity' : ''}>
        <div className="space-y-4">
          <KPICards kpis={data.kpis} />

          <div className="grid gap-4 lg:grid-cols-2">
            <StockTrendChart data={data.stockTrend} />
            <OrderSummaryChart data={data.orderSummary} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SupplierPerformanceChart data={data.supplierPerformance} />
            <TopMissingProducts data={data.topMissingProducts} />
          </div>

          <OrderedProductsTable data={data.orderedProducts} />
        </div>
      </div>
    </div>
  );
}
