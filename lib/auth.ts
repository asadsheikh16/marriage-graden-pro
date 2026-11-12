// lib/auth.ts — page aur action ke liye login aur garden role ka check.
// Har protected page yahin se guzarta hai: login hai? is garden ka member hai? role kya hai?
// Step 2 fix (root cause): pehle koi bhi RPC error ko "member nahi" maan kar /gardens par bhej diya jaata tha.
// Database connection ka chhota hiccup (jaise DB rebuild ke turant baad) owner ko galat screen par bhej deta tha.
// Ab: error par chhota retry; phir bhi error ho to saaf error (page par "thodi der baad" message), redirect nahi.
// Sirf asli "member nahi / role nahi" par hi /gardens redirect hota hai. Security ka matlab same: error = access nahi.

import { redirect } from 'next/navigation';
import { supabaseServer } from './supabase-server';
import type { Role } from './roles';

/** Login zaroori hai. Nahi hai to /login par bhejo. */
export async function requireUser() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/login');
  return { sb, user };
}

const ROLE_RETRY_DELAYS_MS = [300, 700];

/**
 * Garden ka member hai ya nahi, aur role kya hai.
 * Member nahi (role null / koi aur value) to /gardens par bhej do (dusre garden ka data nahi dikhega).
 * Database ya network error to retry karo; baar-baar error ho to saaf error dikhao, galat redirect nahi.
 */
export async function requireGarden(gardenId: string): Promise<{ sb: Awaited<ReturnType<typeof supabaseServer>>; userId: string; role: Role }> {
  const { sb, user } = await requireUser();
  let res = await sb.rpc('my_role', { p_garden: gardenId });
  for (const delay of ROLE_RETRY_DELAYS_MS) {
    if (!res.error) break;
    await new Promise((r) => setTimeout(r, delay));
    res = await sb.rpc('my_role', { p_garden: gardenId });
  }
  if (res.error) {
    throw new Error('Garden ki jaankari abhi nahi mil rahi. Thodi der baad page refresh karein.');
  }
  const role = res.data;
  if (role !== 'owner' && role !== 'staff') redirect('/gardens');
  return { sb, userId: user.id, role: role as Role };
}
