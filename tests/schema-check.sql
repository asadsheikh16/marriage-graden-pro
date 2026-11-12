-- =====================================================================
-- tests/schema-check.sql — schema.sql ko local PostgreSQL 15 par check karta hai.
-- Supabase ka auth schema copy karke (stub) auth.uid() banaya gaya hai.
-- Chalane ka tarika: tests/run-schema-check.sh dekhiye.
-- Har check ek PASS/FAIL row banata hai, aakhir mein summary.
-- =====================================================================
\set ON_ERROR_STOP 0
drop schema if exists auth cascade;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text);
-- Supabase jaisa: JWT claims se user id nikalta hai
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid $$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
grant usage on schema auth to anon, authenticated;
grant usage on schema public to anon, authenticated;

-- schema.sql ko fresh schema par chalao
drop schema if exists public cascade;
create schema public;
grant usage on schema public to anon, authenticated;
\i schema.sql

create table public.test_log (id serial primary key, label text, pass boolean, detail text);
grant all on public.test_log to authenticated, anon;

-- Test users (Owner A, Owner B, Staff of garden A)
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ownerA@x.com'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'ownerB@x.com'),
  ('cccccccc-0000-0000-0000-000000000003', 'staffA@x.com');

-- Garden A aur B: postgres (superuser) se banaya, phir owner ke role se RPC
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001"}', false);
set role authenticated;
select public.create_garden('Garden A', '9000000001') as garden_a \gset
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002"}', false);
set role authenticated;
select public.create_garden('Garden B', '9000000002') as garden_b \gset
reset role;
-- staff ko garden A mein daalo (postgres se, jaise server action service-role se karta hai)
insert into public.garden_members (garden_id, user_id, role, display_name)
values (:'garden_a', 'cccccccc-0000-0000-0000-000000000003', 'staff', 'Staff A');

-- Helper: ek test chalao, role authenticated, uid set, result PASS/FAIL row mein
-- p_expect: 'OK' (error nahi aana chahiye) ya SQLSTATE (jaise 23505, 42501, 23514)
create or replace function public.t_run(p_uid uuid, p_sql text, p_label text, p_expect text)
returns void language plpgsql as $$
declare v_state text := 'OK'; v_msg text := ''; begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid)::text, true);
  begin
    execute 'set local role authenticated';
    execute p_sql;
  exception when others then
    v_state := sqlstate; v_msg := sqlerrm;
  end;
  execute 'reset role';
  insert into public.test_log(label, pass, detail)
  values (p_label, v_state = p_expect, 'got ' || v_state || ' ' || v_msg);
end $$;

-- Helper: count ka test. p_sql ek SELECT hai; p_expect = expected row count (text)
create or replace function public.t_count(p_uid uuid, p_sql text, p_label text, p_expect int)
returns void language plpgsql as $$
declare v_n int := -1; v_msg text := ''; begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid)::text, true);
  begin
    execute 'set local role authenticated';
    execute 'select count(*) from (' || p_sql || ') q' into v_n;
  exception when others then v_msg := sqlstate || ' ' || sqlerrm;
  end;
  execute 'reset role';
  insert into public.test_log(label, pass, detail)
  values (p_label, v_n = p_expect, 'count ' || v_n || ' ' || v_msg);
end $$;

-- Owner A ke liye rate items seed ke hain? (create_garden ne 5 banaye)
select public.t_count('aaaaaaaa-0000-0000-0000-000000000001',
  format('select id from public.rate_items where garden_id = %L', :'garden_a'),
  'A01 owner A rate items dekh sakta hai (5 seeded)', 5);

-- ---------- Tenant isolation (owner A cannot read garden B) ----------
select public.t_count('aaaaaaaa-0000-0000-0000-000000000001',
  format('select id from public.gardens where id = %L', :'garden_b'),
  'T01 owner A garden B nahi padh sakta', 0);
select public.t_count('aaaaaaaa-0000-0000-0000-000000000001',
  'select id from public.gardens', 'T02 owner A sirf apna garden dekhta hai (1)', 1);
