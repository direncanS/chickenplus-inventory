import { createClient } from '@supabase/supabase-js';

/**
 * Service role client — ONLY for:
 * - audit_log writes
 * - System-level operations (profile trigger fallback)
 *
 * Never use for normal business mutations.
 * This bypasses RLS entirely.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
