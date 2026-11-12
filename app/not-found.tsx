// 404 page: jab koi address mile hi na. Simple message aur home par wapas jaane ka link.
import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FFF5E6] p-6">
      <section className="w-full max-w-md rounded-[18px] border border-[rgba(216,180,90,0.55)] bg-white p-8 text-center shadow-card">
        <p className="rmg-eyebrow">Royal Marriage Garden</p>
        <h1 className="rmg-title mt-3 text-2xl font-bold" style={{ color: '#720F26' }}>
          Ye page nahi mila.
        </h1>
        <p className="mt-3 text-[#30201D]">Shayad link purana hai ya address galat hai.</p>
        <div className="mt-6">
          <Link
            href="/"
            className="inline-block rounded-xl px-5 py-3 font-semibold text-[#FFF5E6]"
            style={{ backgroundColor: '#720F26' }}
          >
            Home par jaayein
          </Link>
        </div>
      </section>
    </main>
  );
}