select public.t_run('aaaaaaaa-0000-0000-0000-000000000001',
  format($q$insert into public.bookings(garden_id,customer_name,phone,event_type,event_date,slot)
    values (%L,'Cross','9111111111','shaadi','2027-03-01','din')$q$, :'garden_b'),
  'T03 owner A garden B mein booking nahi daal sakta (RLS)', '42501');
select public.t_count('bbbbbbbb-0000-0000-0000-000000000002',
  format('select id from public.bookings where garden_id = %L', :'garden_a'),
  'T04 owner B garden A ki booking nahi dekh sakta', 0);
select public.t_count('bbbbbbbb-0000-0000-0000-000000000002',
  format('select id from public.rate_items where garden_id = %L', :'garden_a'),
  'T05 owner B garden A ke rate nahi dekh sakta', 0);
select public.t_run('aaaaaaaa-0000-0000-0000-000000000001',
  format('select public.save_booking(%L::uuid, %L::jsonb, null, %L::jsonb)', :'garden_b',
    '{"customer_name":"X Y","phone":"9111111112","event_type":"shaadi","event_date":"2027-03-02","slot":"din","guests":10}', '[]'),
  'T06 owner A save_booking garden B ke liye nahi kar sakta (NOT_A_MEMBER)', '42501');

-- ---------- Staff rules ----------
select public.t_count('cccccccc-0000-0000-0000-000000000003',
  format('select id from public.rate_items where garden_id = %L', :'garden_a'),
  'S01 staff rate items nahi dekh sakta', 0);
select public.t_count('cccccccc-0000-0000-0000-000000000003',
  format('select booking_id from public.booking_money where garden_id = %L', :'garden_a'),
  'S02 staff booking_money (paisa) nahi dekh sakta', 0);
select public.t_count('cccccccc-0000-0000-0000-000000000003',
  format('select id from public.booking_lines where garden_id = %L', :'garden_a'),
  'S03 staff rate lines nahi dekh sakta', 0);
select public.t_run('cccccccc-0000-0000-0000-000000000003',
  format('select * from public.season_summary(%L, %L, %L)', :'garden_a', '2027-01-01', '2027-12-31'),
  'S05 staff season_summary: OWNER_ONLY error 42501', '42501');
select public.t_run('cccccccc-0000-0000-0000-000000000003',
  format($q$update public.rate_items set peak_rate = 1 where garden_id = %L$q$, :'garden_a'),
  'S06 staff rate update: 0 rows (no error, RLS)', 'OK');
select public.t_run('cccccccc-0000-0000-0000-000000000003',
  format($q$insert into public.rate_items(garden_id,name,unit_type) values (%L,'Hack','event')$q$, :'garden_a'),
  'S07 staff naya rate item nahi bana sakta', '42501');
select public.t_run('cccccccc-0000-0000-0000-000000000003',
  format($q$insert into public.garden_members(garden_id,user_id,role) values (%L,'cccccccc-0000-0000-0000-000000000003','owner')$q$, :'garden_a'),
  'S08 staff khud ko owner nahi bana sakta', '42501');
select public.t_run('cccccccc-0000-0000-0000-000000000003',
  format($q$delete from public.bookings where garden_id = %L$q$, :'garden_a'),
  'S09 staff booking delete nahi kar sakta (0 rows, RLS)', 'OK');

select public.t_run('cccccccc-0000-0000-0000-000000000003',
  format('select public.save_booking(%L::uuid, %L::jsonb, %L::jsonb, %L::jsonb)', :'garden_a',
    '{"customer_name":"Staff Ramesh","phone":"9222222222","event_type":"reception","event_date":"2027-01-20","slot":"raat","guests":150}',
    '{"discount":99999,"advance":5000}', '[]'),
  'S11 staff naya booking bana sakta hai (paise ignore)', 'OK');

