import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

describe('getAppViewer', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('deduplicates auth and profile lookups within the same request helper usage', async () => {
    const authGetUserMock = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email: 'chef@example.com',
        },
      },
    });

    const singleMock = vi.fn().mockResolvedValue({
      data: {
        id: 'user-1',
        display_name: 'Chef',
        role: 'admin',
        is_active: true,
        created_at: '2026-04-06T00:00:00.000Z',
        updated_at: '2026-04-06T00:00:00.000Z',
      },
    });

    const eqIsActiveMock = vi.fn(() => ({ single: singleMock }));
    const eqIdMock = vi.fn(() => ({ eq: eqIsActiveMock }));
    const selectMock = vi.fn(() => ({ eq: eqIdMock }));
    const fromMock = vi.fn(() => ({ select: selectMock }));

    vi.doMock('@/lib/supabase/server', () => ({
      createServerClient: vi.fn(async () => ({
        auth: {
          getUser: authGetUserMock,
        },
        from: fromMock,
      })),
    }));

    vi.doMock('react', async () => {
      const actual = await vi.importActual<typeof import('react')>('react');
      return {
        ...actual,
        cache: <TArgs extends unknown[], TResult>(fn: (...args: TArgs) => TResult) => {
          let hasValue = false;
          let cachedValue: TResult;

          return (...args: TArgs) => {
            if (!hasValue) {
              cachedValue = fn(...args);
              hasValue = true;
            }

            return cachedValue;
          };
        },
      };
    });

    const { getAppViewer } = await import('@/lib/supabase/app-viewer');

    const first = await getAppViewer();
    const second = await getAppViewer();

    expect(authGetUserMock).toHaveBeenCalledTimes(1);
    expect(fromMock).toHaveBeenCalledWith('profiles');
    expect(singleMock).toHaveBeenCalledTimes(1);
    expect(first.isAdmin).toBe(true);
    expect(second.profile?.display_name).toBe('Chef');
  });
});
