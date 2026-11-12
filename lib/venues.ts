// lib/venues.ts — public venue search (/venues) ke pure helpers.
// Koi DB ya Next.js import nahi: vitest se seedha test hote hain (tests/venues.test.ts).
// Public pages sirf wahi data dikhate hain jo RPC (public_*) se aata hai.
// Phase 1 change: VENUE_EVENT_LABEL ab lib/function-types.ts ka hi map hai (pehle alag spelling thi).

import { formatINR, monthRange } from './format';
import { FUNCTION_TYPE_LABEL } from './function-types';

export const VENUE_EVENT_TYPES = ['shaadi', 'reception', 'engagement', 'tilak', 'birthday_other'] as const;

export const VENUE_EVENT_LABEL: Record<string, string> = FUNCTION_TYPE_LABEL;

export const SLUG_RE = /^[a-z0-9-]{3,60}$/;

/** Garden ka naam se URL-safe slug. Hindi naam se khaali aaye to '' (caller fallback dega). */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
    .replace(/-+$/g, '');
}

export function isISODate(s: string | null | undefined): s is string {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const t = Date.parse(`${s}T00:00:00Z`);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === s;
}

export function isHttpsUrl(s: string): boolean {
  return /^https:\/\/[^\s]+$/.test(s);
}

/** Textarea ya input se lines (khaali lines hata kar). */
export function splitLines(raw: string): string[] {
  return raw.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
}

/** Comma se list (amenities). */
export function splitList(raw: string): string[] {
  return raw.split(',').map((x) => x.trim()).filter(Boolean);
}

export interface SearchInput {
  city: string;
  date: string | null;
  guests: number | null;
  eventType: string | null;
}

/** URL ke search params saaf karo. Galat date (ya beeti date) hata do, galat guests/event bhi. */
export function normalizeSearch(sp: Record<string, string | undefined>, today: string): SearchInput {
  const city = (sp.city ?? '').trim().slice(0, 60);
  const date = isISODate(sp.date) && sp.date >= today ? sp.date : null;
  const g = Number((sp.guests ?? '').replace(/,/g, ''));
  const guests = Number.isInteger(g) && g >= 1 && g <= 20000 ? g : null;
  const ev = sp.event ?? '';
  const eventType = (VENUE_EVENT_TYPES as readonly string[]).includes(ev) ? ev : null;
  return { city, date, guests, eventType };
}

/** Ek month ka grid. Sunday se shuru. date < today = past, booked set mein = Booked, baaki Khaali. */
export type DayState = 'khaali' | 'booked' | 'past' | 'blank';
export interface GridCell { date: string | null; day: number | null; state: DayState }

export function buildMonthGrid(ym: string, booked: Set<string>, today: string): GridCell[][] {
  const [y, m] = ym.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: GridCell[] = [];
  for (let i = 0; i < first.getUTCDay(); i++) cells.push({ date: null, day: null, state: 'blank' });
  for (let d = 1; d <= days; d++) {
    const date = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const state: DayState = date < today ? 'past' : booked.has(date) ? 'booked' : 'khaali';
    cells.push({ date, day: d, state });
  }
  while (cells.length % 7 !== 0) cells.push({ date: null, day: null, state: 'blank' });
  const weeks: GridCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function validMonth(ym: string | undefined, fallback: string): string {
  return ym && /^\d{4}-(0[1-9]|1[0-2])$/.test(ym) ? ym : fallback;
}

/** Calendar RPC ke rows se booked dates ka set. */
export function bookedDates(rows: { event_date: string }[]): Set<string> {
  return new Set(rows.map((r) => r.event_date));
}

export function monthBounds(ym: string): { from: string; to: string } {
  return monthRange(ym);
}

/** Rate range: sirf min se max. Item-wise kuch nahi. */
export function rateRangeLabel(min: number | null, max: number | null): string | null {
  if (min == null || max == null) return null;
  if (Number(min) === Number(max)) return formatINR(Number(min));
  return `${formatINR(Number(min))} se ${formatINR(Number(max))} tak`;
}

export function seoTitle(name: string, city: string | null): string {
  return city
    ? `${name} | ${city} में शादी का गार्डन — Marriage Garden in ${city}`
    : `${name} | शादी का गार्डन — Marriage Garden`;
}

export function seoDescription(name: string, city: string | null, capacity: number | null): string {
  const cap = capacity && capacity > 0 ? ` ${capacity} mehmaan tak.` : '';
  if (!city) {
    return `${name} — शादी और समारोह के लिए गार्डन. तारीख़ देखें, खाली दिन पर enquiry bhejein.${cap} Marriage garden: check dates and send an enquiry.`;
  }
  return `${city} में शादी और समारोह के लिए ${name}. तारीख़ देखें, खाली दिन पर enquiry bhejein.${cap} Marriage garden in ${city}: check availability and send an enquiry.`;
}

/** RPC ka error message (raise text) -> saaf Hinglish. Technical code kabhi nahi dikhta. */
export function venueErrorMessage(message: string | null | undefined): string {
  const m = message ?? '';
  if (m.includes('NOT_LISTED')) return 'Ye garden abhi public list par nahi hai.';
  if (m.includes('RATE_LIMITED')) return 'Aaj ke liye bahut koshish ho gayi. Thodi der baad try karein, ya seedha call karein.';
  if (m.includes('BAD_INPUT: naam')) return 'Naam kam se kam 2 letter ka likhein.';
  if (m.includes('BAD_INPUT: phone')) return 'Phone sahi nahi hai. 10 digit likhein.';
  if (m.includes('BAD_INPUT: date')) return 'Date sahi nahi hai. Aaj ya aage ki date chunein.';
  if (m.includes('BAD_INPUT: guests')) return 'Guests 1 ya usse zyada likhein.';
  if (m.includes('BAD_INPUT: event')) return 'Event type chunein.';
  return 'Kuch gadbad hui, thodi der baad phir try karein.';
}
