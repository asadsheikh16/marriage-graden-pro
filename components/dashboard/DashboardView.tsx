// Phase 1 (dashboard): presentational hissa. Order: chhota greeting -> "Aaj ke functions" (upar) ->
// chhote stat cards (barabar height) -> "Aane wale functions" -> Quick actions.
// Money (pending, kamai) sirf owner ke props mein aata hai; staff ke case mein ye props undefined rahte hain.
// Koi hardcoded number nahi: sab page.tsx se aata hai (Supabase data).
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { CalendarDays, Users, Wallet, Clock, Plus, BookMarked, PhoneCall } from 'lucide-react';
import { formatINR, SLOT_LABEL } from '@/lib/format';
import { FunctionTag } from '@/components/FunctionTag';

export interface DashBooking { id: string; customer_name: string; slot: string; status: string; event_type: string; event_date?: string }

export interface DashboardData {
  gid: string;
  gardenName: string;
  greeting: string;
  dateLabel: string;
  todays: DashBooking[];
  monthCount: number;
  monthGuests: number;
  growthPct: number | null;      // sirf jab pichle mahine ka asli data ho, warna null (chip nahi dikhta)
  upcoming: DashBooking[];
  owner: boolean;
  pendingTotal?: number;         // owner only
  pendingCount?: number;         // owner only
  yearRevenue?: number;          // owner only
  monthLabel: string;            // mahine ka naam, tarikh se (page.tsx mein)
}

