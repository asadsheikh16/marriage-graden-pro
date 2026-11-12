// lib/csv.ts — CSV banane ka chhota helper (Excel ke liye BOM ke saath).

/** Ek cell ko CSV ke liye safe karo: comma, quote ya new line ho to quotes mein */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** rows (object list) ko CSV string mein badlo. columns = kaun se keys, kis order mein. */
export function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const header = columns.map(csvCell).join(',');
  const body = rows.map((r) => columns.map((c) => csvCell(r[c])).join(','));
  // \uFEFF = BOM, taaki Excel Hindi/rupee sahi padhe
  return '\uFEFF' + [header, ...body].join('\r\n') + '\r\n';
}
