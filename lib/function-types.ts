// lib/function-types.ts — function (event) type ke naam ka EK hi source. Dashboard, calendar, bookings,
// enquiries, booking details aur public /venues sab yahin se naam lete hain (Phase 1: "same look everywhere").
// Keys database ki values hain (schema.sql ka check constraint): inhe mat badlo.
// Phase 1 change: pehle do alag maps the (format.ts aur venues.ts); ab ek map, ek hi spelling.
// Note: "Mehndi" abhi database mein ek allowed function type nahi hai (check constraint mein nahi),
// isliye ise yahan nahi jodha. Jodne ke liye alag migration chahiye (developer/owner ka faisla).

export const FUNCTION_TYPE_LABEL: Readonly<Record<string, string>> = {
  shaadi: 'Shaadi',
  reception: 'Reception',
  engagement: 'Engagement',
  tilak: 'Tilak',
  birthday_other: 'Birthday / other',
};

export const FUNCTION_TYPE_KEYS = Object.keys(FUNCTION_TYPE_LABEL) as readonly string[];

/** Function type ka naam. Ajnaat key aaye to wahi key dikhti hai (kuch khaali nahi). */
export function functionTypeLabel(key: string | null | undefined): string {
  if (!key) return '';
  return FUNCTION_TYPE_LABEL[key] ?? key;
}
