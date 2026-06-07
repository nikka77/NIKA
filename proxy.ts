import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED = [
  '/dashboard',
  '/wallet',
  '/pro/dashboard',
  '/pro/listings',
  '/pro/commandes',
  '/pro/flash-deals',
  '/pro/stats',
];
const AUTH_ONLY = ['/connexion', '/inscription'];

// Routes food dashboard protégées par login prestataire
const FOOD_DASHBOARD_PROTECTED = '/food/dashboard';
const FOOD_DASHBOARD_LOGIN = '/food/dashboard/login';

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(list: { name: string; value: string; options?: object }[]) {
        list.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options as never);
        });
      },
    },
  });

  const { data: { session } } = await supabase.auth.getSession();
  const path = request.nextUrl.pathname;

  if (!session && PROTECTED.some(p => path.startsWith(p))) {
    return NextResponse.redirect(new URL('/connexion', request.url));
  }
  if (session && AUTH_ONLY.some(p => path === p)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Protection food dashboard (sauf page login)
  if (path.startsWith(FOOD_DASHBOARD_PROTECTED) && path !== FOOD_DASHBOARD_LOGIN && !path.startsWith(FOOD_DASHBOARD_LOGIN + '/')) {
    if (!session) {
      return NextResponse.redirect(new URL(FOOD_DASHBOARD_LOGIN, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/wallet/:path*',
    '/pro/dashboard/:path*',
    '/pro/listings/:path*',
    '/pro/commandes/:path*',
    '/pro/flash-deals/:path*',
    '/pro/stats/:path*',
    '/connexion',
    '/inscription',
    '/food/dashboard/:path*',
  ],
};
