'use server';

import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';

/** Naya garden: create_garden() RPC (login user owner ban jaata hai, rate card seed hota hai) */
export async function createGarden(formData: FormData) {
  const { sb } = await requireUser();
  const name = String(formData.get('name') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  if (name.length < 2) redirect('/gardens?error=' + encodeURIComponent('Garden ka naam likhein'));
  const { data, error } = await sb.rpc('create_garden', { p_name: name, p_phone: phone || null });
  if (error || !data) redirect('/gardens?error=' + encodeURIComponent('Garden nahi bana. Phir se try karein.'));
  redirect(`/g/${data}`);
}
