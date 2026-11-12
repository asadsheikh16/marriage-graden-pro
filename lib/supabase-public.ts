// lib/supabase-public.ts — PUBLIC (login ke bina) Supabase client. Sirf anon key.
// Cookies nahi, session nahi. Data sirf public_* view / RPC se aata hai (migrations/002).
// Is file mein service-role key kabhi nahi aayegi.

import { createClient } from '@supabase/supabase-js';

export function supabasePublic() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Supabase ki settings nahi mili: NEXT_PUBLIC_SUPABASE_URL aur NEXT_PUBLIC_SUPABASE_ANON_KEY check karein.');
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
