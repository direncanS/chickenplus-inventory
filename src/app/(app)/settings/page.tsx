import { de } from '@/i18n/de';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { requireAppViewer } from '@/lib/supabase/app-viewer';
import { LogoutButton } from './logout-button';

export default async function SettingsPage() {
  const { user, profile } = await requireAppViewer();

  return (
    <div className="max-w-3xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{de.settings.profile}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">{de.auth.email}</span>
            <span className="max-w-[14rem] text-right text-sm">{user.email}</span>
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
