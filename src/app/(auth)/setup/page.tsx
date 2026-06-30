import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { SetupForm } from './setup-form';

export default async function SetupPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
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
