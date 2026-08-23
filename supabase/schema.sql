-- ============================================================================
-- LAVISH BOYS HOSTEL — PostgreSQL / Supabase schema
-- Normalized, indexed, constrained, RLS-protected. Designed for 20+ years.
-- Run this whole file in: Supabase Dashboard → SQL Editor → New query.
-- ============================================================================

-- Extensions ----------------------------------------------------------------
create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "pg_trgm";        -- fast fuzzy / ILIKE search

-- ============================================================================
-- ENUM TYPES
-- ============================================================================
do $$ begin
  create type room_status   as enum ('active', 'inactive', 'maintenance');
  create type room_type     as enum ('single', 'double', 'triple', 'custom');
  create type student_status as enum ('active', 'left', 'suspended');
  create type payment_method as enum ('cash', 'online', 'mixed');
  create type employee_status as enum ('active', 'inactive', 'terminated');
  create type emp_txn_type   as enum ('salary', 'bonus', 'advance', 'deduction');
  create type timeline_type  as enum ('admission','room_changed','fee_paid','warning','leaving','note');
exception when duplicate_object then null; end $$;

-- ============================================================================
-- updated_at helper
-- ============================================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ============================================================================
-- PROFILES (admin accounts — 1:1 with auth.users)
-- ============================================================================
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  email       text,
  avatar_url  text,
  role        text not null default 'admin',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();

-- Auto-create a profile whenever a new auth user is created.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================================
-- HOSTEL SETTINGS (single-row config)
-- ============================================================================
create table if not exists hostel_settings (
  id             int primary key default 1,
  hostel_name    text not null default 'Lavish Boys Hostel',
  logo_url       text,
  address        text,
  phone          text,
  email          text,
  receipt_footer text default 'Thank you for staying with us.',
  currency       text not null default 'PKR',
  date_format    text not null default 'DD/MM/YYYY',
  theme          text not null default 'light',
  drive_folder_id text,
  drive_connected boolean not null default false,
  updated_at     timestamptz not null default now(),
  constraint single_row check (id = 1)
);
insert into hostel_settings (id) values (1) on conflict do nothing;
create trigger trg_settings_updated before update on hostel_settings
  for each row execute function set_updated_at();

-- ============================================================================
-- ROOMS
-- ============================================================================
create table if not exists rooms (
  id             uuid primary key default gen_random_uuid(),
  room_number    text not null unique,
  floor          int  not null default 0,
  room_type      room_type not null default 'double',
  capacity       int  not null check (capacity > 0),
  occupied_seats int  not null default 0 check (occupied_seats >= 0),
  rent_per_month numeric(12,2) not null default 0 check (rent_per_month >= 0),
  status         room_status not null default 'active',
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint no_overbooking check (occupied_seats <= capacity)
);
create index if not exists idx_rooms_status on rooms(status);
create index if not exists idx_rooms_number_trgm on rooms using gin (room_number gin_trgm_ops);
create trigger trg_rooms_updated before update on rooms
  for each row execute function set_updated_at();

-- ============================================================================
-- STUDENTS
-- ============================================================================
create table if not exists students (
  id                uuid primary key default gen_random_uuid(),
  full_name         text not null,
  father_name       text,
  cnic              text unique,
  phone             text,
  emergency_contact text,
  email             text,
  address           text,
  blood_group       text,
  medical_notes     text,
  guardian_details  text,
  photo_url         text,
  cnic_front_url    text,
  cnic_back_url     text,
  documents         jsonb not null default '[]'::jsonb,
  room_id           uuid references rooms(id) on delete set null,
  seat_number       text,
  joining_date      date not null default current_date,
  leaving_date      date,
  monthly_fee       numeric(12,2) not null default 0 check (monthly_fee >= 0),
  security_deposit  numeric(12,2) not null default 0 check (security_deposit >= 0),
  admission_fee     numeric(12,2) not null default 0 check (admission_fee >= 0),
  status            student_status not null default 'active',
  remarks           text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint leaving_after_joining check (leaving_date is null or leaving_date >= joining_date)
);
create index if not exists idx_students_status  on students(status);
create index if not exists idx_students_room     on students(room_id);
create index if not exists idx_students_leaving  on students(leaving_date);
create index if not exists idx_students_name_trgm on students using gin (full_name gin_trgm_ops);
create index if not exists idx_students_cnic_trgm on students using gin (cnic gin_trgm_ops);
create index if not exists idx_students_phone_trgm on students using gin (phone gin_trgm_ops);
create trigger trg_students_updated before update on students
  for each row execute function set_updated_at();

-- ── Keep rooms.occupied_seats in sync + block overbooking ──────────────────
create or replace function recalc_room_occupancy(p_room uuid)
returns void language plpgsql as $$
begin
  if p_room is null then return; end if;
  update rooms r
     set occupied_seats = (
       select count(*) from students s
       where s.room_id = p_room and s.status = 'active')
   where r.id = p_room;
