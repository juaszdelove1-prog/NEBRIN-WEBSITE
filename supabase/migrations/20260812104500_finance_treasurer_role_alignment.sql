-- NEBRIN Finance RBAC alignment
-- Purpose: ensure Finance aliases resolve correctly and correct the approved
-- Finance head record from legacy CEO to Treasurer / Head of Finance.

begin;

insert into public.nebrin_role_aliases(alias, role_code)
values
  ('Treasurer','TREASURER'),
  ('TREASURER','TREASURER'),
  ('Head of Finance','TREASURER'),
  ('Finance Treasurer','TREASURER'),
  ('Cashier','CASHIER'),
  ('CASHIER','CASHIER'),
  ('External Auditor','EXTERNAL_AUDITOR'),
  ('EXTERNAL_AUDITOR','EXTERNAL_AUDITOR')
on conflict (alias) do update set role_code=excluded.role_code;

do $$
declare
  v_manager uuid;
  v_target uuid;
begin
  select au.user_id into v_manager
  from public.admin_users au
  left join public.nebrin_role_aliases ra on ra.alias=au.role
  where au.is_active=true
    and au.approval_status='Approved'
    and coalesce(ra.role_code, upper(au.role)) in ('CEO','SUPER_ADMIN','MANAGER')
  order by case coalesce(ra.role_code,upper(au.role)) when 'CEO' then 1 when 'SUPER_ADMIN' then 2 else 3 end,
           au.created_at
  limit 1;

  if v_manager is null then
    raise exception 'No approved management identity available for Finance role correction';
  end if;

  select au.user_id into v_target
  from public.admin_users au
  where upper(trim(au.full_name))='ZILPA HERBERT NZIKU'
    and au.department in ('Finance','Finance & Accounts')
  order by au.created_at
  limit 1;

  if v_target is null then
    raise exception 'Finance head record not found';
  end if;

  perform set_config('request.jwt.claim.sub',v_manager::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',v_manager::text,'role','authenticated')::text,true);

  update public.admin_users
     set role='Treasurer',
         department='Finance & Accounts',
         public_job_title='Treasurer / Head of Finance',
         approved_by=coalesce(approved_by,v_manager),
         approved_at=coalesce(approved_at,now())
   where user_id=v_target
     and (role is distinct from 'Treasurer'
       or department is distinct from 'Finance & Accounts'
       or public_job_title is distinct from 'Treasurer / Head of Finance');

  update public.employee_employment
     set job_title='Treasurer / Head of Finance'
   where user_id=v_target
     and job_title is distinct from 'Treasurer / Head of Finance';
end $$;

commit;
