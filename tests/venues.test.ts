import { describe, it, expect } from 'vitest';
import {
  slugify, isISODate, isHttpsUrl, splitLines, splitList, normalizeSearch, buildMonthGrid,
  shiftMonth, validMonth, bookedDates, rateRangeLabel, seoTitle, seoDescription, venueErrorMessage, SLUG_RE,
} from '../lib/venues';

describe('venues: slug aur links', () => {
  it('naam se slug banta hai', () => {
    expect(slugify('Shubh Garden Kota')).toBe('shubh-garden-kota');
    expect(slugify('  Royal  Lawn & Banquet!! ')).toBe('royal-lawn-banquet');
  });
  it('Hindi naam se slug khaali (caller fallback dega)', () => {
    expect(slugify('शुभ गार्डन')).toBe('');
  });
  it('slug regex: chhote letter, number, - ; 3 se 60', () => {
    expect(SLUG_RE.test('shubh-garden-1')).toBe(true);
    expect(SLUG_RE.test('ab')).toBe(false);
    expect(SLUG_RE.test('Has Upper')).toBe(false);
    expect(SLUG_RE.test('a'.repeat(61))).toBe(false);
  });
  it('https link check', () => {
    expect(isHttpsUrl('https://maps.google.com/?q=x')).toBe(true);
    expect(isHttpsUrl('http://x.com')).toBe(false);
    expect(isHttpsUrl('javascript:alert(1)')).toBe(false);
  });
  it('lines aur comma lists saaf hote hain', () => {
    expect(splitLines('a.jpg\n\n  b.jpg \r\n')).toEqual(['a.jpg', 'b.jpg']);
    expect(splitList('AC hall, Parking,, ')).toEqual(['AC hall', 'Parking']);
  });
});

describe('venues: date aur search params', () => {
  it('ISO date sahi aur galat', () => {
    expect(isISODate('2027-03-01')).toBe(true);
    expect(isISODate('2027-02-30')).toBe(false);
    expect(isISODate('01-03-2027')).toBe(false);
    expect(isISODate(undefined)).toBe(false);
  });
  it('beeti date search se hat jaati hai', () => {
    const r = normalizeSearch({ city: ' Kota ', date: '2026-01-01' }, '2026-11-12');
    expect(r.date).toBeNull();
    expect(r.city).toBe('Kota');
  });
  it('guests, event type galat ho to null', () => {
    const r = normalizeSearch({ guests: '0', event: 'xyz' }, '2026-11-12');
    expect(r.guests).toBeNull();
    expect(r.eventType).toBeNull();
    const ok = normalizeSearch({ guests: '1,200', event: 'shaadi', date: '2027-03-01' }, '2026-11-12');
    expect(ok.guests).toBe(1200);
    expect(ok.eventType).toBe('shaadi');
    expect(ok.date).toBe('2027-03-01');
  });
});

describe('venues: calendar grid (sirf Khaali / Booked)', () => {
  it('March 2027 ka grid: 31 din, Sunday se shuru, har week 7 cells', () => {
    const weeks = buildMonthGrid('2027-03', new Set(['2027-03-02']), '2027-03-01');
    const cells = weeks.flat();
    expect(cells.length % 7).toBe(0);
    const days = cells.filter((c) => c.day !== null);
    expect(days.length).toBe(31);
    // 1 March 2027 is a Monday -> one blank before it (Sunday)
    expect(weeks[0][0].state).toBe('blank');
    expect(weeks[0][1].date).toBe('2027-03-01');
  });
  it('booked din Booked, baaki Khaali, beeti din past', () => {
    const weeks = buildMonthGrid('2027-03', new Set(['2027-03-02']), '2027-03-02');
    const byDate = new Map(weeks.flat().filter((c) => c.date).map((c) => [c.date as string, c.state]));
    expect(byDate.get('2027-03-01')).toBe('past');
    expect(byDate.get('2027-03-02')).toBe('booked');
    expect(byDate.get('2027-03-03')).toBe('khaali');
  });
  it('bookedDates rows se set banta hai', () => {
    expect(bookedDates([{ event_date: '2027-03-01' }, { event_date: '2027-03-01' }]).size).toBe(1);
  });
  it('mahine badalna aur valid month', () => {
    expect(shiftMonth('2027-12', 1)).toBe('2028-01');
    expect(shiftMonth('2027-01', -1)).toBe('2026-12');
    expect(validMonth('2027-13', '2026-11')).toBe('2026-11');
    expect(validMonth('2027-04', '2026-11')).toBe('2027-04');
  });
});

describe('venues: rate range, SEO, errors', () => {
  it('rate sirf range: min se max', () => {
    expect(rateRangeLabel(350, 150000)).toBe('₹350 se ₹1,50,000 tak');
    expect(rateRangeLabel(null, null)).toBeNull();
  });
  it('title aur description mein city, Hindi aur English dono', () => {
    const t = seoTitle('Shubh Garden', 'Kota');
    expect(t).toContain('Kota');
    expect(t).toContain('शादी');
    const d = seoDescription('Shubh Garden', 'Kota', 500);
    expect(d).toContain('Kota');
    expect(d).toContain('Marriage garden in Kota');
    expect(d).toContain('500 mehmaan tak');
  });
  it('RPC error ka saaf Hinglish message, technical code nahi', () => {
    expect(venueErrorMessage('NOT_LISTED')).toMatch(/public list/);
    expect(venueErrorMessage('RATE_LIMITED')).toMatch(/Thodi der baad/);
    expect(venueErrorMessage('BAD_INPUT: phone')).toMatch(/10 digit/);
    expect(venueErrorMessage('something 42501 raw')).not.toMatch(/42501/);
    expect(venueErrorMessage(undefined)).toMatch(/gadbad/);
  });
});
