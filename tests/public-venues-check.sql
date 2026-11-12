-- =====================================================================
-- tests/public-venues-check.sql
-- schema.sql + migrations/002_public_venues.sql ko local PostgreSQL 15 par chalakar
-- public (anon) role ke privacy checks. Har check ek row banata hai (pv_log).
-- Supabase par nahi chalta: auth schema ka stub banaya gaya hai.
-- Chalane ka tarika: tests/run-public-venues-check.sh
-- =====================================================================
\set ON_ERROR_STOP 0
\i tests/stub-auth.sql
\i schema.sql
\i migrations/002_public_venues.sql

create table public.pv_log (id serial primary key, label text, pass boolean, detail text);

-- Test users: owner A, owner B, staff of garden A
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ownerA@x.com'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'ownerB@x.com'),
  ('cccccccc-0000-0000-0000-000000000003', 'staffA@x.com');

-- ---------- helpers ----------
-- Direct check (superuser): p_pass true/false
create or replace function public.pv_check(p_label text, p_pass boolean, p_detail text default '')
returns void language plpgsql as $$
begin
  insert into public.pv_log(label, pass, detail) values (p_label, coalesce(p_pass, false), p_detail);
end $$;

-- Statement p_sql ko p_role (anon / authenticated) ke roop mein chalao.
-- p_expect = 'OK' ya SQLSTATE. p_uid sirf authenticated ke liye.
create or replace function public.pv_run(p_sql text, p_label text, p_expect text,
  p_role text default 'anon', p_uid uuid default null)
returns void language plpgsql as $$
declare v_state text := 'OK'; v_msg text := ''; begin
  if p_uid is not null then
    perform set_config('request.jwt.claims', json_build_object('sub', p_uid)::text, true);
  end if;
  begin
    execute format('set local role %I', p_role);
    execute p_sql;
  exception when others then
    v_state := sqlstate; v_msg := sqlerrm;
  end;
  execute 'reset role';
  insert into public.pv_log(label, pass, detail) values (p_label, v_state = p_expect, 'got ' || v_state || ' ' || v_msg);
end $$;

-- Row count ka check: p_sql ek SELECT hai.
create or replace function public.pv_count(p_sql text, p_label text, p_expect bigint,
  p_role text default 'anon', p_uid uuid default null)
returns void language plpgsql as $$
declare v_n bigint := -1; v_msg text := ''; begin
  if p_uid is not null then
    perform set_config('request.jwt.claims', json_build_object('sub', p_uid)::text, true);
  end if;
  begin
    execute format('set local role %I', p_role);
    execute 'select count(*) from (' || p_sql || ') q' into v_n;
  exception when others then
    v_msg := sqlstate || ' ' || sqlerrm;
  end;
  execute 'reset role';
  insert into public.pv_log(label, pass, detail) values (p_label, v_n = p_expect, 'count ' || v_n || ' ' || v_msg);
end $$;

-- Value check: p_sql ek scalar expression ka text (float8) output, p_expect text.
create or replace function public.pv_val(p_sql text, p_label text, p_expect text,
  p_role text default 'anon', p_uid uuid default null)
returns void language plpgsql as $$
declare v_val text := null; v_msg text := ''; begin
  if p_uid is not null then
    perform set_config('request.jwt.claims', json_build_object('sub', p_uid)::text, true);
  end if;
  begin
    execute format('set local role %I', p_role);
    execute 'select (' || p_sql || ')::float8::text' into v_val;
  exception when others then
    v_msg := sqlstate || ' ' || sqlerrm;
  end;
  execute 'reset role';
  insert into public.pv_log(label, pass, detail) values (p_label, v_val is not distinct from p_expect, 'value ' || coalesce(v_val, 'NULL') || ' ' || v_msg);
end $$;

-- Helper functions ko PUBLIC se hatao, taaki G03 sirf product functions ginta ho (superuser ke helpers chalte rahen).
revoke execute on all functions in schema public from public;

-- ---------- SETUP (superuser, owner ke role se RPC) ----------
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001"}', false);
set role authenticated;
select public.create_garden('Garden A', '9000000001') as garden_a \gset
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002"}', false);
set role authenticated;
select public.create_garden('Garden B', '9000000002') as garden_b \gset
reset role;
insert into public.garden_members (garden_id, user_id, role, display_name)
values (:'garden_a', 'cccccccc-0000-0000-0000-000000000003', 'staff', 'Staff A');

