import Link from 'next/link';

// Public venue pages ka header. Login nahi chahiye, isliye requireUser() nahi.
export default function VenuesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ivory text-stone-900">
      <header className="bg-maroon text-ivory shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/venues" className="font-serif text-xl font-semibold tracking-wide">शादी के गार्डन</Link>
          <span className="text-xs text-champagne">Marriage Garden Venues</span>
        </div>
      </header>
      <div className="mx-auto max-w-3xl pb-16">{children}</div>
    </div>
  );
}
