-- =====================================================================
-- migrations/002_public_venues.sql
-- Public venue search (/venues). schema.sql ke BAAD ek baar chalana hai.
--
-- Ye migration kya karta hai (sab additive):
--   1. gardens mein naye columns (marketplace_enabled default FALSE, slug, city, ...)
--   2. public_rate_limits table (RLS on, koi policy nahi: sirf definer functions likhte hain)
--   3. public_slot_status VIEW: sirf (garden_id, event_date, slot, status), marketplace ON gardens ke liye
--   4. public_garden_card / public_search_gardens / public_garden_calendar (RPC, SECURITY DEFINER, read only)
--   5. public_submit_enquiry (RPC): enquiry insert + rate limit
--   6. anon ke grants: sirf view aur 4 functions. Baaki sab band.
--
-- Ye kuch DROP, ALTER ya REWRITE nahi karta: purana data, purani policies, purane tables
-- ko chhuta nahi. Existing RLS waise hi rahegi.
-- =====================================================================

begin;

-- ---------- 1. GARDEN COLUMNS (additive) ----------
alter table public.gardens add column if not exists marketplace_enabled boolean not null default false;
alter table public.gardens add column if not exists slug text
  check (slug is null or slug ~ '^[a-z0-9-]{3,60}$');
alter table public.gardens add column if not exists city text
  check (city is null or char_length(city) <= 60);
alter table public.gardens add column if not exists area text
  check (area is null or char_length(area) <= 80);
alter table public.gardens add column if not exists capacity int not null default 0
  check (capacity >= 0 and capacity <= 20000);
alter table public.gardens add column if not exists description text
  check (description is null or char_length(description) <= 2000);
alter table public.gardens add column if not exists map_url text
  check (map_url is null or map_url ~ '^https://');
alter table public.gardens add column if not exists amenities text[] not null default '{}';
alter table public.gardens add column if not exists photo_urls text[] not null default '{}';
alter table public.gardens add column if not exists event_types text[]
  not null default array['shaadi','reception','engagement','tilak','birthday_other'];

create unique index if not exists gardens_slug_key on public.gardens (slug) where slug is not null;

-- ---------- 2. RATE LIMIT TABLE ----------
create table if not exists public.public_rate_limits (
  bucket       text not null,
  window_start timestamptz not null,
  hits         int not null default 0 check (hits >= 0),
  primary key (bucket, window_start)
);
alter table public.public_rate_limits enable row level security;   -- koi policy nahi: sirf definer functions

