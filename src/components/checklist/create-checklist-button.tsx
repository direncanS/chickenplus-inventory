'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { de } from '@/i18n/de';
import { createChecklist } from '@/app/(app)/checklist/actions';
import { getISOWeekAndYear, formatDateGerman } from '@/lib/utils/date';
import { toast } from 'sonner';

interface CreateChecklistButtonProps {
  todayDate: string;
  minDate: string;
  maxDate: string;
}

export function CreateChecklistButton({ todayDate, minDate, maxDate }: CreateChecklistButtonProps) {
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayDate);

  const { isoWeek } = getISOWeekAndYear(new Date(selectedDate + 'T12:00:00'));
  const formattedDate = formatDateGerman(selectedDate);

  const buttonText = de.checklist.createForDate
    .replace('{date}', formattedDate)
    .replace('{week}', String(isoWeek));

  async function handleCreate() {
    setLoading(true);
    const result = await createChecklist({ checklistDate: selectedDate });

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
        min={minDate}
        max={maxDate}
        onChange={(e) => setSelectedDate(e.target.value)}
        className="w-auto text-center"
      />
      <Button onClick={handleCreate} disabled={loading} size="lg">
        {loading ? de.common.loading : buttonText}
      </Button>
    </div>
  );
}
