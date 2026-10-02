import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const createAdminClientMock = vi.fn();
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => createAdminClientMock() }));
vi.mock('@/lib/utils/logger', () => ({ logger: { error: vi.fn() } }));

const req = (authorization?: string) => new NextRequest('https://example.test/api/cron/keep-alive', {
  headers: authorization ? { authorization } : undefined,
});

beforeEach(() => {
  vi.resetModules();
  createAdminClientMock.mockReset();
  process.env.CRON_SECRET = 'cron-secret';
});

describe('keep-alive cron', () => {
  it('rejects missing and incorrect authorization without using the admin client', async () => {
    const { GET } = await import('@/app/api/cron/keep-alive/route');
    expect((await GET(req())).status).toBe(401);
    expect((await GET(req('Bearer wrong'))).status).toBe(401);
    expect(createAdminClientMock).not.toHaveBeenCalled();
  });

  it('returns ok when the keep-alive query succeeds', async () => {
    createAdminClientMock.mockReturnValue({ from: () => ({ select: vi.fn().mockResolvedValue({ error: null }) }) });
    const { GET } = await import('@/app/api/cron/keep-alive/route');
    const response = await GET(req('Bearer cron-secret'));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true });
  });

  it('returns 500 for a query error or admin client exception', async () => {
    createAdminClientMock.mockReturnValue({ from: () => ({ select: vi.fn().mockResolvedValue({ error: { message: 'database unavailable' } }) }) });
    const { GET } = await import('@/app/api/cron/keep-alive/route');
    expect((await GET(req('Bearer cron-secret'))).status).toBe(500);

    createAdminClientMock.mockImplementation(() => { throw new Error('backend down'); });
    expect((await GET(req('Bearer cron-secret'))).status).toBe(500);
  });
});