-- Owner A: garden A ki public profile bharta hai aur marketplace ON karta hai (owner ki sahmati)
select pv_run(format($q$update public.gardens set slug = 'garden-a-kota', marketplace_enabled = true, city = 'Kota', area = 'Vigyan Nagar',
  capacity = 500, map_url = 'https://maps.google.com/?q=garden-a', description = 'Test garden A',
  amenities = array['AC hall','Parking'], photo_urls = array['https://example.com/a1.jpg'],
  event_types = array['shaadi','reception','engagement']
  where id = %L$q$, :'garden_a'), 'SETUP owner A public profile bhar sakta hai', 'OK', 'authenticated',
  'aaaaaaaa-0000-0000-0000-000000000001');
select pv_run(format($q$update public.gardens set slug = 'garden-b-kota', city = 'Kota', capacity = 800
  where id = %L$q$, :'garden_b'), 'SETUP owner B public profile bhar sakta hai (marketplace OFF hi rahega)', 'OK', 'authenticated',
  'bbbbbbbb-0000-0000-0000-000000000002');

-- Rates (owner A): hall, decoration, catering (plate), DJ, tent (0)
select pv_run(format($q$update public.rate_items set peak_rate = 150000, off_rate = 120000 where garden_id = %L and name = 'Hall / garden rent'$q$, :'garden_a'),
  'SETUP hall rate owner set', 'OK', 'authenticated', 'aaaaaaaa-0000-0000-0000-000000000001');
select pv_run(format($q$update public.rate_items set peak_rate = 20000, off_rate = 20000 where garden_id = %L and name = 'Decoration'$q$, :'garden_a'),
  'SETUP decoration rate', 'OK', 'authenticated', 'aaaaaaaa-0000-0000-0000-000000000001');
select pv_run(format($q$update public.rate_items set peak_rate = 400, off_rate = 350 where garden_id = %L and name like 'Catering%%'$q$, :'garden_a'),
  'SETUP catering per plate rate', 'OK', 'authenticated', 'aaaaaaaa-0000-0000-0000-000000000001');
select pv_run(format($q$update public.rate_items set peak_rate = 15000, off_rate = 15000 where garden_id = %L and name = 'DJ'$q$, :'garden_a'),
  'SETUP DJ rate', 'OK', 'authenticated', 'aaaaaaaa-0000-0000-0000-000000000001');
select pv_run(format($q$update public.rate_items set peak_rate = 150000, off_rate = 120000 where garden_id = %L and name = 'Hall / garden rent'$q$, :'garden_b'),
  'SETUP garden B hall rate (owner B)', 'OK', 'authenticated', 'bbbbbbbb-0000-0000-0000-000000000002');

-- Bookings (owner A ke roop mein save_booking; paise aur lines bhi)
select pv_run(format($q$select public.save_booking(%L::uuid,
  '{"customer_name":"Ravi Sharma","phone":"9876500001","event_type":"shaadi","event_date":"2027-03-01","slot":"din","guests":300,"status":"confirmed"}'::jsonb,
  '{"discount":0,"advance":50000,"balance_paid":0}'::jsonb,
  '[{"item_name":"Hall / garden rent","unit_type":"event","quantity":1,"unit_rate":150000}]'::jsonb)$q$, :'garden_a'),
  'SETUP owner A confirmed din booking with money and lines', 'OK', 'authenticated', 'aaaaaaaa-0000-0000-0000-000000000001');
select pv_run(format($q$select public.save_booking(%L::uuid,
  '{"customer_name":"Hold Person","phone":"9876500002","event_type":"reception","event_date":"2027-03-02","slot":"raat","guests":100,"status":"hold"}'::jsonb)$q$, :'garden_a'),
  'SETUP owner A hold booking', 'OK', 'authenticated', 'aaaaaaaa-0000-0000-0000-000000000001');
