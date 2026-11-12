// Phase 1 (rates): owner-only page. Change: staff ke direct URL par ab redirect (307 to dashboard), pehle 200 "sirf owner" text tha. Rates ki query role check ke baad hi chalti hai.
import { redirect } from 'next/navigation';
import { requireGarden } from '@/lib/auth';
import { canEditRates } from '@/lib/roles';
import { formatINR, prettyDate } from '@/lib/format';
import { Flash } from '@/components/Flash';
import { updateRate, addRate, addSeason, deleteSeason } from './actions';

// Rate card aur season (sirf owner). Staff ko ye page nahi milta.
// Phase 1 change: staff ke direct URL par ab redirect hota hai (pehle 200 par "sirf owner" text tha).
// Queries role check ke BAAD chalti hain, staff ke liye koi rate query nahi.
export default async function RatesPage({ params, searchParams }: {
  params: Promise<{ gardenId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const { gardenId: gid } = await params;
  const { sb, role } = await requireGarden(gid);
  if (!canEditRates(role)) redirect(`/g/${gid}`);
  const [{ data: items }, { data: seasons }] = await Promise.all([
    sb.from('rate_items').select('*').eq('garden_id', gid).order('sort_order'),
    sb.from('peak_seasons').select('*').eq('garden_id', gid).order('start_date'),
  ]);

  return (
    <main className="space-y-6 p-4">
      <h1 className="text-xl font-bold text-navy">Rate card aur season</h1>
      <Flash error={sp.error} ok={sp.saved === '1'} />

      <section className="space-y-3">
        <h2 className="font-semibold">Rate items</h2>
        <p className="text-xs text-stone-600">Peak aur off-season ke rate alag. Booking banate waqt season ke hisaab se apne aap lagte hain.</p>
        {(items ?? []).map((it) => (
          <form key={it.id} action={updateRate.bind(null, gid, it.id)} className="grid grid-cols-2 gap-2 rounded-lg border bg-white p-3 md:grid-cols-6">
            <input name="name" defaultValue={it.name} className="col-span-2 rounded border p-2 md:col-span-2" />
            <label className="text-xs">Peak ₹<input name="peak_rate" inputMode="decimal" defaultValue={it.peak_rate} className="mt-1 w-full rounded border p-2" /></label>
            <label className="text-xs">Off ₹<input name="off_rate" inputMode="decimal" defaultValue={it.off_rate} className="mt-1 w-full rounded border p-2" /></label>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="active" defaultChecked={it.active} /> Active</label>
            <button className="rounded bg-navy px-3 py-2 text-sm text-white">Save</button>
            <p className="col-span-2 text-xs text-stone-500 md:col-span-6">{it.unit_type === 'plate' ? 'Per plate (guests ke hisaab se)' : 'Per event (ek baar)'} · abhi peak {formatINR(Number(it.peak_rate))} / off {formatINR(Number(it.off_rate))}</p>
          </form>
        ))}
        <form action={addRate.bind(null, gid)} className="grid grid-cols-2 gap-2 rounded-lg border border-dashed p-3 md:grid-cols-5">
          <input name="name" required placeholder="Naya item (jaise Mehndi stage)" className="col-span-2 rounded border p-2" />
          <select name="unit_type" className="rounded border p-2"><option value="event">Per event</option><option value="plate">Per plate</option></select>
          <input name="peak_rate" inputMode="decimal" placeholder="Peak ₹" className="rounded border p-2" />
          <input name="off_rate" inputMode="decimal" placeholder="Off ₹" className="rounded border p-2" />
          <button className="col-span-2 rounded bg-gold p-2 font-semibold text-navy md:col-span-5">+ Item jodein</button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Peak season (muhurat wale dates)</h2>
        <p className="text-xs text-stone-600">Agar yahan koi date nahi, to Nov se Feb tak peak maana jaata hai.</p>
        <ul className="divide-y rounded-lg border bg-white">
          {(seasons ?? []).map((s) => (
            <li key={s.id} className="flex items-center justify-between p-3 text-sm">
              <span>{s.label}: {prettyDate(s.start_date)} se {prettyDate(s.end_date)}</span>
              <form action={deleteSeason.bind(null, gid, s.id)}><button className="text-red-700 underline">Hatao</button></form>
            </li>
          ))}
          {(seasons ?? []).length === 0 && <li className="p-3 text-sm text-stone-600">Abhi koi custom season nahi.</li>}
        </ul>
        <form action={addSeason.bind(null, gid)} className="grid grid-cols-2 gap-2 rounded-lg border border-dashed p-3 md:grid-cols-4">
          <input name="label" placeholder="Label (jaise Shaadi muhurat 2027)" className="col-span-2 rounded border p-2" />
          <input type="date" name="start_date" required aria-label="Start date" className="rounded border p-2" />
          <input type="date" name="end_date" required aria-label="End date" className="rounded border p-2" />
          <button className="col-span-2 rounded bg-navy p-2 text-white md:col-span-4">+ Season jodein</button>
        </form>
      </section>
    </main>
  );
}
