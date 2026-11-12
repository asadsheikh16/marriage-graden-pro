// Phase 1 (staff): owner-only page. Change: staff ke direct URL par ab redirect (307 to dashboard), pehle 200 "sirf owner" text tha. Team query role check ke baad hi chalti hai.
import { redirect } from 'next/navigation';
import { requireGarden } from '@/lib/auth';
import { canManageStaff } from '@/lib/roles';
import { Flash } from '@/components/Flash';
import { addStaff, removeStaff } from './actions';

// Team list aur staff add/remove (sirf owner)
// Phase 1 change: staff ke direct URL par ab redirect hota hai (pehle 200 par "sirf owner" text tha).
// Team list ki query role check ke BAAD hi chalti hai.
export default async function StaffPage({ params, searchParams }: {
  params: Promise<{ gardenId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const { gardenId: gid } = await params;
  const { sb, role, userId } = await requireGarden(gid);
  if (!canManageStaff(role)) redirect(`/g/${gid}`);
  const { data } = await sb.from('garden_members').select('user_id, role, display_name').eq('garden_id', gid).order('role');

  return (
    <main className="space-y-6 p-4">
      <h1 className="text-xl font-bold text-navy">Team (owner / staff)</h1>
      <Flash error={sp.error} ok={sp.saved === '1'} />
      <ul className="divide-y rounded-lg border bg-white">
        {(data ?? []).map((m) => (
          <li key={m.user_id} className="flex items-center justify-between p-3 text-sm">
            <span>{m.display_name ?? 'Naam nahi'} <span className="ml-2 rounded bg-stone-100 px-2 text-xs uppercase">{m.role}</span></span>
            {m.role === 'staff' && m.user_id !== userId && (
              <form action={removeStaff.bind(null, gid, m.user_id)}><button className="text-red-700 underline">Hatao</button></form>
            )}
          </li>
        ))}
      </ul>
      <form action={addStaff.bind(null, gid)} className="space-y-3 rounded-lg border bg-white p-4">
        <h2 className="font-semibold">Naya staff jodein</h2>
        <p className="text-xs text-stone-600">Staff ko ye email aur password dein. Staff ko paisa, rate, season aur export nahi dikhta.</p>
        <input name="name" placeholder="Naam" className="w-full rounded border p-3" />
        <input name="email" type="email" required placeholder="Staff ka email" className="w-full rounded border p-3" />
        <input name="password" type="password" required minLength={8} placeholder="Password (kam se kam 8)" className="w-full rounded border p-3" />
        <button className="w-full rounded-lg bg-navy p-3 font-semibold text-white">Staff jodein</button>
      </form>
    </main>
  );
}
