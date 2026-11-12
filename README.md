# Marriage Garden Pro

Marriage garden booking ka poora system: calendar, booking, enquiry, hold, function-day checklist,
paisa ka hisaab (advance / balance), season summary, CSV export, owner aur staff ke alag rights.
Ek hi system mein kai gardens chal sakte hain (multi-tenant). Har garden ka data alag rehta hai.

Stack: **Next.js (App Router, TypeScript) + Supabase (PostgreSQL, Auth, RLS) + Vercel**. Tailwind for styling.
Sab docs Hinglish mein hain.

## Pehle ye samajhein (saaf baat)

- **Vercel**: Hobby (free) plan sirf personal, non-commercial use ke liye hai. Garden owners ko bechne ke liye
  **Vercel Pro** chahiye. Ye plan (Asad ke budget mein) Pro hai. Terms ek baar khud check karein.
- **Supabase**: Pro plan par project pause nahi hota aur daily backup milta hai. Free plan par project kuch din
  inactive rehne par pause ho sakta hai, aur daily backup nahi milta. Isliye Pro plan lein.
- **Row Level Security (RLS)** har table par on hai. Pro plan hone se RLS ki zaroorat khatam nahi hoti.
- Legal baat: ye code bechne ya license dene ke baare mein kanooni salah nahi hai. Terms aur shart apne
  vakil ya platform ki policy se check karein.

## Kya kya hai (features)

- Calendar: booked (lal), hold (amber), khaali (hari). Din par click = us din ki list.
- Booking: naam, phone, event (shaadi / reception / engagement / tilak / birthday-other), date,
  slot (Din 8 AM-5 PM, Raat 6 PM-2 AM, Full Day), guests, rate lines, discount, advance, balance (auto).
- Double-booking: database mein (trigger + lock table) aur screen par warning ("Is date par booking already hai").
  Full Day, din aur raat ke saath clash karta hai. Cancelled aur hold clash nahi karte.
- Hold: tentative booking. Confirmed booking ko nahi rokta. Admin hold ko confirm karta hai.
- Enquiry: call log, date wanted, guests, rate quote (sirf owner), status naya/visit/booked,
  call-back date aur time, aaj ke call-backs ki list.
- Function-day checklist: decoration, catering, light, DJ, safai, parking (tick boxes).
- Dashboard: aaj ki booking, is mahine ki, pending payment, season hisaab (sirf owner).
- WhatsApp receipt aur 2 din pehle ka reminder: sirf wa.me link, message pehle se bhara (koi API nahi).
- Rate card: har item ka peak aur off-season rate, owner screen se badalta hai. Hardcode kuch nahi.
- Peak season: owner muhurat wali date-range set karta hai. Khaali ho to Nov-Feb peak.
- CSV export (sirf owner), pagination (20 per page, server side).
- Login: email + password. Owner aur staff ke roles RLS mein enforce hote hain.

## Roles

| Kaam | Owner | Staff |
|---|---|---|
| Calendar, booking dekhna, naya booking, enquiry | Haan | Haan |
| Customer details | Haan | Haan |
| Function-day checklist tick | Haan | Haan |
| Booking edit, cancel, hold convert | Haan | Nahi |
| Paisa (total, balance), season totals, dashboard paisa | Haan | Nahi |
| Rate card edit, peak season | Haan | Nahi |
| CSV export | Haan | Nahi |
| Staff add / remove | Haan | Nahi |

## Folder structure aur kaun si file kya karti hai

```
marriage-garden-pro/
├── README.md              ← ye file
├── SETUP.md               ← zero se pehla client tak (GitHub bhi)
├── DATABASE.md            ← tables, columns, relations, aur schema.sql
├── DEPLOY.md              ← Supabase + Vercel deploy, env, custom domain
├── BACKUP_RESTORE.md      ← backup aur restore
├── TROUBLESHOOTING.md     ← 15 common problems aur fix
├── CLIENT_ONBOARDING.md   ← naye garden ko 30 minute mein jodne ki checklist
├── HANDOVER.md            ← agar koi AI ya developer na ho to kaise sambhalein; cost
├── DEMO_CHECKLIST.md      ← client ko dene se pehle ka test
├── schema.sql             ← poora database: tables, guard, RLS, RPC (Supabase SQL Editor mein chalana hai)
├── middleware.ts          ← har page par login check, session refresh
├── .env.example           ← env variables ka sample (asli values nahi)
├── package.json           ← scripts: dev, build, start, test
├── next.config.mjs, tsconfig.json, tailwind.config.ts, postcss.config.mjs
├── app/
│   ├── layout.tsx         ← HTML shell, Hindi lang, mobile viewport
│   ├── page.tsx           ← / par aaye to /gardens
│   ├── login/             ← login page + signIn / signOut actions
│   ├── gardens/           ← login user ke gardens; naya garden banana
│   └── g/[gardenId]/      ← ek garden ke saare pages
│       ├── layout.tsx     ← membership check, menu (role ke hisaab se)
│       ├── page.tsx       ← dashboard
│       ├── calendar/      ← month grid (lal / amber / hari)
│       ├── bookings/      ← list (search, filter, pagination), new, [bookingId] detail + edit
│       │   └── actions.ts ← saveBooking (UI warning + save_booking RPC), cancelBooking, saveChecklist
│       ├── enquiries/     ← enquiry list, call-backs, actions.ts
│       ├── rates/         ← rate card aur peak season (owner)
│       ├── staff/         ← team list, staff add/remove (owner) — actions.ts server-only
│       └── export/route.ts← CSV download (owner only, 403 for staff)
├── components/            ← Flash (message), Pager (pagination), BookingFields (form)
├── lib/
│   ├── money.ts           ← paise ka hisaab: subtotal, discount, balance, paid/pending (pure, tested)
│   ├── slots.ts           ← din / raat / full clash rule + DB error ka Hinglish message (tested)
│   ├── season.ts          ← peak / off ka rule (tested)
│   ├── pagination.ts      ← page size 20, range, total pages (tested)
│   ├── roles.ts           ← owner / staff ke rights (tested)
│   ├── form.ts            ← form validation, phone cleaning (tested)
│   ├── whatsapp.ts        ← receipt aur reminder text, wa.me link (tested)
│   ├── csv.ts             ← CSV banana (tested)
│   ├── errors.ts          ← DB error ko Hinglish message (tested)
│   ├── format.ts          ← rupee, IST date, labels
│   ├── auth.ts            ← requireUser / requireGarden (login aur role guard)
│   ├── supabase-server.ts ← server client (anon key + login cookie, RLS ke saath)
│   └── supabase-admin.ts  ← service-role client (server-only, sirf staff ke liye)
├── tests/
│   ├── money.test.ts, slots.test.ts, pagination.test.ts, roles.test.ts, format-form.test.ts  ← npm test
│   ├── schema-check.sql   ← schema.sql ke liye 45 SQL checks (RLS, guard, paisa)
│   └── run-schema-check.sh← schema-check chalane ka script
└── .github/workflows/weekly-db-backup.yml ← har hafte pg_dump (GitHub secret chahiye)
```

