// lib/season.ts — Peak / off-season ka hisaab (UI copy).
// schema.sql ka season_of() wahi rule lagata hai:
//  - garden ki peak_seasons ki koi row hai to: date kisi range mein ho to peak, warna off
//  - koi row nahi to: Nov, Dec, Jan, Feb = peak; baaki off-season

import type { Season } from './money';

export interface PeakWindow {
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
}

const DEFAULT_PEAK_MONTHS = [11, 12, 1, 2];

export function seasonFor(dateISO: string, windows: PeakWindow[]): Season {
  if (windows.length > 0) {
    const inside = windows.some((w) => dateISO >= w.start_date && dateISO <= w.end_date);
    return inside ? 'peak' : 'off';
  }
  const month = Number(dateISO.slice(5, 7));
  return DEFAULT_PEAK_MONTHS.includes(month) ? 'peak' : 'off';
}
