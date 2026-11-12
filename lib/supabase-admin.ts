// lib/supabase-admin.ts — SERVICE ROLE client. Sirf server par, sirf staff add/remove ke liye.
// Ye key RLS ko bypass karti hai, isliye har jagah pehle owner ka check hota hai (lib/auth.ts).
// "server-only" import ka matlab: agar koi client component ise import kare to build fail ho.

import 'server-only';
import { createClient } from '@supabase/supabase-js';

export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Staff ke liye SUPABASE_SERVICE_ROLE_KEY set karein (sirf server environment mein).');
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
