// Phase 1 (layout): garden ka header, desktop sidebar aur mobile bottom nav. Role ke hisaab se
// owner-only links sirf owner ko. Logout form wahi server action (signOut) use karta hai.
// Phase 1 change: mobile par page ka neecha padding badhaya (pb-44) taaki bottom nav aur "+ Naya booking"
// button aakhri card ko na dhakein.
import Link from 'next/link';
import { Plus, LogOut } from 'lucide-react';
import { requireGarden } from '@/lib/auth';
import { canSeeMoney } from '@/lib/roles';
import { signOut } from '@/app/login/actions';
import { BottomNav, SideNav } from '@/components/AppNav';
import { DEFAULT_BRAND_NAME } from '@/lib/brand';

export default async function GardenLayout({ children, params }: { children: React.ReactNode; params: Promise<{ gardenId: string }> }) {
  const { gardenId: gid } = await params;
  const { sb, role } = await requireGarden(gid);
  const { data: garden } = await sb.from('gardens').select('name').eq('id', gid).single();
  const owner = canSeeMoney(role);
  const name = garden?.name || DEFAULT_BRAND_NAME;

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col overflow-y-auto border-r border-gold/40 bg-wine p-4 text-ivory md:flex"
        style={{ background: 'linear-gradient(180deg, #720F26 0%, #400817 100%)' }}>
        <Link href={`/g/${gid}`} className="rmg-title mt-1 block text-xl font-semibold" style={{ color: '#FFF5E6' }}>{name}</Link>
        <span className="mt-2 inline-flex w-fit rounded-full border border-gold/60 px-2 py-0.5 text-sm font-semibold uppercase tracking-wider text-gold">{role}</span>
        <Link href={`/g/${gid}/bookings/new`} className="rmg-btn rmg-btn-gold mt-5 w-full">
          <Plus size={18} aria-hidden="true" /> Naya booking
        </Link>
        <div className="mt-5 flex-1"><SideNav gid={gid} owner={owner} /></div>
        <form action={signOut}>
          <button className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-[15px] font-semibold text-ivory/85 hover:bg-white/10">
            <LogOut size={18} aria-hidden="true" /> Logout
          </button>
        </form>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 border-b border-gold/50 bg-burgundy text-ivory md:hidden"
        style={{ background: 'linear-gradient(135deg, #720F26 0%, #400817 100%)' }}>
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <Link href={`/g/${gid}`} className="rmg-title flex min-h-[44px] min-w-0 items-center truncate text-lg font-semibold" style={{ color: '#FFF5E6' }}>{name}</Link>
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full border border-gold/60 px-2 py-0.5 text-sm font-semibold uppercase tracking-wider text-gold">{role}</span>
            <form action={signOut}>
              <button aria-label="Logout" className="flex h-11 w-11 items-center justify-center rounded-full text-ivory/90 hover:bg-white/10"><LogOut size={18} aria-hidden="true" /></button>
            </form>
          </div>
        </div>
      </header>

      <div className="md:pl-64">
        <div className="mx-auto max-w-5xl pb-44 md:pb-12">{children}</div>
      </div>

      <BottomNav gid={gid} />
    </div>
  );
}