-- ---------- Double-booking guard (database) ----------
-- Owner A ki pehli booking: 2027-01-10 din, confirmed, paisa ke saath
select public.t_run('aaaaaaaa-0000-0000-0000-000000000001',
  format('select public.save_booking(%L::uuid, %L::jsonb, %L::jsonb, %L::jsonb)', :'garden_a',
    '{"customer_name":"Ravi Kumar","phone":"9876543210","event_type":"shaadi","event_date":"2027-01-10","slot":"din","guests":300}',
    '{"discount":5000,"advance":50000,"balance_paid":0}',
    '[{"item_name":"Hall / garden rent","unit_type":"event","quantity":1,"unit_rate":150000},{"item_name":"Catering (per plate)","unit_type":"plate","quantity":300,"unit_rate":500}]'),
  'D01 owner pehli din booking bana sakta hai', 'OK');
select public.t_run('aaaaaaaa-0000-0000-0000-000000000001',
  format($q$insert into public.bookings(garden_id,customer_name,phone,event_type,event_date,slot)
    values (%L,'Dup Din','9876500000','reception','2027-01-10','din')$q$, :'garden_a'),
  'D02 same date + din dobara: BLOCK (23505)', '23505');
select public.t_run('aaaaaaaa-0000-0000-0000-000000000001',
  format($q$insert into public.bookings(garden_id,customer_name,phone,event_type,event_date,slot)
    values (%L,'Night Raat','9876500001','engagement','2027-01-10','raat')$q$, :'garden_a'),
  'D03 same date + raat (din ke saath ok): OK', 'OK');
select public.t_run('aaaaaaaa-0000-0000-0000-000000000001',
  format($q$insert into public.bookings(garden_id,customer_name,phone,event_type,event_date,slot)
    values (%L,'Full Day','9876500002','shaadi','2027-01-10','full')$q$, :'garden_a'),
  'D04 full day jab din+raat booked hain: BLOCK (23505)', '23505');
select public.t_run('aaaaaaaa-0000-0000-0000-000000000001',
  format($q$insert into public.bookings(garden_id,customer_name,phone,event_type,event_date,slot)
    values (%L,'Full Free','9876500003','shaadi','2027-01-11','full')$q$, :'garden_a'),
  'D05 full day khali date par: OK', 'OK');
select public.t_run('aaaaaaaa-0000-0000-0000-000000000001',
  format($q$insert into public.bookings(garden_id,customer_name,phone,event_type,event_date,slot)
    values (%L,'After Full','9876500004','tilak','2027-01-11','raat')$q$, :'garden_a'),
  'D06 full day ke baad raat: BLOCK (23505)', '23505');
select public.t_run('aaaaaaaa-0000-0000-0000-000000000001',
  format($q$insert into public.bookings(garden_id,customer_name,phone,event_type,event_date,slot,status)
    values (%L,'Hold Din','9876500005','shaadi','2027-01-12','din','hold')$q$, :'garden_a'),
  'D07 hold din: OK (hold block nahi karta)', 'OK');
select public.t_run('aaaaaaaa-0000-0000-0000-000000000001',
  format($q$insert into public.bookings(garden_id,customer_name,phone,event_type,event_date,slot)
    values (%L,'Confirm Over Hold','9876500006','shaadi','2027-01-12','din')$q$, :'garden_a'),
  'D08 confirmed din hold ke upar: OK (hold confirmed ko nahi rokta)', 'OK');
select public.t_run('aaaaaaaa-0000-0000-0000-000000000001',
  format($q$update public.bookings set status = 'confirmed' where garden_id = %L and customer_name = 'Hold Din'$q$, :'garden_a'),
  'D09 hold ko confirm karna jab din pe confirmed hai: BLOCK (23505)', '23505');
select public.t_run('aaaaaaaa-0000-0000-0000-000000000001',
  format($q$update public.bookings set status = 'cancelled' where garden_id = %L and customer_name = 'Ravi Kumar'$q$, :'garden_a'),
  'D10 pehli booking cancel karo: OK', 'OK');
