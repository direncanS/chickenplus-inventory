import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware helper: resolves the current Supabase user, rotates session
 * cookies, and propagates the authed user id/email to downstream RSCs via
 * request headers. The layout's `getAppViewer` reads those headers to skip
 * a redundant `auth.getUser()` call on every navigation.
 */
export async function updateSession(request: NextRequest) {
  const collectedCookies: Array<{ name: string; value: string; options: CookieOptions }> = [];
  const requestHeaders = new Headers(request.headers);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  return { user, supabaseResponse };
}
