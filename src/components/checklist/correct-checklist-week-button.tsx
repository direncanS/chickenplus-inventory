'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { correctChecklistWeek } from '@/app/(app)/checklist/actions';
import { Button } from '@/components/ui/button';
import { de } from '@/i18n/de';

interface CorrectChecklistWeekButtonProps {
  sourceChecklistId: string;
  targetWeekStart: string;
  targetWeekEnd: string;
  variant?: 'default' | 'outline';
  className?: string;
}

export function CorrectChecklistWeekButton({
  sourceChecklistId,
  targetWeekStart,
  targetWeekEnd,
  variant = 'outline',
  className,
}: CorrectChecklistWeekButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await correctChecklistWeek({
        sourceChecklistId,
        targetWeekStart,
        targetWeekEnd,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(de.checklist.correctionSuccess);
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      className={className}
      disabled={isPending}
      onClick={handleClick}
    >
      {isPending ? de.common.loading : de.checklist.correctToCurrentWeek}
    </Button>
  );
}
