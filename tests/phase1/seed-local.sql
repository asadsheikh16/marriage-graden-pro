
-- tests/phase1/seed-local.sql
-- Phase 1 local test data (LOCAL PostgreSQL only, never Supabase). Fake names and phones.
-- Run after: tests/stub-auth.sql, schema.sql, migrations/002_public_venues.sql
-- Garden A "Sitara Garden" (owner + staff, bookings this month, last month, next month)
-- Garden B "Test Lawn B" (owner only, no bookings last month -> growth % must stay hidden)

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'owner@test.local'),
  ('22222222-2222-4222-8222-222222222222', 'staff@test.local')
on conflict (id) do nothing;

insert into public.gardens (id, name, owner_phone, city, slug, created_by) values
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'Sitara Garden', '9000000001', 'Kota', 'sitara-garden', '11111111-1111-4111-8111-111111111111'),
  ('bbbbbbbb-0000-4000-8000-00000000000b', 'Test Lawn B', '9000000002', 'Jaipur', null, '11111111-1111-4111-8111-111111111111');

insert into public.garden_members (garden_id, user_id, role, display_name) values
  ('aaaaaaaa-0000-4000-8000-00000000000a', '11111111-1111-4111-8111-111111111111', 'owner', 'Asad'),
  ('aaaaaaaa-0000-4000-8000-00000000000a', '22222222-2222-4222-8222-222222222222', 'staff', 'Ravi (staff)'),
  ('bbbbbbbb-0000-4000-8000-00000000000b', '11111111-1111-4111-8111-111111111111', 'owner', 'Asad');

insert into public.rate_items (garden_id, name, unit_type, peak_rate, off_rate, sort_order) values
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'Hall / garden rent', 'event', 600000, 400000, 1),
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'Decoration', 'event', 100000, 70000, 2),
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'Catering (per plate)', 'plate', 500, 350, 3),
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'DJ', 'event', 15000, 10000, 4);

-- Bookings: dates relative to today (IST) so the dashboard always has data for this month,
-- last month and next month.
create temp table seed_b (
  g uuid, cust text, phone text, ev text, off_days int, slot text, guests int, status text,
  total numeric, paid numeric
);
insert into seed_b values
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'Meera Sharma',  '9811100001', 'shaadi',     0, 'full', 450, 'confirmed', 965500, 50000),
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'Ankit Jain',    '9811100002', 'reception',  0, 'raat', 220, 'hold',      0, 0),
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'Sunita Verma',  '9811100003', 'engagement', 6, 'din', 120, 'confirmed', 180000, 180000),
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'Rohit Meena',   '9811100004', 'shaadi',     9, 'raat', 380, 'confirmed', 420000, 100000),
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'Pooja Singh',   '9811100005', 'shaadi',    14, 'full', 500, 'hold',      0, 0),
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'Kiran Gupta',   '9811100006', 'reception', 20, 'din', 200, 'confirmed', 250000, 0),
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'Old Customer 1','9811100007', 'shaadi',   -20, 'full', 300, 'confirmed', 300000, 300000),
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'Old Customer 2','9811100008', 'engagement',-25,'din', 90,  'confirmed', 120000, 60000),
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'Old Customer 3','9811100009', 'shaadi',   -12, 'raat', 260, 'confirmed', 200000, 200000),
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'Cancelled Lead','9811100010', 'shaadi',     3, 'din', 100, 'cancelled', 0, 0),
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'Next Month 1',  '9811100011', 'shaadi',    35, 'full', 400, 'confirmed', 700000, 200000),
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'Next Month 2',  '9811100012', 'reception', 42, 'raat', 300, 'hold',     0, 0),
  ('bbbbbbbb-0000-4000-8000-00000000000b', 'Lawn B Customer','9811100013','birthday_other', 4, 'din', 80, 'confirmed', 90000, 0);

-- A trigger creates the booking_money row on insert; we then set its amounts (owner-side data).
insert into public.bookings (garden_id, customer_name, phone, event_type, event_date, slot, guests, status)
select g, cust, phone, ev, (now() at time zone 'Asia/Kolkata')::date + off_days, slot, guests, status
from seed_b;

update public.booking_money bm
set subtotal = sb.total,
    advance = case when sb.paid > 0 then least(sb.paid, sb.total) else 0 end
from public.bookings b join seed_b sb on sb.cust = b.customer_name and sb.g = b.garden_id
where bm.booking_id = b.id and sb.total > 0;

-- Hold bookings and cancelled ones have no money row (no lines). Booked rows get one rate line.
insert into public.booking_lines (booking_id, garden_id, item_name, unit_type, quantity, unit_rate)
select bm.booking_id, bm.garden_id, 'Hall / garden rent', 'event', 1, bm.subtotal
from public.booking_money bm;

-- Enquiries (owner-visible rate quotes are not needed for the dashboard)
insert into public.enquiries (garden_id, customer_name, phone, event_type, date_wanted, guests, status)
values
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'Neha Kothari', '9811200001', 'shaadi', (now() at time zone 'Asia/Kolkata')::date + 60, 300, 'naya'),
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'Vikram Rao',   '9811200002', 'reception', (now() at time zone 'Asia/Kolkata')::date + 75, 180, 'visit');

-- one enquiry rate quote (owner only), so the owner-side quote check has a row to read
insert into public.enquiry_quotes (enquiry_id, garden_id, rate_quoted)
select e.id, e.garden_id, 450000 from public.enquiries e where e.customer_name = 'Neha Kothari';
