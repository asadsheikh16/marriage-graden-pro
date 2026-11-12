import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabasePublic } from '@/lib/supabase-public';
import { todayISO } from '@/lib/format';
import {
  bookedDates, buildMonthGrid, monthBounds, rateRangeLabel, seoDescription, seoTitle,
  shiftMonth, validMonth, VENUE_EVENT_LABEL, normalizeSearch, isISODate,
} from '@/lib/venues';
import { submitVenueEnquiry } from './actions';

interface Card {
  slug: string; name: string; city: string | null; area: string | null; capacity: number;
  description: string | null; map_url: string | null; amenities: string[]; photo_urls: string[];
  event_types: string[]; rate_min: number | null; rate_max: number | null;
}

const WEEKDAYS = ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'];

async function loadCard(slug: string): Promise<Card | null> {
  const { data, error } = await supabasePublic().rpc('public_garden_card', { p_slug: slug });
  if (error || !data || (data as Card[]).length === 0) return null;
  return (data as Card[])[0];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const g = await loadCard(slug);
  if (!g) return { title: 'गार्डन नहीं मिला | Marriage Garden Venues' };
  const title = seoTitle(g.name, g.city);
  const description = seoDescription(g.name, g.city, g.capacity);
  return {
    title,
    description,
    alternates: { canonical: `/venues/${g.slug}` },
    openGraph: { title, description, type: 'website', images: g.photo_urls?.[0] ? [g.photo_urls[0]] : undefined },
  };
}

