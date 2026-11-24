-- Harborview Dental — Supabase Schema & Row Level Security Setup
-- Run this script in your Supabase SQL Editor to initialize the exact required tables and policies.

-- 1. Enable UUID extension if needed
create extension if not exists "pgcrypto";

-- 2. Tables (Exact Schema)
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  duration_minutes integer not null check (duration_minutes > 0),
  price numeric(10, 2) not null check (price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text not null,
  service_id uuid not null references public.services(id) on delete restrict,
  appointment_date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.business_hours (
  id uuid primary key default gen_random_uuid(),
  weekday integer not null unique check (weekday between 0 and 6),
  is_open boolean not null default true,
  start_time time not null default '09:00:00',
  end_time time not null default '17:00:00'
);

create table if not exists public.blocked_dates (
  id uuid primary key default gen_random_uuid(),
  blocked_date date not null unique,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.clinic_settings (
  id uuid primary key default gen_random_uuid(),
  clinic_name text not null default 'Harborview Dental',
  clinic_email text not null default 'care@harborviewdental.com',
  clinic_phone text not null default '(206) 555-0194',
  clinic_address text not null default '420 Waterfront Plaza, Suite 300, Seattle, WA 98101',
  slot_interval_minutes integer not null default 30 check (slot_interval_minutes > 0),
  booking_notice_hours integer not null default 2 check (booking_notice_hours >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Helper function to check admin authorization strictly via admin_users.user_id
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;

-- 3. Enable Row Level Security
alter table public.services enable row level security;
alter table public.appointments enable row level security;
alter table public.business_hours enable row level security;
alter table public.blocked_dates enable row level security;
alter table public.clinic_settings enable row level security;
alter table public.admin_users enable row level security;

-- 4. RLS Policies

-- services: public reads active services; admins have full access
drop policy if exists "Public can read active services" on public.services;
create policy "Public can read active services"
  on public.services for select
  using (is_active = true or public.is_admin());

drop policy if exists "Admins can manage services" on public.services;
create policy "Admins can manage services"
  on public.services for all
  using (public.is_admin())
  with check (public.is_admin());

-- business_hours: public read; admins manage
drop policy if exists "Public can read business_hours" on public.business_hours;
create policy "Public can read business_hours"
  on public.business_hours for select
  using (true);

drop policy if exists "Admins can manage business_hours" on public.business_hours;
create policy "Admins can manage business_hours"
  on public.business_hours for all
  using (public.is_admin())
  with check (public.is_admin());

-- blocked_dates: public read; admins manage
drop policy if exists "Public can read blocked_dates" on public.blocked_dates;
create policy "Public can read blocked_dates"
  on public.blocked_dates for select
  using (true);

drop policy if exists "Admins can manage blocked_dates" on public.blocked_dates;
create policy "Admins can manage blocked_dates"
  on public.blocked_dates for all
  using (public.is_admin())
  with check (public.is_admin());

-- clinic_settings: public read; admins manage
drop policy if exists "Public can read clinic_settings" on public.clinic_settings;
create policy "Public can read clinic_settings"
  on public.clinic_settings for select
  using (true);

drop policy if exists "Admins can manage clinic_settings" on public.clinic_settings;
create policy "Admins can manage clinic_settings"
  on public.clinic_settings for all
  using (public.is_admin())
  with check (public.is_admin());

-- appointments: public can insert pending bookings; only admins can read full patient rows
drop policy if exists "Public can insert appointments" on public.appointments;
create policy "Public can insert appointments"
  on public.appointments for insert
  with check (status = 'pending');

drop policy if exists "Public can read appointment schedule times" on public.appointments;
drop policy if exists "Admins can read appointments" on public.appointments;
create policy "Admins can read appointments"
  on public.appointments for select
  using (public.is_admin());

-- PII-free slot lookup RPC so the public booking calendar can check busy times without exposing patient contact info
create or replace function public.get_booked_slots(target_date date)
returns table (
  appointment_date date,
  start_time time,
  end_time time,
  status text
)
language sql
security definer
stable
as $$
  select a.appointment_date, a.start_time, a.end_time, a.status
  from public.appointments a
  where a.appointment_date = target_date
    and a.status <> 'cancelled';
$$;

grant execute on function public.get_booked_slots(date) to anon, authenticated;

drop policy if exists "Admins can manage appointments" on public.appointments;
create policy "Admins can manage appointments"
  on public.appointments for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete appointments" on public.appointments;
create policy "Admins can delete appointments"
  on public.appointments for delete
  using (public.is_admin());

-- admin_users: authenticated user can check their own admin_users row
drop policy if exists "Users can check own admin status" on public.admin_users;
create policy "Users can check own admin status"
  on public.admin_users for select
  using (auth.uid() = user_id or public.is_admin());

-- 5. Initial Default Business Hours (Mon-Fri 08:30-17:30, Sat 09:00-14:00, Sun closed)
insert into public.business_hours (weekday, is_open, start_time, end_time)
values
  (0, false, '09:00:00', '17:00:00'),
  (1, true,  '08:30:00', '17:30:00'),
  (2, true,  '08:30:00', '17:30:00'),
  (3, true,  '08:30:00', '17:30:00'),
  (4, true,  '08:30:00', '17:30:00'),
  (5, true,  '08:30:00', '16:30:00'),
  (6, true,  '09:00:00', '14:00:00')
on conflict (weekday) do nothing;

-- 6. Initial Clinic Settings Row (insert only if table is empty)
insert into public.clinic_settings (
  clinic_name,
  clinic_email,
  clinic_phone,
  clinic_address,
  slot_interval_minutes,
  booking_notice_hours
)
select
  'Harborview Dental',
  'care@harborviewdental.com',
  '(206) 555-0194',
  '420 Waterfront Plaza, Suite 300, Seattle, WA 98101',
  30,
  2
where not exists (select 1 from public.clinic_settings);

-- 7. Sample Starter Dental Services (insert only if services table is empty)
insert into public.services (name, description, duration_minutes, price, is_active)
select * from (values
  ('Comprehensive Dental Checkup', 'Thorough oral exam, digital imaging review, gum health evaluation, and a clear personalized preventive care plan.', 45, 145.00, true),
  ('Preventive Teeth Cleaning', 'Gentle ultrasonic plaque removal, thorough polishing, and enamel-protecting care tailored to sensitive teeth.', 45, 130.00, true),
  ('In-Office Teeth Whitening', 'Clinically supervised enamel-safe brightening treatment designed to lift everyday stains with minimal sensitivity.', 60, 380.00, true),
  ('Composite Tooth Filling', 'Natural tooth-colored restorative bonding to repair decay or minor chips seamlessly and comfortably.', 45, 220.00, true),
  ('Cosmetic Smile Consultation', 'One-on-one conversation with our dentist to explore conservative cosmetic options, timelines, and clear fee estimates.', 30, 85.00, true),
  ('Urgent Dental Consultation', 'Prompt same-week assessment for sudden tooth sensitivity, discomfort, or chipped restorations with a clear relief plan.', 30, 110.00, true)
) as v(name, description, duration_minutes, price, is_active)
where not exists (select 1 from public.services);

-- 8. Grant Admin Access:
-- After creating a user in Supabase Auth -> Users, insert their UUID into admin_users:
-- insert into public.admin_users (user_id) values ('YOUR-AUTH-USER-UUID-HERE');
