'use server';

import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase-server';

/** Email + password se login. Galat ho to usi page par message. */
export async function signIn(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const sb = await supabaseServer();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) redirect('/login?error=' + encodeURIComponent('Email ya password galat hai'));
  redirect('/gardens');
}

/** Logout: session cookie hatao */
export async function signOut() {
  const sb = await supabaseServer();
  await sb.auth.signOut();
  redirect('/login');
}
