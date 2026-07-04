import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { getActiveProfile } from '@/lib/supabase/auth-helpers';
import { SetupForm } from './setup-form';

export default async function SetupPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const profile = await getActiveProfile(supabase, user.id);

  if (!profile) {
    redirect('/deactivated');
  }

  // Check if admin already exists
  const { data: adminExists } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .limit(1)
    .single();

  if (adminExists) {
    redirect('/dashboard');
  }

  return <SetupForm />;
}
