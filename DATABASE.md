# DATABASE.md — Tables, columns, relations, aur schema.sql

Ye database Supabase (PostgreSQL 15) par hai. Har table mein `garden_id` hai (multi-tenant), aur har table par
RLS on hai. Puri SQL file neeche "schema.sql" section mein hai, wahi Supabase SQL Editor mein chalani hai.

## Tables ek nazar mein

| Table | Kaam | Kaun dekh sakta hai |
|---|---|---|
| `gardens` | Har garden (client) ka record | Member (owner aur staff) |
| `garden_members` | Kaun owner hai, kaun staff | Member; add/remove sirf owner |
| `rate_items` | Rate card: hall, decoration, catering, DJ, tent/lights (peak aur off rate) | **Sirf owner** |
| `peak_seasons` | Muhurat wali peak date-ranges | Member (dates), likhna sirf owner |
| `bookings` | Booking ka non-money hissa: naam, phone, event, date, slot, guests, status | Member; naya bana sakta; edit/delete sirf owner |
| `booking_money` | Subtotal, discount, advance, balance jama; total, balance, status (auto) | **Sirf owner** |
| `booking_lines` | Booking ki rate lines (kya, kitna, kis rate par) | **Sirf owner** |
| `function_checklist` | Function-day tick boxes (har booking ke 6 items) | Member; tick kar sakta |
| `enquiries` | Call log: naam, phone, date wanted, guests, status, call-back | Member; naya bana sakta; delete sirf owner |
| `enquiry_quotes` | Enquiry par quoted rate | **Sirf owner** |
| `booking_slot_locks` | Double-booking guard ki lock table (trigger bharta hai) | Member (padh sakta) |

## Relations

- `gardens` 1 — N `garden_members`, `rate_items`, `peak_seasons`, `bookings`, `enquiries`
- `bookings` 1 — 1 `booking_money`
- `bookings` 1 — N `booking_lines`
- `bookings` 1 — N `function_checklist` (ban-ne par 6 items apne aap)
- `bookings` 1 — N `booking_slot_locks` (full day = 2 rows: din aur raat; confirmed booking ke liye hi)
- `enquiries` 1 — 0/1 `enquiry_quotes`
- `booking_lines.rate_item_id` → `rate_items` (agar item delete ho to NULL, purani line safe)
- Delete karne par: garden delete ho to uske saare rows cascade delete hote hain. Booking delete ho to uska
  money, lines, checklist aur lock bhi.

## Important columns (kya matlab hai)

- `bookings.status`: `hold` (tentative), `confirmed` (booked, guard mein), `cancelled` (guard se bahar)
- `bookings.slot`: `din`, `raat`, `full`
- `booking_money.total_amount` = subtotal − discount (auto)
- `booking_money.balance` = total − advance − balance_paid (auto, kabhi negative nahi)
- `booking_money.payment_status` = `paid` jab total > 0 aur jama >= total, warna `pending` (auto)
- `booking_lines.line_total` = quantity × unit_rate (auto). `unit_rate` booking ke time ka snapshot hai,
  rate card badalne se purani booking nahi badalti.

## Double-booking guard kaise kaam karta hai

1. Confirmed booking save hoti hai → trigger `sync_booking_slot_locks` lock rows banata hai
   (`garden_id`, `event_date`, `slot_part` = din / raat). Full day = din aur raat dono.
2. Agar ye lock pehle se hai → error `23505` "Is date par booking already hai". Save nahi hota.
3. Hold, cancelled ke lock nahi banate. Hold ko confirm karne par bhi same check hota hai.
4. Primary key `(garden_id, event_date, slot_part)` race condition mein bhi duplicate rokti hai.

## Season ka rule

- Garden ki `peak_seasons` rows hain: date kisi range mein ho to peak, warna off.
- Koi row nahi: Nov, Dec, Jan, Feb = peak. Baaki off.
- Function `season_of(garden, date)`. Booking ka rate is ke hisaab se lagta hai.

## RPC functions (app inhe call karta hai)

- `create_garden(name, phone)`: naya garden, login user owner, rate card seed.
- `save_booking(garden, booking_json, money_json, lines_json, id)`: booking + paisa + lines ek transaction mein.
  Staff sirf naya bana sakta hai; paisa owner ka hi.
