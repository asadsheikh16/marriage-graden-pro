// Pagination ke tests: page size 20, range, total pages, clamp.
import { describe, it, expect } from 'vitest';
import { PAGE_SIZE, parsePage, rangeFor, totalPages, clampPage } from '../lib/pagination';

describe('parsePage', () => {
  it('khaali / galat value par page 1', () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage('')).toBe(1);
    expect(parsePage('abc')).toBe(1);
    expect(parsePage('-4')).toBe(1);
    expect(parsePage('0')).toBe(1);
  });
  it('sahi number ko parse karta hai', () => {
    expect(parsePage('3')).toBe(3);
    expect(parsePage('12')).toBe(12);
  });
});

describe('rangeFor (Supabase .range inclusive)', () => {
  it('page size default 20', () => expect(PAGE_SIZE).toBe(20));
  it('page 1 = 0..19', () => expect(rangeFor(1)).toEqual({ from: 0, to: 19 }));
  it('page 2 = 20..39', () => expect(rangeFor(2)).toEqual({ from: 20, to: 39 }));
  it('page 5 = 80..99', () => expect(rangeFor(5)).toEqual({ from: 80, to: 99 }));
  it('page 0 ya negative bhi page 1 jaisa', () => expect(rangeFor(0)).toEqual({ from: 0, to: 19 }));
});

describe('totalPages', () => {
  it('khaali list = 1 page', () => expect(totalPages(0)).toBe(1));
  it('20 records = 1 page', () => expect(totalPages(20)).toBe(1));
  it('21 records = 2 pages', () => expect(totalPages(21)).toBe(2));
  it('lakh records = 5000 pages', () => expect(totalPages(100000)).toBe(5000));
});

describe('clampPage', () => {
  it('bahut bada page total tak limit ho jaaye', () => expect(clampPage(99, 3)).toBe(3));
  it('0 ya kam page 1 ho jaaye', () => expect(clampPage(0, 3)).toBe(1));
  it('sahi page waisa hi', () => expect(clampPage(2, 3)).toBe(2));
});
