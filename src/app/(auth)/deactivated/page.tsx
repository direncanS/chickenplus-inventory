import { redirect } from 'next/navigation';
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
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{de.auth.accountDeactivated}</CardTitle>
        <CardDescription>{de.auth.accountDeactivatedDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground text-center">
          {de.auth.accountDeactivatedHelp}
        </p>
        <DeactivatedLogoutButton />
      </CardContent>
    </Card>
  );
}