-- Ek window mein hits ginna. Limit par ho to error (P0429). Purane windows saaf karta hai.
create or replace function public.public_rate_take(p_bucket text, p_max int, p_window interval, p_code text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_secs  float8 := extract(epoch from p_window)::float8;
  v_start timestamptz;
  v_hits  int;
begin
  v_start := to_timestamp(floor(extract(epoch from now())::float8 / v_secs) * v_secs);
  select l.hits into v_hits from public.public_rate_limits l
   where l.bucket = p_bucket and l.window_start = v_start;
  if coalesce(v_hits, 0) >= p_max then
    raise exception '%', p_code using errcode = 'P0429';
  end if;
  insert into public.public_rate_limits as l (bucket, window_start, hits) values (p_bucket, v_start, 1)
  on conflict (bucket, window_start) do update set hits = l.hits + 1;
  delete from public.public_rate_limits where window_start < now() - interval '2 days';
end $$;

-- ---------- 3. PUBLIC VIEW: sirf date + slot + status ----------
-- View owner ke rights se chalta hai (RLS bypass), isliye anon ko bookings par koi grant nahi chahiye.
-- Columns: garden_id, event_date, slot, status. Naam, phone, paise, rate, notes kuch nahi.
-- Status hamesha 'booked' (confirmed aur hold dono 'Booked' dikhte hain). Cancelled gayab.
-- Sirf marketplace ON + slug wale gardens, aur aaj se aage ki tareekh.
create or replace view public.public_slot_status as
select b.garden_id,
       b.event_date,
       b.slot,
       'booked'::text as status
from public.bookings b
join public.gardens g on g.id = b.garden_id
where g.marketplace_enabled
  and g.slug is not null
  and b.status in ('confirmed', 'hold')
  and b.event_date >= (now() at time zone 'Asia/Kolkata')::date;

-- ---------- 4. PUBLIC RPCs (read only, sirf public columns) ----------

-- Garden ka public card (slug se). Rate sirf RANGE: sabse kam aur sabse zyada. Item-wise rate nahi.
create or replace function public.public_garden_card(p_slug text)
returns table (
  slug text, name text, city text, area text, capacity int, description text, map_url text,
  amenities text[], photo_urls text[], event_types text[], rate_min numeric, rate_max numeric)
language sql stable security definer set search_path = public, pg_temp as $$
  select g.slug, g.name, g.city, g.area, g.capacity, g.description, g.map_url,
         g.amenities, g.photo_urls, g.event_types,
         (select min(least(r.peak_rate, r.off_rate)) from public.rate_items r
           where r.garden_id = g.id and r.active and greatest(r.peak_rate, r.off_rate) > 0),
         (select max(greatest(r.peak_rate, r.off_rate)) from public.rate_items r
           where r.garden_id = g.id and r.active)
  from public.gardens g
  where g.slug = p_slug and g.marketplace_enabled and g.slug is not null
$$;

-- Search: shehar/area, date (sirf wo garden jo us din poori tarah khaali ho), guests, event type.
create or replace function public.public_search_gardens(
  p_city text default null, p_date date default null, p_guests int default null, p_event_type text default null)
returns table (
  slug text, name text, city text, area text, capacity int, cover_photo text, event_types text[],
  rate_min numeric, rate_max numeric)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_city text := lower(trim(coalesce(p_city, '')));
begin
  if p_date is not null and p_date < (now() at time zone 'Asia/Kolkata')::date then
    return;
  end if;
  return query
    select g.slug, g.name, g.city, g.area, g.capacity,
           g.photo_urls[1], g.event_types,
           (select min(least(r.peak_rate, r.off_rate)) from public.rate_items r
             where r.garden_id = g.id and r.active and greatest(r.peak_rate, r.off_rate) > 0),
           (select max(greatest(r.peak_rate, r.off_rate)) from public.rate_items r
             where r.garden_id = g.id and r.active)
    from public.gardens g
    where g.marketplace_enabled and g.slug is not null
      and (v_city = '' or strpos(lower(coalesce(g.city, '')), v_city) > 0
                       or strpos(lower(coalesce(g.area, '')), v_city) > 0)
      and (p_guests is null or g.capacity >= p_guests)
      and (p_event_type is null or p_event_type = '' or p_event_type = any (g.event_types))
      and (p_date is null or not exists (
            select 1 from public.public_slot_status s
             where s.garden_id = g.id and s.event_date = p_date))
    order by g.name
    limit 50;
end $$;

-- Calendar: ek garden ki (date, slot, status) range mein. Sirf view se.
create or replace function public.public_garden_calendar(p_slug text, p_from date, p_to date)
returns table (event_date date, slot text, status text)
language sql stable security definer set search_path = public, pg_temp as $$
  select s.event_date, s.slot, s.status
  from public.public_slot_status s
  join public.gardens g on g.id = s.garden_id
  where g.slug = p_slug and g.marketplace_enabled
    and s.event_date between p_from and p_to
  order by s.event_date, s.slot
$$;

-- ---------- 5. PUBLIC ENQUIRY (insert + rate limit) ----------
-- Enquiry usi garden ke enquiries table mein jaati hai; owner ki list mein dikhti hai.
-- Rate limit: IP par 10 entries ghante mein, garden + phone par 3 din mein, phone par sab gardens mein 10 din mein.
-- Validation pehle; rate limit ke hit tabhi, jab entry sach mein jaane wali ho.
create or replace function public.public_submit_enquiry(
  p_slug text, p_name text, p_phone text, p_date date, p_guests int, p_event_type text, p_ip text default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_garden public.gardens%rowtype;
  v_name   text := trim(coalesce(p_name, ''));
  v_phone  text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_today  date := (now() at time zone 'Asia/Kolkata')::date;
begin
  select * into v_garden from public.gardens g where g.slug = p_slug and g.marketplace_enabled;
  if not found then
    raise exception 'NOT_LISTED' using errcode = 'P0002';
  end if;

  if v_phone ~ '^91[0-9]{10}$' then v_phone := substr(v_phone, 3); end if;

  if char_length(v_name) < 2 or char_length(v_name) > 80 then
    raise exception 'BAD_INPUT: naam' using errcode = '22023';
  end if;
  if v_phone !~ '^[0-9]{10}$' then
    raise exception 'BAD_INPUT: phone' using errcode = '22023';
  end if;
  if p_date is null or p_date < v_today or p_date > v_today + 730 then
    raise exception 'BAD_INPUT: date' using errcode = '22023';
  end if;
  if p_guests is null or p_guests < 1 or p_guests > 20000 then
    raise exception 'BAD_INPUT: guests' using errcode = '22023';
  end if;
  if p_event_type is null
     or p_event_type not in ('shaadi','reception','engagement','tilak','birthday_other')
     or not (p_event_type = any (v_garden.event_types)) then
    raise exception 'BAD_INPUT: event' using errcode = '22023';
  end if;

  perform public.public_rate_take(
    'ip:' || encode(sha256(convert_to(coalesce(nullif(p_ip, ''), 'unknown'), 'UTF8')), 'hex'),
    10, interval '1 hour', 'RATE_LIMITED');
  perform public.public_rate_take(
    'ph:' || v_garden.id::text || ':' || encode(sha256(convert_to(v_phone, 'UTF8')), 'hex'),
    3, interval '1 day', 'RATE_LIMITED');
  perform public.public_rate_take(
    'phall:' || encode(sha256(convert_to(v_phone, 'UTF8')), 'hex'),
    10, interval '1 day', 'RATE_LIMITED');

  insert into public.enquiries (garden_id, customer_name, phone, event_type, date_wanted, guests, status, notes)
  values (v_garden.id, v_name, v_phone, p_event_type, p_date, p_guests, 'naya',
          'Website (venue search) se enquiry');
end $$;

-- ---------- 6. GRANTS ----------
-- Pehle: PUBLIC aur anon se function execute hatao (Supabase default: PUBLIC ko milta hai).
-- Phir authenticated ko wahi jo pehle tha. Phir anon ko sirf chaar public functions.
revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon;
grant execute on all functions in schema public to authenticated;

-- Tables: anon ko kuch nahi (schema.sql wali line dobara, saaf dikhane ke liye)
revoke all on all tables in schema public from anon;
revoke all on public.public_rate_limits from authenticated;

-- Anon ke liye sirf: view (date/slot/status) aur chaar RPC
grant select on public.public_slot_status to anon, authenticated;
grant execute on function public.public_garden_card(text) to anon, authenticated;
grant execute on function public.public_search_gardens(text, date, int, text) to anon, authenticated;
grant execute on function public.public_garden_calendar(text, date, date) to anon, authenticated;
grant execute on function public.public_submit_enquiry(text, text, text, date, int, text, text) to anon, authenticated;
-- public_rate_take: bahar se nahi (anon aur authenticated dono ko nahi)
revoke execute on function public.public_rate_take(text, int, interval, text) from anon, authenticated;

comment on view public.public_slot_status is 'PUBLIC: sirf garden_id, event_date, slot, status (booked). Sirf marketplace ON gardens.';
comment on column public.gardens.marketplace_enabled is 'Garden owner ki sahmati: ON hone par hi public /venues par dikhta hai. Default OFF.';

commit;
