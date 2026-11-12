import Link from 'next/link';
import type { Metadata } from 'next';
import { supabasePublic } from '@/lib/supabase-public';
import { normalizeSearch, rateRangeLabel, VENUE_EVENT_LABEL, VENUE_EVENT_TYPES } from '@/lib/venues';
import { todayISO } from '@/lib/format';

export const metadata: Metadata = {
  title: 'शादी के लिए गार्डन ढूँढें | Marriage Garden Venues',
  description: 'शहर, तारीख़ और मेहमानों की संख्या से शादी के गार्डन ढूँढें. Find marriage gardens by city, date and guests.',
};

interface Row {
  slug: string;
  name: string;
  city: string | null;
  area: string | null;
  capacity: number;
  cover_photo: string | null;
  event_types: string[];
  rate_min: number | null;
  rate_max: number | null;
}

// Public search: sirf wo gardens jo chuni hui date par poori tarah khaali hain (RPC se).
export default async function VenuesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const today = todayISO();
  const s = normalizeSearch(sp, today);
  const { data, error } = await supabasePublic().rpc('public_search_gardens', {
    p_city: s.city || null,
    p_date: s.date,
    p_guests: s.guests,
    p_event_type: s.eventType,
  });
  const rows = (error ? [] : (data ?? [])) as Row[];

  const qs = new URLSearchParams();
  if (s.date) qs.set('date', s.date);
  if (s.guests) qs.set('guests', String(s.guests));
  if (s.eventType) qs.set('event', s.eventType);
  const qStr = qs.toString() ? `?${qs.toString()}` : '';

  return (
    <main className="space-y-6 px-4 pt-6">
      <section>
        <h1 className="font-serif text-3xl leading-tight text-maroon-deep">
          आपकी शादी के लिए गार्डन
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          तारीख़ चुनें, तो सिर्फ़ वो गार्डन दिखेंगे जो उस दिन खाली हैं. Find gardens free on your date.
        </p>
      </section>

      <form action="/venues" method="get" className="space-y-3 rounded-2xl bg-white p-4 shadow-md ring-1 ring-champagne/30">
        <label className="block">
          <span className="text-sm font-medium text-stone-700">शहर या इलाका</span>
          <input name="city" defaultValue={s.city} placeholder="जैसे Kota, Vigyan Nagar"
            className="mt-1 h-12 w-full rounded-xl border border-stone-300 px-3 text-base focus:border-maroon focus:outline-none" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-medium text-stone-700">तारीख़</span>
            <input name="date" type="date" min={today} defaultValue={s.date ?? ''}
              className="mt-1 h-12 w-full rounded-xl border border-stone-300 px-3 text-base focus:border-maroon focus:outline-none" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-stone-700">मेहमान</span>
            <input name="guests" type="number" inputMode="numeric" min={1} max={20000} placeholder="जैसे 300" defaultValue={s.guests ?? ''}
              className="mt-1 h-12 w-full rounded-xl border border-stone-300 px-3 text-base focus:border-maroon focus:outline-none" />
          </label>
        </div>
        <label className="block">
          <span className="text-sm font-medium text-stone-700">प्रोग्राम</span>
          <select name="event" defaultValue={s.eventType ?? ''}
            className="mt-1 h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-base focus:border-maroon focus:outline-none">
            <option value="">सब चलेगा</option>
            {VENUE_EVENT_TYPES.map((t) => (
              <option key={t} value={t}>{VENUE_EVENT_LABEL[t]}</option>
            ))}
          </select>
        </label>
        <button className="h-14 w-full rounded-xl bg-maroon text-base font-semibold text-ivory shadow hover:bg-maroon-deep">
          गार्डन ढूँढें
        </button>
      </form>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">अभी लिस्ट नहीं आ पा रही. थोड़ी देर बाद फिर देखें.</p>}

      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-xl text-maroon-deep">{s.date ? 'उस दिन खाली गार्डन' : 'सभी गार्डन'}</h2>
          <span className="text-xs text-stone-500">{rows.length} मिले</span>
        </div>
        {!s.date && rows.length > 0 && (
          <p className="text-xs text-stone-500">तारीख़ चुनेंगे तो सिर्फ़ खाली गार्डन दिखेंगे.</p>
        )}

        {rows.length === 0 && (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <div aria-hidden className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-ivory text-2xl">🌿</div>
            <p className="font-serif text-lg text-maroon-deep">
              {s.date ? 'उस तारीख़ पर कोई गार्डन खाली नहीं मिला.' : 'अभी कोई गार्डन यहाँ लिस्ट नहीं है.'}
            </p>
            <p className="mt-1 text-sm text-stone-600">
              {s.date ? 'दूसरी तारीख़ या शहर आज़माएँ.' : 'शहर बदलकर देखें.'}
            </p>
          </div>
        )}

        <ul className="space-y-4">
          {rows.map((g) => {
            const range = rateRangeLabel(g.rate_min, g.rate_max);
            return (
              <li key={g.slug} className="overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-stone-200">
                <Link href={`/venues/${g.slug}${qStr}`} className="block">
                  {g.cover_photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={g.cover_photo} alt={`${g.name}, ${g.city ?? ''}`} loading="lazy"
                      className="aspect-[16/9] w-full object-cover" />
                  ) : (
                    <div className="flex aspect-[16/9] w-full items-center justify-center bg-gradient-to-br from-maroon to-maroon-deep font-serif text-4xl text-champagne">
                      {g.name.slice(0, 1)}
                    </div>
                  )}
                  <div className="space-y-2 p-4">
                    <h3 className="font-serif text-2xl text-maroon-deep">{g.name}</h3>
                    <p className="text-sm text-stone-600">
                      {[g.city, g.area].filter(Boolean).join(' · ')}
                      {g.capacity > 0 && <> · {g.capacity} मेहमान तक</>}
                    </p>
                    {range && <p className="text-sm font-medium text-champagne">रेंज: {range}</p>}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {g.event_types.map((t) => (
                        <span key={t} className="rounded-full bg-ivory px-3 py-1 text-xs text-maroon-deep ring-1 ring-champagne/40">
                          {VENUE_EVENT_LABEL[t] ?? t}
                        </span>
                      ))}
                    </div>
                    <span className="mt-2 flex h-12 items-center justify-center rounded-xl bg-maroon text-base font-semibold text-ivory">
                      देखें और enquiry भेजें
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
