'use server';

// Booking ke server actions: save (naya / edit), cancel, checklist tick.
// Har action pehle requireGarden() se login + membership + role check karta hai.
// Asli rokthaam database (RLS + trigger) mein bhi hai.

import { redirect } from 'next/navigation';
import { requireGarden } from '@/lib/auth';
import { canEditBooking } from '@/lib/roles';
import { parseBookingForm, parseNumber } from '@/lib/form';
import { findClash, DOUBLE_BOOKING_MESSAGE, type SlotBooking } from '@/lib/slots';
import { calcBooking, rateFor, MoneyError, type RateItem, type RateLine } from '@/lib/money';
import { friendlyDbError } from '@/lib/errors';

type LineRow = RateLine & { rate_item_id: string };

/** Galat hone par form wapas bhejo, values ke saath (URL mein), error message ke saath */
function backWith(path: string, fd: FormData, error: string): never {
  const sp = new URLSearchParams();
  fd.forEach((value, key) => {
    if (typeof value === 'string' && !key.startsWith('qty_')) sp.set(key, value);
  });
  sp.set('error', error);
  redirect(`${path}?${sp.toString()}`);
}

/**
 * Naya booking (bookingId = null) ya edit.
 * 1) form check  2) UI warning: same din/slot par confirmed booking?  3) owner ho to rate lines + paisa
 * 4) save_booking RPC (ek transaction)  5) DB guard agar race ho to bhi rukega.
 */
export async function saveBooking(gardenId: string, bookingId: string | null, fd: FormData) {
  const { sb, role } = await requireGarden(gardenId);
  const back = `/g/${gardenId}/bookings${bookingId ? `/${bookingId}` : '/new'}`;

  const parsed = parseBookingForm(fd);
  if (!parsed.ok) return backWith(back, fd, parsed.error);
  const v = parsed.value;

  // UI par double-booking warning (database guard ke upar ek aur layer)
  if (v.status === 'confirmed') {
    const { data: same } = await sb.from('bookings').select('id, event_date, slot, status')
      .eq('garden_id', gardenId).eq('event_date', v.event_date).eq('status', 'confirmed');
    const clash = findClash(
      { id: bookingId ?? undefined, event_date: v.event_date, slot: v.slot },
      (same ?? []) as SlotBooking[],
    );
    if (clash) return backWith(back, fd, `${DOUBLE_BOOKING_MESSAGE}. Dusri date ya slot chuniye.`);
  }

  let money: { discount: number; advance: number; balance_paid: number } | null = null;
  const lines: LineRow[] = [];

  if (role === 'owner') {
    // Rate server se padhte hain (client ki bheji rate kabhi nahi maanenge)
    const { data: items } = await sb.from('rate_items')
      .select('id, name, unit_type, peak_rate, off_rate')
      .eq('garden_id', gardenId).eq('active', true).order('sort_order');
    const { data: season } = await sb.rpc('season_of', { p_garden: gardenId, p_date: v.event_date });
    const s = season === 'off' ? 'off' : 'peak';

    for (const item of (items ?? []) as RateItem[]) {
      const qty = parseNumber(fd.get(`qty_${item.id}`));
      if (Number.isNaN(qty) || qty < 0) return backWith(back, fd, `${item.name} ki quantity sahi nahi hai`);
      if (qty > 0) {
        lines.push({
          rate_item_id: item.id, item_name: item.name, unit_type: item.unit_type as RateLine['unit_type'],
          quantity: qty, unit_rate: rateFor(item, s),
        });
      }
    }

    const discount = parseNumber(fd.get('discount'));
    const advance = parseNumber(fd.get('advance'));
    const balancePaid = parseNumber(fd.get('balance_paid'));
    if ([discount, advance, balancePaid].some((n) => Number.isNaN(n))) {
      return backWith(back, fd, 'Paise ki rakam sahi likhein (sirf number)');
    }
    try {
      // Pehle hisaab check: discount, overpay wagairah
      calcBooking({ lines, discount, advance, balancePaid });
    } catch (e) {
      return backWith(back, fd, e instanceof MoneyError ? e.message : 'Hisaab galat hai');
    }
    money = { discount, advance, balance_paid: balancePaid };
  }

  const { data: id, error } = await sb.rpc('save_booking', {
    p_garden: gardenId,
    p_booking: { ...v },
    p_money: money,
    p_lines: lines,
    p_id: bookingId,
  });
  if (error || !id) return backWith(back, fd, friendlyDbError(error));
  redirect(`/g/${gardenId}/bookings/${id}?saved=1`);
}

/** Booking cancel (owner). Cancelled booking calendar aur guard se bahar ho jaati hai. */
export async function cancelBooking(gardenId: string, bookingId: string) {
  const { sb, role } = await requireGarden(gardenId);
  if (!canEditBooking(role)) redirect(`/g/${gardenId}/bookings/${bookingId}?error=${encodeURIComponent('Sirf owner cancel kar sakta hai')}`);
  const { error } = await sb.from('bookings')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', bookingId).eq('garden_id', gardenId);
  if (error) redirect(`/g/${gardenId}/bookings/${bookingId}?error=${encodeURIComponent(friendlyDbError(error))}`);
  redirect(`/g/${gardenId}/bookings/${bookingId}?saved=1`);
}

/** Function-day checklist: jo tick hain unhe done karo, baaki undone. Staff bhi kar sakta hai. */
export async function saveChecklist(gardenId: string, bookingId: string, fd: FormData) {
  const { sb } = await requireGarden(gardenId);
  const { data: items } = await sb.from('function_checklist')
    .select('id, done').eq('booking_id', bookingId).eq('garden_id', gardenId);
  const now = new Date().toISOString();
  for (const it of items ?? []) {
    const done = fd.has(`item_${it.id}`);
    if (done === it.done) continue; // badla nahi, skip
    await sb.from('function_checklist')
      .update({ done, done_at: done ? now : null })
      .eq('id', it.id).eq('garden_id', gardenId);
  }
  redirect(`/g/${gardenId}/bookings/${bookingId}?saved=1#checklist`);
}
