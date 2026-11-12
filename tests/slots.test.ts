// Double-booking rule ke tests: din / raat / full day, cancelled, hold, edit.
import { describe, it, expect } from 'vitest';
import { findClash, slotsOverlap, slotParts, type SlotBooking } from '../lib/slots';
import { friendlyDbError } from '../lib/errors';

const D = '2027-01-10';
const b = (over: Partial<SlotBooking> & { id?: string }): SlotBooking => ({
  id: 'x', event_date: D, slot: 'din', status: 'confirmed', ...over,
});

describe('slotsOverlap — din / raat / full', () => {
  it('din aur din clash karte hain', () => expect(slotsOverlap('din', 'din')).toBe(true));
  it('raat aur raat clash karte hain', () => expect(slotsOverlap('raat', 'raat')).toBe(true));
  it('din aur raat clash NAHI karte', () => expect(slotsOverlap('din', 'raat')).toBe(false));
  it('full day din se clash karta hai', () => expect(slotsOverlap('full', 'din')).toBe(true));
  it('full day raat se clash karta hai', () => expect(slotsOverlap('raat', 'full')).toBe(true));
  it('full day full day se clash karta hai', () => expect(slotsOverlap('full', 'full')).toBe(true));
  it('slotParts: full = din + raat', () => expect(slotParts('full')).toEqual(['din', 'raat']));
});

describe('findClash — UI warning ka rule', () => {
  it('same date aur same slot par confirmed booking ho to clash', () => {
    const r = findClash({ event_date: D, slot: 'din' }, [b({ slot: 'din' })]);
    expect(r).not.toBeNull();
  });

  it('same date, din booked, raat naya: clash nahi', () => {
    expect(findClash({ event_date: D, slot: 'raat' }, [b({ slot: 'din' })])).toBeNull();
  });

  it('din booked hai, full day maango: clash', () => {
    expect(findClash({ event_date: D, slot: 'full' }, [b({ slot: 'din' })])).not.toBeNull();
  });

  it('din + raat booked hain, full day maango: clash', () => {
    const existing = [b({ id: 'a', slot: 'din' }), b({ id: 'c', slot: 'raat' })];
    expect(findClash({ event_date: D, slot: 'full' }, existing)).not.toBeNull();
  });

  it('full day booked hai, raat maango: clash', () => {
    expect(findClash({ event_date: D, slot: 'raat' }, [b({ slot: 'full' })])).not.toBeNull();
  });

  it('cancelled booking clash nahi karti', () => {
    expect(findClash({ event_date: D, slot: 'din' }, [b({ status: 'cancelled' })])).toBeNull();
  });

  it('hold clash nahi karta (hold confirmed ko nahi rokta)', () => {
    expect(findClash({ event_date: D, slot: 'din' }, [b({ status: 'hold' })])).toBeNull();
  });

  it('alag date par clash nahi', () => {
    expect(findClash({ event_date: '2027-01-11', slot: 'din' }, [b({})])).toBeNull();
  });

  it('edit ke time apni hi booking se clash nahi', () => {
    expect(findClash({ id: 'x', event_date: D, slot: 'din' }, [b({ id: 'x' })])).toBeNull();
  });

  it('dusri booking edit karte waqt uski clash pakdi jaaye', () => {
    expect(findClash({ id: 'y', event_date: D, slot: 'din' }, [b({ id: 'x' })])).not.toBeNull();
  });
});

describe('friendlyDbError — DB guard ka message', () => {
  it('23505 + double booking message => Hinglish warning', () => {
    const msg = friendlyDbError({ code: '23505', message: 'Is date par booking already hai (2027-01-10 din)' });
    expect(msg).toContain('Is date par booking already hai');
  });
  it('permission error => owner se poochhiye', () => {
    expect(friendlyDbError({ code: '42501', message: 'OWNER_ONLY' })).toContain('permission');
  });
  it('check constraint => paise ka hisaab galat', () => {
    expect(friendlyDbError({ code: '23514' })).toContain('Paise');
  });
  it('kuch aur => generic message, SQL code nahi', () => {
    const m = friendlyDbError({ code: 'XX000', message: 'boom' });
    expect(m).not.toContain('XX000');
  });
});
