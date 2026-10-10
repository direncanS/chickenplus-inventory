import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import type { CookieOptions } from '@supabase/ssr';

const getUserMock = vi.fn();
const createServerClientMock = vi.fn();
let latestOptions: { global?: { fetch?: typeof fetch } } | undefined;

vi.mock('@supabase/ssr', () => ({
  createServerClient: (...args: unknown[]) => createServerClientMock(...args),
}));
vi.mock('@/lib/utils/logger', () => ({ logger: { error: vi.fn() } }));

function request(path: string, headers?: HeadersInit) {
  return new NextRequest(`https://example.test${path}`, { headers });
}

beforeEach(() => {
  vi.resetModules();
  getUserMock.mockReset();
  createServerClientMock.mockReset();
  latestOptions = undefined;
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.example.test';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  createServerClientMock.mockImplementation((_url: unknown, _key: unknown, options: {
    global?: { fetch?: typeof fetch };
    cookies: { setAll: (cookies: Array<{ name: string; value: string; options: CookieOptions }>) => void };
  }) => {
    latestOptions = options;
    return {
    auth: {
      getUser: async () => {
        const result = await getUserMock();
        if (result.rotate) {
          options.cookies.setAll([{ name: 'sb-session', value: 'rotated', options: { path: '/' } }]);
        }
        return result.value;
      },
    },
    };
  });
});

describe('updateSession', () => {
  it('serves the public logo while keeping application routes protected', async () => {
    const { config } = await import('../../middleware');
    const matches = (url: string) => unstable_doesMiddlewareMatch({ config, nextConfig: {}, url });
    expect(matches('/logo.png')).toBe(false);
    expect(matches('/_next/image?url=%2Flogo.png&w=48&q=75')).toBe(false);
    for (const path of ['/checklist', '/dashboard', '/suppliers', '/logo.png/private', '/private.png']) {
      expect(matches(path)).toBe(true);
    }
  });

  it('uses verified user identity and strips caller supplied identity headers', async () => {
    getUserMock.mockResolvedValue({ value: { data: { user: { id: 'verified-id', email: 'real@example.test' } }, error: null } });
    const { updateSession } = await import('@/lib/supabase/middleware');
    const result = await updateSession(request('/dashboard', {
      'x-authed-user-id': 'forged-id',
      'x-authed-user-email': 'attacker@example.test',
    }));
    const forwarded = result.supabaseResponse.headers.get('x-middleware-request-x-authed-user-id');
    expect(result.user?.id).toBe('verified-id');
    expect(result.unavailable).toBe(false);
    expect(forwarded).toBe('verified-id');
  });

  it('treats an ordinary invalid session as unauthenticated', async () => {
    getUserMock.mockResolvedValue({ value: { data: { user: null }, error: { status: 401, name: 'AuthApiError' } } });
    const { updateSession } = await import('@/lib/supabase/middleware');
    const result = await updateSession(request('/dashboard'));
    expect(result.user).toBeNull();
    expect(result.unavailable).toBe(false);
  });

  it('does not forward spoofed identity headers for an unauthenticated request', async () => {
    getUserMock.mockResolvedValue({ value: { data: { user: null }, error: { status: 401, name: 'AuthApiError' } } });
    const { updateSession } = await import('@/lib/supabase/middleware');
    const result = await updateSession(request('/dashboard', {
      'x-authed-user-id': 'forged-id',
      'x-authed-user-email': 'attacker@example.test',
    }));
    expect(result.supabaseResponse.headers.get('x-middleware-request-x-authed-user-id')).toBeNull();
    expect(result.supabaseResponse.headers.get('x-middleware-request-x-authed-user-email')).toBeNull();
  });

  it('marks auth backend failures unavailable', async () => {
    getUserMock.mockResolvedValue({ value: { data: { user: null }, error: { status: 503, name: 'AuthApiError' } } });
    const { updateSession } = await import('@/lib/supabase/middleware');
    const result = await updateSession(request('/dashboard'));
    expect(result.unavailable).toBe(true);
  });

  it('aborts and marks a hung auth request unavailable after eight seconds', async () => {
    vi.useFakeTimers();
    let observedSignal: AbortSignal | undefined;
    vi.stubGlobal('fetch', vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      observedSignal = init?.signal ?? undefined;
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      });
    }));
    getUserMock.mockImplementation(() => latestOptions!.global!.fetch!('https://auth.example.test/user'));
    const { updateSession } = await import('@/lib/supabase/middleware');
    const pending = updateSession(request('/dashboard'));
    await vi.advanceTimersByTimeAsync(8000);
    await expect(pending).resolves.toMatchObject({ user: null, unavailable: true });
    expect(observedSignal?.aborted).toBe(true);
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('preserves rotated cookies on redirects and rewrites outages as 503', async () => {
    getUserMock.mockResolvedValueOnce({
      rotate: true,
      value: { data: { user: { id: 'user-1', email: 'u@example.test' } }, error: null },
    });
    const { middleware } = await import('../../middleware');
    const redirected = await middleware(request('/login'));
    expect(redirected.status).toBe(307);
    expect(redirected.cookies.get('sb-session')?.value).toBe('rotated');

    getUserMock.mockResolvedValue({ value: { data: { user: null }, error: { status: 503, name: 'AuthApiError' } } });
    const unavailable = await middleware(request('/dashboard'));
    expect(unavailable.status).toBe(503);
    expect(unavailable.headers.get('retry-after')).toBe('60');
    expect(unavailable.headers.get('cache-control')).toBe('no-store');
  });

  it('redirects unauthenticated protected requests to login', async () => {
    getUserMock.mockResolvedValue({ value: { data: { user: null }, error: { status: 401, name: 'AuthApiError' } } });
    const { middleware } = await import('../../middleware');
    const response = await middleware(request('/dashboard'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://example.test/login');
  });
});
