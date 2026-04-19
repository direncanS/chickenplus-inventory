'use client';

import { ChartContainer } from './chart-container';
import { de } from '@/i18n/de';
import type { SupplierPerformance as SupplierPerformanceType } from '@/types/reports';

interface SupplierPerformanceProps {
  data: SupplierPerformanceType[];
}

export function SupplierPerformanceChart({ data }: SupplierPerformanceProps) {
  return (
    <ChartContainer title={de.reports.supplierPerformance} isEmpty={data.length === 0}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="py-2 text-left font-medium">{de.reports.supplier}</th>
              <th className="py-2 text-right font-medium">{de.reports.orderCount}</th>
              <th className="py-2 text-right font-medium">{de.reports.deliveryRate}</th>
              <th className="py-2 text-right font-medium">{de.reports.avgDeliveryDays}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((s) => {
              const rateClass =
                s.deliveryRate >= 90
                  ? 'text-emerald-700'
                  : s.deliveryRate >= 70
                    ? 'text-amber-700'
                    : 'text-destructive';
              return (
                <tr key={s.supplierId} className="border-b last:border-0">
                  <td className="py-2 font-medium">{s.supplierName}</td>
                  <td className="py-2 text-right tabular-nums">{s.orderCount}</td>
                  <td className={`py-2 text-right font-semibold tabular-nums ${rateClass}`}>
                    {s.deliveryRate}%
                  </td>
                  <td className="py-2 text-right tabular-nums">{s.avgDeliveryDays ?? '–'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ChartContainer>
  );
}
