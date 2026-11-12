// Form validation, phone cleaning, WhatsApp link, CSV ke tests.
import { describe, it, expect } from 'vitest';
import { cleanPhone, parseBookingForm, parseNumber } from '../lib/form';
import { waLink, normalizeWaPhone, receiptText } from '../lib/whatsapp';
import { toCsv, csvCell } from '../lib/csv';
import { monthRange, istDayBounds, formatINR, todayISO } from '../lib/format';

function fd(obj: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(obj)) f.append(k, v);
  return f;
}
const good = {
  customer_name: 'Ravi Kumar', phone: '+91 98765 43210', event_type: 'shaadi',
  event_date: '2027-01-10', slot: 'din', guests: '300', status: 'confirmed', notes: '',
};

describe('cleanPhone', () => {
  it('+91 wale number ko 10 digit banata hai', () => expect(cleanPhone('+91 98765 43210')).toBe('9876543210'));
  it('10 digit sahi', () => expect(cleanPhone('9876543210')).toBe('9876543210'));
  it('bahut chhota number null', () => expect(cleanPhone('12345')).toBeNull());
});

describe('parseBookingForm', () => {
  it('sahi form ok', () => {
    const r = parseBookingForm(fd(good));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.phone).toBe('9876543210');
  });
  it('naam chhota ho to error', () => {
    const r = parseBookingForm(fd({ ...good, customer_name: 'R' }));
    expect(r.ok).toBe(false);
  });
  it('galat event type error', () => {
    expect(parseBookingForm(fd({ ...good, event_type: 'party' })).ok).toBe(false);
  });
  it('galat date error', () => {
    expect(parseBookingForm(fd({ ...good, event_date: '10/01/2027' })).ok).toBe(false);
  });
  it('slot full day allowed', () => {
    expect(parseBookingForm(fd({ ...good, slot: 'full' })).ok).toBe(true);
  });
  it('guests negative ya decimal nahi', () => {
    expect(parseBookingForm(fd({ ...good, guests: '-3' })).ok).toBe(false);
    expect(parseBookingForm(fd({ ...good, guests: '2.5' })).ok).toBe(false);
  });
  it('status hold ho sakta hai, kuch aur confirmed', () => {
    const r = parseBookingForm(fd({ ...good, status: 'hold' }));
    expect(r.ok && r.value.status).toBe('hold');
    const r2 = parseBookingForm(fd({ ...good, status: 'cancelled' }));
    expect(r2.ok && r2.value.status).toBe('confirmed');
  });
  it('parseNumber: khaali 0, galat NaN', () => {
    expect(parseNumber('')).toBe(0);
    expect(parseNumber('1,50,000'.replace(/,/g, ''))).toBe(150000);
    expect(Number.isNaN(parseNumber('abc'))).toBe(true);
  });
});

describe('WhatsApp link aur receipt', () => {
  it('10 digit ko 91 ke saath wa.me link', () => {
    expect(normalizeWaPhone('9876543210')).toBe('919876543210');
    expect(waLink('9876543210', 'hi')).toBe('https://wa.me/919876543210?text=hi');
  });
  it('galat phone par null', () => expect(waLink('123', 'x')).toBeNull());
  it('receipt mein amount aur balance hote hain', () => {
    const t = receiptText({
      gardenName: 'Test Garden', customerName: 'Ravi', eventType: 'shaadi', eventDate: '2027-01-10',
      slot: 'din', total: 300000, received: 50000, balance: 250000,
    });
    expect(t).toContain('₹3,00,000');
    expect(t).toContain('₹2,50,000');
    expect(t).toContain('Test Garden');
  });
});

describe('CSV', () => {
  it('comma aur quote wali cell quotes mein', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell(null)).toBe('');
  });
  it('header aur rows, BOM ke saath', () => {
    const out = toCsv([{ a: 1, b: 'x' }], ['a', 'b']);
    expect(out.startsWith('\uFEFF')).toBe(true);
    expect(out).toContain('a,b\r\n1,x');
  });
});

describe('dates aur rupee', () => {
  it('month range February 2028 (leap year)', () => {
    expect(monthRange('2028-02')).toEqual({ from: '2028-02-01', to: '2028-02-29' });
  });
  it('IST din ki bounds +05:30 par', () => {
    expect(istDayBounds('2027-01-10')).toEqual({
      start: '2027-01-10T00:00:00+05:30', end: '2027-01-11T00:00:00+05:30',
    });
  });
  it('Indian rupee format', () => {
    expect(formatINR(150000)).toBe('₹1,50,000');
  });
  it('todayISO format YYYY-MM-DD', () => {
    expect(todayISO(new Date('2027-01-10T20:00:00Z'))).toBe('2027-01-11'); // IST raat 1:30
  });
});
