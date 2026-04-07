import 'server-only';

import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import type { Profile } from '@/types/database';

export interface AppViewer {
  user: { id: string; email?: string | null } | null;
  profile: Profile | null;
  isAdmin: boolean;
}

/**
 * Request-scoped viewer lookup used by layout/page loaders.
 * This avoids repeating auth + profile fetches within the same RSC request tree.
 */
export const getAppViewer = cache(async (): Promise<AppViewer> => {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      profile: null,
      isAdmin: false,
    };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .eq('is_active', true)
    .single();

  const typedProfile = (profile ?? null) as Profile | null;

  return {
    user: {
      id: user.id,
      email: user.email,
    },
    profile: typedProfile,
    isAdmin: typedProfile?.role === 'admin',
  };
});

export async function requireAppViewer(): Promise<{
  user: NonNullable<AppViewer['user']>;
  profile: NonNullable<AppViewer['profile']>;
  isAdmin: boolean;
}> {
  const viewer = await getAppViewer();

  if (!viewer.user) {
    redirect('/login');
  }

  if (!viewer.profile) {
    redirect('/deactivated');
  }

  return {
    user: viewer.user,
    profile: viewer.profile,
    isAdmin: viewer.isAdmin,
  };
}
