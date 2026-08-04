-- =========================================================
-- NEBRIN V21 STAFF, BOOKING TRACKING & RETENTION UPDATE
-- Run once after the existing V20/V21 database setup.
-- =========================================================

begin;

alter table public.admin_users
  add column if not exists department text not null default 'Management',
  add column if not exists is_active boolean not null default true;

alter table public.applications
  add column if not exists assigned_to uuid references auth.users(id) on delete set null,
  add column if not exists department text,
  add column if not exists priority text not null default 'Normal',
  add column if not exists due_date date,
  add column if not exists completed_at timestamptz,
  add column if not exists archived_at timestamptz;

alter table public.appointments
  add column if not exists admin_note text not null default '';

update public.applications
set completed_at=coalesce(completed_at,created_at)
where status='Completed' and completed_at is null;

-- Track appointment/booking securely with reference + phone.
create or replace function public.track_appointment(
  p_reference text,
  p_phone text
)
returns table(
  reference text,
  full_name text,
  phone text,
  office text,
  appointment_date date,
  appointment_time time,
  purpose text,
  status text,
  admin_note text,
  created_at timestamptz
)
language sql
security definer
set search_path=public
as $$
  select
    a.reference,a.full_name,a.phone,a.office,a.appointment_date,
    a.appointment_time,a.purpose,a.status,a.admin_note,a.created_at
  from public.appointments a
  where upper(a.reference)=upper(trim(p_reference))
    and regexp_replace(a.phone,'[^0-9]','','g')
      =regexp_replace(trim(p_phone),'[^0-9]','','g')
  limit 1;
$$;

revoke all on function public.track_appointment(text,text) from public;
grant execute on function public.track_appointment(text,text) to anon,authenticated;

-- Automatically set completion timestamp.
create or replace function public.set_application_completion_time()
returns trigger
language plpgsql
as $$
begin
  if new.status='Completed' and old.status is distinct from 'Completed' then
    new.completed_at=now();
  elsif new.status<>'Completed' then
    new.completed_at=null;
  end if;
  return new;
end;
$$;

drop trigger if exists applications_set_completion_time on public.applications;
create trigger applications_set_completion_time
before update of status on public.applications
for each row execute function public.set_application_completion_time();

-- Delete completed applications after seven days, including their storage files.
create or replace function public.cleanup_completed_applications()
returns integer
language plpgsql
security definer
set search_path=public,storage
as $$
declare
  deleted_count integer;
begin
  delete from storage.objects
  where bucket_id='application-documents'
    and exists(
      select 1
      from public.applications a
      where a.status='Completed'
        and a.completed_at<now()-interval '7 days'
        and storage.objects.name like a.reference||'/%'
    );

  delete from public.applications
  where status='Completed'
    and completed_at<now()-interval '7 days';

  get diagnostics deleted_count=row_count;
  return deleted_count;
end;
$$;

revoke all on function public.cleanup_completed_applications() from public;

-- Try to schedule automatic cleanup daily when pg_cron is available.
do $$
begin
  begin
    create extension if not exists pg_cron;
    if not exists(select 1 from cron.job where jobname='nebrin-cleanup-completed-applications') then
      perform cron.schedule(
        'nebrin-cleanup-completed-applications',
        '15 2 * * *',
        'select public.cleanup_completed_applications();'
      );
    end if;
  exception
    when others then
      raise notice 'Automatic cron scheduling was unavailable. Run cleanup_completed_applications manually or enable Supabase Cron.';
  end;
end $$;

commit;
