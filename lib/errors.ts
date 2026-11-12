// lib/errors.ts — database ki technical error ko Hinglish message mein badalna.
// Client ko raw error (jaise SQLSTATE) kabhi nahi dikhna chahiye.

import { DOUBLE_BOOKING_MESSAGE } from './slots';

export interface DbErrorLike {
  code?: string | null;
  message?: string | null;
}

export function friendlyDbError(err: DbErrorLike | null | undefined): string {
  if (!err) return 'Kuch gadbad hui, phir se try karein.';
  const msg = err.message ?? '';

  // 23505 = unique violation. Hamara double-booking trigger isi code se rokta hai.
  if (err.code === '23505') {
    if (msg.includes(DOUBLE_BOOKING_MESSAGE)) {
      return `${DOUBLE_BOOKING_MESSAGE}. Dusri date ya slot chuniye.`;
    }
    return 'Ye record pehle se hai.';
  }
  // 23514 = check constraint: paisa ya discount galat
  if (err.code === '23514') {
    return 'Paise ka hisaab galat hai (discount ya jama total se zyada hai). Check karke phir save karein.';
  }
  // 42501 = permission / RLS. Staff ne owner wala kaam kiya.
  if (err.code === '42501') {
    return 'Aapko ye kaam karne ki permission nahi hai. Owner se poochhiye.';
  }
  if (err.code === 'P0002' || msg.includes('NOT_FOUND')) {
    return 'Ye booking nahi mili. Page refresh karke dekhiye.';
  }
  return 'Kuch gadbad hui, thodi der baad phir try karein.';
}