end $$;

create or replace function students_occupancy_guard()
returns trigger language plpgsql as $$
declare v_cap int; v_count int;
begin
  -- Enforce capacity on the NEW room for active students.
  if new.room_id is not null and new.status = 'active' then
    select capacity into v_cap from rooms where id = new.room_id;
    select count(*) into v_count from students
      where room_id = new.room_id and status = 'active' and id <> new.id;
    if v_count + 1 > v_cap then
      raise exception 'Room is full: capacity % already reached', v_cap;
    end if;
  end if;
  return new;
end $$;

create or replace function students_occupancy_after()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    perform recalc_room_occupancy(old.room_id);
    return old;
  end if;
  perform recalc_room_occupancy(new.room_id);
  if tg_op = 'UPDATE' and old.room_id is distinct from new.room_id then
    perform recalc_room_occupancy(old.room_id);
  end if;
  return new;
end $$;

create trigger trg_students_guard before insert or update on students
  for each row execute function students_occupancy_guard();
create trigger trg_students_recalc after insert or update or delete on students
  for each row execute function students_occupancy_after();

-- ============================================================================
-- FEE PAYMENTS (receipts) — permanent, immutable-by-convention record
-- ============================================================================
create sequence if not exists receipt_seq start 1;

create table if not exists fee_payments (
  id             uuid primary key default gen_random_uuid(),
  receipt_no     text not null unique,
  student_id     uuid not null references students(id) on delete restrict,
  room_id        uuid references rooms(id) on delete set null,
  seat_number    text,
  fee_month      date not null,                     -- first day of the paid month
  amount         numeric(12,2) not null check (amount > 0),
  cash_amount    numeric(12,2) not null default 0 check (cash_amount >= 0),
  online_amount  numeric(12,2) not null default 0 check (online_amount >= 0),
  method         payment_method not null default 'cash',
  paid_on        date not null default current_date,
  collected_by   text,
  notes          text,
  pdf_url        text,
  drive_file_id  text,
  created_at     timestamptz not null default now(),
  constraint amount_split_matches check (cash_amount + online_amount = amount)
);
create index if not exists idx_fees_student on fee_payments(student_id);
create index if not exists idx_fees_paid_on on fee_payments(paid_on);
create index if not exists idx_fees_month   on fee_payments(fee_month);
create index if not exists idx_fees_receipt_trgm on fee_payments using gin (receipt_no gin_trgm_ops);

-- Auto receipt number: LBH-000001
create or replace function assign_receipt_no()
returns trigger language plpgsql as $$
begin
  if new.receipt_no is null or new.receipt_no = '' then
    new.receipt_no := 'LBH-' || lpad(nextval('receipt_seq')::text, 6, '0');
  end if;
  return new;
end $$;
create trigger trg_fees_receipt before insert on fee_payments
  for each row execute function assign_receipt_no();

