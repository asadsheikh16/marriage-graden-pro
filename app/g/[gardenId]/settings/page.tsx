import { redirect } from 'next/navigation';
import { requireGarden } from '@/lib/auth';
import { canEditSettings } from '@/lib/roles';
import { EVENT_TYPES } from '@/lib/form';
import { VENUE_EVENT_LABEL } from '@/lib/venues';
import { Flash } from '@/components/Flash';
import { saveMarketplace } from './actions';

// Garden settings (sirf owner). Sabse upar: "Marketplace par dikhao" ON/OFF (default OFF).
export default async function SettingsPage({ params, searchParams }: {
  params: Promise<{ gardenId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const { gardenId: gid } = await params;
  const { sb, role } = await requireGarden(gid);
  if (!canEditSettings(role)) redirect(`/g/${gid}`);

  const { data: g } = await sb.from('gardens')
    .select('name, marketplace_enabled, slug, city, area, capacity, description, map_url, amenities, photo_urls, event_types')
    .eq('id', gid).single();
  if (!g) redirect('/gardens');

  const save = saveMarketplace.bind(null, gid);
  const publicPath = g.slug ? `/venues/${g.slug}` : null;

  return (
    <main className="space-y-6 p-4">
      <div>
        <h1 className="text-xl font-bold text-navy">Garden settings</h1>
        <p className="text-sm text-stone-600">{g.name}</p>
      </div>
      <Flash error={sp.error} ok={sp.saved === '1'} />

      <form action={save} className="space-y-5">
        <section className="space-y-3 rounded-2xl border-2 border-maroon/20 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-maroon-deep">Marketplace par dikhao</h2>
          <label className="flex min-h-[56px] cursor-pointer items-center justify-between gap-4 rounded-xl bg-ivory p-4">
            <span className="text-sm">
              <span className="block font-semibold text-stone-800">{g.marketplace_enabled ? 'ON: public /venues par dikh raha hai' : 'OFF: public par nahi dikhega'}</span>
              <span className="block text-xs text-stone-600">Sirf khaali/booked din dikhenge. Naam, phone, paisa kabhi nahi.</span>
            </span>
            <input type="checkbox" name="marketplace_enabled" value="on" defaultChecked={g.marketplace_enabled}
              className="h-7 w-12 shrink-0 accent-maroon" />
          </label>
          {publicPath && (
            <p className="text-xs text-stone-600">Public link: <span className="break-all font-mono">{publicPath}</span></p>
          )}
        </section>

        <section className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Public listing ki jaankari</h2>
          <label className="block text-sm">Link (slug)
            <input name="slug" defaultValue={g.slug ?? ''} placeholder="jaise shubh-garden-kota (khaali chhodein to naam se banega)"
              className="mt-1 w-full rounded border p-3" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">Shehar (city)
              <input name="city" defaultValue={g.city ?? ''} className="mt-1 w-full rounded border p-3" />
            </label>
            <label className="block text-sm">Area
              <input name="area" defaultValue={g.area ?? ''} className="mt-1 w-full rounded border p-3" />
            </label>
          </div>
          <label className="block text-sm">Capacity (kitne mehmaan)
            <input name="capacity" type="number" inputMode="numeric" min={0} max={20000} defaultValue={g.capacity ?? 0} className="mt-1 w-full rounded border p-3" />
          </label>
          <label className="block text-sm">Description
            <textarea name="description" rows={4} defaultValue={g.description ?? ''} className="mt-1 w-full rounded border p-3" />
          </label>
          <label className="block text-sm">Location map link (https://)
            <input name="map_url" type="url" defaultValue={g.map_url ?? ''} placeholder="https://maps.google.com/..." className="mt-1 w-full rounded border p-3" />
          </label>
          <label className="block text-sm">Suvidhayein (comma se alag karein)
            <input name="amenities" defaultValue={(g.amenities ?? []).join(', ')} placeholder="AC hall, Parking, Generator" className="mt-1 w-full rounded border p-3" />
          </label>
          <label className="block text-sm">Photo links (har line mein ek, https://)
            <textarea name="photo_urls" rows={4} defaultValue={(g.photo_urls ?? []).join('\n')} className="mt-1 w-full rounded border p-3" />
          </label>
          <fieldset className="space-y-2 text-sm">
            <legend className="font-semibold">Kaun se programs ke liye</legend>
            {EVENT_TYPES.map((t) => (
              <label key={t} className="flex min-h-[44px] items-center gap-3">
                <input type="checkbox" name="event_types" value={t} defaultChecked={(g.event_types ?? []).includes(t)} className="h-5 w-5 accent-maroon" />
                {VENUE_EVENT_LABEL[t]}
              </label>
            ))}
          </fieldset>
        </section>

        <button className="w-full rounded-lg bg-navy p-4 font-semibold text-white">Save karein</button>
      </form>
    </main>
  );
}