select pv_run(format($q$select public.save_booking(%L::uuid,
  '{"customer_name":"Full Day Customer","phone":"9876500003","event_type":"shaadi","event_date":"2027-03-03","slot":"full","guests":400,"status":"confirmed"}'::jsonb)$q$, :'garden_a'),
  'SETUP owner A full day booking', 'OK', 'authenticated', 'aaaaaaaa-0000-0000-0000-000000000001');
select pv_run(format($q$select public.save_booking(%L::uuid,
  '{"customer_name":"Cancel Person","phone":"9876500004","event_type":"shaadi","event_date":"2027-03-04","slot":"din","guests":50,"status":"cancelled"}'::jsonb)$q$, :'garden_a'),
  'SETUP owner A cancelled booking', 'OK', 'authenticated', 'aaaaaaaa-0000-0000-0000-000000000001');
select pv_run(format($q$select public.save_booking(%L::uuid,
  '{"customer_name":"Kota B Customer","phone":"9876500005","event_type":"shaadi","event_date":"2027-03-01","slot":"din","guests":200,"status":"confirmed"}'::jsonb)$q$, :'garden_b'),
  'SETUP owner B confirmed booking (garden B OFF)', 'OK', 'authenticated', 'bbbbbbbb-0000-0000-0000-000000000002');

-- Internal enquiry (owner A ki list mein)
select pv_run(format($q$insert into public.enquiries (garden_id, customer_name, phone, event_type, guests, status, notes)
  values (%L, 'Internal Enquiry Person', '9000011111', 'shaadi', 80, 'naya', 'Owner ne khud daali')$q$, :'garden_a'),
  'SETUP owner A internal enquiry', 'OK', 'authenticated', 'aaaaaaaa-0000-0000-0000-000000000001');

-- ---------- G: structure and grants (superuser checks) ----------
select pv_check('G01 anon ko public schema mein sirf 1 table privilege (view SELECT)',
  (select count(*) from information_schema.role_table_grants where grantee = 'anon' and table_schema = 'public') = 1,
  'got ' || (select count(*) from information_schema.role_table_grants where grantee = 'anon' and table_schema = 'public'));
select pv_check('G02 anon ka privilege public_slot_status par SELECT hai',
  exists (select 1 from information_schema.role_table_grants where grantee = 'anon' and table_name = 'public_slot_status' and privilege_type = 'SELECT'), '');
select pv_check('G03 anon EXECUTE sirf 4 public functions par',
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'EXECUTE')) = 4,
  'got ' || (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'EXECUTE')));
select pv_check('G04 view ke columns sirf garden_id,event_date,slot,status',
  (select string_agg(column_name, ',' order by ordinal_position) from information_schema.columns
    where table_schema = 'public' and table_name = 'public_slot_status') = 'garden_id,event_date,slot,status', '');
select pv_check('G05 public_garden_card output mein phone/address/owner nahi',
  (select pg_get_function_result(p.oid) from pg_proc p where p.proname = 'public_garden_card') !~* 'phone|address|created_by|owner',
  '');
select pv_check('G06 public_search_gardens aur calendar output mein phone/address nahi',
  (select pg_get_function_result(p.oid) from pg_proc p where p.proname = 'public_search_gardens') !~* 'phone|address|owner'
  and (select pg_get_function_result(p.oid) from pg_proc p where p.proname = 'public_garden_calendar') !~* 'phone|address|owner|status_name', '');
select pv_check('G07 marketplace_enabled default FALSE',
  (select column_default from information_schema.columns where table_schema = 'public' and table_name = 'gardens' and column_name = 'marketplace_enabled') = 'false', '');
select pv_check('G08 purani RLS policies sab maujood (6 key policies)',
  (select count(*) from pg_policies where schemaname = 'public'
    and policyname in ('bookings_select','money_owner_select','lines_owner_select','enquiries_select','rates_owner_all','gardens_update')) = 6, '');
select pv_check('G09 public_rate_limits par RLS on aur koi policy nahi',
  (select relrowsecurity from pg_class where relname = 'public_rate_limits')
  and not exists (select 1 from pg_policies where tablename = 'public_rate_limits'), '');

