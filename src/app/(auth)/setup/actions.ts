'use server';

import { createServerClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/utils/audit';
import { logger } from '@/lib/utils/logger';
import { de } from '@/i18n/de';

export async function bootstrapAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: de.auth.notLoggedIn };
  }

  try {
    const { data, error } = await supabase.rpc('rpc_bootstrap_admin', {
      p_user_id: user.id,
    });

    if (error) {
      logger.error('Bootstrap admin RPC error', { userId: user.id, error: error.message });
      return { error: de.errors.generic };
    }

    const result = data as { success: boolean; error?: string };

    if (!result.success) {
      return { error: de.auth.setupAlreadyExists };
    }

    await logAudit({
      userId: user.id,
      action: 'admin_bootstrapped',
      entityType: 'profile',
      entityId: user.id,
      details: {},
    });

    logger.info('Admin bootstrapped', { userId: user.id });
    return { success: true };
  } catch (err) {
    logger.error('Bootstrap admin failed', {
      userId: user.id,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    return { error: de.errors.generic };
  }
}
