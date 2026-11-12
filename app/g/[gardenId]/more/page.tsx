// Phase 1 (More): bottom nav ka "More" page. Owner ko Rates & Season, Staff, Settings, CSV dikhte hain;
// staff ko sirf apni cheezein. Owner-only links ka rokthaam role check (lib/roles) se hi hai.
import Link from 'next/link';
import { Tag, Users, Settings, FileDown, LogOut, PhoneCall, BookMarked } from 'lucide-react';
import { requireGarden } from '@/lib/auth';
import { canEditRates, canEditSettings, canExport, canManageStaff } from '@/lib/roles';
import { signOut } from '@/app/login/actions';

export default async function MorePage({ params }: { params: Promise<{ gardenId: string }> }) {
  const { gardenId: gid } = await params;
  const { role } = await requireGarden(gid);

  const items = [
    { show: true, href: `/g/${gid}/bookings`, label: 'Bookings', hint: 'Sab bookings ki list', Icon: BookMarked },
    { show: true, href: `/g/${gid}/enquiries`, label: 'Enquiries', hint: 'Call-back aur naye lead', Icon: PhoneCall },
    { show: canEditRates(role), href: `/g/${gid}/rates`, label: 'Rates & Season', hint: 'Rate card aur peak season (sirf owner)', Icon: Tag },
    { show: canManageStaff(role), href: `/g/${gid}/staff`, label: 'Staff', hint: 'Staff add ya hatana (sirf owner)', Icon: Users },
    { show: canEditSettings(role), href: `/g/${gid}/settings`, label: 'Settings', hint: 'Garden ki details (sirf owner)', Icon: Settings },
    { show: canExport(role), href: `/g/${gid}/export`, label: 'CSV export', hint: 'Data download (sirf owner)', Icon: FileDown },
  ].filter((i) => i.show);

  return (
    <main className="space-y-5 p-4 md:p-6">
      <header>
        <p className="rmg-eyebrow">More</p>
        <h1 className="rmg-title mt-1 text-3xl font-semibold">Aur kya chahiye?</h1>
      </header>

      <ul className="space-y-3">
        {items.map(({ href, label, hint, Icon }) => (
          <li key={href}>
            <Link href={href} className="rmg-card flex min-h-[64px] items-center gap-4 p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ivory text-burgundy"><Icon size={20} aria-hidden="true" /></span>
              <span className="min-w-0">
                <span className="block font-semibold text-brown">{label}</span>
                <span className="block text-sm text-brown/75">{hint}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {role === 'staff' && (
        <p className="rounded-xl border border-gold/50 bg-cream p-4 text-sm text-brown/80">
          Aap staff ke roop mein login hain. Paise, rates aur season totals owner ke paas hain.
        </p>
      )}

      <form action={signOut}>
        <button className="rmg-btn rmg-btn-ghost w-full"><LogOut size={18} aria-hidden="true" /> Logout</button>
      </form>
    </main>
  );
}
