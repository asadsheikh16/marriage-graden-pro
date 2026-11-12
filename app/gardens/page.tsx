import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { Flash } from '@/components/Flash';
import { createGarden } from './actions';

// Login user ke sab gardens. Owner naya garden bana sakta hai (platform admin ke liye).
export default async function GardensPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  const { sb } = await requireUser();
  const { data, error } = await sb.from('garden_members').select('role, gardens(id, name)');
  const rows = (data ?? []) as unknown as { role: string; gardens: { id: string; name: string } | null }[];

  return (
    <main className="mx-auto max-w-xl p-4">
      <h1 className="text-2xl font-bold text-navy">Mere gardens</h1>
      <Flash error={sp.error} />
      {error && <p className="mt-4 text-sm text-red-600">Gardens load nahi hue. Thodi der baad refresh karein.</p>}
      <ul className="mt-4 space-y-2">
        {rows.filter((r) => r.gardens).map((r) => (
          <li key={r.gardens!.id}>
            <Link href={`/g/${r.gardens!.id}`} className="flex items-center justify-between rounded-lg border bg-white p-4 shadow-sm">
              <span className="font-semibold">{r.gardens!.name}</span>
              <span className="text-xs uppercase text-stone-500">{r.role}</span>
            </Link>
          </li>
        ))}
        {rows.length === 0 && <li className="text-stone-600">Abhi koi garden nahi. Neeche se naya banayein.</li>}
      </ul>

      <form action={createGarden} className="mt-8 space-y-3 rounded-lg border bg-white p-4">
        <h2 className="font-semibold">Naya garden banayein</h2>
        <input name="name" required minLength={2} placeholder="Garden ka naam" className="w-full rounded border p-3" />
        <input name="phone" inputMode="tel" placeholder="Owner ka phone (optional)" className="w-full rounded border p-3" />
        <button className="w-full rounded-lg bg-navy p-3 font-semibold text-white">Garden banayein</button>
      </form>
    </main>
  );
}
