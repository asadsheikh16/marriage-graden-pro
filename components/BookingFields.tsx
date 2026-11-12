// Booking ka form (naya ya edit). Staff ko paisa wala hissa nahi dikhta.
// Ye server component hai: koi browser key ya secret yahan nahi.
import { EVENT_LABEL, SLOT_LABEL } from '@/lib/format';

export interface RateRow { id: string; name: string; unit_type: string; peak_rate: number; off_rate: number }

export function BookingFields({ v, owner, items, qty }: {
  v: Record<string, string | undefined>;
  owner: boolean;
  items: RateRow[];
  qty: Record<string, string>;   // rate item id -> quantity (owner ke liye)
}) {
  const val = (k: string) => v[k] ?? '';
  return (
    <div className="space-y-4">
      <fieldset className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm">Customer ka naam *
          <input name="customer_name" required minLength={2} defaultValue={val('customer_name')} className="w-full rounded border p-3" />
        </label>
        <label className="space-y-1 text-sm">Phone *
          <input name="phone" inputMode="tel" required defaultValue={val('phone')} placeholder="98765 43210" className="w-full rounded border p-3" />
        </label>
        <label className="space-y-1 text-sm">Event *
          <select name="event_type" required defaultValue={val('event_type') || 'shaadi'} className="w-full rounded border p-3">
            {Object.entries(EVENT_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm">Date *
          <input type="date" name="event_date" required defaultValue={val('event_date') || val('date')} className="w-full rounded border p-3" />
        </label>
        <label className="space-y-1 text-sm">Slot *
          <select name="slot" required defaultValue={val('slot') || 'din'} className="w-full rounded border p-3">
            {Object.entries(SLOT_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm">Guests
          <input name="guests" inputMode="numeric" defaultValue={val('guests') || '0'} className="w-full rounded border p-3" />
        </label>
        <label className="space-y-1 text-sm">Status
          <select name="status" defaultValue={val('status') || 'confirmed'} className="w-full rounded border p-3">
            <option value="confirmed">Confirmed (booked)</option>
            <option value="hold">Hold (tentative)</option>
          </select>
        </label>
        <label className="space-y-1 text-sm md:col-span-2">Notes
          <textarea name="notes" rows={2} defaultValue={val('notes')} className="w-full rounded border p-3" />
        </label>
      </fieldset>

      {owner && (
        <fieldset className="space-y-3 rounded-lg border border-gold/60 bg-amber-50/40 p-4">
          <legend className="px-1 font-semibold">Rate aur paisa (sirf owner)</legend>
          <p className="text-xs text-stone-600">Rate season ke hisaab se apne aap lagta hai (peak / off). Khaali quantity = line nahi.</p>
          {items.map((it) => (
            <label key={it.id} className="flex items-center justify-between gap-3 text-sm">
              <span>{it.name} <span className="text-xs text-stone-500">({it.unit_type === 'plate' ? 'per plate' : 'per event'})</span></span>
              <input name={`qty_${it.id}`} inputMode="decimal" defaultValue={qty[it.id] ?? ''} placeholder={it.unit_type === 'plate' ? 'plates' : '1'}
                className="w-24 rounded border p-2 text-right" />
            </label>
          ))}
          <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-1 text-sm">Discount (₹)
              <input name="discount" inputMode="decimal" defaultValue={val('discount')} className="w-full rounded border p-3" />
            </label>
            <label className="space-y-1 text-sm">Advance (₹)
              <input name="advance" inputMode="decimal" defaultValue={val('advance')} className="w-full rounded border p-3" />
            </label>
            <label className="space-y-1 text-sm">Balance jama (₹)
              <input name="balance_paid" inputMode="decimal" defaultValue={val('balance_paid')} className="w-full rounded border p-3" />
            </label>
          </div>
        </fieldset>
      )}
    </div>
  );
}
