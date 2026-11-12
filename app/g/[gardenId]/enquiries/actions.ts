'use server';

import { redirect } from 'next/navigation';
import { requireGarden } from '@/lib/auth';
import { canSeeMoney } from '@/lib/roles';
import { cleanPhone, parseNumber, EVENT_TYPES } from '@/lib/form';
import { friendlyDbError } from '@/lib/errors';

/** IST date + time ko timestamptz string banao (jaise 2027-01-10T11:00:00+05:30) */
function callbackAt(date: string, time: string): string | null {
  if (!date) return null;
  return `${date}T${time || '10:00'}:00+05:30`;
}

/** Nayi enquiry. Rate quote sirf owner ka (staff ka form mein field nahi aata). */
export async function createEnquiry(gardenId: string, fd: FormData) {
  const { sb, role } = await requireGarden(gardenId);
  const name = String(fd.get('customer_name') ?? '').trim();
  const back = `/g/${gardenId}/enquiries`;
  if (name.length < 2) return redirect(`${back}?error=${encodeURIComponent('Naam likhein (kam se kam 2 letter)')}`);

  const rawPhone = String(fd.get('phone') ?? '').trim();
  const phone = rawPhone ? cleanPhone(rawPhone) : null;
  if (rawPhone && !phone) return redirect(`${back}?error=${encodeURIComponent('Phone sahi nahi hai')}`);

  const guests = parseNumber(fd.get('guests'));
  if (!Number.isInteger(guests) || guests < 0) return redirect(`${back}?error=${encodeURIComponent('Guests number mein likhein')}`);

  const eventType = String(fd.get('event_type') ?? '');
  const status = String(fd.get('status') ?? 'naya');
  const dateWanted = String(fd.get('date_wanted') ?? '') || null;
  const { data: enq, error } = await sb.from('enquiries').insert({
    garden_id: gardenId,
    customer_name: name,
    phone,
    event_type: (EVENT_TYPES as readonly string[]).includes(eventType) ? eventType : null,
    date_wanted: dateWanted,
    guests,
    status: ['naya', 'visit', 'booked'].includes(status) ? status : 'naya',
    callback_at: callbackAt(String(fd.get('callback_date') ?? ''), String(fd.get('callback_time') ?? '')),
    notes: String(fd.get('notes') ?? '').trim() || null,
    created_by: null,
  }).select('id').single();
  if (error || !enq) return redirect(`${back}?error=${encodeURIComponent(friendlyDbError(error))}`);

  if (canSeeMoney(role)) {
    const rate = parseNumber(fd.get('rate_quoted'));
    if (!Number.isNaN(rate) && rate > 0) {
      await sb.from('enquiry_quotes').insert({ enquiry_id: enq.id, garden_id: gardenId, rate_quoted: rate });
    }
  }
  redirect(`${back}?saved=1`);
}

/** Enquiry status / call-back badalna (owner aur staff dono) */
export async function updateEnquiry(gardenId: string, enquiryId: string, fd: FormData) {
  const { sb } = await requireGarden(gardenId);
  const status = String(fd.get('status') ?? 'naya');
  const update: Record<string, unknown> = {
    status: ['naya', 'visit', 'booked'].includes(status) ? status : 'naya',
    updated_at: new Date().toISOString(),
  };
  const cb = callbackAt(String(fd.get('callback_date') ?? ''), String(fd.get('callback_time') ?? ''));
  if (cb) update.callback_at = cb;
  const { error } = await sb.from('enquiries').update(update).eq('id', enquiryId).eq('garden_id', gardenId);
  if (error) redirect(`/g/${gardenId}/enquiries?error=${encodeURIComponent(friendlyDbError(error))}`);
  redirect(`/g/${gardenId}/enquiries?saved=1`);
}