select public.t_run('aaaaaaaa-0000-0000-0000-000000000001',
  format($q$insert into public.bookings(garden_id,customer_name,phone,event_type,event_date,slot)
    values (%L,'Replace Din','9876500007','shaadi','2027-01-10','din')$q$, :'garden_a'),
  'D11 cancel ke baad same din dobara: OK (cancelled guard se bahar)', 'OK');
select public.t_run('aaaaaaaa-0000-0000-0000-000000000001',
  format($q$update public.bookings set slot='full' where garden_id = %L and customer_name = 'Night Raat'$q$, :'garden_a'),
  'D12 raat ko full day badalna jab din (Replace) booked hai: BLOCK (23505)', '23505');
select public.t_run('aaaaaaaa-0000-0000-0000-000000000001',
  format($q$delete from public.bookings where garden_id = %L and customer_name = 'Full Free'$q$, :'garden_a'),
  'D13 delete karne par lock bhi hata: OK', 'OK');
select public.t_run('aaaaaaaa-0000-0000-0000-000000000001',
  format($q$insert into public.bookings(garden_id,customer_name,phone,event_type,event_date,slot)
    values (%L,'Free Now','9876500008','shaadi','2027-01-11','full')$q$, :'garden_a'),
  'D14 delete ke baad wahi full day phir se: OK', 'OK');

-- ---------- Money rules (database) ----------
select public.t_count('aaaaaaaa-0000-0000-0000-000000000001',
  format($q$select 1 from public.booking_money m join public.bookings b on b.id = m.booking_id
    where b.garden_id = %L and b.customer_name = 'Ravi Kumar'
      and m.subtotal = 300000 and m.total_amount = 295000 and m.balance = 245000 and m.payment_status = 'pending' $q$, :'garden_a'),
  'M02 subtotal 300000 (150000 + 300x500), discount 5000 => total 295000, advance 50000 => balance 245000, pending', 1);
-- Paise badalne ka ek hi raasta: save_booking RPC (owner). Seedha UPDATE RLS se 0 rows hota hai.
select public.t_run('aaaaaaaa-0000-0000-0000-000000000001',
  format($q$update public.booking_money set balance_paid = 1 where booking_id = (select id from public.bookings where garden_id=%L and customer_name='Ravi Kumar')$q$, :'garden_a'),
  'M03a seedha money UPDATE: 0 rows (koi error nahi, RLS ne rok diya)', 'OK');
select public.t_run('aaaaaaaa-0000-0000-0000-000000000001',
  format('select public.save_booking(%L::uuid, %L::jsonb, %L::jsonb, %L::jsonb, (select id from public.bookings where garden_id = %L and customer_name = %L))', :'garden_a',
    '{"customer_name":"Ravi Kumar","phone":"9876543210","event_type":"shaadi","event_date":"2027-01-10","slot":"din","guests":300}',
    '{"discount":5000,"advance":50000,"balance_paid":245000}',
    '[{"item_name":"Hall / garden rent","unit_type":"event","quantity":1,"unit_rate":150000},{"item_name":"Catering (per plate)","unit_type":"plate","quantity":300,"unit_rate":500}]',
    :'garden_a', 'Ravi Kumar'),
  'M03 owner save_booking se poora balance jama: OK', 'OK');
select public.t_count('aaaaaaaa-0000-0000-0000-000000000001',
  format($q$select 1 from public.booking_money m join public.bookings b on b.id = m.booking_id
    where b.garden_id = %L and b.customer_name = 'Ravi Kumar' and m.payment_status = 'paid' and m.balance = 0 $q$, :'garden_a'),
  'M04 poora jama => status paid, balance 0', 1);
