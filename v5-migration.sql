alter table public.applications add column if not exists deletion_reason text not null default '', add column if not exists deleted_at timestamptz;
alter table public.applications drop constraint if exists applications_status_check;
alter table public.applications add constraint applications_status_check check (status in ('New','Processing','Completed','Rejected','Deleted'));
create or replace function public.track_application(p_reference text,p_phone text)
returns table(reference text,full_name text,service text,status text,created_at timestamptz,deletion_reason text)
language sql security definer set search_path=public as $$
select a.reference,a.full_name,a.service,a.status,a.created_at,a.deletion_reason
from public.applications a
where upper(a.reference)=upper(trim(p_reference))
and regexp_replace(a.phone,'[^0-9]','','g')=regexp_replace(trim(p_phone),'[^0-9]','','g')
limit 1;
$$;
revoke all on function public.track_application(text,text) from public;
grant execute on function public.track_application(text,text) to anon,authenticated;