-- ---------- A: anon ko private tables se mana (expect 42501) ----------
select pv_run('select * from public.bookings', 'A01 anon bookings nahi padh sakta', '42501');
select pv_run('select * from public.booking_money', 'A02 anon booking_money (paisa) nahi padh sakta', '42501');
select pv_run('select * from public.booking_lines', 'A03 anon booking_lines (rate lines) nahi padh sakta', '42501');
select pv_run('select * from public.enquiries', 'A04 anon enquiries (customer naam/phone) nahi padh sakta', '42501');
select pv_run('select * from public.enquiry_quotes', 'A05 anon enquiry_quotes nahi padh sakta', '42501');
select pv_run('select * from public.rate_items', 'A06 anon rate_items nahi padh sakta', '42501');
select pv_run('select * from public.gardens', 'A07 anon gardens (owner_phone/address) nahi padh sakta', '42501');
select pv_run('select * from public.garden_members', 'A08 anon garden_members (staff list) nahi padh sakta', '42501');
select pv_run('select * from public.function_checklist', 'A09 anon function_checklist nahi padh sakta', '42501');
select pv_run('select * from public.booking_slot_locks', 'A10 anon booking_slot_locks nahi padh sakta', '42501');
select pv_run('select * from public.peak_seasons', 'A11 anon peak_seasons nahi padh sakta', '42501');
select pv_run('select * from public.public_rate_limits', 'A12 anon rate limit table nahi padh sakta', '42501');
select pv_run(format($q$insert into public.enquiries (garden_id, customer_name, guests) values (%L, 'Spam Person', 1)$q$, :'garden_a'),
  'A13 anon seedha enquiries mein insert nahi kar sakta', '42501');
select pv_run(format($q$update public.gardens set marketplace_enabled = true where id = %L$q$, :'garden_b'),
  'A14 anon marketplace toggle nahi badal sakta', '42501');
select pv_run('select public.save_booking(null, ''{}''::jsonb)', 'A15 anon save_booking nahi chala sakta', '42501');
select pv_run(format('select * from public.season_summary(%L, ''2027-01-01'', ''2027-12-31'')', :'garden_a'),
  'A16 anon season_summary (paisa total) nahi chala sakta', '42501');
select pv_run('select customer_name from public.public_slot_status', 'A17 view mein customer_name column hi nahi', '42703');
select pv_run('select phone from public.public_slot_status', 'A18 view mein phone column hi nahi', '42703');
select pv_run('select public.public_rate_take(''x'', 1, interval ''1 hour'', ''X'')', 'A19 anon rate_take function nahi chala sakta', '42501');

-- ---------- B: anon ko public data (sirf date/slot/status aur card) ----------
select pv_count('select garden_id from public.public_slot_status where garden_id = ' || quote_literal(:'garden_a'),
  'B01 view: garden A (ON) ki 3 active slot rows (cancelled gayab)', 3);
select pv_count('select garden_id from public.public_slot_status where garden_id = ' || quote_literal(:'garden_b'),
  'B02 view: garden B (OFF) ki koi row nahi', 0);
select pv_count('select status from public.public_slot_status where status <> ''booked''',
  'B03 view: status sirf booked (hold bhi booked dikhta hai)', 0);
select pv_count('select slug from public.public_garden_card(''garden-b-kota'')',
  'B04 card: garden B (OFF) ka card nahi', 0);
select pv_count('select slug from public.public_garden_card(''garden-a-kota'')',
  'B05 card: garden A (ON) ka card 1 row', 1);
select pv_val('select rate_min from public.public_garden_card(''garden-a-kota'')',
  'B06 card: rate_min sabse kam (catering 350 off)', '350');
select pv_val('select rate_max from public.public_garden_card(''garden-a-kota'')',
  'B07 card: rate_max sabse zyada (hall 150000 peak)', '150000');
select pv_val('select capacity from public.public_garden_card(''garden-a-kota'')',
  'B08 card: capacity 500', '500');
select pv_count('select slug from public.public_search_gardens(''Kota'', ''2027-03-05'', 100, ''shaadi'')',
  'B09 search: Kota, khaali date, 100 guests -> garden A (B OFF)', 1);
select pv_count('select slug from public.public_search_gardens(''Kota'', ''2027-03-01'', null, null)',
  'B10 search: 2027-03-01 par garden A booked hai -> 0', 0);
select pv_count('select slug from public.public_search_gardens(''Kota'', ''2027-03-04'', null, null)',
  'B11 search: cancelled din free -> 1', 1);
