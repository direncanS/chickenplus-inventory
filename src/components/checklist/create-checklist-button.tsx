'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { de } from '@/i18n/de';
import { createChecklist } from '@/app/(app)/checklist/actions';
import { toast } from 'sonner';

export function CreateChecklistButton({ week }: { week: number }) {
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setLoading(true);
    const result = await createChecklist();

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(de.checklist.createSuccess);
    }
    setLoading(false);
  }

  return (
    <Button onClick={handleCreate} disabled={loading} size="lg">
      {loading
        ? de.common.loading
        : de.checklist.createForWeek.replace('{week}', String(week))}
    </Button>
  );
}