select public.t_run('aaaaaaaa-0000-0000-0000-000000000001',
  format('select public.save_booking(%L::uuid, %L::jsonb, %L::jsonb, %L::jsonb, (select id from public.bookings where garden_id = %L and customer_name = %L))', :'garden_a',
    '{"customer_name":"Ravi Kumar","phone":"9876543210","event_type":"shaadi","event_date":"2027-01-10","slot":"din","guests":300}',
    '{"discount":5000,"advance":50000,"balance_paid":999999}',
    '[{"item_name":"Hall / garden rent","unit_type":"event","quantity":1,"unit_rate":150000},{"item_name":"Catering (per plate)","unit_type":"plate","quantity":300,"unit_rate":500}]',
    :'garden_a', 'Ravi Kumar'),
  'M05 zyada paisa (overpay 999999 > total): BLOCK (23514)', '23514');
select public.t_run('aaaaaaaa-0000-0000-0000-000000000001',
  format('select public.save_booking(%L::uuid, %L::jsonb, %L::jsonb, %L::jsonb)', :'garden_a',
    '{"customer_name":"Bad Disc","phone":"9876500010","event_type":"shaadi","event_date":"2027-02-05","slot":"din","guests":50}',
    '{"discount":5000,"advance":0}', '[{"item_name":"DJ","unit_type":"event","quantity":1,"unit_rate":1000}]'),
  'M06 discount > subtotal: BLOCK (23514)', '23514');
select public.t_count('aaaaaaaa-0000-0000-0000-000000000001',
  format($q$select 1 from public.booking_money m join public.bookings b on b.id=m.booking_id
    where b.garden_id = %L and b.customer_name = 'Replace Din' and m.payment_status = 'pending' $q$, :'garden_a'),
  'M07 zero-amount booking: pending (paid nahi)', 1);

-- ---------- Checklist and season ----------
select public.t_count('aaaaaaaa-0000-0000-0000-000000000001',
  format($q$select 1 from public.function_checklist c join public.bookings b on b.id=c.booking_id
    where b.garden_id=%L and b.customer_name='Replace Din'$q$, :'garden_a'),
  'C01 naye booking par 6 checklist items ban gaye', 6);
select public.t_run('cccccccc-0000-0000-0000-000000000003',
  format($q$update public.function_checklist set done = true where garden_id = %L$q$, :'garden_a'),
  'C02 staff checklist tick kar sakta hai: OK', 'OK');
select public.t_run('cccccccc-0000-0000-0000-000000000003',
  format($q$delete from public.function_checklist where garden_id = %L$q$, :'garden_a'),
  'C03 staff checklist item delete nahi kar sakta (0 rows, RLS)', 'OK');
select public.t_count('aaaaaaaa-0000-0000-0000-000000000001',
  format($q$select 1 from public.function_checklist where garden_id = %L and done$q$, :'garden_a'),
  'C04 staff ke tick owner ko dikhte hain (7 bookings x 6 items = 42 done rows)', 42);
select public.t_run('aaaaaaaa-0000-0000-0000-000000000001',
  format('select * from public.season_summary(%L, %L, %L)', :'garden_a', '2027-01-01', '2027-12-31'),
  'SS01 owner season_summary chala sakta hai: OK', 'OK');
select public.t_count('aaaaaaaa-0000-0000-0000-000000000001',
  format($q$select 1 from public.season_of(%L, '2027-01-15'::date) s where s = 'peak' $q$, :'garden_a'),
  'SE01 Jan 15 default peak (Nov-Feb)', 1);
select public.t_count('aaaaaaaa-0000-0000-0000-000000000001',
  format($q$select 1 from public.season_of(%L, '2027-07-15'::date) s where s = 'off' $q$, :'garden_a'),
  'SE02 Jul 15 default off-season', 1);

-- Staff ko garden A ki sab 7 bookings dikhni chahiye (Ravi, Night, Hold, Confirm, Replace, Free Now, Staff Ramesh), garden B ki nahi
select public.t_count('cccccccc-0000-0000-0000-000000000003',
  'select id from public.bookings', 'S10 staff: sirf garden A ki 7 bookings dikhti hain', 7);

-- ---------- Summary ----------
select count(*) as total_checks, count(*) filter (where pass) as passed, count(*) filter (where not pass) as failed
from public.test_log;
select id, label, detail from public.test_log where not pass order by id;
