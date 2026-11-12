// lib/form.ts — form se aayi entries ko check karke saaf karna (server side).
// Browser ki "required" check bhi hai, lekin asli check yahin hota hai.

import type { Slot, BookingStatus } from './slots';

export const EVENT_TYPES = ['shaadi', 'reception', 'engagement', 'tilak', 'birthday_other'] as const;
export const SLOTS: Slot[] = ['din', 'raat', 'full'];

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

export interface BookingInput {
  customer_name: string;
  phone: string;           // sirf digits, 10 se 15
  event_type: string;
  event_date: string;      // YYYY-MM-DD
  slot: Slot;
  guests: number;
  status: BookingStatus;   // hold ya confirmed (cancel alag action se)
  notes: string | null;
}

/**
 * Phone ko sirf digits mein badlo. 10 digits = Indian mobile (91 apne aap nahi lagta).
 * Galat ho to null.
 */
export function cleanPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length >= 10 && digits.length <= 15) return digits;
  return null;
}

/** Number field ko samjho: khaali = 0, galat = NaN */
export function parseNumber(raw: FormDataEntryValue | null | undefined): number {
  if (raw === null || raw === undefined || String(raw).trim() === '') return 0;
  const n = Number(String(raw).replace(/,/g, ''));
  return Number.isFinite(n) ? n : Number.NaN;
}

/** Booking form ki poori validation */
export function parseBookingForm(fd: FormData): ParseResult<BookingInput> {
  const name = String(fd.get('customer_name') ?? '').trim();
  if (name.length < 2) return { ok: false, error: 'Customer ka naam likhein (kam se kam 2 letter)' };

  const phone = cleanPhone(String(fd.get('phone') ?? ''));
  if (!phone) return { ok: false, error: 'Phone number sahi nahi hai (10 digit)' };

  const eventType = String(fd.get('event_type') ?? '');
  if (!(EVENT_TYPES as readonly string[]).includes(eventType)) {
    return { ok: false, error: 'Event type chuniye' };
  }

  const date = String(fd.get('event_date') ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    return { ok: false, error: 'Date sahi nahi hai' };
  }

  const slot = String(fd.get('slot') ?? '') as Slot;
  if (!SLOTS.includes(slot)) return { ok: false, error: 'Slot chuniye: Din, Raat ya Full Day' };

  const guests = parseNumber(fd.get('guests'));
  if (!Number.isInteger(guests) || guests < 0) return { ok: false, error: 'Guests sahi number mein likhein' };

  const statusRaw = String(fd.get('status') ?? 'confirmed');
  const status: BookingStatus = statusRaw === 'hold' ? 'hold' : 'confirmed';

  const notes = String(fd.get('notes') ?? '').trim() || null;

  return {
    ok: true,
    value: { customer_name: name, phone, event_type: eventType, event_date: date, slot, guests, status, notes },
  };
}
