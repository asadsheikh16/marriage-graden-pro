// Phase 1 (dashboard): data yahan se, screen DashboardView mein. Pending payment aur kamai sirf owner ke
// case mein query hoti hain (staff ko paisa wali query hi nahi chalti). Growth % sirf asli pichle mahine
// ke data par. Koi hardcoded number nahi.
import { requireGarden } from '@/lib/auth';
import { canSeeMoney } from '@/lib/roles';
import { todayISO, monthRange, prettyDate } from '@/lib/format';
import { DashboardView, type DashBooking } from '@/components/dashboard/DashboardView';

function prevMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

function greetingFor(now: Date): string {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }).format(now));
  if (hour < 12) return 'Shubh subah';
  if (hour < 17) return 'Shubh dopahar';
  return 'Shubh shaam';
}

export default async function DashboardPage({ params }: { params: Promise<{ gardenId: string }> }) {
  const { gardenId: gid } = await params;
  const { sb, role } = await requireGarden(gid);
  const owner = canSeeMoney(role);
  const now = new Date();
  const today = todayISO(now);
  const ym = today.slice(0, 7);
  const { from, to } = monthRange(ym);
  const prev = monthRange(prevMonth(ym));
  const year = today.slice(0, 4);

  const [gardenRes, todayRes, monthRes, prevRes, upcomingRes] = await Promise.all([
    sb.from('gardens').select('name').eq('id', gid).single(),
    sb.from('bookings').select('id, customer_name, slot, status, event_type')
      .eq('garden_id', gid).eq('event_date', today).neq('status', 'cancelled').order('slot'),
    sb.from('bookings').select('id, guests')
      .eq('garden_id', gid).gte('event_date', from).lte('event_date', to).neq('status', 'cancelled'),
    sb.from('bookings').select('id', { count: 'exact', head: true })
      .eq('garden_id', gid).gte('event_date', prev.from).lte('event_date', prev.to).neq('status', 'cancelled'),
    sb.from('bookings').select('id, customer_name, slot, status, event_type, event_date')
      .eq('garden_id', gid).gt('event_date', today).neq('status', 'cancelled')
      .order('event_date', { ascending: true }).limit(3),
  ]);

  const monthRows = monthRes.data ?? [];
  const monthCount = monthRows.length;
  const monthGuests = monthRows.reduce((s, r) => s + Number(r.guests ?? 0), 0);
  const prevCount = prevRes.count ?? 0;
  // Growth sirf tab jab pichle mahine mein asli bookings hon
  const growthPct = prevCount > 0 ? Math.round(((monthCount - prevCount) / prevCount) * 100) : null;

  const data: Parameters<typeof DashboardView>[0] = {
    gid,
    gardenName: gardenRes.data?.name ?? '',
    greeting: greetingFor(now),
    dateLabel: prettyDate(today),
    todays: (todayRes.data ?? []) as DashBooking[],
    monthCount,
    monthGuests,
    growthPct,
    monthLabel: new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', month: 'long' }).format(now),
    upcoming: (upcomingRes.data ?? []) as DashBooking[],
    owner,
  };

  if (owner) {
    // Paisa ka hisaab: sirf owner. RLS staff ko ye rows waise bhi nahi deta.
    const [pend, season] = await Promise.all([
      sb.from('booking_money').select('balance, bookings!inner(status)')
        .eq('garden_id', gid).eq('payment_status', 'pending').gt('balance', 0).eq('bookings.status', 'confirmed'),
      sb.rpc('season_summary', { p_garden: gid, p_from: `${year}-01-01`, p_to: `${year}-12-31` }),
    ]);
    const pendRows = pend.data ?? [];
    data.pendingTotal = pendRows.reduce((s, r) => s + Number(r.balance), 0);
    data.pendingCount = pendRows.length;
    const seasons = (season.data ?? []) as { total_value: number }[];
    data.yearRevenue = seasons.reduce((s, r) => s + Number(r.total_value), 0);
  }

  return <DashboardView {...data} />;
}
