import { redirect } from 'next/navigation';
import { BrandMark } from '@/components/layout/brand-mark';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createServerClient } from '@/lib/supabase/server';
import { getActiveProfile } from '@/lib/supabase/auth-helpers';
import { de } from '@/i18n/de';
import { DeactivatedLogoutButton } from './logout-button';

export default async function DeactivatedPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const profile = await getActiveProfile(supabase, user.id);

  if (profile) {
    redirect('/dashboard');
  }

  return (
    <Card className="w-full max-w-[30rem]">
      <CardHeader className="space-y-6 text-center">
        <div className="mx-auto lg:hidden">
          <BrandMark compact />
        </div>
        <div className="space-y-2">
          <CardTitle className="text-3xl">{de.auth.accountDeactivated}</CardTitle>
          <CardDescription>{de.auth.accountDeactivatedDescription}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="rounded-2xl border border-border/70 bg-muted/45 px-4 py-4 text-center text-sm leading-6 text-muted-foreground">
          {de.auth.accountDeactivatedHelp}
        </p>
        <DeactivatedLogoutButton />
      </CardContent>
    </Card>
  );
}
