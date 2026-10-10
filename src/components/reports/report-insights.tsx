'use client';

import { de } from '@/i18n/de';
import { cn } from '@/lib/utils';
import { buildReportInsights, type ReportInsightTone } from '@/lib/utils/report-insights';
import type { ReportData } from '@/types/reports';

interface ReportInsightsProps {
  data: ReportData;
}

const toneStyles: Record<ReportInsightTone, string> = {
  success: 'border-border bg-card text-foreground',
  warning: 'border-primary/40 bg-primary/5 text-foreground',
  info: 'border-border bg-muted text-foreground',
};

export function ReportInsights({ data }: ReportInsightsProps) {
  const insights = buildReportInsights(data);

  return (
    <section className="grid gap-3 lg:grid-cols-3">
      {insights.map((insight) => {
        return (
          <article
            key={insight.id}
            className={cn('rounded-sm border p-4', toneStyles[insight.tone])}
          >
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  {translateInsight(insight.titleKey, insight.replacements)}
                </p>
                <p className="mt-1 text-sm leading-5 opacity-80">
                  {translateInsight(insight.descriptionKey, insight.replacements)}
                </p>
              </div>
          </article>
        );
      })}
    </section>
  );
}

function translateInsight(key: keyof typeof de.reports, replacements?: Record<string, string>) {
  let text = String(de.reports[key]);

  for (const [placeholder, value] of Object.entries(replacements ?? {})) {
    text = text.replaceAll(`{${placeholder}}`, value);
  }

  return text;
}
