'use client';

import { de } from '@/i18n/de';
import { cn } from '@/lib/utils';

type OrderGenerationStatus = 'idle' | 'pending' | 'running' | 'completed' | 'failed';

interface OrderGenerationStatusBannerProps {
  status?: OrderGenerationStatus | null;
  ordersCreated?: number | null;
  error?: string | null;
}

export function OrderGenerationStatusBanner({
  status,
  ordersCreated = 0,
  error,
}: OrderGenerationStatusBannerProps) {
  const orderCount = ordersCreated ?? 0;

  if (!status || status === 'idle') return null;
  if (status === 'completed' && orderCount <= 0) return null;

  const config = {
    pending: {
      className: 'border-sky-200 bg-sky-50 text-sky-900',
      message: de.checklist.orderGenerationPending,
    },
    running: {
      className: 'border-sky-200 bg-sky-50 text-sky-900',
      message: de.checklist.orderGenerationRunning,
    },
    completed: {
      className: 'border-emerald-200 bg-emerald-50 text-emerald-900',
      message: de.checklist.orderGenerationCompleted.replace('{count}', String(orderCount)),
    },
    failed: {
      className: 'border-destructive/30 bg-destructive/10 text-destructive',
      message: de.checklist.orderGenerationFailed,
    },
  } satisfies Record<Exclude<OrderGenerationStatus, 'idle'>, { className: string; message: string }>;

  const current = config[status];

  return (
    <div className={cn('rounded-md border px-3 py-2 text-sm', current.className)}>
      <p className="font-medium">{current.message}</p>
      {status === 'failed' && error && (
        <p className="mt-1 text-xs opacity-80">{error}</p>
      )}
    </div>
  );
}
