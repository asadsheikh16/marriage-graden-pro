'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabasePublic } from '@/lib/supabase-public';
import { venueErrorMessage } from '@/lib/venues';

/** Client ka IP (Vercel ke header se). Rate limit ka ek hissa; phone limit bhi RPC mein hai. */
async function clientIp(): Promise<string> {
  // Next 16: headers() ab Promise deta hai, isliye await.
  const h = await headers();
  const real = (h.get('x-real-ip') ?? '').trim();
  if (real) return real;
  const xff = (h.get('x-forwarded-for') ?? '').split(',')[0]?.trim();
  return xff || 'unknown';
}

/** Public "Enquiry bhejo". Insert RPC se hota hai (anon ko enquiries table par koi haq nahi). */
export async function submitVenueEnquiry(slug: string, fd: FormData) {
  const back = `/venues/${encodeURIComponent(slug)}`;

  // Honeypot: bots ye field bhar dete hain. Bhara ho to chupchap "sent" dikhao, kuch save mat karo.
  if (String(fd.get('website') ?? '').trim() !== '') {
    redirect(`${back}?sent=1#enquiry`);
  }

  const eventDate = String(fd.get('event_date') ?? '').trim();
  const { error } = await supabasePublic().rpc('public_submit_enquiry', {
    p_slug: slug,
    p_name: String(fd.get('customer_name') ?? ''),
    p_phone: String(fd.get('phone') ?? ''),
    p_date: eventDate || null,
    p_guests: Number(String(fd.get('guests') ?? '').replace(/,/g, '')) || 0,
    p_event_type: String(fd.get('event_type') ?? ''),
    p_ip: await clientIp(),
  });

  if (error) {
    redirect(`${back}?error=${encodeURIComponent(venueErrorMessage(error.message))}#enquiry`);
  }
  redirect(`${back}?sent=1#enquiry`);
}
