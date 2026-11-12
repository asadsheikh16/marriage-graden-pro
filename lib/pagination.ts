// lib/pagination.ts — server-side pagination ka hisaab (page size 20).
// Database se sirf ek page ka data aata hai (.range(from, to)), poori list nahi.
// Lakhon records ke liye ye zaroori hai.

export const PAGE_SIZE = 20;

/** URL ke ?page= ko samjho. Galat ya khaali ho to 1. */
export function parsePage(raw: string | undefined | null): number {
  const n = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

/** Supabase .range(from, to) ke liye 0-based inclusive range */
export function rangeFor(page: number, size: number = PAGE_SIZE): { from: number; to: number } {
  const safePage = Math.max(1, Math.floor(page));
  const from = (safePage - 1) * size;
  return { from, to: from + size - 1 };
}

/** Kul pages. Khaali list ka bhi 1 page maana jaata hai. */
export function totalPages(count: number, size: number = PAGE_SIZE): number {
  if (count <= 0) return 1;
  return Math.ceil(count / size);
}

/** Page ko 1 se total ke beech rakho (bahut bade page number par error na aaye) */
export function clampPage(page: number, total: number): number {
  return Math.min(Math.max(1, Math.floor(page)), Math.max(1, total));
}
