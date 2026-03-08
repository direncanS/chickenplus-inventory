'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ChartContainer } from './chart-container';
import { de } from '@/i18n/de';
import type { OrderSummaryPoint } from '@/types/reports';

interface OrderSummaryChartProps {
  data: OrderSummaryPoint[];
}

const STATUS_COLORS = {
  draft: '#9ca3af',     // gray
  ordered: '#3b82f6',   // blue
  delivered: '#22c55e', // green
  cancelled: '#ef4444', // red
};

export function OrderSummaryChart({ data }: OrderSummaryChartProps) {
  return (
    <ChartContainer title={de.reports.orderSummary} isEmpty={data.length === 0}>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="weekLabel"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey="draft" name={de.orders.statusDraft} fill={STATUS_COLORS.draft} radius={[2, 2, 0, 0]} />
            <Bar dataKey="ordered" name={de.orders.statusOrdered} fill={STATUS_COLORS.ordered} radius={[2, 2, 0, 0]} />
            <Bar dataKey="delivered" name={de.orders.statusDelivered} fill={STATUS_COLORS.delivered} radius={[2, 2, 0, 0]} />
            <Bar dataKey="cancelled" name={de.orders.statusCancelled} fill={STATUS_COLORS.cancelled} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  );
}
