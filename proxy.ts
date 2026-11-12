// proxy.ts — (Next 16 mein middleware.ts ka naya naam). Har request par login session refresh karta hai,
// aur login ke bina kisi bhi page par nahi jaane deta (sirf /login aur /venues chhodkar).
// Change: file middleware.ts se proxy.ts hui, function ka naam proxy hua. Logic same hai.

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(list: { name: string; value: string; options: CookieOptions }[]) {
          list.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data: { user } } = await sb.auth.getUser();
  // /login aur public venue pages (/venues) bina login ke khule hain
  const isPublic = req.nextUrl.pathname.startsWith('/login') || req.nextUrl.pathname.startsWith('/venues');
  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
