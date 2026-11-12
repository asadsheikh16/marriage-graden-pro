// Phase 1 (nav): bottom nav (mobile) aur left sidebar (desktop). Home, Calendar, Bookings, Enquiries, More.
// "+ Naya booking" button dono jagah. Owner-only links (Rates, Staff, Settings, CSV) sirf owner ko.
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House, CalendarDays, BookMarked, PhoneCall, Ellipsis, Plus, Settings, Users, Tag, FileDown } from 'lucide-react';

export interface NavFlags { owner: boolean }

function isActive(pathname: string, href: string, base: string) {
  if (href === base) return pathname === base;
  return pathname === href || pathname.startsWith(href + '/');
}

export function BottomNav({ gid }: { gid: string }) {
  const pathname = usePathname() ?? '';
  const base = `/g/${gid}`;
  const items = [
    { href: base, label: 'Home', Icon: House },
    { href: `${base}/calendar`, label: 'Calendar', Icon: CalendarDays },
    { href: `${base}/bookings`, label: 'Bookings', Icon: BookMarked },
    { href: `${base}/enquiries`, label: 'Enquiries', Icon: PhoneCall },
    { href: `${base}/more`, label: 'More', Icon: Ellipsis },
  ];
  return (
    <>
      <Link
        href={`${base}/bookings/new`}
        className="rmg-btn rmg-btn-gold fixed bottom-20 right-4 z-30 rounded-full shadow-lift md:hidden"
        aria-label="Naya booking"
      >
        <Plus size={18} aria-hidden="true" /> Naya booking
      </Link>
      <nav aria-label="Main menu" className="fixed inset-x-0 bottom-0 z-40 border-t border-gold/50 bg-cream/95 backdrop-blur md:hidden"
        style={{ boxShadow: '0 -8px 24px -14px rgba(64,8,23,0.35)' }}>
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {items.map(({ href, label, Icon }) => {
            const active = isActive(pathname, href, base) || (label === 'More' && pathname.startsWith(`${base}/rates`)) || (label === 'More' && pathname.startsWith(`${base}/staff`)) || (label === 'More' && pathname.startsWith(`${base}/settings`));
            return (
              <li key={label}>
                <Link href={href} aria-current={active ? 'page' : undefined}
                  className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[14px] font-semibold ${active ? 'text-burgundy' : 'text-brown/70'}`}>
                  <span className={`flex h-8 w-12 items-center justify-center rounded-full ${active ? 'bg-burgundy text-ivory shadow-card' : ''}`}>
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

export function SideNav({ gid, owner }: { gid: string; owner: boolean }) {
  const pathname = usePathname() ?? '';
  const base = `/g/${gid}`;
  const items = [
    { href: base, label: 'Dashboard', Icon: House },
    { href: `${base}/calendar`, label: 'Calendar', Icon: CalendarDays },
    { href: `${base}/bookings`, label: 'Bookings', Icon: BookMarked },
    { href: `${base}/enquiries`, label: 'Enquiries', Icon: PhoneCall },
  ];
  const ownerItems = owner ? [
    { href: `${base}/rates`, label: 'Rates & Season', Icon: Tag },
    { href: `${base}/staff`, label: 'Staff', Icon: Users },
    { href: `${base}/settings`, label: 'Settings', Icon: Settings },
    { href: `${base}/export`, label: 'CSV export', Icon: FileDown },
  ] : [];
  return (
    <nav aria-label="Main menu" className="space-y-1">
      {[...items, ...ownerItems].map(({ href, label, Icon }) => {
        const active = isActive(pathname, href, base);
        return (
          <Link key={href} href={href} aria-current={active ? 'page' : undefined}
            className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-[15px] font-semibold transition-colors ${active ? 'bg-burgundy text-ivory shadow-card' : 'text-ivory/85 hover:bg-white/10'}`}>
            <Icon size={18} aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
