import { redirect } from 'next/navigation';

// Root par aao to gardens list par bhejo (login na ho to middleware /login par le jaayega)
export default function Home() {
  redirect('/gardens');
}
