import Link from 'next/link';
import { requireGarden } from '@/lib/auth';
import { canSeeMoney } from '@/lib/roles';
import { parsePage, rangeFor, PAGE_SIZE } from '@/lib/pagination';
import { todayISO, istDayBounds, formatINR, prettyDate, EVENT_LABEL, IST_OFFSET } from '@/lib/format';
import { Pager } from '@/components/Pager';
import { Flash } from '@/components/Flash';
import { createEnquiry, updateEnquiry } from './actions';

const STATUS_LABEL: Record<string, string> = { naya: 'Naya', visit: 'Visit', booked: 'Booked' };

// Enquiry list: call log, status (naya / visit / booked), call-back date+time, aaj ke call-backs.
export default async function EnquiriesPage({ params, searchParams }: {
  params: Promise<{ gardenId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const { gardenId: gid } = await params;
  const { sb, role } = await requireGarden(gid);
  const owner = canSeeMoney(role);
  const today = todayISO();
  const { start, end } = istDayBounds(today);
  const page = parsePage(sp.page);

  // Aaj ke call-backs (jo abhi booked nahi)
  const { data: callbacks } = await sb.from('enquiries')
    .select('id, customer_name, phone, callback_at, status')
    .eq('garden_id', gid).gte('callback_at', start).lt('callback_at', end).neq('status', 'booked')
    .order('callback_at');

  const { data, count, error } = await sb.from('enquiries')
    .select(`id, customer_name, phone, event_type, date_wanted, guests, status, callback_at${owner ? ', enquiry_quotes(rate_quoted)' : ''}`, { count: 'exact' })
    .eq('garden_id', gid).order('created_at', { ascending: false })
    .range(rangeFor(page, PAGE_SIZE).from, rangeFor(page, PAGE_SIZE).to);
  const rows = (data ?? []) as unknown as Array<{
    id: string; customer_name: string; phone: string | null; event_type: string | null; date_wanted: string | null; guests: number;
    status: string; callback_at: string | null; enquiry_quotes?: { rate_quoted: number } | { rate_quoted: number }[] | null;
  }>;

  return (
    <main className="space-y-4 p-4">
      <h1 className="text-xl font-bold text-navy">Enquiries</h1>
      <Flash error={sp.error} ok={sp.saved === '1'} />

      <section className="rounded-lg border border-gold/60 bg-amber-50 p-4">
        <h2 className="font-semibold">Aaj ke call-backs ({prettyDate(today)})</h2>
        {(callbacks ?? []).length === 0 && <p className="mt-2 text-sm text-stone-600">Aaj koi call-back nahi.</p>}
        <ul className="mt-2 divide-y">
          {(callbacks ?? []).map((c) => (
            <li key={c.id} className="flex justify-between py-2 text-sm">
              <span>{c.customer_name} {c.phone && <a className="text-navy underline" href={`tel:${c.phone}`}>{c.phone}</a>}</span>
              <span>{c.callback_at ? new Date(c.callback_at).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) : ''}</span>
            </li>
          ))}
        </ul>
      </section>

      <details className="rounded-lg border bg-white p-4" open={Boolean(sp.error) || undefined}>
        <summary className="cursor-pointer font-semibold">+ Nayi enquiry</summary>
        <form action={createEnquiry.bind(null, gid)} className="mt-3 grid gap-3 md:grid-cols-2">
          <input name="customer_name" required minLength={2} placeholder="Naam *" defaultValue={sp.customer_name ?? ''} className="rounded border p-3" />
          <input name="phone" inputMode="tel" placeholder="Phone" defaultValue={sp.phone ?? ''} className="rounded border p-3" />
          <input type="date" name="date_wanted" aria-label="Date wanted" defaultValue={sp.date_wanted ?? ''} className="rounded border p-3" />
          <input name="guests" inputMode="numeric" placeholder="Guests" defaultValue={sp.guests ?? ''} className="rounded border p-3" />
          <select name="event_type" defaultValue={sp.event_type ?? 'shaadi'} className="rounded border p-3">
            {Object.entries(EVENT_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <select name="status" defaultValue="naya" className="rounded border p-3">
            <option value="naya">Naya</option><option value="visit">Visit</option><option value="booked">Booked</option>
          </select>
          <input type="date" name="callback_date" aria-label="Call-back date" className="rounded border p-3" />
          <input type="time" name="callback_time" aria-label="Call-back time" className="rounded border p-3" />
          {owner && <input name="rate_quoted" inputMode="decimal" placeholder="Rate quote kiya (₹)" className="rounded border p-3" />}
          <textarea name="notes" rows={2} placeholder="Notes" className="rounded border p-3 md:col-span-2" />
          <button className="rounded-lg bg-navy p-3 font-semibold text-white md:col-span-2">Enquiry save karein</button>
        </form>
      </details>

      {error && <p className="text-sm text-red-700">List load nahi hui.</p>}
      <ul className="divide-y rounded-lg border bg-white">
        {rows.map((r) => {
          const quote = Array.isArray(r.enquiry_quotes) ? r.enquiry_quotes[0] : r.enquiry_quotes;
          return (
            <li key={r.id} className="p-3 text-sm">
              <div className="flex justify-between gap-2">
                <span className="font-semibold">{r.customer_name}</span>
                <span className="rounded bg-stone-100 px-2 text-xs">{STATUS_LABEL[r.status]}</span>
              </div>
              <div className="text-xs text-stone-600">
                {r.phone} · {r.event_type ? EVENT_LABEL[r.event_type] : ''} · {r.date_wanted ? prettyDate(r.date_wanted) : 'date nahi'} · {r.guests} guests
                {owner && quote && <> · quote {formatINR(Number(quote.rate_quoted))}</>}
              </div>
              {r.callback_at && <div className="text-xs text-stone-500">Call-back: {new Date(r.callback_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</div>}
              <form action={updateEnquiry.bind(null, gid, r.id)} className="mt-2 flex flex-wrap gap-2">
                <select name="status" defaultValue={r.status} className="rounded border p-2 text-xs">
                  <option value="naya">Naya</option><option value="visit">Visit</option><option value="booked">Booked</option>
                </select>
                <input type="date" name="callback_date" aria-label="Call-back date" className="rounded border p-2 text-xs" />
                <input type="time" name="callback_time" aria-label="Call-back time" className="rounded border p-2 text-xs" />
                <button className="rounded border px-3 text-xs">Update</button>
              </form>
            </li>
          );
        })}
      </ul>
      {rows.length === 0 && <p className="text-sm text-stone-600">Abhi koi enquiry nahi.</p>}
      <Pager base={`/g/${gid}/enquiries`} page={page} count={count ?? 0} query={{}} />
      <p className="text-xs text-stone-500">Booking banane ke liye <Link className="underline" href={`/g/${gid}/bookings/new`}>naya booking</Link> kholiye.</p>
    </main>
  );
}
