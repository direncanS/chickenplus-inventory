import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === '/service-unavailable') {
    return NextResponse.next();
  }
  const { user, supabaseResponse, unavailable } = await updateSession(request);

  function withCookies(response: NextResponse) {
    for (const cookie of supabaseResponse.cookies.getAll()) {
      response.cookies.set(cookie);
    }
    return response;
  }

  if (unavailable) {
    return withCookies(NextResponse.rewrite(new URL('/service-unavailable', request.url), {
      status: 503,
      headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' },
    }));
  }

  // Public routes (no auth needed)
  if (pathname === '/login') {
    if (user) {
      return withCookies(NextResponse.redirect(new URL('/dashboard', request.url)));
    }
    return supabaseResponse;
  }

  if (pathname === '/deactivated') {
    if (!user) {
      return withCookies(NextResponse.redirect(new URL('/login', request.url)));
    }
    return supabaseResponse;
  }

  // Setup route: special handling
  if (pathname === '/setup') {
    if (!user) {
      return withCookies(NextResponse.redirect(new URL('/login', request.url)));
    }
    return supabaseResponse;
  }

  // Protected routes: require auth
  if (!user) {
    return withCookies(NextResponse.redirect(new URL('/login', request.url)));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo\\.png$|api/export|api/cron).*)',
  ],
};
