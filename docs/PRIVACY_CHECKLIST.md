# Privacy checklist — public venues (/venues)

Ye checklist har release se pehle, aur Supabase par migration ke baad, ek baar zaroor chalayein.
Har check ke saath "kaise check karein" likha hai. Sab check pass hone chahiye.

## Public (anon) ko kabhi nahi dikhna chahiye

| # | Cheez | Kyun | Kaise check karein |
|---|---|---|---|
| 1 | Customer ka naam (bookings, enquiries) | Privacy | SQL Editor: `set role anon; select customer_name from public.public_slot_status;` → error (column nahi hai). `select * from public.bookings;` → permission denied. |
| 2 | Customer phone | Privacy, spam | `set role anon; select phone from public.enquiries;` → permission denied. Browser: `/venues/<slug>` ka page source mein 10-digit numbers nahi hone chahiye. |
| 3 | Paisa: total, advance, balance, discount, payment status | Privacy, dhandha | `set role anon; select * from public.booking_money;` → permission denied. |
| 4 | Rate items ka item-wise rate (Hall, Decoration, DJ, plate) | Competitor se bachav | `set role anon; select * from public.rate_items;` → permission denied. Page par sirf min aur max range. |
| 5 | Booking lines (rate lines) | Privacy | `set role anon; select * from public.booking_lines;` → permission denied. |
| 6 | Enquiries aur enquiry_quotes (rate quote) | Privacy | `set role anon; select * from public.enquiries;` aur `enquiry_quotes` → permission denied. |
| 7 | Staff list aur emails | Privacy | `set role anon; select * from public.garden_members;` → permission denied. |
| 8 | Owner ka phone aur garden ka address | Privacy | `set role anon; select owner_phone, address from public.gardens;` → permission denied. `public_garden_card('<slug>')` ke output mein `phone|address|owner` nahi (test G05). |
| 9 | Booking notes, event type, guests | Privacy | View mein sirf 4 columns: `select column_name from information_schema.columns where table_name='public_slot_status';` → garden_id, event_date, slot, status. |
| 10 | Toggle OFF garden ka koi bhi data (availability, card, calendar, search) | Owner ki sahmati | Settings mein toggle OFF karein. Phir `set role anon; select * from public.public_slot_status where garden_id = '<id>';` → 0 rows. `/venues/<slug>` → 404. |
| 11 | Dusre garden ka data | Tenant | Owner A login se garden B ka koi data nahi (RLS, tests O04, T01). |
| 12 | Rate limit table | Spam logic chhupi rahe | `set role anon; select * from public.public_rate_limits;` → permission denied. |
| 13 | Service-role key ya koi secret browser mein | Sabse bada risk | Browser source mein `service_role` ya `SUPABASE_SERVICE_ROLE_KEY` ka naam ya value nahi hona chahiye: `curl -s https://<site>/venues | grep -c service_role` → 0. |
| 14 | Anon ka EXECUTE sirf 4 public functions par | Chhupi functions band | `select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and has_function_privilege('anon', p.oid, 'EXECUTE');` → sirf public_garden_card, public_search_gardens, public_garden_calendar, public_submit_enquiry. |

## Sirf ye public hona chahiye

- Availability: garden, date, slot, status = `booked` (confirmed aur hold dono "Booked" dikhte hain). Cancelled nahi.
- Garden card: naam, shehar, area, capacity, description, map link, suvidhayein, photos, programs.
- Rate RANGE (min se max) — kisi ek item ka rate nahi.
- Enquiry form: sirf likhna (insert). Padhna nahi.

## Automated checks (local, Supabase ke bina)

```
PSQL="sudo -u postgres psql" ./tests/run-public-venues-check.sh
```

Ye schema.sql + migrations/002 ko scratch database par chalata hai, phir anon, authenticated (owner, staff, dusre owner)
ke roop mein checks karta hai. Last run ka count REPORT mein hai. Har fail row dikhti hai.

```
npm test
```

Unit tests (slug, search params, calendar grid, rate range, SEO, error messages).

## Supabase par migration ke baad (live check, 10 minute)

1. Migration run hone ke baad SQL Editor mein ye chalayein (koi password nahi chahiye):
   `select count(*) from information_schema.role_table_grants where grantee = 'anon' and table_schema = 'public';` → **1** (sirf view ka SELECT).
2. Toggle OFF ke saath `/venues` par garden nahi dikhna chahiye.
3. Toggle ON karke `/venues/<slug>` par booking ke din "Booked" dikhe, naam kahin na dikhe.
4. Browser DevTools → Network: `/venues` aur `/venues/<slug>` ke responses mein customer naam ya phone nahi.
5. Enquiry bhejein, phir owner login se Enquiries list mein wo dikhe. 4 baar ek phone se bhejein, 4th par "bahut koshish" message aaye.

## Agar kuch fail ho

- Koi bhi privacy check fail ho to feature OFF rakhein (toggle OFF) aur migration ka SQL dobara dekhein.
- Migration ko rollback karne ki zarurat ho to DATABASE.md aur BACKUP_RESTORE.md dekhein (daily backup).
