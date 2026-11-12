// Payment calculation ke tests: balance, paid/pending, discount, galat input.
import { describe, it, expect } from 'vitest';
import { calcBooking, lineTotal, rateFor, MoneyError, round2 } from '../lib/money';

const rent = { item_name: 'Hall / garden rent', unit_type: 'event' as const, quantity: 1, unit_rate: 150000 };
const plates = { item_name: 'Catering (per plate)', unit_type: 'plate' as const, quantity: 300, unit_rate: 500 };

describe('calcBooking — balance aur paid/pending', () => {
  it('subtotal lines ka jod hota hai', () => {
    const r = calcBooking({ lines: [rent, plates], discount: 0, advance: 0, balancePaid: 0 });
    expect(r.subtotal).toBe(300000);
    expect(r.total).toBe(300000);
  });

  it('advance ke baad balance = total - advance, status pending', () => {
    const r = calcBooking({ lines: [rent, plates], discount: 0, advance: 50000, balancePaid: 0 });
    expect(r.balance).toBe(250000);
    expect(r.received).toBe(50000);
    expect(r.status).toBe('pending');
  });

  it('poora balance jama hone par status paid, balance 0', () => {
    const r = calcBooking({ lines: [rent, plates], discount: 0, advance: 50000, balancePaid: 250000 });
    expect(r.balance).toBe(0);
    expect(r.status).toBe('paid');
  });

  it('advance + balance jama, dono milkar total ke barabar ho to paid', () => {
    const r = calcBooking({ lines: [rent], discount: 0, advance: 100000, balancePaid: 50000 });
    expect(r.status).toBe('paid');
  });

  it('kuch bhi nahi diya, total > 0 => pending', () => {
    const r = calcBooking({ lines: [rent], discount: 0, advance: 0, balancePaid: 0 });
    expect(r.status).toBe('pending');
    expect(r.balance).toBe(150000);
  });

  it('total 0 (khaali booking) kabhi paid nahi maana jaata', () => {
    const r = calcBooking({ lines: [], discount: 0, advance: 0, balancePaid: 0 });
    expect(r.total).toBe(0);
    expect(r.status).toBe('pending');
  });
});

describe('calcBooking — discount', () => {
  it('discount total ko ghatata hai, balance us hisaab se', () => {
    const r = calcBooking({ lines: [rent, plates], discount: 5000, advance: 50000, balancePaid: 0 });
    expect(r.total).toBe(295000);
    expect(r.balance).toBe(245000);
  });

  it('discount ke baad poora paisa mil jaaye to paid', () => {
    const r = calcBooking({ lines: [rent], discount: 10000, advance: 140000, balancePaid: 0 });
    expect(r.total).toBe(140000);
    expect(r.status).toBe('paid');
  });

  it('discount subtotal se zyada ho to error', () => {
    expect(() => calcBooking({ lines: [rent], discount: 150001, advance: 0, balancePaid: 0 })).toThrow(MoneyError);
  });

  it('discount 0 ya subtotal ke barabar allowed hai', () => {
    expect(() => calcBooking({ lines: [rent], discount: 150000, advance: 0, balancePaid: 0 })).not.toThrow();
  });
});

describe('calcBooking — galat input', () => {
  it('jama total se zyada ho to error (overpay)', () => {
    expect(() => calcBooking({ lines: [rent], discount: 0, advance: 100000, balancePaid: 60000 })).toThrow(MoneyError);
  });

  it('negative paisa par error', () => {
    expect(() => calcBooking({ lines: [rent], discount: -1, advance: 0, balancePaid: 0 })).toThrow(MoneyError);
    expect(() => calcBooking({ lines: [rent], discount: 0, advance: -5, balancePaid: 0 })).toThrow(MoneyError);
  });

  it('NaN paisa par error', () => {
    expect(() => calcBooking({ lines: [rent], discount: NaN, advance: 0, balancePaid: 0 })).toThrow(MoneyError);
  });
});

describe('lineTotal, rateFor, round2', () => {
  it('plate line = guests x rate', () => {
    expect(lineTotal(plates)).toBe(150000);
  });

  it('paise ka floating point sahi aata hai', () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(lineTotal({ item_name: 'x', unit_type: 'plate', quantity: 3, unit_rate: 33.33 })).toBe(99.99);
  });

  it('season ke hisaab se peak ya off rate', () => {
    const item = { id: '1', name: 'DJ', unit_type: 'event' as const, peak_rate: 25000, off_rate: 15000 };
    expect(rateFor(item, 'peak')).toBe(25000);
    expect(rateFor(item, 'off')).toBe(15000);
  });
});
