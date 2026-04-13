'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BrandMark } from '@/components/layout/brand-mark';
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
    <Card className="w-full max-w-[28rem]">
      <CardHeader className="space-y-6 text-center">
        <div className="mx-auto lg:hidden">
          <BrandMark compact />
        </div>
        <div className="space-y-2">
          <CardTitle className="text-3xl">{de.auth.setupTitle}</CardTitle>
          <CardDescription>{de.auth.setupDescription}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p className="rounded-2xl border border-destructive/15 bg-destructive/8 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}
        <Button onClick={handleSetup} size="lg" className="w-full" disabled={loading}>
          {loading ? de.common.loading : de.auth.setupButton}
        </Button>
      </CardContent>
    </Card>
  );
}
