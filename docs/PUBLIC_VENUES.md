# Public venues (/venues) — Hinglish guide

Ye section us feature ka hai jo garden owner ke login ke BAAD nahi, PUBLIC (bina login) dikhta hai:
customer ek shehar aur date chunkar wo gardens dekh sakta hai jo us din khaali hain, garden ka page
dekh sakta hai (photos, location, capacity, rate range, khaali/booked calendar) aur enquiry bhej sakta hai.

**Status (saaf baat):** ye code ABHI sirf local par check hua hai. Koi live Supabase project aur koi
live Vercel deploy is kaam mein use NAHI hua. SQL checks local PostgreSQL 15 par chale, unit tests chale,
aur `npm run build` pass hua. Live par chalane se pehle SETUP ke steps aur `docs/PRIVACY_CHECKLIST.md` zaroor karein.

## Sabse zaroori rule: public ko kya milta hai

Public (anon) ko sirf ye milta hai:

1. **Availability**: garden, date, slot aur status (sirf `booked`). Ye ek VIEW `public_slot_status` se aata hai,
   jiske columns hain `garden_id, event_date, slot, status`. Customer ka naam, phone, paisa, notes kuch nahi.
2. **Garden ka public card**: naam, shehar, area, capacity, description, map link, suvidhayein, photos,
   aur rate ki RANGE (sabse kam aur sabse zyada). Item-wise rate kabhi nahi.
3. **Search result**: wahi card ka chhota hissa + "us din khaali hai" wali filter.
4. **Enquiry bhejne ka form**: ye data sirf insert hota hai, padha nahi jaata.

Public ko ye NAHI milta: `bookings`, `booking_money`, `booking_lines`, `enquiries`, `enquiry_quotes`,
`rate_items`, `garden_members` (staff), `gardens` table seedha, `function_checklist`, `booking_slot_locks`,
`peak_seasons`, rate limit table. Inpar anon ka koi GRANT nahi hai (migration ke end mein `revoke`).

## Kaise kaam karta hai (technical, short)

- `gardens` table mein naye columns: `marketplace_enabled` (default **false**), `slug`, `city`, `area`,
  `capacity`, `description`, `map_url`, `amenities`, `photo_urls`, `event_types`.
- `public_slot_status` VIEW: sirf `marketplace_enabled = true` aur slug wale gardens, aaj se aage ki tareekh,
  confirmed aur hold bookings (cancelled gayab). View owner ke haq se chalta hai, isliye anon ko bookings par grant nahi chahiye.
- RPC functions (SECURITY DEFINER, read only ya insert-only):
  - `public_garden_card(p_slug)`: garden ka public card, rate range ke saath.
  - `public_search_gardens(p_city, p_date, p_guests, p_event_type)`: search.
  - `public_garden_calendar(p_slug, p_from, p_to)`: calendar ke liye (date, slot, status).
  - `public_submit_enquiry(...)`: enquiry insert, validation aur rate limit ke saath.
- Rate limit: `public_rate_limits` table (RLS on, koi policy nahi). IP par 10 entries ghante mein;
  garden + phone par 3 din mein; phone par sab gardens mein 10 din mein.
- Owner ka toggle: garden settings page (`/g/<garden>/settings`), sirf owner. Existing RLS
  (`gardens_update`, sirf owner) hi ise rokta hai. Staff toggle nahi kar sakta.

## Setup (Asad ke liye, ek baar)

1. Supabase SQL Editor mein pehle `schema.sql` (agar pehle se chali hai to dobara mat chalaiye).
2. Phir `migrations/002_public_venues.sql` ki poori file paste karke Run karein.
   Ye kisi purana data, purani policy ya table ko drop/alter nahi karta. Sirf naye columns (default ke saath)
   aur naye objects banata hai.
3. Apne garden ke Settings page par jaayein (`Settings` menu), shehar, capacity, photos (https links), map link bharein.
4. "Marketplace par dikhao" ko ON karein. Tab hi `/venues/<slug>` par garden dikhega.
5. `docs/PRIVACY_CHECKLIST.md` ke sab checks ek baar karein.

Agar `schema.sql` abhi tak run nahi hui hai, to pehle wo chalayein, phir migration.

## Enquiry aur owner

