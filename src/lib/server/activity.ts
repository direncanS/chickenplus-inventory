import 'server-only';

import { cache } from 'react';
import { createServerClient } from '@/lib/supabase/server';

export interface ActivityLogEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown>;
  created_at: string;
  profiles: {
    display_name: string | null;
    role: 'admin' | 'staff';
  } | null;
}

type RawActivityLogEntry = Omit<ActivityLogEntry, 'profiles' | 'details'> & {
  details: unknown;
  profiles:
    | ActivityLogEntry['profiles']
    | Array<NonNullable<ActivityLogEntry['profiles']>>
    | null;
};

function normalizeActivity(row: RawActivityLogEntry): ActivityLogEntry {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] ?? null : row.profiles;
  const details =
    row.details && typeof row.details === 'object' && !Array.isArray(row.details)
      ? (row.details as Record<string, unknown>)
      : {};

  return {
    ...row,
    details,
    profiles: profile,
  };
}

export const getRecentActivity = cache(async (limit = 8): Promise<ActivityLogEntry[]> => {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('audit_log')
    .select(
      `
      id,
      action,
      entity_type,
      entity_id,
      details,
      created_at,
      profiles(display_name, role)
    `
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return ((data ?? []) as unknown as RawActivityLogEntry[]).map(normalizeActivity);
});
