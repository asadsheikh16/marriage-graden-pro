// Phase 1 (CSV export): owner-only route. Change: sirf comment; logic pehle jaisi hai (staff ko 403, owner ko CSV). Staff direct URL test: 403.
import { supabaseServer } from '@/lib/supabase-server';
import { toCsv } from '@/lib/csv';
import { todayISO } from '@/lib/format';

// Garden ki bookings ka CSV (sirf owner). Staff ko 403 milega.
// Owner ke liye paisa wale columns bhi, RLS ke hisaab se.
// Phase 1 change: none in logic (role check pehle se tha, 403 pehle se tha); sirf ye comment. Staff test: 403.
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ gardenId: string }> }) {
  const { gardenId: gid } = await params;
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return new Response('Login karein', { status: 401 });

  const { data: role } = await sb.rpc('my_role', { p_garden: gid });
  if (role !== 'owner') return new Response('Export sirf owner kar sakta hai', { status: 403 });

  const { data, error } = await sb.from('bookings')
    .select('event_date, slot, status, customer_name, phone, event_type, guests, notes, booking_money(subtotal, discount, total_amount, advance, balance_paid, balance, payment_status)')
    .eq('garden_id', gid).order('event_date');
  if (error) return new Response('Export nahi ho paya. Thodi der baad try karein.', { status: 500 });

  const rows = (data ?? []).map((b) => {
    const m = (Array.isArray(b.booking_money) ? b.booking_money[0] : b.booking_money) ?? {};
    return {
      event_date: b.event_date, slot: b.slot, status: b.status, customer_name: b.customer_name,
      phone: b.phone, event_type: b.event_type, guests: b.guests, notes: b.notes,
      subtotal: (m as Record<string, unknown>).subtotal, discount: (m as Record<string, unknown>).discount,
      total: (m as Record<string, unknown>).total_amount, advance: (m as Record<string, unknown>).advance,
      balance_paid: (m as Record<string, unknown>).balance_paid, balance: (m as Record<string, unknown>).balance,
      payment_status: (m as Record<string, unknown>).payment_status,
    };
  });
  const csv = toCsv(rows, [
    'event_date', 'slot', 'status', 'customer_name', 'phone', 'event_type', 'guests', 'notes',
    'subtotal', 'discount', 'total', 'advance', 'balance_paid', 'balance', 'payment_status',
  ]);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="bookings-${gid.slice(0, 8)}-${todayISO()}.csv"`,
    },
  });
}
