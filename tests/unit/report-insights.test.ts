import { describe, expect, it } from 'vitest';
import { buildReportInsights } from '@/lib/utils/report-insights';
import type { ReportData } from '@/types/reports';

function makeReportData(overrides: Partial<ReportData> = {}): ReportData {
  return {
    kpis: {
      totalChecklists: 2,
      avgMissingProducts: 4,
      totalOrders: 3,
      deliveryRate: 95,
    },
    stockTrend: [
      { weekLabel: 'KW 21', date: '2026-05-17', missingCount: 6, totalItems: 120 },
      { weekLabel: 'KW 22', date: '2026-05-24', missingCount: 2, totalItems: 120 },
    ],
    orderSummary: [],
    supplierPerformance: [],
    topMissingProducts: [{ productName: 'Cola', count: 3 }],
    orderedProducts: [],
    ...overrides,
  };
}

describe('buildReportInsights', () => {
  it('returns a no-data insight when there are no completed checklists', () => {
    const insights = buildReportInsights(
      makeReportData({
        kpis: { totalChecklists: 0, avgMissingProducts: 0, totalOrders: 0, deliveryRate: 0 },
        stockTrend: [],
        topMissingProducts: [],
      })
    );

    expect(insights).toEqual([
      {
        id: 'no-data',
        tone: 'info',
        titleKey: 'insightNoDataTitle',
        descriptionKey: 'insightNoDataDescription',
      },
    ]);
  });

  it('highlights falling missing counts as a positive trend', () => {
    const insights = buildReportInsights(makeReportData());

    expect(insights[0]).toMatchObject({
      id: 'missing-down',
      tone: 'success',
      replacements: { count: '4', week: 'KW 22' },
    });
  });

  it('flags rising missing counts', () => {
    const insights = buildReportInsights(
      makeReportData({
        stockTrend: [
          { weekLabel: 'KW 21', date: '2026-05-17', missingCount: 2, totalItems: 120 },
          { weekLabel: 'KW 22', date: '2026-05-24', missingCount: 7, totalItems: 120 },
        ],
      })
    );

    expect(insights[0]).toMatchObject({
      id: 'missing-up',
      tone: 'warning',
      replacements: { count: '5', week: 'KW 22' },
    });
  });

  it('uses delivery rate to create a delivery insight', () => {
    const healthy = buildReportInsights(makeReportData())[1];
    const attention = buildReportInsights(
      makeReportData({
        kpis: { totalChecklists: 2, avgMissingProducts: 4, totalOrders: 3, deliveryRate: 50 },
      })
    )[1];

    expect(healthy).toMatchObject({ id: 'delivery-good', tone: 'success' });
    expect(attention).toMatchObject({ id: 'delivery-attention', tone: 'warning' });
  });

  it('flags repeated missing products', () => {
    const insights = buildReportInsights(makeReportData());

    expect(insights[2]).toMatchObject({
      id: 'repeat-missing',
      tone: 'warning',
      replacements: { product: 'Cola', count: '3' },
    });
  });
});
