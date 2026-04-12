'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { de } from '@/i18n/de';
import { createChecklist } from '@/app/(app)/checklist/actions';
import { getISOWeekAndYear, getWeekRange, formatWeekRangeGerman } from '@/lib/utils/date';
import { toast } from 'sonner';

interface CreateChecklistButtonProps {
  currentWeekStart: string;
}

export function CreateChecklistButton({ currentWeekStart }: CreateChecklistButtonProps) {
  const [loading, setLoading] = useState(false);
  // Default selected date is the Monday of the current week (currentWeekStart + 1)
  const defaultDate = (() => {
    const d = new Date(currentWeekStart + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  })();
  const [selectedDate, setSelectedDate] = useState(defaultDate);

  const { startDate: weekStart, endDate: weekEnd } = getWeekRange(new Date(selectedDate + 'T12:00:00'));
  const monday = new Date(weekStart + 'T12:00:00');
  monday.setDate(monday.getDate() + 1);
  const { isoWeek } = getISOWeekAndYear(monday);
  const weekRangeText = formatWeekRangeGerman(weekStart, weekEnd);

  const buttonText = de.checklist.createForDate
    .replace('{startDate}', weekRangeText.split(' - ')[0])
    .replace('{endDate}', weekRangeText.split(' - ')[1])
    .replace('{week}', String(isoWeek));

  async function handleCreate() {
    setLoading(true);
    const result = await createChecklist({ weekStartDate: weekStart, weekEndDate: weekEnd });

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(de.checklist.createSuccess);
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <label className="text-sm font-medium text-muted-foreground">
        {de.checklist.selectDate}
      </label>
      <Input
        type="date"
        value={selectedDate}
        onChange={(e) => setSelectedDate(e.target.value)}
        className="w-auto text-center"
      />
      <p className="text-sm text-muted-foreground">
        {de.checklist.weekRange
          .replace('{startDate}', weekRangeText.split(' - ')[0])
          .replace('{endDate}', weekRangeText.split(' - ')[1])}
        {' - '}{de.dashboard.weekLabel} {isoWeek}
      </p>
      <Button onClick={handleCreate} disabled={loading} size="lg">
        {loading ? de.common.loading : buttonText}
      </Button>
    </div>
  );
}
