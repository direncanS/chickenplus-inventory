'use client';

import { Button } from '@/components/ui/button';
import { de } from '@/i18n/de';
import { AlertTriangle } from 'lucide-react';

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-4">
      <AlertTriangle className="h-12 w-12 text-destructive" />
      <h2 className="text-lg font-semibold">{de.errors.unexpectedError}</h2>
      <p className="text-muted-foreground text-center max-w-md">
        {de.errors.unexpectedErrorDescription}
      </p>
      <Button onClick={reset}>
        {de.errors.retry}
      </Button>
    </div>
  );
}
