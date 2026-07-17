'use client';

import { ChartContainer } from './chart-container';
import { de } from '@/i18n/de';
import { formatDateTimeVienna } from '@/lib/utils/date';
import type { OrderedProductRecord } from '@/types/reports';

interface OrderedProductsTableProps {
  data: OrderedProductRecord[];
}

function formatOrderedQuantity(quantity: number | null, unit: string | null) {
  if (quantity == null) return '—';
  return unit ? `${quantity} ${unit}` : String(quantity);
}

export function OrderedProductsTable({ data }: OrderedProductsTableProps) {
  return (
    <ChartContainer title={de.reports.orderedProducts} isEmpty={data.length === 0}>
      <div className="overflow-x-auto rounded-[24px] border border-border/70 bg-white/70 p-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="py-3 pr-3 text-left font-medium">{de.reports.orderedAt}</th>
              <th className="py-3 pr-3 text-left font-medium">{de.reports.week}</th>
              <th className="py-3 pr-3 text-left font-medium">{de.reports.supplier}</th>
              <th className="py-3 pr-3 text-left font-medium">{de.reports.product}</th>
              <th className="py-3 text-right font-medium">{de.reports.orderedQuantity}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={`${item.source}:${item.recordId}`} className="border-b border-border/60 last:border-0">
                <td className="py-3 pr-3 whitespace-nowrap">{formatDateTimeVienna(item.orderedAt)}</td>
                <td className="py-3 pr-3 whitespace-nowrap">{`KW ${item.isoWeek}/${item.isoYear}`}</td>
                <td className="py-3 pr-3">{item.supplierName}</td>
                <td className="py-3 pr-3">{item.productName}</td>
                <td className="py-3 text-right font-mono">
                  {formatOrderedQuantity(item.orderedQuantity, item.unit)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartContainer>
  );
}