## Ek nazar mein kaise chalta hai

1. Browser → `middleware.ts` check karta hai login hai ya nahi.
2. Page `requireGarden()` se membership aur role nikalta hai (`my_role` RPC).
3. Data `supabaseServer()` ke through aata hai: anon key + login cookie. RLS filter karta hai.
4. Booking save `save_booking` RPC se hota hai (ek transaction). Double-booking trigger database mein rokta hai.
5. Service-role key sirf `staff/actions.ts` mein, sirf server par, owner ke check ke baad.

## Tests (kya chala, kitne pass hue)

Ye numbers isi build ke hain (Tab ne local par chala kar dekhe):

- `npm test` (Vitest): 5 test files, **82 tests, sab pass**. Paise (calcBooking), double-booking rule
  (din / raat / full day / cancelled / hold), pagination, role checks, form validation, CSV, WhatsApp links.
- `npm run build`: **pass** (Next.js production build, sab routes compile).
- `npm run typecheck`: **pass** (tsc --noEmit, strict).
- `tests/schema-check.sql` local PostgreSQL 15 par: **45 of 45 SQL checks pass**. Ismein RLS (owner A garden B
  nahi padh sakta; staff rates, paisa, season summary, export nahi dekh sakta), double-booking guard
  (din/raat/full/cancelled/hold/edit/delete), paisa constraints (overpay, discount) aur checklist shaamil hain.
  Run: `PSQL="psql -h localhost -U postgres" ./tests/run-schema-check.sh`

**Ab tak NAHI test hua:** asli Supabase project par (login, RLS asli users se, Auth emails), asli Vercel
deploy par, phone par UI, WhatsApp link ka asli khulna, weekly GitHub backup workflow ka chalna.
Ye pehli baar owner khud ek test garden par check kare (DEMO_CHECKLIST.md).

## Important

- Kisi bhi key ya password ko code mein na daalein. Asli values sirf `.env.local` (computer par) aur
  Vercel ke Environment Variables mein.
- `SUPABASE_SERVICE_ROLE_KEY` browser mein kabhi nahi jaati. `server-only` import isi ko rokta hai.
- Public sign-up band karein (SETUP.md, Step 3), warna koi bhi login karke garden bana sakta hai.

## Public venues (/venues) — bina login wala search

Naya feature: gardens ek public search par dikh sakte hain. Customer shehar aur date chunkar wo gardens dekhta hai
jo us din khaali hain, garden ka page dekhta hai (photos, location, capacity, rate range, Khaali/Booked calendar) aur
enquiry bhejta hai. Customer ko naam, phone, paisa ya item-wise rate kabhi nahi dikhta.

- Owner ke liye: `Settings` menu se "Marketplace par dikhao" ON karein. Default OFF hai. Bina owner ki sahmati kuch public nahi hota.
- Database: `migrations/002_public_venues.sql` ko Supabase SQL Editor mein `schema.sql` ke baad ek baar chalayein.
  Ye purana data ya policy nahi chhedta.
- Privacy: `docs/PRIVACY_CHECKLIST.md` (kya public nahi dekh sakta, aur kaise check karein).
- Poori jaankari: `docs/PUBLIC_VENUES.md` (phone OTP ka plan, rate limit, SEO, open items).
- Tests: `PSQL="sudo -u postgres psql" ./tests/run-public-venues-check.sh` (local PostgreSQL 15, anon privacy checks) aur `npm test`.

Status: local par test hua hai. Koi live Supabase ya Vercel is kaam mein use nahi hua.
