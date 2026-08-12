begin;

alter table public.payment_requests drop constraint if exists payment_requests_status_check;
alter table public.payment_requests add constraint payment_requests_status_check check (status = any (array['Generated'::text,'Submitted'::text,'Paid'::text,'Cancelled'::text,'Expired'::text]));

alter table public.payment_requests
  add column if not exists collected_by uuid,
  add column if not exists collected_at timestamptz,
  add column if not exists verified_by uuid,
  add column if not exists verified_at timestamptz,
  add column if not exists cancelled_by uuid,
  add column if not exists cancelled_at timestamptz;

create or replace function public.record_case_payment_collection(p_payment_request_id uuid)
returns boolean
language plpgsql
security definer
set search_path='public'
as $$
declare pr public.payment_requests%rowtype;
begin
  if not public.current_staff_is_approved() then raise exception 'Approved staff required'; end if;
  if not public.nebrin_has_permission('finance.cashier.collect') then raise exception 'Cashier collection permission required'; end if;
  select * into pr from public.payment_requests where id=p_payment_request_id for update;
  if pr.id is null then raise exception 'Payment request not found'; end if;
  if pr.status='Submitted' then return true; end if;
  if pr.status not in ('Generated') then raise exception 'Only generated bills can be recorded as collected'; end if;
  update public.payment_requests set status='Submitted',collected_by=auth.uid(),collected_at=now() where id=pr.id;
  update public.applications set payment_status='Submitted',updated_at=now() where id=pr.application_id;
  return true;
end $$;

create or replace function public.confirm_case_payment(p_payment_request_id uuid)
returns boolean
language plpgsql
security definer
set search_path='public'
as $$
declare pr public.payment_requests%rowtype; c public.office_intake_cases%rowtype;
begin
  if not public.current_staff_is_approved() then raise exception 'Approved staff required'; end if;
  if not public.nebrin_has_permission('finance.reconciliation.prepare') then raise exception 'Accountant verification permission required'; end if;
  select * into pr from public.payment_requests where id=p_payment_request_id for update;
  if pr.id is null then raise exception 'Payment request not found'; end if;
  if pr.status='Paid' then return true; end if;
  if pr.status not in ('Submitted') then raise exception 'Cashier must record collection before accounting verification'; end if;
  if pr.collected_by=auth.uid() then raise exception 'Maker-checker rule: collector cannot verify the same payment'; end if;
  update public.payment_requests set status='Paid',verified_by=auth.uid(),verified_at=now() where id=pr.id;
  update public.applications set payment_status='Confirmed',updated_at=now() where id=pr.application_id;
  select * into c from public.office_intake_cases where source_type='application' and source_id=pr.application_id order by created_at desc limit 1;
  if c.id is not null then
    update public.office_intake_cases set public_status='Processing',public_message='Payment has been confirmed. Your request is continuing through NEBRIN processing.',client_action_required=false,updated_at=now() where id=c.id;
    perform public.queue_case_customer_notification(c.id,'NEBRIN payment confirmed','Payment for request '||c.case_number||' has been confirmed. Processing will continue.');
    if c.current_department_id is not null then perform public.notify_case_department(c.id,c.current_department_id,'Payment confirmed: '||c.case_number,'Payment has been confirmed and processing may continue.','Normal'); end if;
  end if;
  return true;
end $$;

create or replace function public.cancel_case_payment(p_payment_request_id uuid)
returns boolean
language plpgsql
security definer
set search_path='public'
as $$
declare pr public.payment_requests%rowtype;
begin
  if not public.current_staff_is_approved() then raise exception 'Approved staff required'; end if;
  if not (public.nebrin_has_permission('finance.treasury.approve') or public.is_management()) then raise exception 'Treasurer or management authorization required'; end if;
  select * into pr from public.payment_requests where id=p_payment_request_id for update;
  if pr.id is null then raise exception 'Payment request not found'; end if;
  if pr.status='Cancelled' then return true; end if;
  if pr.status not in ('Generated','Submitted') then raise exception 'Only unpaid bills can be cancelled'; end if;
  update public.payment_requests set status='Cancelled',cancelled_by=auth.uid(),cancelled_at=now() where id=pr.id;
  update public.applications set payment_status='Cancelled',updated_at=now() where id=pr.application_id;
  return true;
end $$;

create or replace function public.create_case_payment_request(p_case_id uuid,p_payment_method_id uuid,p_amount numeric)
returns uuid
language plpgsql
security definer
set search_path='public'
as $$
declare c public.office_intake_cases%rowtype; pm public.payment_methods%rowtype; v_id uuid; v_ref text;
begin
  if not public.current_staff_is_approved() then raise exception 'Approved staff required'; end if;
  if not (public.nebrin_has_permission('finance.ar.manage') or public.is_management()) then raise exception 'Accounts receivable permission required'; end if;
  select * into c from public.office_intake_cases where id=p_case_id for update;
  if c.id is null then raise exception 'Case not found'; end if;
  if c.source_type <> 'application' then raise exception 'Payment bridge currently requires an application-backed case'; end if;
  select * into pm from public.payment_methods where id=p_payment_method_id and is_active=true;
  if pm.id is null then raise exception 'Active payment method required'; end if;
  if p_amount is null or p_amount<=0 then raise exception 'Valid payment amount required'; end if;
  v_ref:='NEB-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
  insert into public.payment_requests(bill_reference,application_id,application_reference,payment_method_id,provider,payment_type,account_number,account_name,amount,status)
  values(v_ref,c.source_id,c.case_number,pm.id,pm.provider,pm.payment_type,pm.account_number,pm.account_name,p_amount,'Generated') returning id into v_id;
  update public.office_intake_cases set public_status='Payment Required',public_message='Payment is required before processing can continue. Bill reference: '||v_ref,client_action_required=true,updated_at=now() where id=c.id;
  update public.applications set payment_status='Pending',quoted_amount=p_amount,updated_at=now() where id=c.source_id;
  perform public.queue_case_customer_notification(c.id,'NEBRIN payment required','Your request '||c.case_number||' requires payment. Bill reference: '||v_ref||'. Amount: TZS '||p_amount::text||'.');
  return v_id;
end $$;

commit;
