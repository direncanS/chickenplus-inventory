import { createServerClient } from '@/lib/supabase/server';
import { de } from '@/i18n/de';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LogoutButton } from './logout-button';

export default async function SettingsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, role')
    .eq('id', user!.id)
    .single();

  return (
    <div className="space-y-4 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{de.settings.profile}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">{de.auth.email}</span>
            <span className="text-sm">{user!.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">{de.settings.displayName}</span>
            <span className="text-sm">{profile?.display_name ?? '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">{de.settings.role}</span>
            <Badge variant="outline">
              {profile?.role === 'admin' ? de.settings.admin : de.settings.staff}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <LogoutButton />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        {de.settings.version}: 1.0.0
      </p>
    </div>
  );
}
