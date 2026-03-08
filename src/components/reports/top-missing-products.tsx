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
import type { MissingProduct } from '@/types/reports';

interface TopMissingProductsProps {
  data: MissingProduct[];
}

export function TopMissingProducts({ data }: TopMissingProductsProps) {
  const chartData = data.map((p) => ({
    name: p.productName,
    count: p.count,
  }));

  return (
    <ChartContainer title={de.reports.topMissingProducts} isEmpty={data.length === 0}>
      <div className="h-64 w-full" style={{ minHeight: Math.max(data.length * 32, 64) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              type="number"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
              width={120}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value) => [value, de.reports.count]}
            />
            <Bar
              dataKey="count"
              name={de.reports.count}
              fill="hsl(var(--destructive))"
              fillOpacity={0.8}
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  );
}
