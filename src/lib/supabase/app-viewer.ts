import 'server-only';

import { cache } from 'react';
import { headers } from 'next/headers';
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
 *
 * Fast path: middleware has already validated the Supabase session and placed
 * the user id/email into `x-authed-user-id` / `x-authed-user-email` request
 * headers. When present, we skip `supabase.auth.getUser()` (which otherwise
 * hits the Supabase Auth endpoint a second time) and fetch the profile only.
 *
 * Fallback path: for contexts where middleware didn't run (e.g. API routes
 * excluded from the matcher), we do the full auth + profile lookup.
 *
 * Wrapped in React `cache()` so multiple calls in a single RSC render tree
 * reuse the same promise.
 */
export const getAppViewer = cache(async (): Promise<AppViewer> => {
  const headerList = await headers();
  const authedUserId = headerList.get('x-authed-user-id');
  const authedUserEmail = headerList.get('x-authed-user-email');

  const supabase = await createServerClient();

  let userId: string | null = authedUserId;
  let userEmail: string | null = authedUserEmail;

  if (!userId) {
    // No middleware-provided identity → fall back to full auth check.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { user: null, profile: null, isAdmin: false };
    }
    userId = user.id;
    userEmail = user.email ?? null;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .eq('is_active', true)
    .single();

  const typedProfile = (profile ?? null) as Profile | null;

  return {
    user: {
      id: userId,
      email: userEmail,
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
