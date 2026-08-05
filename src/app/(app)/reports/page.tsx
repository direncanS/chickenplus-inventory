import { getReportData } from './actions';
import { ReportsContent } from '@/components/reports/reports-content';
import type { ReportData } from '@/types/reports';

function getDefaultDateRange() {
  const now = new Date();
  const endDate = now.toISOString().split('T')[0];
  const start = new Date(now);
  start.setDate(start.getDate() - 28);
  const startDate = start.toISOString().split('T')[0];
  return { startDate, endDate };
}

const emptyData: ReportData = {
  kpis: { totalChecklists: 0, avgMissingProducts: 0, totalOrders: 0, deliveryRate: 0 },
  stockTrend: [],
  orderSummary: [],
  supplierPerformance: [],
  topMissingProducts: [],
  orderedProducts: [],
};

export default async function ReportsPage() {
  const dateRange = getDefaultDateRange();
  const result = await getReportData(dateRange);

  const data = 'error' in result ? emptyData : result.data;

  return (
    <div className="space-y-4">
      {'error' in result && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {result.error}
        </div>
      )}
      <ReportsContent initialData={data} />
    </div>
  );
}