select pv_count('select slug from public.public_search_gardens(''Jaipur'', null, null, null)',
  'B12 search: Jaipur mein koi garden nahi -> 0', 0);
select pv_count('select slug from public.public_search_gardens(''Kota'', null, 9999, null)',
  'B13 search: 9999 guests (capacity 500) -> 0', 0);
select pv_count('select slug from public.public_search_gardens(''Kota'', null, null, ''tilak'')',
  'B14 search: tilak garden ki list mein nahi -> 0', 0);
select pv_count('select slug from public.public_search_gardens(''vigyan'', null, null, null)',
  'B15 search: area se (Vigyan Nagar) bhi milta hai -> 1', 1);
select pv_count('select slug from public.public_search_gardens(null, ''2026-01-01'', null, null)',
  'B16 search: beeti tareekh -> 0', 0);
select pv_count('select event_date from public.public_garden_calendar(''garden-a-kota'', ''2027-03-01'', ''2027-03-31'')',
  'B17 calendar: garden A March ke 3 booked slot rows', 3);
select pv_count('select event_date from public.public_garden_calendar(''garden-b-kota'', ''2027-03-01'', ''2027-03-31'')',
  'B18 calendar: garden B (OFF) -> 0', 0);
select pv_count('select status from public.public_garden_calendar(''garden-a-kota'', ''2027-03-01'', ''2027-03-31'') where status = ''booked''',
  'B19 calendar: status sirf booked', 3);
select pv_count('select * from public.public_slot_status s where s.garden_id = ' || quote_literal(:'garden_a') || ' and s.slot = ''raat''',
  'B20 view: hold wala raat slot booked dikhta hai', 1);

-- ---------- E: public enquiry ----------
select pv_run($q$select public.public_submit_enquiry('garden-a-kota', 'Ravi Kumar', '9876543210', '2027-04-10', 150, 'shaadi', '1.2.3.4')$q$,
  'E01 public enquiry garden A (ON) -> OK', 'OK');
select pv_run($q$select public.public_submit_enquiry('garden-a-kota', 'Asha Devi', '+91 98765 43211', '2027-04-11', 80, 'reception', '1.2.3.4')$q$,
  'E02 +91 wala phone spaces ke saath -> OK', 'OK');
select pv_run($q$select public.public_submit_enquiry('garden-b-kota', 'Koi Bhi', '9876543212', '2027-04-12', 80, 'shaadi', '1.2.3.4')$q$,
  'E03 garden B (OFF) par enquiry -> NOT_LISTED (P0002)', 'P0002');
select pv_run($q$select public.public_submit_enquiry('nahi-hai-yeh', 'Koi Bhi', '9876543213', '2027-04-12', 80, 'shaadi', '1.2.3.4')$q$,
  'E04 galat slug -> P0002', 'P0002');
select pv_run($q$select public.public_submit_enquiry('garden-a-kota', 'Test Person', '12345', '2027-04-12', 80, 'shaadi', '1.2.3.4')$q$,
  'E05 chhota phone -> BAD_INPUT (22023)', '22023');
select pv_run($q$select public.public_submit_enquiry('garden-a-kota', 'R', '9876543214', '2027-04-12', 80, 'shaadi', '1.2.3.4')$q$,
  'E06 chhota naam -> 22023', '22023');
select pv_run($q$select public.public_submit_enquiry('garden-a-kota', 'Test Person', '9876543215', '2027-04-12', 80, 'xyz', '1.2.3.4')$q$,
  'E07 galat event type -> 22023', '22023');
select pv_run($q$select public.public_submit_enquiry('garden-a-kota', 'Test Person', '9876543216', '2020-01-01', 80, 'shaadi', '1.2.3.4')$q$,
  'E08 beeti date -> 22023', '22023');
select pv_run($q$select public.public_submit_enquiry('garden-a-kota', 'Test Person', '9876543217', '2027-04-12', 0, 'shaadi', '1.2.3.4')$q$,
  'E09 guests 0 -> 22023', '22023');
select pv_run($q$select public.public_submit_enquiry('garden-a-kota', 'Test Person', '9876543218', '2027-04-12', 80, 'tilak', '1.2.3.4')$q$,
  'E10 garden ki list mein na ho (tilak) -> 22023', '22023');
