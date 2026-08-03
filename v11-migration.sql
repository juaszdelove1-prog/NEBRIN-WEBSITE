-- NEBRIN V11: reporting and audit trail

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  application_id uuid,
  reference text,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  actor_id uuid,
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

drop policy if exists "admins read audit logs" on public.audit_logs;
create policy "admins read audit logs"
on public.audit_logs for select
to authenticated
using (
  exists (
    select 1 from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);

create or replace function public.log_application_change()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  insert into public.audit_logs(
    application_id,
    reference,
    action,
    old_data,
    new_data,
    actor_id
  )
  values(
    coalesce(new.id,old.id),
    coalesce(new.reference,old.reference),
    tg_op,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end,
    auth.uid()
  );
  return coalesce(new,old);
end;
$$;

drop trigger if exists applications_audit_trigger on public.applications;
create trigger applications_audit_trigger
after insert or update or delete on public.applications
for each row execute function public.log_application_change();
