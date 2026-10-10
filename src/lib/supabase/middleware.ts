import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

/**
 * Middleware helper: resolves the current Supabase user, rotates session
 * cookies, and propagates the authed user id/email to downstream RSCs via
 * request headers. The layout's `getAppViewer` reads those headers to skip
 * a redundant `auth.getUser()` call on every navigation.
 */
export async function updateSession(request: NextRequest) {
  const collectedCookies: Array<{ name: string; value: string; options: CookieOptions }> = [];
  const requestHeaders = new Headers(request.headers);
  // Identity headers are internal: never trust values supplied by a caller.
  requestHeaders.delete('x-authed-user-id');
  requestHeaders.delete('x-authed-user-email');
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let user = null;
  let unavailable = false;

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          fetch: (input, init) => fetch(input, {
            ...init,
            signal: init?.signal
              ? AbortSignal.any([init.signal, controller.signal])
              : controller.signal,
          }),
        },
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            for (const { name, value, options } of cookiesToSet) {
              request.cookies.set(name, value);
              collectedCookies.push({ name, value, options });
            }
          },
        },
      }
    );

    // Bound the entire verification, including refresh retries.
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          controller.abort();
          reject(new Error('Auth verification timed out'));
        }, 8000);
      }),
    ]);
    if (result.error && (result.error.status === 0 ||
        (result.error.status ?? 0) >= 500 ||
        result.error.name === 'AuthRetryableFetchError' ||
        result.error.name === 'AuthUnknownError')) {
      unavailable = true;
      logger.error('Supabase authentication unavailable');
    } else {
      user = result.error ? null : result.data.user;
    }
  } catch {
    unavailable = true;
    logger.error('Supabase authentication unavailable');
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }

  if (user) {
    requestHeaders.set('x-authed-user-id', user.id);
    if (user.email) requestHeaders.set('x-authed-user-email', user.email);
  }

  const supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  for (const { name, value, options } of collectedCookies) {
    supabaseResponse.cookies.set(name, value, options);
  }

  return { user, supabaseResponse, unavailable };
}
