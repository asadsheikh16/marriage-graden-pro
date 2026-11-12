'use server';

// Rate card aur peak season ke actions. Sirf owner. Rates kabhi hardcode nahi.
import { redirect } from 'next/navigation';
import { requireGarden } from '@/lib/auth';
import { canEditRates } from '@/lib/roles';
import { parseNumber } from '@/lib/form';

const base = (gid: string) => `/g/${gid}/rates`;

function fail(gid: string, msg: string): never {
  redirect(`${base(gid)}?error=${encodeURIComponent(msg)}`);
}

/** Owner check: staff ko yahan se kuch nahi milta (RLS bhi rokta hai) */
async function ownerOnly(gid: string) {
  const { sb, role } = await requireGarden(gid);
  if (!canEditRates(role)) fail(gid, 'Rates sirf owner badal sakta hai');
  return sb;
}

/** Rate item ka naam, peak rate, off rate, active on/off badlo */
export async function updateRate(gid: string, itemId: string, fd: FormData) {
  const sb = await ownerOnly(gid);
  const peak = parseNumber(fd.get('peak_rate'));
  const off = parseNumber(fd.get('off_rate'));
  const name = String(fd.get('name') ?? '').trim();
  if ([peak, off].some((n) => Number.isNaN(n) || n < 0)) fail(gid, 'Rate sahi number mein likhein (0 ya usse zyada)');
  if (name.length < 2) fail(gid, 'Item ka naam likhein');
  const { error } = await sb.from('rate_items')
    .update({ name, peak_rate: peak, off_rate: off, active: fd.has('active') })
    .eq('id', itemId).eq('garden_id', gid);
  if (error) fail(gid, 'Rate save nahi hua. Phir se try karein.');
  redirect(`${base(gid)}?saved=1`);
}

/** Naya rate item (jaise "Mehndi stage") */
export async function addRate(gid: string, fd: FormData) {
  const sb = await ownerOnly(gid);
  const name = String(fd.get('name') ?? '').trim();
  const unit = String(fd.get('unit_type') ?? 'event') === 'plate' ? 'plate' : 'event';
  const peak = parseNumber(fd.get('peak_rate'));
  const off = parseNumber(fd.get('off_rate'));
  if (name.length < 2) fail(gid, 'Item ka naam likhein');
  if ([peak, off].some((n) => Number.isNaN(n) || n < 0)) fail(gid, 'Rate sahi number mein likhein');
  const { error } = await sb.from('rate_items').insert({ garden_id: gid, name, unit_type: unit, peak_rate: peak, off_rate: off });
  if (error) fail(gid, 'Item nahi bana. Phir se try karein.');
  redirect(`${base(gid)}?saved=1`);
}

/** Peak season ki date range jodo (muhurat ke hisaab se) */
export async function addSeason(gid: string, fd: FormData) {
  const sb = await ownerOnly(gid);
  const start = String(fd.get('start_date') ?? '');
  const end = String(fd.get('end_date') ?? '');
  const label = String(fd.get('label') ?? '').trim() || 'Peak season';
  if (!start || !end || end < start) fail(gid, 'Season ki start aur end date sahi likhein');
  const { error } = await sb.from('peak_seasons').insert({ garden_id: gid, label, start_date: start, end_date: end });
  if (error) fail(gid, 'Season save nahi hua');
  redirect(`${base(gid)}?saved=1`);
}

/** Peak season hatao */
export async function deleteSeason(gid: string, seasonId: string) {
  const sb = await ownerOnly(gid);
  await sb.from('peak_seasons').delete().eq('id', seasonId).eq('garden_id', gid);
  redirect(`${base(gid)}?saved=1`);
}