Public form se aayi enquiry usi garden ke `enquiries` table mein jaati hai, status `naya`, aur notes mein
`Website (venue search) se enquiry` likha hota hai. Owner ko wo existing Enquiries list mein dikhegi.
Phone ko 10 digit mein saaf kiya jaata hai (+91 hata ke). Naam 2 se 80 akshar. Tarikh aaj se 2 saal tak.

## Rate limit ki seemaayein

- IP: 10 enquiry ghante mein (IP `x-real-ip` ya `x-forwarded-for` se; Vercel par ye platform set karta hai).
- Garden + phone: 3 din mein.
- Phone sab gardens mein: 10 din mein.
- Limit ke baad saaf message: "Aaj ke liye bahut koshish ho gayi..." (koi technical code nahi).
- Ye counters table mein hain; purane 2 din se zyada purane rows har call par saaf hote hain.

## Phone verification (ABHI NAHI BANA — agla step ka plan)

Abhi enquiry bina OTP ke aati hai; rate limit spam kam karta hai, poora nahi. Agla step (alag kaam):

- **Option A — Supabase phone auth (SMS OTP)**: Supabase mein phone provider on karein, SMS provider (Twilio/MSG91 jaisa)
  jodein, customer enquiry se pehle `signInWithOtp` ke saath 6-digit code lega, `verifyOtp` par hi enquiry insert hogi.
  Cost: SMS per message. Pros: built-in. Cons: DLT registration (India) aur SMS provider ka setup.
- **Option B — WhatsApp OTP (Meta template)**: WhatsApp Business par ek approved OTP template banaya jaata hai,
  code WhatsApp par jaata hai. Cons: Meta business verification aur template approval lagta hai.
- Dono mein plan: (1) `public_otp_requests` table (hashed code, expiry, attempts), (2) RPC `public_request_otp` aur
  `public_verify_otp`, (3) `public_submit_enquiry` ko verified token maangna, (4) rate limit OTP par bhi (per phone per hour).
- Jab tak ye nahi, enquiry par owner ko call karke confirm karna hi safe rasta hai.

## SEO

Har garden page par `generateMetadata` se title aur description aate hain, jinmein shehar ka naam Hindi aur
English dono mein hai. Sitemap abhi nahi hai (agla step). Canonical link `/venues/<slug>` hai.

## Files (is feature ki)

- `migrations/002_public_venues.sql` — migration (naye columns, view, RPC, rate limit table, anon grants).
- `tests/public-venues-check.sql` + `tests/run-public-venues-check.sh` + `tests/stub-auth.sql` — anon privacy checks (local PostgreSQL 15).
- `tests/venues.test.ts` — unit tests (slug, search params, calendar grid, rate range, SEO, error messages).
- `lib/venues.ts` — pure helpers. `lib/supabase-public.ts` — anon client (cookies nahi).
- `middleware.ts` — `/venues` bina login khula hai (baaki sab routes pehle jaise login maangte hain).
- `app/venues/layout.tsx`, `app/venues/page.tsx`, `app/venues/[slug]/page.tsx`, `app/venues/[slug]/actions.ts`.
- `app/g/[gardenId]/settings/page.tsx`, `app/g/[gardenId]/settings/actions.ts` — owner ka marketplace toggle.
- `app/g/[gardenId]/layout.tsx` — Settings menu (sirf owner). `lib/roles.ts` — `canEditSettings`.
- `tailwind.config.ts` — maroon, champagne, ivory rang.

## Design

Maroon + gold (champagne) + ivory background, serif heading (system serif: Georgia fallback),
mobile-first, inputs 48px+ (touch friendly), buttons 56px. Hindi Devanagari system font par depend karta hai
(koi web font load nahi kiya, taaki build ko internet na chahiye).

## Open items (abhi nahi)

- Phone OTP (upar ka plan).
- Next.js 14.2.15 par npm ka security warning hai: patched 14.2.x ya 15 par upgrade ek developer se karwayein.
- PITR (point-in-time recovery) Supabase ka add-on hai; daily backup ke bhi bharose na rahein tab tak.
- Photos abhi URL list hain (https). Supabase Storage se upload agla step.
- Supabase ke default privileges: naya table banane par anon ko default grant mil sakta hai. Har migration ke baad `docs/PRIVACY_CHECKLIST.md` ka check 1 (anon grants count) chalayein.
- Sitemap, Hindi web font, booking se seedha availability sync (abhi confirmed + hold, cancelled gayab).
