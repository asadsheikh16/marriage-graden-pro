// Error page (client error boundary): Next.js jab kisi page par error aaye to ye dikhta hai.
// Sirf simple Hinglish message; stack trace ya database detail user ko nahi dikhayi jaati.
'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Error sirf browser console mein jaata hai, screen par nahi.
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FFF5E6] p-6">
      <section className="w-full max-w-md rounded-[18px] border border-[rgba(216,180,90,0.55)] bg-white p-8 text-center shadow-card">
        <p className="rmg-eyebrow">Royal Marriage Garden</p>
        <h1 className="rmg-title mt-3 text-2xl font-bold" style={{ color: '#720F26' }}>
          Kuch gadbad ho gayi.
        </h1>
        <p className="mt-3 text-[#30201D]">Thodi der baad dobara try karein.</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-xl px-5 py-3 font-semibold text-[#FFF5E6]"
            style={{ backgroundColor: '#720F26' }}
          >
            Dobara try karein
          </button>
          <Link
            href="/"
            className="rounded-xl border border-[#D8B45A] px-5 py-3 font-semibold"
            style={{ color: '#720F26' }}
          >
            Home par jaayein
          </Link>
        </div>
      </section>
    </main>
  );
}
