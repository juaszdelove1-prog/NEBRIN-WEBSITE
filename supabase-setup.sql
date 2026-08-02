-- NEBRIN SUPABASE SETUP
-- Run this entire script in Supabase Dashboard > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  reference text unique not null,
  full_name text not null check (char_length(full_name) between 2 and 120),
  phone text not null check (char_length(phone) between 7 and 40),
  email text,
  service text not null,
  message text default '',
  submission_channel text not null default 'website'
    check (submission_channel in ('website','whatsapp','email')),
  status text not null default 'New'
    check (status in ('New','Processing','Completed','Rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'staff',
  created_at timestamptz not null default now()
);

alter table public.applications enable row level security;
alter table public.admin_users enable row level security;

-- Anyone using the website publishable key may submit a new application.
drop policy if exists "public can submit applications" on public.applications;
create policy "public can submit applications"
on public.applications for insert
to anon, authenticated
with check (
  status = 'New'
  and submission_channel = 'website'
);

-- Only listed staff can read applications.
drop policy if exists "admins can read applications" on public.applications;
create policy "admins can read applications"
on public.applications for select
to authenticated
using (
  exists (
    select 1 from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);

-- Only listed staff can update application status and details.
drop policy if exists "admins can update applications" on public.applications;
create policy "admins can update applications"
on public.applications for update
to authenticated
using (
  exists (
    select 1 from public.admin_users
    where admin_users.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);

drop policy if exists "admins can see own admin record" on public.admin_users;
create policy "admins can see own admin record"
on public.admin_users for select
to authenticated
using (user_id = auth.uid());

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists applications_set_updated_at on public.applications;
create trigger applications_set_updated_at
before update on public.applications
for each row execute function public.set_updated_at();

-- AFTER running this script:
-- 1. Go to Authentication > Users > Add user.
-- 2. Create an account for the CEO or Manager.
-- 3. Copy that user's UUID.
-- 4. Run:
-- insert into public.admin_users (user_id, full_name, role)
-- values ('PASTE-USER-UUID-HERE', 'Justine Asajile Mwalusako', 'CEO');
