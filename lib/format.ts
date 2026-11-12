// lib/format.ts — rupee, date aur label ki formatting. Sab Hinglish / English.
// Time zone: Asia/Kolkata (IST). Date strings YYYY-MM-DD rakhte hain.
// Phase 1 change: EVENT_LABEL ab lib/function-types.ts wale ek hi map se aata hai (naam ek jaisa rahe).

import { FUNCTION_TYPE_LABEL } from './function-types';

export const IST_OFFSET = '+05:30';

export const EVENT_LABEL: Record<string, string> = FUNCTION_TYPE_LABEL;

export const SLOT_LABEL: Record<string, string> = {
  din: 'Din (8 AM–5 PM)',
  raat: 'Raat (6 PM–2 AM)',
  full: 'Full Day',
};

/** Rupee: Rs ka format Indian comma ke saath, jaise ₹1,50,000 */
export function formatINR(n: number): string {
  return '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n);
}

/** Aaj ki date IST mein, YYYY-MM-DD */
export function todayISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
}

/** YYYY-MM ka pehla aur aakhri din (YYYY-MM-DD) */
export function monthRange(ym: string): { from: string; to: string } {
  const [y, m] = ym.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const mm = String(m).padStart(2, '0');
  return { from: `${y}-${mm}-01`, to: `${y}-${mm}-${String(last).padStart(2, '0')}` };
}

/** Ek IST din ka start aur end (timestamptz ke liye, call-back filter mein) */
export function istDayBounds(dateISO: string): { start: string; end: string } {
  const start = `${dateISO}T00:00:00${IST_OFFSET}`;
  const next = new Date(new Date(`${dateISO}T00:00:00Z`).getTime() + 86400000)
    .toISOString().slice(0, 10);
  return { start, end: `${next}T00:00:00${IST_OFFSET}` };
}

/** Date ko chhota dikhane ke liye: 10 Jan 2027 (Sun) */
export function prettyDate(dateISO: string): string {
  const d = new Date(`${dateISO}T00:00:00Z`);
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric', weekday: 'short',
  }).format(d);
}