select pv_run($q$select public.public_submit_enquiry('garden-a-kota', 'Ravi Kumar', '9876543210', '2027-04-10', 150, 'shaadi', '1.2.3.4')$q$,
  'E11 same phone dusri baar (2 of 3) -> OK', 'OK');
select pv_run($q$select public.public_submit_enquiry('garden-a-kota', 'Ravi Kumar', '9876543210', '2027-04-10', 150, 'shaadi', '1.2.3.4')$q$,
  'E12 same phone teesri baar (3 of 3) -> OK', 'OK');
select pv_run($q$select public.public_submit_enquiry('garden-a-kota', 'Ravi Kumar', '9876543210', '2027-04-10', 150, 'shaadi', '1.2.3.4')$q$,
  'E13 same phone chauthi baar -> RATE_LIMITED (P0429)', 'P0429');
select pv_run($q$select public.public_submit_enquiry('garden-a-kota', 'Ravi Kumar', '9876543210', '2027-04-10', 150, 'shaadi', '9.9.9.9')$q$,
  'E14 rate limit phone par hai, IP alag ho to bhi same phone par P0429 (garden+phone)', 'P0429');
do $$ begin
  for i in 1..10 loop
    perform public.pv_run(format($q$select public.public_submit_enquiry('garden-a-kota', 'IP Test %s', '90000000%s', '2027-04-20', 50, 'shaadi', '5.5.5.5')$q$, i, lpad(i::text, 2, '0')),
      'E20 IP 5.5.5.5 se entry ' || i || ' -> OK', 'OK');
  end loop;
end $$;
select pv_run($q$select public.public_submit_enquiry('garden-a-kota', 'IP Test 11', '9000000011', '2027-04-20', 50, 'shaadi', '5.5.5.5')$q$,
  'E30 IP 5.5.5.5 se 11wi entry -> RATE_LIMITED (P0429)', 'P0429');
select pv_count('select id from public.enquiries where garden_id = ' || quote_literal(:'garden_a') || ' and notes like ''Website%''',
  'E31 garden A ko public se 14 enquiries mili (owner ki list mein)', 14, 'authenticated', 'aaaaaaaa-0000-0000-0000-000000000001');
select pv_count('select id from public.enquiries where garden_id = ' || quote_literal(:'garden_a') || ' and customer_name = ''Ravi Kumar''',
  'E32 owner A ko Ravi Kumar ki enquiry dikhti hai (3 hit, 1 rejected)', 3, 'authenticated', 'aaaaaaaa-0000-0000-0000-000000000001');
select pv_count('select id from public.enquiries where garden_id = ' || quote_literal(:'garden_b') || ' and notes like ''Website%''',
  'E33 garden B mein koi public enquiry nahi (OFF)', 0, 'authenticated', 'bbbbbbbb-0000-0000-0000-000000000002');

-- ---------- O / S / T: owner, staff, tenant (existing RLS intact) ----------
select pv_count('select id from public.bookings where garden_id = ' || quote_literal(:'garden_a'),
  'O01 owner A apni 4 bookings dekh sakta hai (cancelled bhi)', 4, 'authenticated', 'aaaaaaaa-0000-0000-0000-000000000001');
select pv_count('select booking_id from public.booking_money where garden_id = ' || quote_literal(:'garden_a'),
  'O02 owner A apna paisa dekh sakta hai (4 rows)', 4, 'authenticated', 'aaaaaaaa-0000-0000-0000-000000000001');
select pv_count('select id from public.booking_lines where garden_id = ' || quote_literal(:'garden_a'),
  'O03 owner A rate lines dekh sakta hai (1)', 1, 'authenticated', 'aaaaaaaa-0000-0000-0000-000000000001');
select pv_count('select id from public.bookings where garden_id = ' || quote_literal(:'garden_b'),
  'O04 owner A garden B ki booking nahi dekh sakta (tenant)', 0, 'authenticated', 'aaaaaaaa-0000-0000-0000-000000000001');
select pv_count('select id from public.bookings where garden_id = ' || quote_literal(:'garden_b'),
  'O05 owner B apni garden B booking dekh sakta hai (OFF ho to bhi owner ka data)', 1, 'authenticated', 'bbbbbbbb-0000-0000-0000-000000000002');