-- ============================================================================
-- EXPENSES
-- ============================================================================
create table if not exists expenses (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  category    text not null,
  amount      numeric(12,2) not null check (amount >= 0),
  spent_on    date not null default current_date,
  paid_to     text,
  description text,
  bill_url    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_expenses_date on expenses(spent_on);
create index if not exists idx_expenses_cat  on expenses(category);
create trigger trg_expenses_updated before update on expenses
  for each row execute function set_updated_at();

-- ============================================================================
-- EMPLOYEES
-- ============================================================================
create table if not exists employees (
  id           uuid primary key default gen_random_uuid(),
  full_name    text not null,
  cnic         text unique,
  phone        text,
  designation  text,
  photo_url    text,
  documents    jsonb not null default '[]'::jsonb,
  joining_date date not null default current_date,
  salary       numeric(12,2) not null default 0 check (salary >= 0),
  status       employee_status not null default 'active',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_employees_status on employees(status);
create index if not exists idx_employees_name_trgm on employees using gin (full_name gin_trgm_ops);
create trigger trg_employees_updated before update on employees
  for each row execute function set_updated_at();

-- Employee salary / advance / bonus / deduction history
create table if not exists employee_payments (
  id           uuid primary key default gen_random_uuid(),
  employee_id  uuid not null references employees(id) on delete cascade,
  txn_type     emp_txn_type not null default 'salary',
  amount       numeric(12,2) not null check (amount >= 0),
  for_month    date,
  paid_on      date not null default current_date,
  notes        text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_emp_pay_emp  on employee_payments(employee_id);
create index if not exists idx_emp_pay_date on employee_payments(paid_on);

-- ============================================================================
-- STUDENT TIMELINE (audit-friendly per-student history)
-- ============================================================================
create table if not exists student_timeline (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references students(id) on delete cascade,
  event_type  timeline_type not null,
  title       text not null,
  detail      text,
  event_date  timestamptz not null default now()
);
create index if not exists idx_timeline_student on student_timeline(student_id);

-- ============================================================================
-- AUDIT LOG
-- ============================================================================
create table if not exists audit_logs (
  id         bigserial primary key,
  actor_id   uuid,
  actor_email text,
  action     text not null,           -- create | update | delete | login | ...
  entity     text not null,           -- rooms | students | fee_payments | ...
  entity_id  text,
  old_value  jsonb,
  new_value  jsonb,
  ip_address text,
  device     text,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_entity on audit_logs(entity);
create index if not exists idx_audit_created on audit_logs(created_at);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================
create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  type       text not null,           -- fee_due | leaving | low_vacancy | expense | salary | backup
  title      text not null,
  message    text,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notif_read on notifications(is_read);

-- ============================================================================
-- VIEWS — dashboard & reporting helpers
-- ============================================================================

-- Per-student financial summary (months stayed, paid, pending, advance).
create or replace view student_financials as
select
  s.id as student_id,
  s.full_name,
  s.status,
  s.monthly_fee,
  s.joining_date,
  coalesce(s.leaving_date, current_date) as effective_end,
  greatest(
    1,
    (date_part('year',  age(coalesce(s.leaving_date, current_date), s.joining_date)) * 12
     + date_part('month', age(coalesce(s.leaving_date, current_date), s.joining_date)))::int
    + 1
  ) as months_stayed,
  coalesce(p.total_paid, 0) as total_paid,
  greatest(
    1,
    (date_part('year',  age(coalesce(s.leaving_date, current_date), s.joining_date)) * 12
     + date_part('month', age(coalesce(s.leaving_date, current_date), s.joining_date)))::int
    + 1
  ) * s.monthly_fee - coalesce(p.total_paid, 0) as pending_amount
from students s
left join (
  select student_id, sum(amount) as total_paid
  from fee_payments group by student_id
) p on p.student_id = s.id;

-- Room occupancy view.
create or replace view room_occupancy as
select
  r.id, r.room_number, r.floor, r.room_type, r.capacity,
  r.occupied_seats, (r.capacity - r.occupied_seats) as vacant_seats,
  r.rent_per_month, r.status
from rooms r;

-- Daily income / expense rollup (fast dashboard & reports).
create or replace view daily_income as
select paid_on as day, sum(amount) as income from fee_payments group by paid_on;

create or replace view daily_expense as
select spent_on as day, sum(amount) as expense from expenses group by spent_on;

-- ============================================================================
-- ROW LEVEL SECURITY
-- Only authenticated admins may read/write. (No public/anon access.)
-- ============================================================================
alter table profiles          enable row level security;
alter table hostel_settings   enable row level security;
alter table rooms             enable row level security;
alter table students          enable row level security;
alter table fee_payments      enable row level security;
alter table expenses          enable row level security;
alter table employees         enable row level security;
alter table employee_payments enable row level security;
alter table student_timeline  enable row level security;
alter table audit_logs        enable row level security;
alter table notifications     enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','hostel_settings','rooms','students','fee_payments','expenses',
    'employees','employee_payments','student_timeline','audit_logs','notifications'
  ] loop
    execute format('drop policy if exists auth_all on %I;', t);
    execute format(
      'create policy auth_all on %I for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- ============================================================================
-- STORAGE BUCKETS  (private; access via authenticated policies below)
-- ============================================================================
insert into storage.buckets (id, name, public)
values
  ('student-documents','student-documents', false),
  ('student-photos','student-photos', false),
  ('receipts','receipts', false),
  ('expense-bills','expense-bills', false),
  ('employee-documents','employee-documents', false),
  ('hostel-files','hostel-files', false)
on conflict (id) do nothing;

-- Authenticated admins may manage objects in all app buckets.
drop policy if exists storage_admin_read on storage.objects;
drop policy if exists storage_admin_write on storage.objects;
create policy storage_admin_read on storage.objects for select to authenticated
  using (bucket_id in ('student-documents','student-photos','receipts','expense-bills','employee-documents','hostel-files'));
create policy storage_admin_write on storage.objects for insert to authenticated
  with check (bucket_id in ('student-documents','student-photos','receipts','expense-bills','employee-documents','hostel-files'));
create policy storage_admin_update on storage.objects for update to authenticated
  using (bucket_id in ('student-documents','student-photos','receipts','expense-bills','employee-documents','hostel-files'));
create policy storage_admin_delete on storage.objects for delete to authenticated
  using (bucket_id in ('student-documents','student-photos','receipts','expense-bills','employee-documents','hostel-files'));

-- ============================================================================
-- DONE.  Next: create your admin user (see supabase/README.md).
-- ============================================================================
