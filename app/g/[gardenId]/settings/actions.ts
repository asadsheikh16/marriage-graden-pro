'use server';

import { redirect } from 'next/navigation';
import { requireGarden } from '@/lib/auth';
import { canEditSettings } from '@/lib/roles';
import { parseNumber, EVENT_TYPES } from '@/lib/form';
import { isHttpsUrl, slugify, SLUG_RE, splitLines, splitList } from '@/lib/venues';

/** Marketplace settings save. Sirf owner (RLS bhi owner hi update karne deta hai). */
export async function saveMarketplace(gardenId: string, fd: FormData) {
  const { sb, role } = await requireGarden(gardenId);
  const back = `/g/${gardenId}/settings`;
  if (!canEditSettings(role)) redirect(`/g/${gardenId}`);

  const fail = (msg: string) => redirect(`${back}?error=${encodeURIComponent(msg)}`);

  const { data: current } = await sb.from('gardens').select('name').eq('id', gardenId).single();
  const enabled = fd.get('marketplace_enabled') === 'on';

  let slug = String(fd.get('slug') ?? '').trim().toLowerCase();
  if (!slug) slug = slugify(current?.name ?? '') || `garden-${gardenId.slice(0, 6)}`;
  if (!SLUG_RE.test(slug)) fail('Link (slug) mein sirf chhote letter, number aur - chalenge (3 se 60 akshar).');

  const city = String(fd.get('city') ?? '').trim() || null;
  if (enabled && !city) fail('Public karne se pehle shehar (city) likhein.');
  if (city && city.length > 60) fail('Shehar ka naam 60 akshar se chhota rakhein.');

  const area = String(fd.get('area') ?? '').trim() || null;
  const capacity = parseNumber(fd.get('capacity'));
  if (!Number.isInteger(capacity) || capacity < 0 || capacity > 20000) fail('Capacity (kitne mehmaan) sahi number mein likhein.');

  const description = String(fd.get('description') ?? '').trim() || null;
  if (description && description.length > 2000) fail('Description 2000 akshar se chhoti rakhein.');

  const mapUrl = String(fd.get('map_url') ?? '').trim() || null;
  if (mapUrl && !isHttpsUrl(mapUrl)) fail('Map ka link https:// se shuru hona chahiye.');

  const amenities = splitList(String(fd.get('amenities') ?? '')).slice(0, 20).map((a) => a.slice(0, 60));
  const photos = splitLines(String(fd.get('photo_urls') ?? '')).filter(isHttpsUrl).slice(0, 12);

  const eventTypes = fd.getAll('event_types').map(String).filter((t) => (EVENT_TYPES as readonly string[]).includes(t));
  if (eventTypes.length === 0) fail('Kam se kam ek program (event type) chunein.');

  const { error } = await sb.from('gardens').update({
    marketplace_enabled: enabled,
    slug,
    city,
    area,
    capacity,
    description,
    map_url: mapUrl,
    amenities,
    photo_urls: photos,
    event_types: eventTypes,
  }).eq('id', gardenId);

  if (error) {
    if (error.code === '23505') fail('Ye link (slug) pehle se kisi aur garden ka hai. Koi aur likhein.');
    if (error.code === '23514') fail('Kuch value sahi nahi hai. Check karke phir save karein.');
    fail('Save nahi hua. Thodi der baad phir try karein.');
  }
  redirect(`${back}?saved=1`);
}
