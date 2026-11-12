'use server';

// Staff add / remove. Sirf owner. Naya staff user banane ke liye service-role client (sirf server par).
import 'server-only';
import { redirect } from 'next/navigation';
import { requireGarden } from '@/lib/auth';
import { canManageStaff } from '@/lib/roles';
import { supabaseAdmin } from '@/lib/supabase-admin';

const base = (gid: string) => `/g/${gid}/staff`;

/** Staff ka email + password + naam. Owner password set karta hai aur staff ko bata deta hai. */
export async function addStaff(gid: string, fd: FormData) {
  const { role } = await requireGarden(gid);
  if (!canManageStaff(role)) redirect(`${base(gid)}?error=${encodeURIComponent('Sirf owner staff add kar sakta hai')}`);

  const email = String(fd.get('email') ?? '').trim().toLowerCase();
  const password = String(fd.get('password') ?? '');
  const name = String(fd.get('name') ?? '').trim() || 'Staff';
  if (!/^\S+@\S+\.\S+$/.test(email)) redirect(`${base(gid)}?error=${encodeURIComponent('Email sahi nahi hai')}`);
  if (password.length < 8) redirect(`${base(gid)}?error=${encodeURIComponent('Password kam se kam 8 character ka ho')}`);

  const admin = supabaseAdmin();
  const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !created.user) {
    redirect(`${base(gid)}?error=${encodeURIComponent('Ye email pehle se login mein hai ya user nahi bana. Dusra email try karein.')}`);
  }
  const { error: mErr } = await admin.from('garden_members').insert({
    garden_id: gid, user_id: created.user!.id, role: 'staff', display_name: name,
  });
  if (mErr) redirect(`${base(gid)}?error=${encodeURIComponent('Staff ko garden se jod nahi paaye')}`);
  redirect(`${base(gid)}?saved=1`);
}

/** Staff hatao (membership delete). Owner apni hi membership nahi hataye. */
export async function removeStaff(gid: string, userId: string) {
  const { sb, role, userId: me } = await requireGarden(gid);
  if (!canManageStaff(role)) redirect(`${base(gid)}?error=${encodeURIComponent('Sirf owner staff hata sakta hai')}`);
  if (userId === me) redirect(`${base(gid)}?error=${encodeURIComponent('Apni hi membership nahi hata sakte')}`);
  await sb.from('garden_members').delete().eq('garden_id', gid).eq('user_id', userId).eq('role', 'staff');
  redirect(`${base(gid)}?saved=1`);
}