export default async function VenuePage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const g = await loadCard(slug);
  if (!g) notFound();

  const today = todayISO();
  const sel = normalizeSearch(sp, today);
  const ym = validMonth(sp.m, today.slice(0, 7));
  const { from, to } = monthBounds(ym);

  const { data: cal } = await supabasePublic().rpc('public_garden_calendar', {
    p_slug: g.slug, p_from: from, p_to: to,
  });
  const grid = buildMonthGrid(ym, bookedDates((cal ?? []) as { event_date: string }[]), today);
  const monthLabel = new Intl.DateTimeFormat('hi-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${from}T00:00:00Z`));
  const range = rateRangeLabel(g.rate_min, g.rate_max);
  const prefillDate = isISODate(sp.date) && sp.date >= today ? sp.date : '';
  const sent = sp.sent === '1';
  const err = sp.error;
  const photos = g.photo_urls ?? [];
  const eventOptions = g.event_types ?? [];

  return (
    <main className="space-y-8 pb-10">
      {/* Hero */}
      <section className="relative">
        {photos[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photos[0]} alt={`${g.name}, ${g.city ?? ''}`} className="aspect-[4/3] w-full object-cover sm:aspect-[16/9]" />
        ) : (
          <div className="aspect-[4/3] w-full bg-gradient-to-br from-maroon to-maroon-deep sm:aspect-[16/9]" />
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5 pt-16">
          <h1 className="font-serif text-3xl leading-tight text-white">{g.name}</h1>
          <p className="mt-1 text-sm text-champagne">{[g.city, g.area].filter(Boolean).join(' · ')}</p>
        </div>
      </section>

      <div className="space-y-8 px-4">
        {/* Basic info */}
        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
            <p className="text-xs text-stone-500">Capacity</p>
            <p className="mt-1 font-serif text-2xl text-maroon-deep">{g.capacity > 0 ? `${g.capacity} तक` : 'पूछें'}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
            <p className="text-xs text-stone-500">रेट रेंज</p>
            <p className="mt-1 text-sm font-semibold text-maroon-deep">{range ?? 'enquiry से पूछें'}</p>
            <p className="mt-1 text-[11px] text-stone-500">पूरा हिसाब enquiry के बाद</p>
          </div>
        </section>

        {g.description && <p className="text-base leading-relaxed text-stone-700">{g.description}</p>}

        {eventOptions.length > 0 && (
          <section className="space-y-2">
            <h2 className="font-serif text-xl text-maroon-deep">प्रोग्राम</h2>
            <div className="flex flex-wrap gap-2">
              {eventOptions.map((t) => (
                <span key={t} className="rounded-full bg-white px-3 py-1.5 text-sm text-maroon-deep ring-1 ring-champagne/50">
                  {VENUE_EVENT_LABEL[t] ?? t}
                </span>
              ))}
            </div>
          </section>
        )}

        {g.amenities?.length > 0 && (
          <section className="space-y-2">
            <h2 className="font-serif text-xl text-maroon-deep">सुविधाएँ</h2>
            <ul className="grid grid-cols-2 gap-2 text-sm text-stone-700">
              {g.amenities.map((a) => (
                <li key={a} className="flex items-center gap-2"><span aria-hidden className="text-champagne">✦</span>{a}</li>
              ))}
            </ul>
          </section>
        )}

        {g.map_url && (
          <a href={g.map_url} target="_blank" rel="noopener noreferrer"
            className="flex h-14 items-center justify-center rounded-xl border-2 border-maroon text-base font-semibold text-maroon hover:bg-maroon hover:text-ivory">
            📍 Location map पर देखें
          </a>
        )}

        {/* Calendar: sirf Khaali / Booked */}
        <section className="space-y-3 rounded-2xl bg-white p-4 shadow-md ring-1 ring-stone-200">
          <div className="flex items-center justify-between">
            <Link href={`/venues/${g.slug}?m=${shiftMonth(ym, -1)}`} aria-label="पिछला महीना"
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-ivory text-xl text-maroon-deep">‹</Link>
            <h2 className="font-serif text-xl text-maroon-deep">{monthLabel}</h2>
            <Link href={`/venues/${g.slug}?m=${shiftMonth(ym, 1)}`} aria-label="अगला महीना"
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-ivory text-xl text-maroon-deep">›</Link>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-stone-500">
            {WEEKDAYS.map((w) => <div key={w} className="py-1">{w}</div>)}
          </div>
          <div className="space-y-1">
            {grid.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-1">
                {week.map((c, ci) => {
                  if (c.state === 'blank') return <div key={ci} />;
                  const isBooked = c.state === 'booked';
                  const isPast = c.state === 'past';
                  return (
                    <div key={ci} aria-label={`${c.date}: ${isBooked ? 'Booked' : 'Khaali'}`}
                      className={[
                        'flex min-h-[52px] flex-col items-center justify-center rounded-lg text-xs',
                        isBooked ? 'bg-maroon text-ivory' : 'bg-ivory text-maroon-deep ring-1 ring-champagne/50',
                        isPast ? 'opacity-40' : '',
                      ].join(' ')}>
                      <span className="text-sm font-semibold">{c.day}</span>
                      <span className="text-[10px] leading-tight">{isBooked ? 'Booked' : 'Khaali'}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <p className="text-xs text-stone-500">
            <span className="mr-3 inline-block h-3 w-3 rounded bg-ivory ring-1 ring-champagne/50 align-middle" /> Khaali
            <span className="ml-4 mr-3 inline-block h-3 w-3 rounded bg-maroon align-middle" /> Booked
          </p>
        </section>

        {/* Photos */}
        {photos.length > 1 && (
          <section className="grid grid-cols-2 gap-2">
            {photos.slice(1).map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p} src={p} alt={`${g.name} की तस्वीर`} loading="lazy" className="aspect-square w-full rounded-xl object-cover" />
            ))}
          </section>
        )}

        {/* Enquiry */}
        <section id="enquiry" className="scroll-mt-4 space-y-4 rounded-2xl bg-white p-5 shadow-md ring-1 ring-champagne/40">
          <div>
            <h2 className="font-serif text-2xl text-maroon-deep">Enquiry भेजें</h2>
            <p className="mt-1 text-sm text-stone-600">नाम, फ़ोन और तारीख़ लिखें. गार्डन की टीम आपसे बात करेगी.</p>
          </div>

          {sent && (
            <p role="status" className="rounded-xl bg-ivory p-4 text-sm text-maroon-deep ring-1 ring-champagne">
              आपकी enquiry मिल गई है. गार्डन की टीम जल्द संपर्क करेगी.
            </p>
          )}
          {err && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{err}</p>}

          <form action={submitVenueEnquiry.bind(null, g.slug)} className="space-y-3">
            {/* Honeypot: insaan ko nahi dikhta */}
            <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
            <label className="block">
              <span className="text-sm font-medium text-stone-700">आपका नाम</span>
              <input name="customer_name" required minLength={2} maxLength={80} autoComplete="name"
                className="mt-1 h-12 w-full rounded-xl border border-stone-300 px-3 text-base focus:border-maroon focus:outline-none" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-stone-700">फ़ोन नंबर</span>
              <input name="phone" type="tel" inputMode="tel" required autoComplete="tel" placeholder="10 अंक"
                className="mt-1 h-12 w-full rounded-xl border border-stone-300 px-3 text-base focus:border-maroon focus:outline-none" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium text-stone-700">तारीख़</span>
                <input name="event_date" type="date" min={today} required defaultValue={prefillDate}
                  className="mt-1 h-12 w-full rounded-xl border border-stone-300 px-3 text-base focus:border-maroon focus:outline-none" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-stone-700">मेहमान</span>
                <input name="guests" type="number" inputMode="numeric" min={1} max={20000} required
                  defaultValue={sel.guests ?? ''}
                  className="mt-1 h-12 w-full rounded-xl border border-stone-300 px-3 text-base focus:border-maroon focus:outline-none" />
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-stone-700">प्रोग्राम</span>
              <select name="event_type" required defaultValue={sel.eventType && eventOptions.includes(sel.eventType) ? sel.eventType : ''}
                className="mt-1 h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-base focus:border-maroon focus:outline-none">
                <option value="" disabled>चुनें</option>
                {eventOptions.map((t) => (
                  <option key={t} value={t}>{VENUE_EVENT_LABEL[t] ?? t}</option>
                ))}
              </select>
            </label>
            <button className="h-14 w-full rounded-xl bg-maroon text-base font-semibold text-ivory shadow hover:bg-maroon-deep">
              Enquiry भेजें
            </button>
          </form>
        </section>

        <p className="text-center text-xs text-stone-500">
          तारीख़ पक्की करने से पहले गार्डन से बात ज़रूर करें. खाली दिखने का मतलब है कि इस वक्त कोई बुकिंग दर्ज नहीं है.
        </p>
      </div>
    </main>
  );
}
