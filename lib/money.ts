// lib/money.ts — Paise ka hisaab (payment calculation).
// Ye file pure functions rakhti hai (koi database nahi), taaki unit tests chal sakein.
// schema.sql mein bhi SAME rule hai (subtotal - discount = total; balance = total - jama).
// Agar dono mein farak aaye to tests fail honge — yahi iska kaam hai.

export type UnitType = 'event' | 'plate';
export type Season = 'peak' | 'off';

/** Ek rate line: jaise "Catering (per plate)" 300 plate x Rs 500 */
export interface RateLine {
  item_name: string;
  unit_type: UnitType;
  quantity: number;
  unit_rate: number;
}

/** Rate card ka ek item (owner admin screen se badalta hai, hardcode nahi) */
export interface RateItem {
  id: string;
  name: string;
  unit_type: UnitType;
  peak_rate: number;
  off_rate: number;
}

export interface MoneyInput {
  lines: RateLine[];
  discount: number;      // rupees mein
  advance: number;       // booking ke waqt mili advance
  balancePaid: number;   // baad mein mila balance (jama)
}

export interface MoneyResult {
  subtotal: number;      // sab lines ka jod
  discount: number;
  total: number;         // subtotal - discount
  received: number;      // advance + balancePaid
  balance: number;       // total - received (baaki paisa)
  status: 'paid' | 'pending';
}

/** Galat input par ye error (Hinglish message ke saath) */
export class MoneyError extends Error {}

/** 2 decimal tak round (floating point ki galti se bachne ke liye) */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Ek line ka total = quantity x unit_rate */
export function lineTotal(line: RateLine): number {
  return round2(line.quantity * line.unit_rate);
}

/** Season ke hisaab se item ka rate: peak ho to peak_rate, warna off_rate */
export function rateFor(item: RateItem, season: Season): number {
  return season === 'peak' ? item.peak_rate : item.off_rate;
}

/**
 * Booking ka poora hisaab.
 * - subtotal = sab lines ka jod
 * - total = subtotal - discount (discount subtotal se zyada nahi ho sakta)
 * - received = advance + balance jama
 * - balance = total - received (baaki paisa, kabhi negative nahi)
 * - status = 'paid' sirf tab jab total > 0 aur received >= total, warna 'pending'
 * Galat input par MoneyError.
 */
export function calcBooking(input: MoneyInput): MoneyResult {
  const { lines, discount, advance, balancePaid } = input;
  for (const n of [discount, advance, balancePaid]) {
    if (!Number.isFinite(n) || n < 0) {
      throw new MoneyError('Paise 0 ya usse zyada hone chahiye');
    }
  }
  const subtotal = round2(lines.reduce((sum, l) => sum + lineTotal(l), 0));
  if (discount > subtotal) {
    throw new MoneyError('Discount total se zyada nahi ho sakta');
  }
  const total = round2(subtotal - discount);
  const received = round2(advance + balancePaid);
  if (received > total) {
    throw new MoneyError('Jama ki rakam total se zyada hai');
  }
  const balance = round2(total - received);
  return {
    subtotal,
    discount: round2(discount),
    total,
    received,
    balance,
    status: total > 0 && received >= total ? 'paid' : 'pending',
  };
}
