import Link from 'next/link';
import { clampPage, totalPages } from '@/lib/pagination';

// Server-side pagination ke buttons (20 per page). Baaki filters URL mein rehte hain.
export function Pager({ base, page, count, query }: {
  base: string; page: number; count: number; query: Record<string, string | undefined>;
}) {
  const total = totalPages(count);
  const current = clampPage(page, total);
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v) sp.set(k, v);
    sp.set('page', String(p));
    return `${base}?${sp.toString()}`;
  };
  return (
    <nav className="flex items-center justify-between pt-3 text-sm" aria-label="Pages">
      {current > 1 ? <Link className="rounded border bg-white px-3 py-2" href={href(current - 1)}>‹ Pichla</Link> : <span />}
      <span className="text-stone-600">Page {current} / {total} · kul {count}</span>
      {current < total ? <Link className="rounded border bg-white px-3 py-2" href={href(current + 1)}>Agla ›</Link> : <span />}
    </nav>
  );
}
