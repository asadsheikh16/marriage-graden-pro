// Phase 1 (calendar): month grid, dots — Booked (burgundy), Hold (gold), Available (chhota green dot).
// Din par tap karne se neeche us din ka booking card. Query aur date logic pehle jaisi hai.
// Phase 1 change: function type ka chip FunctionTag (ek hi naam-source) se; slot aur type alag dikhte hain.
import Link from 'next/link';
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { requireGarden } from '@/lib/auth';
import { todayISO, monthRange, prettyDate, SLOT_LABEL } from '@/lib/format';
import { FunctionTag } from '@/components/FunctionTag';

export default async function CalendarPage({ params, searchParams }: {
  params: Promise<{ gardenId: string }>; searchParams: Promise<{ m?: string; d?: string }>;
}) {
  const sp = await searchParams;
  const { gardenId: gid } = await params;
  const { sb } = await requireGarden(gid);

  const ym = /^\d{4}-\d{2}$/.test(sp.m ?? '') ? sp.m! : todayISO().slice(0, 7);
  const sel = /^\d{4}-\d{2}-\d{2}$/.test(sp.d ?? '') ? sp.d! : null;
  const { from, to } = monthRange(ym);

  const { data } = await sb.from('bookings')
    .select('id, event_date, slot, status, customer_name, event_type')
    .eq('garden_id', gid).gte('event_date', from).lte('event_date', to).neq('status', 'cancelled')
    .order('event_date');
  const rows = data ?? [];

  // Har din ka status: confirmed ho to booked dot, sirf hold ho to hold dot, kuch na ho to available
  const dayState = new Map<string, { confirmed: boolean; hold: boolean }>();
  for (const r of rows) {
    const cur = dayState.get(r.event_date) ?? { confirmed: false, hold: false };
    if (r.status === 'confirmed') cur.confirmed = true;
    if (r.status === 'hold') cur.hold = true;
    dayState.set(r.event_date, cur);
  }

  const [y, m] = ym.split('-').map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(); // 0 = Sunday
  const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const dayRows = sel ? rows.filter((r) => r.event_date === sel) : [];
  const monthName = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, 1)));
  const today = todayISO();

  return (
    <main className="space-y-5 p-4 md:p-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="rmg-eyebrow">Calendar</p>
          <h1 className="rmg-title mt-1 text-2xl font-semibold">{monthName}</h1>
        </div>
        <div className="flex gap-2">
          <Link href={`?m=${prev}`} aria-label="Pichla mahina" className="rmg-btn rmg-btn-ghost h-11 w-11 !px-0"><ChevronLeft size={18} aria-hidden="true" /></Link>
          <Link href={`?m=${next}`} aria-label="Agla mahina" className="rmg-btn rmg-btn-ghost h-11 w-11 !px-0"><ChevronRight size={18} aria-hidden="true" /></Link>
        </div>
      </header>

      <section className="rmg-card p-3 md:p-5" aria-label="Mahine ka calendar">
        <div className="grid grid-cols-7 gap-1 pb-2 text-center text-[14px] font-semibold uppercase tracking-wide text-brown/70">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (day === null) return <div key={`b${i}`} />;
            const date = `${ym}-${String(day).padStart(2, '0')}`;
            const st = dayState.get(date);
            const isSel = sel === date;
            const isToday = today === date;
            return (
              <Link key={date} href={`?m=${ym}&d=${date}`}
                aria-label={`${prettyDate(date)}${st?.confirmed ? ', booked' : st?.hold ? ', hold' : ', khaali'}`}
                className={`flex min-h-[48px] flex-col items-center justify-center rounded-xl text-[15px] font-semibold transition-colors
                  ${isSel ? 'bg-burgundy text-ivory shadow-card' : 'text-brown hover:bg-ivory'}
                  ${isToday && !isSel ? 'ring-1 ring-gold' : ''}`}>
                <span>{day}</span>
                <span className="mt-1 flex h-2 items-center gap-0.5">
                  {st?.confirmed && <span className={`h-1.5 w-1.5 rounded-full ${isSel ? 'bg-ivory' : 'bg-burgundy'}`} />}
                  {st?.hold && <span className={`h-1.5 w-1.5 rounded-full ${isSel ? 'bg-gold-light' : 'bg-gold'}`} />}
                  {!st && <span className={`h-1.5 w-1.5 rounded-full ${isSel ? 'bg-ivory/80' : 'bg-success'}`} />}
                </span>
              </Link>
            );
          })}
        </div>
        <ul className="mt-4 flex flex-wrap gap-4 border-t border-gold/40 pt-3 text-sm font-semibold text-brown/85">
          <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-burgundy" aria-hidden="true" /> Booked</li>
          <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-gold" aria-hidden="true" /> Hold</li>
          <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-success" aria-hidden="true" /> Available</li>
        </ul>
      </section>

      {sel && (
        <section className="rmg-card p-4 md:p-5" aria-labelledby="day-h">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="rmg-eyebrow">Din ka haal</p>
              <h2 id="day-h" className="rmg-title text-xl font-semibold">{prettyDate(sel)}</h2>
            </div>
            <Link href={`/g/${gid}/bookings/new?event_date=${sel}`} className="rmg-btn rmg-btn-primary">
              <Plus size={18} aria-hidden="true" /> Is din booking
            </Link>
          </div>
          {dayRows.length === 0 && (
            <p className="mt-3 flex items-center gap-2 text-[15px] font-semibold text-success">
              <CalendarDays size={18} aria-hidden="true" /> Is din sab khaali hai.
            </p>
          )}
          <ul className="mt-3 space-y-2">
            {dayRows.map((r) => (
              <li key={r.id}>
                <Link href={`/g/${gid}/bookings/${r.id}`} className="flex min-h-[52px] items-center justify-between gap-3 rounded-xl border border-gold/40 bg-ivory/60 px-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-brown">{r.customer_name}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-2 text-[14px] text-brown/80">
                      <FunctionTag type={r.event_type} />
                      <span>{SLOT_LABEL[r.slot] ?? r.slot}</span>
                    </span>
                  </span>
                  {r.status === 'hold' ? <span className="rmg-chip rmg-chip-hold">Hold</span> : <span className="rmg-chip rmg-chip-green">Booked</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
