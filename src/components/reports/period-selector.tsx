'use client';

import { de } from '@/i18n/de';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ReportPeriod } from '@/types/reports';

interface PeriodSelectorProps {
  value: ReportPeriod;
  onChange: (value: ReportPeriod) => void;
}

const periodOptions: { value: ReportPeriod; label: string }[] = [
  { value: '4weeks', label: de.reports.last4Weeks },
  { value: '1month', label: de.reports.lastMonth },
  { value: '3months', label: de.reports.last3Months },
];

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-muted-foreground">{de.reports.period}:</span>
      <Select value={value} onValueChange={(v) => onChange(v as ReportPeriod)}>
        <SelectTrigger className="min-w-[13rem]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {periodOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
