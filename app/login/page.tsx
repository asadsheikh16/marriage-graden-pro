import { signIn } from './actions';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  return (
    <main className="mx-auto mt-16 max-w-sm p-6">
      <h1 className="text-2xl font-bold text-navy">Login / लॉगिन</h1>
      <p className="mt-1 text-sm text-stone-600">Owner ya staff ka email aur password</p>
      <form action={signIn} className="mt-6 space-y-3">
        <input name="email" type="email" required autoComplete="email" placeholder="Email"
          className="w-full rounded-lg border border-stone-300 bg-white p-3" />
        <input name="password" type="password" required autoComplete="current-password" placeholder="Password"
          className="w-full rounded-lg border border-stone-300 bg-white p-3" />
        <button className="w-full rounded-lg bg-navy p-3 font-semibold text-white">Login karein</button>
        {sp.error && <p className="text-sm text-red-600">{sp.error}</p>}
      </form>
    </main>
  );
}
