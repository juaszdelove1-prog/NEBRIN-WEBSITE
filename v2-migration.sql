create or replace function public.track_application(p_reference text,p_phone text)
returns table(reference text,full_name text,service text,status text,created_at timestamptz)
language sql security definer set search_path=public as $$
select a.reference,a.full_name,a.service,a.status,a.created_at
from public.applications a
where upper(a.reference)=upper(trim(p_reference))
and regexp_replace(a.phone,'[^0-9]','','g')=regexp_replace(trim(p_phone),'[^0-9]','','g')
limit 1;
$$;
revoke all on function public.track_application(text,text) from public;
grant execute on function public.track_application(text,text) to anon, authenticated;
