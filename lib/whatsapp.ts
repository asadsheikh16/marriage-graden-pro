// lib/whatsapp.ts — WhatsApp wale links (receipt aur reminder). Koi API nahi, sirf wa.me link.
// Customer ko link bhejna owner ka kaam hai (link khud message bhejta nahi, sirf chat khulti hai).

import { formatINR, EVENT_LABEL, SLOT_LABEL, prettyDate } from './format';

/** Phone ko wa.me ke format mein: 91 + 10 digit. Galat ho to null. */
export function normalizeWaPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return '91' + digits;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return null;
}

/** wa.me link, message pehle se bhara hua */
export function waLink(phone: string, text: string): string | null {
  const p = normalizeWaPhone(phone);
  if (!p) return null;
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`;
}

export interface ReceiptInput {
  gardenName: string;
  customerName: string;
  eventType: string;
  eventDate: string;
  slot: string;
  total: number;
  received: number;
  balance: number;
}

/** Advance receipt (Hinglish). Amount, date, slot sab saaf likhe hote hain. */
export function receiptText(i: ReceiptInput): string {
  return [
    `Namaste ${i.customerName} ji,`,
    `${i.gardenName} ki taraf se booking receipt:`,
    `Event: ${EVENT_LABEL[i.eventType] ?? i.eventType}`,
    `Date: ${prettyDate(i.eventDate)}`,
    `Slot: ${SLOT_LABEL[i.slot] ?? i.slot}`,
    `Kul rakam: ${formatINR(i.total)}`,
    `Abhi tak mila: ${formatINR(i.received)}`,
    `Baaki balance: ${formatINR(i.balance)}`,
    `Dhanyavaad! Kisi bhi sawal ke liye yahin message karein.`,
  ].join('\n');
}

export interface ReminderInput {
  gardenName: string;
  customerName: string;
  eventDate: string;
  slot: string;
  balance: number;
}

/** 2 din pehle ka reminder (Hinglish). Balance ho to yaad dilaata hai. */
export function reminderText(i: ReminderInput): string {
  const balanceLine = i.balance > 0
    ? `Baaki balance ${formatINR(i.balance)} hai, please time par jama karein.`
    : 'Aapka payment poora ho chuka hai.';
  return [
    `Namaste ${i.customerName} ji,`,
    `${i.gardenName} par aapka function ${prettyDate(i.eventDate)} ko hai (${SLOT_LABEL[i.slot] ?? i.slot}).`,
    balanceLine,
    'Kisi bhi tarah ki madad ke liye is chat par likhein. Dhanyavaad!',
  ].join('\n');
}
