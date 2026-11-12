// lib/supabase-server.ts — server ke liye Supabase client (anon key + login cookie).
// Ye RLS ke saath chalta hai: jo user login hai, uske rights ke hisaab se data aata hai.
// Browser ko kabhi service-role key nahi milti.

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    // Hinglish: env values set nahi hain (.env.local ya Vercel env check karein)
    throw new Error('Supabase ki settings nahi mili: NEXT_PUBLIC_SUPABASE_URL aur NEXT_PUBLIC_SUPABASE_ANON_KEY check karein.');
  }
  // Next 16: cookies() ab Promise deta hai, isliye await zaroori hai.
  const jar = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return jar.getAll();
      },
      setAll(list: { name: string; value: string; options: CookieOptions }[]) {
        try {
          list.forEach(({ name, value, options }) => jar.set(name, value, options));
        } catch {
          // Server Component se cookie set nahi hoti; middleware session refresh karta hai.
        }
      },
    },
  });
}