- `season_summary(garden, from, to)`: owner only. Season ke hisaab se booking count, value, mila, baaki.
- `season_of(garden, date)`, `my_role(garden)`, `is_member`, `is_owner`: helper.

---

## schema.sql (poori file)

```sql
-- =====================================================================
-- Marriage Garden Pro — schema.sql
-- Ye file Supabase SQL Editor mein poori ek baar run karni hai (fresh project).
-- Isme hai: tables, double-booking guard (database level), RLS (owner / staff),
-- helper functions, aur RPC functions (save_booking, create_garden, season_summary).
-- Multi-tenant: har table mein garden_id hai, aur RLS se ek garden ka data
-- doosre garden ko nahi dikhta.
-- =====================================================================

-- ---------- 1. TABLES ----------

-- Garden = ek marriage garden (ek client). Har client ka alag garden_id.
create table if not exists public.gardens (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(trim(name)) between 2 and 120),
  owner_phone text,
  address     text,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Kaun is garden ka owner hai aur kaun staff. Ek user ek garden mein ek hi role.
create table if not exists public.garden_members (
  garden_id    uuid not null references public.gardens(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null check (role in ('owner','staff')),
  display_name text,
  created_at   timestamptz not null default now(),
  primary key (garden_id, user_id)
);

-- Rate card: hall/garden rent, decoration, catering (per plate), DJ, tent/lights.
-- Har item ka peak aur off-season rate alag. Owner admin screen se badalta hai.
create table if not exists public.rate_items (
  id         uuid primary key default gen_random_uuid(),
  garden_id  uuid not null references public.gardens(id) on delete cascade,
  name       text not null check (char_length(trim(name)) >= 2),
  unit_type  text not null default 'event' check (unit_type in ('event','plate')),
  peak_rate  numeric(12,2) not null default 0 check (peak_rate >= 0),
  off_rate   numeric(12,2) not null default 0 check (off_rate >= 0),
  sort_order int not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- Peak season ki date-ranges (muhurat wali). Agar koi row nahi, to Nov-Feb peak maana jaata hai.
create table if not exists public.peak_seasons (
  id         uuid primary key default gen_random_uuid(),
  garden_id  uuid not null references public.gardens(id) on delete cascade,
  label      text not null default 'Peak season',
  start_date date not null,
  end_date   date not null,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

-- Booking ka non-money hissa. Staff bhi ise bana sakta hai aur dekh sakta hai.
create table if not exists public.bookings (
  id            uuid primary key default gen_random_uuid(),
  garden_id     uuid not null references public.gardens(id) on delete cascade,
  customer_name text not null check (char_length(trim(customer_name)) >= 2),
  phone         text not null check (phone ~ '^[0-9]{10,15}$'),
  event_type    text not null check (event_type in ('shaadi','reception','engagement','tilak','birthday_other')),
  event_date    date not null,
  slot          text not null check (slot in ('din','raat','full')),
  guests        int  not null default 0 check (guests >= 0),
  -- hold = tentative (confirmed booking ko block nahi karta); cancelled = guard se bahar
  status        text not null default 'confirmed' check (status in ('hold','confirmed','cancelled')),
  notes         text,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists bookings_garden_date_idx on public.bookings (garden_id, event_date);

-- Paise wala hissa (OWNER ONLY). Staff ko is table ki koi row nahi dikhti.
-- total, balance, payment_status database khud calculate karta hai (generated columns).
create table if not exists public.booking_money (
  booking_id     uuid primary key references public.bookings(id) on delete cascade,
  garden_id      uuid not null references public.gardens(id) on delete cascade,
  subtotal       numeric(12,2) not null default 0 check (subtotal >= 0),   -- = sum of booking_lines
  discount       numeric(12,2) not null default 0 check (discount >= 0 and discount <= subtotal),
  advance        numeric(12,2) not null default 0 check (advance >= 0),
  balance_paid   numeric(12,2) not null default 0 check (balance_paid >= 0),
  total_amount   numeric(12,2) generated always as (subtotal - discount) stored,
  balance        numeric(12,2) generated always as (subtotal - discount - advance - balance_paid) stored,
  payment_status text generated always as (
    case when (subtotal - discount) > 0 and (advance + balance_paid) >= (subtotal - discount)
         then 'paid' else 'pending' end) stored,
  check (advance + balance_paid <= subtotal - discount)
);

-- Booking ki rate lines (OWNER ONLY). Booking ke time ka rate save rehta hai (snapshot).
create table if not exists public.booking_lines (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid not null references public.bookings(id) on delete cascade,
  garden_id    uuid not null references public.gardens(id) on delete cascade,
  rate_item_id uuid references public.rate_items(id) on delete set null,
  item_name    text not null,
  unit_type    text not null default 'event' check (unit_type in ('event','plate')),
  quantity     numeric(10,2) not null default 1 check (quantity >= 0),
  unit_rate    numeric(12,2) not null default 0 check (unit_rate >= 0),
  line_total   numeric(12,2) generated always as (quantity * unit_rate) stored
);

-- Function-day checklist: har booking ke liye tick boxes (staff bhi tick kar sakta hai).
create table if not exists public.function_checklist (
  id         uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  garden_id  uuid not null references public.gardens(id) on delete cascade,
  item_key   text not null,
  label      text not null,
  done       boolean not null default false,
  done_at    timestamptz,
  unique (booking_id, item_key)
);

-- Enquiry = call par aayi poochh-tachh. Status: naya / visit / booked.
create table if not exists public.enquiries (
  id            uuid primary key default gen_random_uuid(),
  garden_id     uuid not null references public.gardens(id) on delete cascade,
  customer_name text not null check (char_length(trim(customer_name)) >= 2),
  phone         text check (phone is null or phone ~ '^[0-9]{10,15}$'),
  event_type    text check (event_type is null or event_type in ('shaadi','reception','engagement','tilak','birthday_other')),
  date_wanted   date,
  guests        int not null default 0 check (guests >= 0),
  status        text not null default 'naya' check (status in ('naya','visit','booked')),
  callback_at   timestamptz,          -- call-back ki date aur time
  notes         text,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Enquiry ka quoted rate (OWNER ONLY). Staff enquiry bana sakta hai, rate nahi dekh sakta.
create table if not exists public.enquiry_quotes (
  enquiry_id  uuid primary key references public.enquiries(id) on delete cascade,
  garden_id   uuid not null references public.gardens(id) on delete cascade,
  rate_quoted numeric(12,2) not null default 0 check (rate_quoted >= 0)
);

-- Double-booking guard ki lock table. Har CONFIRMED booking ke har slot-part (din / raat) ki ek row.
-- Full day = din + raat dono ki rows. Primary key (garden, date, slot_part) duplicate rokti hai.
-- Ye table trigger khud bharta hai; app seedha isme nahi likhta. Hold yahan nahi aata.
create table if not exists public.booking_slot_locks (
  garden_id  uuid not null references public.gardens(id) on delete cascade,
  event_date date not null,
  slot_part  text not null check (slot_part in ('din','raat')),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  primary key (garden_id, event_date, slot_part)
);

-- ---------- 2. HELPER FUNCTIONS (RLS aur RPC mein use hote hain) ----------

-- Login user ka is garden mein role ('owner' / 'staff' / null).
-- security definer: garden_members ki RLS ke andar loop nahi banta.
create or replace function public.my_role(p_garden uuid)
returns text language sql stable security definer set search_path = public as $$
  select m.role from public.garden_members m
  where m.garden_id = p_garden and m.user_id = auth.uid()
  limit 1
$$;

create or replace function public.is_member(p_garden uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.my_role(p_garden) is not null
$$;

create or replace function public.is_owner(p_garden uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role(p_garden) = 'owner', false)
$$;

-- Date peak season mein hai ya off: 'peak' / 'off'.
-- Agar garden ki koi peak_seasons row nahi, to Nov, Dec, Jan, Feb = peak (default).
create or replace function public.season_of(p_garden uuid, p_date date)
returns text language plpgsql stable set search_path = public as $$
begin
  if exists (select 1 from public.peak_seasons s where s.garden_id = p_garden) then
    return case when exists (
        select 1 from public.peak_seasons s
        where s.garden_id = p_garden and p_date between s.start_date and s.end_date)
      then 'peak' else 'off' end;
  end if;
  return case when extract(month from p_date) in (11, 12, 1, 2) then 'peak' else 'off' end;
end $$;

-- ---------- 3. DOUBLE-BOOKING GUARD (database level) ----------

-- Jab confirmed booking aaye, badle, ya delete ho: uske lock rows theek karo.
-- Agar same garden + date + slot-part ka lock pehle se hai, to error (23505).
-- Cancelled aur hold bookings lock nahi karte, isliye woh guard ke bahar hain.
create or replace function public.sync_booking_slot_locks()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_part  text;
  v_parts text[];
begin
  if tg_op = 'DELETE' then
    delete from public.booking_slot_locks where booking_id = old.id;
    return old;
  end if;

  delete from public.booking_slot_locks where booking_id = new.id;

  if new.status = 'confirmed' then
    -- full day = din + raat dono; din = sirf din; raat = sirf raat
    v_parts := case new.slot when 'din' then array['din']
                             when 'raat' then array['raat']
                             else array['din','raat'] end;
    foreach v_part in array v_parts loop
      if exists (select 1 from public.booking_slot_locks l
                 where l.garden_id = new.garden_id
                   and l.event_date = new.event_date
                   and l.slot_part = v_part) then
        -- Hinglish message: app ise friendly text mein badalta hai
        raise exception 'Is date par booking already hai (% %)', new.event_date, v_part
          using errcode = '23505';
      end if;
      insert into public.booking_slot_locks (garden_id, event_date, slot_part, booking_id)
      values (new.garden_id, new.event_date, v_part, new.id);
    end loop;
  end if;
  return new;
end $$;

drop trigger if exists trg_bookings_locks on public.bookings;
create trigger trg_bookings_locks
  after insert or update or delete on public.bookings
  for each row execute function public.sync_booking_slot_locks();

-- Naya booking bante hi uska money row (zero) aur checklist (6 items) ban jaata hai.
create or replace function public.booking_defaults()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.booking_money (booking_id, garden_id) values (new.id, new.garden_id);
  insert into public.function_checklist (booking_id, garden_id, item_key, label) values
    (new.id, new.garden_id, 'decoration', 'Decoration (saj-sajja)'),
    (new.id, new.garden_id, 'catering',   'Catering / khana'),
    (new.id, new.garden_id, 'light',      'Light / tent'),
    (new.id, new.garden_id, 'dj',         'DJ / sound'),
    (new.id, new.garden_id, 'safai',      'Safai / cleaning'),
    (new.id, new.garden_id, 'parking',    'Parking / gaadi');
  return new;
end $$;

drop trigger if exists trg_bookings_defaults on public.bookings;
create trigger trg_bookings_defaults
  after insert on public.bookings
  for each row execute function public.booking_defaults();

-- ---------- 4. RPC FUNCTIONS (app inhe call karta hai) ----------

-- Naya garden banao. Jo call kare woh owner banta hai. Default rate items bhi ban jaate hain.
create or replace function public.create_garden(p_name text, p_phone text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'LOGIN_REQUIRED' using errcode = '42501'; end if;
  insert into public.gardens (name, owner_phone, created_by)
  values (trim(p_name), nullif(p_phone, ''), auth.uid())
  returning id into v_id;
  insert into public.garden_members (garden_id, user_id, role, display_name)
  values (v_id, auth.uid(), 'owner', 'Owner');
  insert into public.rate_items (garden_id, name, unit_type, sort_order) values
    (v_id, 'Hall / garden rent', 'event', 1),
    (v_id, 'Decoration',         'event', 2),
    (v_id, 'Catering (per plate)', 'plate', 3),
    (v_id, 'DJ',                 'event', 4),
    (v_id, 'Tent / lights',      'event', 5);
  return v_id;
end $$;

-- Booking save karo (naya ya update), rate lines aur paise ke saath, ek hi transaction mein.
-- Staff: sirf naya booking bana sakta hai; paise (p_money) ignore hote hain.
-- Owner: booking edit, status change (hold -> confirmed etc.), aur paise/rate lines bhi.
-- p_booking keys: customer_name, phone, event_type, event_date, slot, guests, status, notes
-- p_money keys: discount, advance, balance_paid
-- p_lines: [{rate_item_id, item_name, unit_type, quantity, unit_rate}, ...]
create or replace function public.save_booking(
  p_garden  uuid,
  p_booking jsonb,
  p_money   jsonb default null,
  p_lines   jsonb default '[]'::jsonb,
  p_id      uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_role text;
  v_id   uuid;
begin
  v_role := public.my_role(p_garden);
  if v_role is null then raise exception 'NOT_A_MEMBER' using errcode = '42501'; end if;

  if p_id is null then
    insert into public.bookings (garden_id, customer_name, phone, event_type, event_date, slot,
                                 guests, status, notes, created_by)
    values (p_garden,
            trim(p_booking->>'customer_name'),
            p_booking->>'phone',
            p_booking->>'event_type',
            (p_booking->>'event_date')::date,
            p_booking->>'slot',
            coalesce((p_booking->>'guests')::int, 0),
            coalesce(p_booking->>'status', 'confirmed'),
            nullif(p_booking->>'notes', ''),
            auth.uid())
    returning id into v_id;
  else
    if v_role <> 'owner' then raise exception 'OWNER_ONLY' using errcode = '42501'; end if;
    update public.bookings set
      customer_name = trim(p_booking->>'customer_name'),
      phone         = p_booking->>'phone',
      event_type    = p_booking->>'event_type',
      event_date    = (p_booking->>'event_date')::date,
      slot          = p_booking->>'slot',
      guests        = coalesce((p_booking->>'guests')::int, 0),
      status        = coalesce(p_booking->>'status', status),
      notes         = nullif(p_booking->>'notes', ''),
      updated_at    = now()
    where id = p_id and garden_id = p_garden
    returning id into v_id;
    if v_id is null then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  end if;

  -- Paise aur rate lines sirf owner ke liye
  if v_role = 'owner' and p_money is not null then
    delete from public.booking_lines where booking_id = v_id;
    insert into public.booking_lines (booking_id, garden_id, rate_item_id, item_name, unit_type, quantity, unit_rate)
    select v_id, p_garden,
           nullif(l->>'rate_item_id', '')::uuid,
           l->>'item_name',
           coalesce(l->>'unit_type', 'event'),
           (l->>'quantity')::numeric,
           (l->>'unit_rate')::numeric
    from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb)) as l;

    -- subtotal = lines ka jod; baaki check constraints database khud dekhta hai
    update public.booking_money set
      discount     = coalesce((p_money->>'discount')::numeric, 0),
      advance      = coalesce((p_money->>'advance')::numeric, 0),
      balance_paid = coalesce((p_money->>'balance_paid')::numeric, 0),
      subtotal     = (select coalesce(sum(line_total), 0) from public.booking_lines where booking_id = v_id)
    where booking_id = v_id;
  end if;

  return v_id;
end $$;

-- Season ka hisaab (OWNER ONLY). Confirmed bookings ka total, received aur balance, season ke hisaab se.
create or replace function public.season_summary(p_garden uuid, p_from date, p_to date)
returns table (season text, booking_count bigint, total_value numeric, received numeric, balance_outstanding numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if public.my_role(p_garden) is distinct from 'owner' then
    raise exception 'OWNER_ONLY' using errcode = '42501';
  end if;
  return query
    select public.season_of(p_garden, b.event_date) as season,
           count(*)::bigint,
           coalesce(sum(m.total_amount), 0),
           coalesce(sum(m.advance + m.balance_paid), 0),
           coalesce(sum(m.balance), 0)
    from public.bookings b
    join public.booking_money m on m.booking_id = b.id
    where b.garden_id = p_garden
      and b.status = 'confirmed'
      and b.event_date between p_from and p_to
    group by 1
    order by 1;
end $$;

-- ---------- 5. ROW LEVEL SECURITY ----------
alter table public.gardens            enable row level security;
alter table public.garden_members     enable row level security;
alter table public.rate_items         enable row level security;
alter table public.peak_seasons       enable row level security;
alter table public.bookings           enable row level security;
alter table public.booking_money      enable row level security;
alter table public.booking_lines      enable row level security;
alter table public.function_checklist enable row level security;
alter table public.enquiries          enable row level security;
alter table public.enquiry_quotes     enable row level security;
alter table public.booking_slot_locks enable row level security;

-- gardens: member dekh sakta hai; sirf owner badal sakta hai. Insert sirf create_garden() se.
create policy gardens_select on public.gardens for select to authenticated
  using (public.is_member(id));
create policy gardens_update on public.gardens for update to authenticated
  using (public.is_owner(id)) with check (public.is_owner(id));

-- garden_members: member apni garden ki list dekh sakta hai; add/remove sirf owner.
create policy members_select on public.garden_members for select to authenticated
  using (public.is_member(garden_id));
create policy members_write on public.garden_members for all to authenticated
  using (public.is_owner(garden_id)) with check (public.is_owner(garden_id));

-- rate_items: OWNER ONLY (staff ko rate nahi dikhte, rate edit nahi kar sakta)
create policy rates_owner_all on public.rate_items for all to authenticated
  using (public.is_owner(garden_id)) with check (public.is_owner(garden_id));

-- peak_seasons: sab members padh sakte hain (date hai, paisa nahi); likhna sirf owner
create policy seasons_select on public.peak_seasons for select to authenticated
  using (public.is_member(garden_id));
create policy seasons_owner_write on public.peak_seasons for all to authenticated
  using (public.is_owner(garden_id)) with check (public.is_owner(garden_id));

-- bookings: member padh aur naya bana sakta hai; edit/delete sirf owner
create policy bookings_select on public.bookings for select to authenticated
  using (public.is_member(garden_id));
create policy bookings_insert on public.bookings for insert to authenticated
  with check (public.is_member(garden_id));
create policy bookings_owner_update on public.bookings for update to authenticated
  using (public.is_owner(garden_id)) with check (public.is_owner(garden_id));
create policy bookings_owner_delete on public.bookings for delete to authenticated
  using (public.is_owner(garden_id));

-- booking_money: OWNER ONLY padhna (likhna sirf save_booking / trigger se)
create policy money_owner_select on public.booking_money for select to authenticated
  using (public.is_owner(garden_id));

-- booking_lines: OWNER ONLY padhna
create policy lines_owner_select on public.booking_lines for select to authenticated
  using (public.is_owner(garden_id));

-- function_checklist: member padh aur tick kar sakta hai; delete sirf owner; insert trigger se
create policy checklist_select on public.function_checklist for select to authenticated
  using (public.is_member(garden_id));
create policy checklist_update on public.function_checklist for update to authenticated
  using (public.is_member(garden_id)) with check (public.is_member(garden_id));
create policy checklist_owner_delete on public.function_checklist for delete to authenticated
  using (public.is_owner(garden_id));

-- enquiries: member padh, bana, aur status / call-back badal sakta hai; delete sirf owner
create policy enquiries_select on public.enquiries for select to authenticated
  using (public.is_member(garden_id));
create policy enquiries_insert on public.enquiries for insert to authenticated
  with check (public.is_member(garden_id));
create policy enquiries_update on public.enquiries for update to authenticated
  using (public.is_member(garden_id)) with check (public.is_member(garden_id));
create policy enquiries_owner_delete on public.enquiries for delete to authenticated
  using (public.is_owner(garden_id));

-- enquiry_quotes: OWNER ONLY (rate quote)
create policy quotes_owner_all on public.enquiry_quotes for all to authenticated
  using (public.is_owner(garden_id)) with check (public.is_owner(garden_id));

-- booking_slot_locks: member padh sakta hai (calendar ke liye); likhna sirf trigger
create policy locks_select on public.booking_slot_locks for select to authenticated
  using (public.is_member(garden_id));

-- ---------- 6. GRANTS ----------
-- Supabase mein ye default hota hai; yahan clear likha hai. anon ko kuch nahi.
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

```

## tests/schema-check.sql

Ye file schema.sql ko local PostgreSQL 15 par test karti hai (45 checks). Supabase par chalana zaroori nahi.
Chalane ka tarika: README.md mein "Tests" section.
