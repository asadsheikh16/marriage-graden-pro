import Link from 'next/link';
import { requireGarden } from '@/lib/auth';
import { canSeeMoney } from '@/lib/roles';
import { parsePage, rangeFor, PAGE_SIZE } from '@/lib/pagination';
import { todayISO, formatINR, SLOT_LABEL, EVENT_LABEL, prettyDate } from '@/lib/format';
import { Pager } from '@/components/Pager';

const FILTERS = ['all', 'upcoming', 'past', 'pending'] as const;

// Booking list: search (naam / phone / date), filter, pagination (20 per page, server side).
export default async function BookingsPage({ params, searchParams }: {
  params: Promise<{ gardenId: string }>;
  searchParams: Promise<{ q?: string; f?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const { gardenId: gid } = await params;
  const { sb, role } = await requireGarden(gid);
  const owner = canSeeMoney(role);
  const today = todayISO();
  const f = (FILTERS as readonly string[]).includes(sp.f ?? '') ? sp.f! : 'all';
  const q = (sp.q ?? '').trim().slice(0, 60);
  const page = parsePage(sp.page);
  const pendingFilter = f === 'pending' && owner;

  // Owner ko paisa wala join; pending filter ke liye inner join
  const money = owner ? `, booking_money${pendingFilter ? '!inner' : ''}(total_amount, balance, payment_status)` : '';
  let query = sb.from('bookings')
    .select(`id, customer_name, phone, event_type, event_date, slot, status${money}`, { count: 'exact' })
    .eq('garden_id', gid);

  if (f === 'upcoming') query = query.gte('event_date', today).neq('status', 'cancelled').order('event_date', { ascending: true });
  else if (f === 'past') query = query.lt('event_date', today).order('event_date', { ascending: false });
  else query = query.order('event_date', { ascending: false });

  if (pendingFilter) query = query.eq('booking_money.payment_status', 'pending').neq('status', 'cancelled');

  if (q) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(q)) {
      query = query.eq('event_date', q);
    } else {
      // , ( ) % jaise characters hata do taaki filter na toote
      const term = q.replace(/[,()%*]/g, '').trim();
      const digits = q.replace(/\D/g, '');
      const ors = [`customer_name.ilike.%${term}%`];
      if (digits.length >= 3) ors.push(`phone.ilike.%${digits}%`);
      query = query.or(ors.join(','));
    }
  }

  const { from, to } = rangeFor(page, PAGE_SIZE);
  const { data, count, error } = await query.range(from, to);
  const rows = (data ?? []) as unknown as Array<{
    id: string; customer_name: string; phone: string; event_type: string; event_date: string; slot: string; status: string;
    booking_money?: { total_amount: number; balance: number; payment_status: string } | null;
  }>;

  const tabs = [
    { key: 'all', label: 'Sab' }, { key: 'upcoming', label: 'Aane wale' },
    { key: 'past', label: 'Pichle' }, ...(owner ? [{ key: 'pending', label: 'Pending payment' }] : []),
  ];

  return (
    <main className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-navy">Bookings</h1>
        <Link href={`/g/${gid}/bookings/new`} className="rounded-lg bg-gold px-3 py-2 text-sm font-semibold text-navy">+ Naya</Link>
      </div>

      <form className="flex gap-2">
        <input name="q" defaultValue={q} placeholder="Naam, phone ya date (2027-01-10)" className="min-w-0 flex-1 rounded border bg-white p-2" />
        <input type="hidden" name="f" value={f} />
        <button className="rounded bg-navy px-4 text-white">Dhundo</button>
      </form>

      <div className="flex flex-wrap gap-2 text-sm">
        {tabs.map((t) => (
          <Link key={t.key} href={`?f=${t.key}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
            className={`rounded-full border px-3 py-1 ${f === t.key ? 'bg-navy text-white' : 'bg-white'}`}>{t.label}</Link>
        ))}
      </div>

      {error && <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">List load nahi hui. Refresh karein.</p>}
      {!error && rows.length === 0 && <p className="text-sm text-stone-600">Koi booking nahi mili.</p>}

      <ul className="divide-y rounded-lg border bg-white">
        {rows.map((b) => {
          const m = Array.isArray(b.booking_money) ? b.booking_money[0] : b.booking_money;
          return (
            <li key={b.id}>
              <Link href={`/g/${gid}/bookings/${b.id}`} className="block p-3">
                <div className="flex justify-between gap-2">
                  <span className="font-semibold">{b.customer_name}</span>
                  <span className="text-xs text-stone-500">{prettyDate(b.event_date)}</span>
                </div>
                <div className="text-xs text-stone-600">
                  {EVENT_LABEL[b.event_type]} · {SLOT_LABEL[b.slot]} · {b.phone}
                  {b.status === 'hold' && <span className="ml-2 rounded bg-amber-200 px-1">HOLD</span>}
                  {b.status === 'cancelled' && <span className="ml-2 rounded bg-stone-300 px-1">CANCELLED</span>}
                </div>
                {owner && m && (
                  <div className="mt-1 text-xs">
                    Baaki {formatINR(Number(m.balance))} ·{' '}
                    <span className={m.payment_status === 'paid' ? 'text-green-700' : 'text-red-700'}>
                      {m.payment_status === 'paid' ? 'Paid' : 'Pending'}
                    </span>
                  </div>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      <Pager base={`/g/${gid}/bookings`} page={page} count={count ?? 0} query={{ q, f }} />
    </main>
  );
}
