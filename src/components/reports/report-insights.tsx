'use client';

import { AlertTriangle, CheckCircle2, Lightbulb } from 'lucide-react';
import { de } from '@/i18n/de';
import { cn } from '@/lib/utils';
import { buildReportInsights, type ReportInsightTone } from '@/lib/utils/report-insights';
import type { ReportData } from '@/types/reports';

interface ReportInsightsProps {
  data: ReportData;
}

const toneStyles: Record<ReportInsightTone, string> = {
  success: 'border-green-200 bg-green-50 text-green-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-950',
  info: 'border-blue-200 bg-blue-50 text-blue-950',
};

const iconStyles: Record<ReportInsightTone, string> = {
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  info: 'bg-blue-100 text-blue-700',
};

const icons = {
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Lightbulb,
};

export function ReportInsights({ data }: ReportInsightsProps) {
  const insights = buildReportInsights(data);

  return (
    <section className="grid gap-3 lg:grid-cols-3">
      {insights.map((insight) => {
        const Icon = icons[insight.tone];
        return (
          <article
            key={insight.id}
            className={cn('rounded-2xl border p-4 shadow-[0_18px_45px_-36px_rgba(38,32,29,0.35)]', toneStyles[insight.tone])}
          >
            <div className="flex gap-3">
              <span
                className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', iconStyles[insight.tone])}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  {translateInsight(insight.titleKey, insight.replacements)}
                </p>
                <p className="mt-1 text-sm leading-5 opacity-80">
                  {translateInsight(insight.descriptionKey, insight.replacements)}
                </p>
              </div>
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
