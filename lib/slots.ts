// lib/slots.ts — Din / Raat / Full Day ka double-booking rule (UI wali copy).
// Asli guard database mein hai (schema.sql: booking_slot_locks). Ye UI ko pehle hi warning deta hai.
//
// Rule:
//  - din  = sirf din
//  - raat = sirf raat
//  - full = din + raat dono (isliye full day din ya raat dono se clash karta hai)
//  - cancelled booking clash nahi karti
//  - hold clash nahi karta (hold sirf tentative hai; confirmed ko nahi rokta)

export type Slot = 'din' | 'raat' | 'full';
export type SlotPart = 'din' | 'raat';
export type BookingStatus = 'hold' | 'confirmed' | 'cancelled';

export interface SlotBooking {
  id?: string;
  event_date: string;   // YYYY-MM-DD
  slot: Slot;
  status: BookingStatus;
}

/** Slot ke andar ke hisse: full = ['din','raat'] */
export function slotParts(slot: Slot): SlotPart[] {
  return slot === 'full' ? ['din', 'raat'] : [slot];
}

/** Do slots ek-dusre se clash karte hain ya nahi */
export function slotsOverlap(a: Slot, b: Slot): boolean {
  const pb = slotParts(b);
  return slotParts(a).some((p) => pb.includes(p));
}

/**
 * Naye confirmed booking ke liye clash dhoondho.
 * Sirf confirmed bookings count hoti hain (hold, cancelled nahi).
 * existingId ko skip karo (edit ke time apni hi booking se clash na ho).
 * Clash mile to pehli clash wali booking, warna null.
 */
export function findClash(
  candidate: { event_date: string; slot: Slot; id?: string },
  existing: SlotBooking[],
): SlotBooking | null {
  for (const b of existing) {
    if (b.status !== 'confirmed') continue;          // hold / cancelled ignore
    if (b.id && candidate.id && b.id === candidate.id) continue; // apni hi booking
    if (b.event_date !== candidate.event_date) continue;
    if (slotsOverlap(b.slot, candidate.slot)) return b;
  }
  return null;
}

/** Hinglish warning jo screen par dikhti hai */
export const DOUBLE_BOOKING_MESSAGE = 'Is date par booking already hai';
