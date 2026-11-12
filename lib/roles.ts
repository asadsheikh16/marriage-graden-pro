// lib/roles.ts — owner / staff ke rules (UI ke liye).
// Asli rokthaam RLS (schema.sql) mein hai. Ye functions sirf screen chhupane ke liye hain,
// aur tests se pakka hota hai ki owner aur staff ka farak sahi hai.

export type Role = 'owner' | 'staff';

/** Paisa, season totals, booking amounts: sirf owner */
export function canSeeMoney(role: Role | null | undefined): boolean {
  return role === 'owner';
}

/** Rate card edit aur season set karna: sirf owner */
export function canEditRates(role: Role | null | undefined): boolean {
  return role === 'owner';
}

/** CSV / data export: sirf owner */
export function canExport(role: Role | null | undefined): boolean {
  return role === 'owner';
}

/** Garden settings (marketplace toggle, city, rate range wali info): sirf owner */
export function canEditSettings(role: Role | null | undefined): boolean {
  return role === 'owner';
}

/** Staff add / remove: sirf owner */
export function canManageStaff(role: Role | null | undefined): boolean {
  return role === 'owner';
}

/** Booking ka edit, cancel, hold convert karna: sirf owner */
export function canEditBooking(role: Role | null | undefined): boolean {
  return role === 'owner';
}

/** Naya booking ya enquiry banana: owner aur staff dono */
export function canCreate(role: Role | null | undefined): boolean {
  return role === 'owner' || role === 'staff';
}

/** Function-day checklist tick karna: owner aur staff dono */
export function canTickChecklist(role: Role | null | undefined): boolean {
  return role === 'owner' || role === 'staff';
}
