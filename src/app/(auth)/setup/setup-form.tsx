'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { de } from '@/i18n/de';
import { bootstrapAdmin } from './actions';

export function SetupForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSetup() {
    setLoading(true);
    setError('');

    const result = await bootstrapAdmin();

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{de.auth.setupTitle}</CardTitle>
        <CardDescription>{de.auth.setupDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        <Button onClick={handleSetup} className="w-full" disabled={loading}>
          {loading ? de.common.loading : de.auth.setupButton}
        </Button>
      </CardContent>
    </Card>
  );
}
