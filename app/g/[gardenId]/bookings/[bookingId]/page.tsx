import Link from 'next/link';
import { requireGarden } from '@/lib/auth';
import { canEditBooking, canSeeMoney } from '@/lib/roles';
import { formatINR, prettyDate, SLOT_LABEL, EVENT_LABEL, IST_OFFSET } from '@/lib/format';
import { receiptText, reminderText, waLink } from '@/lib/whatsapp';
import { Flash } from '@/components/Flash';
import { BookingFields, type RateRow } from '@/components/BookingFields';
import { saveBooking, cancelBooking, saveChecklist } from '../actions';

// Booking ka detail: customer, paisa (owner), rate lines (owner), checklist, WhatsApp receipt aur reminder.
export default async function BookingDetail({ params, searchParams }: {
  params: Promise<{ gardenId: string; bookingId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const { gardenId: gid, bookingId: bid } = await params;
  const { sb, role } = await requireGarden(gid);
  const owner = canSeeMoney(role);

  const { data: b } = await sb.from('bookings').select('*').eq('id', bid).eq('garden_id', gid).maybeSingle();
  if (!b) {
    return <main className="p-4"><p>Ye booking nahi mili.</p><Link href={`/g/${gid}/bookings`} className="underline">Wapas list par</Link></main>;
  }
  const { data: checklist } = await sb.from('function_checklist').select('id, label, done').eq('booking_id', bid).order('label');

  type MoneyRow = { total_amount: number; balance: number; payment_status: string; advance: number; balance_paid: number; discount: number; subtotal: number };
  let money = null as MoneyRow | null;
  let lines = [] as { item_name: string; unit_type: string; quantity: number; unit_rate: number; line_total: number }[];
  let items: RateRow[] = [];
  let garden: { name: string } | null = null;
  const qty: Record<string, string> = {};
  if (owner) {
    const [m, l, it, g] = await Promise.all([
      sb.from('booking_money').select('*').eq('booking_id', bid).maybeSingle(),
      sb.from('booking_lines').select('*').eq('booking_id', bid),
      sb.from('rate_items').select('id, name, unit_type, peak_rate, off_rate').eq('garden_id', gid).eq('active', true).order('sort_order'),
      sb.from('gardens').select('name').eq('id', gid).single(),
    ]);
    money = m.data as MoneyRow | null;
    lines = (l.data ?? []) as typeof lines;
    items = (it.data ?? []) as RateRow[];
    garden = g.data as { name: string } | null;
    for (const line of lines) {
      const match = items.find((i) => i.name === line.item_name);
      if (match) qty[match.id] = String(line.quantity);
    }
  }

  // Form ki values: booking ki asli values, URL ke error-wali values se badli hui
  const v: Record<string, string | undefined> = {
    customer_name: b.customer_name, phone: b.phone, event_type: b.event_type, event_date: b.event_date,
    slot: b.slot, guests: String(b.guests), status: b.status, notes: b.notes ?? '',
    discount: money ? String(money.discount) : '', advance: money ? String(money.advance) : '', balance_paid: money ? String(money.balance_paid) : '',
    ...Object.fromEntries(Object.entries(sp).filter(([, val]) => val !== undefined)),
  };
  const hasError = Boolean(sp.error);
  const cancelled = b.status === 'cancelled';
  const received = money ? Number(money.advance) + Number(money.balance_paid) : 0;
  const receiptLink = owner && money && garden
    ? waLink(b.phone, receiptText({ gardenName: garden.name, customerName: b.customer_name, eventType: b.event_type, eventDate: b.event_date, slot: b.slot, total: Number(money.total_amount), received, balance: Number(money.balance) }))
    : null;
  const reminderLink = owner && money && garden
    ? waLink(b.phone, reminderText({ gardenName: garden.name, customerName: b.customer_name, eventDate: b.event_date, slot: b.slot, balance: Number(money.balance) }))
    : null;

  return (
    <main className="space-y-4 p-4">
      <Link href={`/g/${gid}/bookings`} className="text-sm underline">‹ Bookings</Link>
      <header>
        <h1 className="text-xl font-bold text-navy">{b.customer_name}</h1>
        <p className="text-sm text-stone-600">
          {prettyDate(b.event_date)} · {SLOT_LABEL[b.slot]} · {EVENT_LABEL[b.event_type]} · {b.phone}
          {b.status === 'hold' && <span className="ml-2 rounded bg-amber-200 px-1">HOLD</span>}
          {cancelled && <span className="ml-2 rounded bg-stone-300 px-1">CANCELLED</span>}
        </p>
        <p className="text-xs text-stone-500">Time: IST (+{IST_OFFSET.slice(1)})</p>
      </header>
      <Flash error={sp.error} ok={sp.saved === '1' && !hasError} />

      {owner && money && (
        <section className="grid grid-cols-2 gap-3 rounded-lg border bg-white p-4 text-sm">
          <div><p className="text-stone-500">Kul rakam</p><p className="font-semibold">{formatINR(Number(money.total_amount))}</p></div>
          <div><p className="text-stone-500">Mila (advance + balance)</p><p className="font-semibold">{formatINR(received)}</p></div>
          <div><p className="text-stone-500">Baaki</p><p className="font-semibold">{formatINR(Number(money.balance))}</p></div>
          <div><p className="text-stone-500">Status</p>
            <p className={`font-semibold ${money.payment_status === 'paid' ? 'text-green-700' : 'text-red-700'}`}>{money.payment_status === 'paid' ? 'Paid' : 'Pending'}</p></div>
          {lines.length > 0 && (
            <div className="col-span-2 border-t pt-2">
              {lines.map((l) => (
                <p key={l.item_name} className="flex justify-between"><span>{l.item_name} ({l.quantity} x {formatINR(Number(l.unit_rate))})</span><span>{formatINR(Number(l.line_total))}</span></p>
              ))}
            </div>
          )}
          <div className="col-span-2 flex flex-wrap gap-2 pt-2">
            {receiptLink && <a href={receiptLink} target="_blank" rel="noreferrer" className="rounded bg-green-600 px-3 py-2 text-white">Receipt WhatsApp par</a>}
            {reminderLink && <a href={reminderLink} target="_blank" rel="noreferrer" className="rounded border px-3 py-2">2 din pehle reminder</a>}
          </div>
        </section>
      )}

      <section id="checklist" className="rounded-lg border bg-white p-4">
        <h2 className="font-semibold">Function-day checklist</h2>
        <form action={saveChecklist.bind(null, gid, bid)} className="mt-2 space-y-2">
          {(checklist ?? []).map((c) => (
            <label key={c.id} className="flex items-center gap-3 p-1 text-sm">
              <input type="checkbox" name={`item_${c.id}`} defaultChecked={c.done} className="h-5 w-5" />
              {c.label}
            </label>
          ))}
          <button className="rounded bg-navy px-4 py-2 text-white">Checklist save</button>
        </form>
      </section>

      {canEditBooking(role) && !cancelled && (
        <section className="space-y-4 rounded-lg border bg-white p-4">
          <h2 className="font-semibold">Edit karein</h2>
          <form action={saveBooking.bind(null, gid, bid)} className="space-y-4">
            <BookingFields v={v} owner={owner} items={items} qty={qty} />
            <button className="w-full rounded-lg bg-navy p-3 font-semibold text-white">Changes save karein</button>
          </form>
          <form action={cancelBooking.bind(null, gid, bid)}>
            <button className="w-full rounded-lg border border-red-300 p-3 text-red-700">Booking cancel karein</button>
          </form>
        </section>
      )}
    </main>
  );
}
