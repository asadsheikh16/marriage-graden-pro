import { requireGarden } from '@/lib/auth';
import { canSeeMoney } from '@/lib/roles';
import { Flash } from '@/components/Flash';
import { BookingFields, type RateRow } from '@/components/BookingFields';
import { saveBooking } from '../actions';

// Naya booking form. Owner ko rate card aur paisa wala hissa bhi. Staff ko sirf details.
export default async function NewBookingPage({ params, searchParams }: {
  params: Promise<{ gardenId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const { gardenId: gid } = await params;
  const { sb, role } = await requireGarden(gid);
  const owner = canSeeMoney(role);
  const { data: items } = owner
    ? await sb.from('rate_items').select('id, name, unit_type, peak_rate, off_rate').eq('garden_id', gid).eq('active', true).order('sort_order')
    : { data: [] as RateRow[] };

  // Default: event items = 1, plate items = guests (URL ke guests se)
  const guests = sp.guests ?? '';
  const qty: Record<string, string> = {};
  for (const it of (items ?? []) as RateRow[]) {
    qty[it.id] = sp[`qty_${it.id}`] ?? (it.unit_type === 'plate' ? guests : '1');
  }

  return (
    <main className="p-4">
      <h1 className="text-xl font-bold text-navy">Naya booking</h1>
      <Flash error={sp.error} />
      <form action={saveBooking.bind(null, gid, null)} className="mt-4 space-y-4">
        <BookingFields v={sp} owner={owner} items={(items ?? []) as RateRow[]} qty={qty} />
        <button className="w-full rounded-lg bg-navy p-3 font-semibold text-white">Booking save karein</button>
      </form>
    </main>
  );
}
