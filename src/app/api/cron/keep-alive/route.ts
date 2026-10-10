import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Keep-alive cron: runs a trivial query so the Supabase project is not paused
 * after a week of inactivity (which manifests as middleware 504 timeouts).
 * Triggered daily by Vercel Cron; protected by CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from('storage_locations')
      .select('id', { count: 'exact', head: true });

    if (error) {
      logger.error('Keep-alive query failed', { error: error.message });
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    return NextResponse.json({ ok: true, ts: new Date().toISOString() });
  } catch (err) {
    logger.error('Keep-alive exception', {
      error: err instanceof Error ? err.message : 'Unknown',
    });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
