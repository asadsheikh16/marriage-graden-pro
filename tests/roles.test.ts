// Role checks: owner sab kuch, staff sirf calendar / booking / enquiry / checklist.
import { describe, it, expect } from 'vitest';
import * as roles from '../lib/roles';
import { seasonFor } from '../lib/season';

describe('owner ke rights', () => {
  it('paisa, rates, export, staff, booking edit sab allowed', () => {
    expect(roles.canSeeMoney('owner')).toBe(true);
    expect(roles.canEditRates('owner')).toBe(true);
    expect(roles.canExport('owner')).toBe(true);
    expect(roles.canManageStaff('owner')).toBe(true);
    expect(roles.canEditBooking('owner')).toBe(true);
  });
});

describe('staff ke rights (ye sab NAHI)', () => {
  it('paisa / total earnings / season totals nahi dekh sakta', () => {
    expect(roles.canSeeMoney('staff')).toBe(false);
  });
  it('rates edit nahi kar sakta', () => {
    expect(roles.canEditRates('staff')).toBe(false);
  });
  it('data export nahi kar sakta', () => {
    expect(roles.canExport('staff')).toBe(false);
  });
  it('staff add / remove nahi kar sakta', () => {
    expect(roles.canManageStaff('staff')).toBe(false);
  });
  it('booking edit / cancel nahi kar sakta', () => {
    expect(roles.canEditBooking('staff')).toBe(false);
  });
});

describe('staff ke rights (ye HAAN)', () => {
  it('naya booking / enquiry bana sakta hai', () => {
    expect(roles.canCreate('staff')).toBe(true);
  });
  it('function-day checklist tick kar sakta hai', () => {
    expect(roles.canTickChecklist('staff')).toBe(true);
  });
});

describe('bina login / bina membership', () => {
  it('null role ko kuch bhi allowed nahi', () => {
    expect(roles.canSeeMoney(null)).toBe(false);
    expect(roles.canExport(undefined)).toBe(false);
    expect(roles.canCreate(null)).toBe(false);
  });
});

describe('seasonFor — peak / off', () => {
  it('bina season rows ke Nov-Feb peak', () => {
    expect(seasonFor('2027-01-15', [])).toBe('peak');
    expect(seasonFor('2026-11-01', [])).toBe('peak');
    expect(seasonFor('2027-07-15', [])).toBe('off');
  });
  it('owner ki season window ke andar peak, bahar off', () => {
    const w = [{ start_date: '2027-03-01', end_date: '2027-03-31' }];
    expect(seasonFor('2027-03-15', w)).toBe('peak');
    expect(seasonFor('2027-01-15', w)).toBe('off');
  });
});