export function DashboardView(d: DashboardData) {
  const base = `/g/${d.gid}`;
  const shown = d.todays.slice(0, 2);
  const more = d.todays.length - shown.length;
  return (
    <main className="space-y-4 p-4 md:p-6">
      {/* Chhota greeting card */}
      <section className="rmg-hero px-4 py-3 md:px-6 md:py-4">
        <p className="text-[14px] font-semibold" style={{ color: '#E9CF8C' }}>{d.dateLabel}</p>
        <h1 className="rmg-title mt-0.5 text-2xl font-semibold" style={{ color: '#FFF5E6' }}>{d.greeting}</h1>
        <p className="text-[14px]" style={{ color: '#F3E3C4' }}>{d.gardenName}</p>
      </section>

      {/* Aaj ke functions: sabse upar */}
      <section className="rmg-card flex h-full flex-col p-4" aria-labelledby="today-h">
        <div className="flex items-center justify-between gap-3">
          <h2 id="today-h" className="rmg-title text-xl font-semibold">Aaj ke functions</h2>
          <Link href={`${base}/calendar`} className="inline-flex min-h-[44px] items-center text-[15px] font-semibold text-burgundy underline underline-offset-4">Calendar</Link>
        </div>
        {d.todays.length === 0 && <p className="mt-3 text-[15px] text-brown/80">Aaj koi function nahi hai. Din khaali hai.</p>}
        <ul className="mt-3 space-y-2">
          {shown.map((b) => (
            <li key={b.id}>
              <Link href={`${base}/bookings/${b.id}`} className="flex min-h-[56px] items-center justify-between gap-3 rounded-xl border border-gold/40 bg-ivory/60 px-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-brown">{b.customer_name}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-[14px] text-brown/80">
                    <FunctionTag type={b.event_type} />
                    <span>{SLOT_LABEL[b.slot] ?? b.slot}</span>
                  </span>
                </span>
                {b.status === 'hold' ? <span className="rmg-chip rmg-chip-hold">Hold</span> : <span className="rmg-chip rmg-chip-green">Booked</span>}
              </Link>
            </li>
          ))}
        </ul>
        {more > 0 && (
          <p className="mt-2 text-[14px] text-brown/80">Aur {more} function aaj hain. <Link className="inline-flex min-h-[44px] items-center font-semibold text-burgundy underline" href={`${base}/bookings`}>Sab dekhein</Link></p>
        )}
      </section>

      {/* Stat cards: chhote, ek hi row mein barabar height (items-stretch + h-full) */}
      <section aria-label="Summary" className="grid grid-cols-2 items-stretch gap-3 md:grid-cols-4">
        <Stat label={`${d.monthLabel} ki bookings`} value={String(d.monthCount)} Icon={BookMarked}
          chip={d.growthPct !== null ? `${d.growthPct >= 0 ? '▲' : '▼'} ${Math.abs(d.growthPct)}% pichle mahine se` : undefined}
          chipTone={d.growthPct !== null && d.growthPct >= 0 ? 'green' : 'red'} />
        <Stat label="Guests (is mahine)" value={d.monthGuests.toLocaleString('en-IN')} Icon={Users} />
        {d.owner && d.pendingTotal !== undefined && (
          <Stat label="Pending payment" value={formatINR(d.pendingTotal)} Icon={Clock}
            sub={`${d.pendingCount ?? 0} bookings ka baaki`} tone="burgundy" />
        )}
        {d.owner && d.yearRevenue !== undefined && (
          <Stat label="Is saal ki kamai" value={formatINR(d.yearRevenue)} Icon={Wallet}
            sub="Confirmed bookings ka total (sirf owner)" tone="gold" />
        )}
      </section>

      {d.upcoming.length > 0 && (
        <section className="rmg-card p-4" aria-labelledby="up-h">
          <h2 id="up-h" className="rmg-title text-xl font-semibold">Aane wale functions</h2>
          <ul className="mt-3 divide-y divide-gold/30">
            {d.upcoming.map((b) => (
              <li key={b.id}>
                <Link href={`${base}/bookings/${b.id}`} className="flex min-h-[56px] items-center justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-brown">{b.customer_name}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-2 text-[14px] text-brown/80">
                      {b.event_date && <span>{b.event_date}</span>}
                      <FunctionTag type={b.event_type} />
                    </span>
                  </span>
                  {b.status === 'hold' ? <span className="rmg-chip rmg-chip-hold">Hold</span> : <span className="rmg-chip rmg-chip-green">Booked</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="qa-h">
        <h2 id="qa-h" className="rmg-eyebrow mb-2">Quick actions</h2>
        <div className="grid grid-cols-2 items-stretch gap-3 md:grid-cols-4">
          <QuickAction href={`${base}/bookings/new`} label="Naya booking" Icon={Plus} gold />
          <QuickAction href={`${base}/calendar`} label="Calendar" Icon={CalendarDays} />
          <QuickAction href={`${base}/enquiries`} label="Enquiries" Icon={PhoneCall} />
          <QuickAction href={`${base}/bookings`} label="Bookings" Icon={BookMarked} />
        </div>
      </section>

      {!d.owner && (
        <p className="text-center text-[14px] text-brown/75">Staff view: paise, rates aur season totals owner ke paas hain.</p>
      )}
    </main>
  );
}

function Stat({ label, value, Icon, chip, chipTone, sub, tone }: {
  label: string; value: string; Icon: LucideIcon;
  chip?: string; chipTone?: 'green' | 'red'; sub?: string; tone?: 'burgundy' | 'gold';
}) {
  const valueTone = tone === 'burgundy' ? 'text-burgundy' : 'text-brown';
  return (
    <div className="rmg-card flex h-full flex-col p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[14px] font-semibold leading-snug text-brown/85">{label}</p>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ivory text-burgundy"><Icon size={14} aria-hidden={true} /></span>
      </div>
      <p className={`rmg-title mt-1 text-xl font-semibold ${valueTone}`}>{value}</p>
      <div className="mt-auto pt-1">
        {sub && <p className="text-[14px] leading-snug text-brown/80">{sub}</p>}
        {chip && <span className={`mt-1 inline-flex rmg-chip ${chipTone === 'red' ? 'rmg-chip-red' : 'rmg-chip-green'}`}>{chip}</span>}
      </div>
    </div>
  );
}

function QuickAction({ href, label, Icon, gold }: { href: string; label: string; Icon: LucideIcon; gold?: boolean }) {
  return (
    <Link href={href} className={`rmg-btn min-h-[56px] flex-col gap-1 py-3 ${gold ? 'rmg-btn-gold' : 'rmg-btn-ghost'}`}>
      <Icon size={20} aria-hidden={true} />
      <span className="text-[15px]">{label}</span>
    </Link>
  );
}
