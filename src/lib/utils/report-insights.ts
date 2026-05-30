import type { ReportData } from '@/types/reports';

export type ReportInsightTone = 'success' | 'warning' | 'info';

export interface ReportInsight {
  id: string;
  tone: ReportInsightTone;
  titleKey:
    | 'insightNoDataTitle'
    | 'insightMissingUpTitle'
    | 'insightMissingDownTitle'
    | 'insightMissingStableTitle'
    | 'insightDeliveryGoodTitle'
    | 'insightDeliveryNeedsAttentionTitle'
    | 'insightRepeatMissingTitle';
  descriptionKey:
    | 'insightNoDataDescription'
    | 'insightMissingUpDescription'
    | 'insightMissingDownDescription'
    | 'insightMissingStableDescription'
    | 'insightDeliveryGoodDescription'
    | 'insightDeliveryNeedsAttentionDescription'
    | 'insightRepeatMissingDescription';
  replacements?: Record<string, string>;
}

export function buildReportInsights(data: ReportData): ReportInsight[] {
  if (data.kpis.totalChecklists === 0) {
    return [
      {
        id: 'no-data',
        tone: 'info',
        titleKey: 'insightNoDataTitle',
        descriptionKey: 'insightNoDataDescription',
      },
    ];
  }

  const insights: ReportInsight[] = [];
  const trendInsight = buildMissingTrendInsight(data);
  if (trendInsight) insights.push(trendInsight);

  insights.push(buildDeliveryInsight(data));

  const repeatMissingInsight = buildRepeatMissingInsight(data);
  if (repeatMissingInsight) insights.push(repeatMissingInsight);

  return insights.slice(0, 3);
}

function buildMissingTrendInsight(data: ReportData): ReportInsight | null {
  const trend = data.stockTrend;
  if (trend.length < 2) {
    return null;
  }

  const first = trend[0];
  const last = trend[trend.length - 1];
  const diff = last.missingCount - first.missingCount;

  if (diff > 0) {
    return {
      id: 'missing-up',
      tone: 'warning',
      titleKey: 'insightMissingUpTitle',
      descriptionKey: 'insightMissingUpDescription',
      replacements: {
        count: String(diff),
        week: last.weekLabel,
      },
    };
  }

  if (diff < 0) {
    return {
      id: 'missing-down',
      tone: 'success',
      titleKey: 'insightMissingDownTitle',
      descriptionKey: 'insightMissingDownDescription',
      replacements: {
        count: String(Math.abs(diff)),
        week: last.weekLabel,
      },
    };
  }

  return {
    id: 'missing-stable',
    tone: 'info',
    titleKey: 'insightMissingStableTitle',
    descriptionKey: 'insightMissingStableDescription',
    replacements: {
      count: String(last.missingCount),
    },
  };
}

function buildDeliveryInsight(data: ReportData): ReportInsight {
  const hasOrders = data.kpis.totalOrders > 0;
  const isHealthy = hasOrders && data.kpis.deliveryRate >= 90;

  if (isHealthy) {
    return {
      id: 'delivery-good',
      tone: 'success',
      titleKey: 'insightDeliveryGoodTitle',
      descriptionKey: 'insightDeliveryGoodDescription',
      replacements: {
        rate: String(data.kpis.deliveryRate),
      },
    };
  }

  return {
    id: 'delivery-attention',
    tone: hasOrders ? 'warning' : 'info',
    titleKey: 'insightDeliveryNeedsAttentionTitle',
    descriptionKey: 'insightDeliveryNeedsAttentionDescription',
    replacements: {
      rate: String(data.kpis.deliveryRate),
    },
  };
}

function buildRepeatMissingInsight(data: ReportData): ReportInsight | null {
  const topProduct = data.topMissingProducts[0];
  if (!topProduct || topProduct.count < 2) {
    return null;
  }

  return {
    id: 'repeat-missing',
    tone: 'warning',
    titleKey: 'insightRepeatMissingTitle',
    descriptionKey: 'insightRepeatMissingDescription',
    replacements: {
      product: topProduct.productName,
      count: String(topProduct.count),
    },
  };
}
