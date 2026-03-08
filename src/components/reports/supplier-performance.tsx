'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChartContainer } from './chart-container';
import { de } from '@/i18n/de';
import type { SupplierPerformance as SupplierPerformanceType } from '@/types/reports';

interface SupplierPerformanceProps {
  data: SupplierPerformanceType[];
}

export function SupplierPerformanceChart({ data }: SupplierPerformanceProps) {
  const chartData = data.map((s) => ({
    name: s.supplierName,
    orderCount: s.orderCount,
    deliveryRate: s.deliveryRate,
    avgDays: s.avgDeliveryDays ?? 0,
  }));

  return (
    <ChartContainer title={de.reports.supplierPerformance} isEmpty={data.length === 0}>
      <div className="space-y-4">
        {/* Horizontal bar chart for delivery rate */}
        <div className="h-48 w-full" style={{ minHeight: Math.max(data.length * 40, 48) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                unit="%"
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                width={100}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value) => [`${value}%`, de.reports.deliveryRate]}
              />
              <Bar
                dataKey="deliveryRate"
                name={de.reports.deliveryRate}
                fill="hsl(var(--primary))"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary table */}
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
              {data.map((s) => (
                <tr key={s.supplierId} className="border-b last:border-0">
                  <td className="py-2">{s.supplierName}</td>
                  <td className="py-2 text-right">{s.orderCount}</td>
                  <td className="py-2 text-right">{s.deliveryRate}%</td>
                  <td className="py-2 text-right">{s.avgDeliveryDays ?? '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ChartContainer>
  );
}
