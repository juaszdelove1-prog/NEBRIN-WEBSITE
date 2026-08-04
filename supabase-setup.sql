-- =========================================================
-- NEBRIN ENTERPRISE V20 COMPLETE FINAL MIGRATION
-- Target: Existing database that already completed V11.
-- Run this SQL file only.
-- =========================================================

begin;

create extension if not exists pgcrypto;

-- APPOINTMENTS
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  reference text unique not null,
  full_name text not null,
  phone text not null,
  email text not null default '',
  office text not null,
  appointment_date date not null,
  appointment_time time not null,
  purpose text not null,
  status text not null default 'Pending'
    check (status in ('Pending','Confirmed','Completed','Cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.appointments enable row level security;

drop policy if exists "admins read appointments" on public.appointments;
create policy "admins read appointments"
on public.appointments for select to authenticated
using (exists(select 1 from public.admin_users where admin_users.user_id=auth.uid()));

drop policy if exists "admins update appointments" on public.appointments;
create policy "admins update appointments"
on public.appointments for update to authenticated
using (exists(select 1 from public.admin_users where admin_users.user_id=auth.uid()))
with check (exists(select 1 from public.admin_users where admin_users.user_id=auth.uid()));

create or replace function public.book_appointment(
  full_name text,
  phone text,
  email text,
  office text,
  appointment_date date,
  appointment_time time,
  purpose text
)
returns text
language plpgsql
security definer
set search_path=public
as $$
declare new_reference text;
begin
  if trim(full_name)='' or trim(phone)='' or trim(office)='' or trim(purpose)='' then
    raise exception 'Required appointment information is missing.';
  end if;
  if appointment_date<current_date then
    raise exception 'Appointment date cannot be in the past.';
  end if;

  new_reference:='APT-'||to_char(now(),'YYYYMMDD')||'-'||upper(substr(md5(random()::text),1,6));

  insert into public.appointments(
    reference,full_name,phone,email,office,appointment_date,appointment_time,purpose
  ) values(
    new_reference,trim(full_name),trim(phone),coalesce(trim(email),''),
    trim(office),appointment_date,appointment_time,trim(purpose)
  );

  return new_reference;
end;
$$;

revoke all on function public.book_appointment(text,text,text,text,date,time,text) from public;
grant execute on function public.book_appointment(text,text,text,text,date,time,text) to anon,authenticated;

create or replace function public.set_appointment_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end $$;

drop trigger if exists appointments_set_updated_at on public.appointments;
create trigger appointments_set_updated_at
before update on public.appointments
for each row execute function public.set_appointment_updated_at();

-- CUSTOMER FEEDBACK
create table if not exists public.customer_feedback (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  reference text not null,
  rating integer not null check(rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  unique(application_id)
);

alter table public.customer_feedback enable row level security;

drop policy if exists "admins read feedback" on public.customer_feedback;
create policy "admins read feedback"
on public.customer_feedback for select to authenticated
using (exists(select 1 from public.admin_users where admin_users.user_id=auth.uid()));

create or replace function public.submit_customer_feedback(
  p_reference text,
  p_phone text,
  p_rating integer,
  p_comment text
)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare target_id uuid;
begin
  if p_rating<1 or p_rating>5 then
    raise exception 'Rating must be between 1 and 5.';
  end if;

  select id into target_id
  from public.applications
  where upper(reference)=upper(trim(p_reference))
    and regexp_replace(phone,'[^0-9]','','g')=regexp_replace(trim(p_phone),'[^0-9]','','g')
    and status='Completed'
  limit 1;

  if target_id is null then
    raise exception 'Only completed applications can be rated.';
  end if;

  insert into public.customer_feedback(application_id,reference,rating,comment)
  values(target_id,upper(trim(p_reference)),p_rating,coalesce(trim(p_comment),''))
  on conflict(application_id) do update
  set rating=excluded.rating,comment=excluded.comment,created_at=now();

  return true;
end;
$$;

revoke all on function public.submit_customer_feedback(text,text,integer,text) from public;
grant execute on function public.submit_customer_feedback(text,text,integer,text) to anon,authenticated;

-- PAYMENT METHODS
create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  payment_type text not null,
  account_number text not null,
  account_name text not null default '',
  instructions text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payment_methods enable row level security;

drop policy if exists "public read active payment methods" on public.payment_methods;
create policy "public read active payment methods"
on public.payment_methods for select to anon,authenticated
using (
  is_active=true
  or exists(select 1 from public.admin_users where admin_users.user_id=auth.uid())
);

drop policy if exists "admins insert payment methods" on public.payment_methods;
create policy "admins insert payment methods"
on public.payment_methods for insert to authenticated
with check (exists(select 1 from public.admin_users where admin_users.user_id=auth.uid()));

drop policy if exists "admins update payment methods" on public.payment_methods;
create policy "admins update payment methods"
on public.payment_methods for update to authenticated
using (exists(select 1 from public.admin_users where admin_users.user_id=auth.uid()))
with check (exists(select 1 from public.admin_users where admin_users.user_id=auth.uid()));

drop policy if exists "admins delete payment methods" on public.payment_methods;
create policy "admins delete payment methods"
on public.payment_methods for delete to authenticated
using (exists(select 1 from public.admin_users where admin_users.user_id=auth.uid()));

create or replace function public.set_payment_method_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end $$;

drop trigger if exists payment_methods_set_updated_at on public.payment_methods;
create trigger payment_methods_set_updated_at
before update on public.payment_methods
for each row execute function public.set_payment_method_updated_at();

delete from public.payment_methods
where provider in (
  'Lipa Number','Lipa kwa M-Pesa','M-Pesa','Mixx by Yas','Mixx by Yas Lipa',
  'Halotel','HaloPesa','HaloPesa Lipa','Airtel Lipa','Airtel Money','CRDB Bank'
);

insert into public.payment_methods(
  provider,payment_type,account_number,account_name,instructions,is_active
)
values
('Lipa kwa M-Pesa','Lipa Number','53002300','JUSTINE ASAJILE MWALUSAKO',
 'Tumia Lipa kwa M-Pesa. Hakikisha jina JUSTINE ASAJILE MWALUSAKO linaonekana kabla ya kuthibitisha malipo.',true),
('M-Pesa','M-Pesa Number','314824','MARIA FALES JOHN',
 'Tumia M-Pesa. Hakikisha jina MARIA FALES JOHN linaonekana kabla ya kuthibitisha malipo.',true),
('Mixx by Yas Lipa','Lipa Number','15255818','JUSTINE ASAJILE MWALUSAKO',
 'Tumia Mixx by Yas Lipa. Hakikisha jina JUSTINE ASAJILE MWALUSAKO linaonekana kabla ya kuthibitisha malipo.',true),
('HaloPesa Lipa','Lipa Number','23224622','MARIA FALES JOHN',
 'Tumia HaloPesa Lipa. Hakikisha jina MARIA FALES JOHN linaonekana kabla ya kuthibitisha malipo.',true),
('Airtel Lipa','Lipa Number','145048645','MARIA FALES JOHN',
 'Tumia Airtel Lipa. Hakikisha jina MARIA FALES JOHN linaonekana kabla ya kuthibitisha malipo.',true),
('Airtel Money','Airtel Money Number','1145933','MARIA FALES JOHN',
 'Tumia Airtel Money. Hakikisha jina MARIA FALES JOHN linaonekana kabla ya kuthibitisha malipo.',true),
('CRDB Bank','Bank Account','10256528008','MARIA FALES JOHN',
 'Hamisha fedha kwenda CRDB Bank. Hakikisha jina MARIA FALES JOHN linaonekana kabla ya kuthibitisha malipo.',true);

-- PAYMENT BILL REQUESTS
create table if not exists public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  bill_reference text unique not null,
  application_id uuid not null references public.applications(id) on delete cascade,
  application_reference text not null,
  payment_method_id uuid not null references public.payment_methods(id) on delete restrict,
  provider text not null,
  payment_type text not null,
  account_number text not null,
  account_name text not null default '',
  amount numeric(14,2) not null check(amount>0),
  status text not null default 'Generated'
    check(status in ('Generated','Paid','Cancelled','Expired')),
  created_at timestamptz not null default now()
);

alter table public.payment_requests enable row level security;

drop policy if exists "admins read payment requests" on public.payment_requests;
create policy "admins read payment requests"
on public.payment_requests for select to authenticated
using (exists(select 1 from public.admin_users where admin_users.user_id=auth.uid()));

create or replace function public.request_payment_bill(
  p_reference text,
  p_phone text,
  p_payment_method_id uuid
)
returns text
language plpgsql
security definer
set search_path=public
as $$
declare
  target_application public.applications%rowtype;
  target_method public.payment_methods%rowtype;
  new_bill_reference text;
begin
  select * into target_application
  from public.applications
  where upper(reference)=upper(trim(p_reference))
    and regexp_replace(phone,'[^0-9]','','g')=regexp_replace(trim(p_phone),'[^0-9]','','g')
    and status<>'Deleted'
  limit 1;

  if target_application.id is null then
    raise exception 'Application not found.';
  end if;

  if target_application.quoted_amount is null or target_application.quoted_amount<=0 then
    raise exception 'Admin has not set the service fee yet.';
  end if;

  select * into target_method
  from public.payment_methods
  where id=p_payment_method_id and is_active=true
  limit 1;

  if target_method.id is null then
    raise exception 'Selected payment method is unavailable.';
  end if;

  new_bill_reference:='BILL-'||to_char(now(),'YYYYMMDD')||'-'||upper(substr(md5(random()::text),1,7));

  insert into public.payment_requests(
    bill_reference,application_id,application_reference,payment_method_id,
    provider,payment_type,account_number,account_name,amount
  ) values(
    new_bill_reference,target_application.id,target_application.reference,target_method.id,
    target_method.provider,target_method.payment_type,target_method.account_number,
    target_method.account_name,target_application.quoted_amount
  );

  return new_bill_reference;
end;
$$;

revoke all on function public.request_payment_bill(text,text,uuid) from public;
grant execute on function public.request_payment_bill(text,text,uuid) to anon,authenticated;

-- REALTIME
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='applications'
  ) then
    alter publication supabase_realtime add table public.applications;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='appointments'
  ) then
    alter publication supabase_realtime add table public.appointments;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='customer_feedback'
  ) then
    alter publication supabase_realtime add table public.customer_feedback;
  end if;
end $$;

commit;