select pv_count('select id from public.rate_items where garden_id = ' || quote_literal(:'garden_a'),
  'S01 staff rate items nahi dekh sakta', 0, 'authenticated', 'cccccccc-0000-0000-0000-000000000003');
select pv_count('select booking_id from public.booking_money where garden_id = ' || quote_literal(:'garden_a'),
  'S02 staff booking_money (paisa) nahi dekh sakta', 0, 'authenticated', 'cccccccc-0000-0000-0000-000000000003');
select pv_count('select id from public.booking_lines where garden_id = ' || quote_literal(:'garden_a'),
  'S03 staff rate lines nahi dekh sakta', 0, 'authenticated', 'cccccccc-0000-0000-0000-000000000003');
select pv_run(format($q$update public.gardens set marketplace_enabled = false where id = %L$q$, :'garden_a'),
  'S04 staff marketplace toggle try kare (RLS se 0 rows, error nahi)', 'OK', 'authenticated', 'cccccccc-0000-0000-0000-000000000003');
select pv_check('S05 staff ke try ke baad garden A marketplace abhi bhi ON',
  (select marketplace_enabled from public.gardens where id = :'garden_a'), '');
select pv_run(format($q$update public.gardens set marketplace_enabled = true where id = %L$q$, :'garden_b'),
  'T01 owner A garden B ka toggle nahi badal sakta (tenant, 0 rows)', 'OK', 'authenticated', 'aaaaaaaa-0000-0000-0000-000000000001');
select pv_check('T02 garden B marketplace abhi bhi OFF', not (select marketplace_enabled from public.gardens where id = :'garden_b'), '');
select pv_run(format($q$update public.gardens set marketplace_enabled = true where id = %L$q$, :'garden_b'),
  'T03 owner B apna toggle ON karta hai (OK)', 'OK', 'authenticated', 'bbbbbbbb-0000-0000-0000-000000000002');
select pv_check('T04 owner B ke toggle ON ke baad garden B ON hai', (select marketplace_enabled from public.gardens where id = :'garden_b'), '');
select pv_run(format($q$update public.gardens set marketplace_enabled = false where id = %L$q$, :'garden_b'),
  'T05 owner B apna toggle OFF karta hai (OK)', 'OK', 'authenticated', 'bbbbbbbb-0000-0000-0000-000000000002');
-- Toggle OFF ka asar: owner A garden A OFF karta hai, public se sab gayab
select pv_run(format($q$update public.gardens set marketplace_enabled = false where id = %L$q$, :'garden_a'),
  'T06 owner A apna garden A toggle OFF karta hai (OK)', 'OK', 'authenticated', 'aaaaaaaa-0000-0000-0000-000000000001');
select pv_count('select garden_id from public.public_slot_status where garden_id = ' || quote_literal(:'garden_a'),
  'T07 toggle OFF ke baad view mein garden A ki koi row nahi', 0);
select pv_count('select slug from public.public_garden_card(''garden-a-kota'')',
  'T08 toggle OFF ke baad card nahi', 0);
select pv_count('select slug from public.public_search_gardens(''Kota'', null, null, null)',
  'T09 toggle OFF ke baad search mein koi nahi', 0);
select pv_count('select event_date from public.public_garden_calendar(''garden-a-kota'', ''2027-03-01'', ''2027-03-31'')',
  'T10 toggle OFF ke baad calendar khaali', 0);
select pv_run($q$select public.public_submit_enquiry('garden-a-kota', 'Ravi Kumar', '9876543299', '2027-04-10', 150, 'shaadi', '1.2.3.4')$q$,
  'T11 toggle OFF ke baad enquiry -> NOT_LISTED', 'P0002');
select pv_run(format($q$update public.gardens set marketplace_enabled = true where id = %L$q$, :'garden_a'),
  'T12 owner A wapas ON karta hai (end state)', 'OK', 'authenticated', 'aaaaaaaa-0000-0000-0000-000000000001');

-- ---------- RESULT ----------
select count(*) filter (where not pass) as failed, count(*) as total from public.pv_log;
select id, label, pass, detail from public.pv_log where not pass order by id;
