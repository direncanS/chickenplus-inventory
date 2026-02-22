import { SupabaseClient } from '@supabase/supabase-js';
import { Profile } from '@/types/database';

/**
 * Get the active profile for the current user.
 * Returns null if user not found or is_active = false.
 */
export async function getActiveProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .eq('is_active', true)
    .single();

  return data as Profile | null;
}

/**
 * Check if the current user is an admin.
 */
export async function isAdmin(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const profile = await getActiveProfile(supabase, userId);
  return profile?.role === 'admin';
}
