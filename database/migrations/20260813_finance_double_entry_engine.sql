-- NEBRIN ONE Finance: canonical double-entry accounting engine
-- Safe migration draft for Supabase/Postgres. Designed to make one approved transaction
-- post automatically to journal, ledgers, trial balance/reporting views and audit trail.

create extension if not exists pgcrypto;

create table if not exists public.finance_accounting_transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_no text not null unique,
  source_book text not null,
  source_reference text,
  transaction_date date not null default current_date,
  description text not null,
  counterparty text,
  currency text not null default 'TZS',
  status text not null default 'Draft' check (status in ('Draft','Submitted','Approved','Posted','Rejected','Reversed')),
  total_debit numeric(18,2) not null default 0,
  total_credit numeric(18,2) not null default 0,
  created_by uuid default auth.uid(),
  approved_by uuid,
  posted_by uuid,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  posted_at timestamptz,
  reversal_of uuid references public.finance_accounting_transactions(id),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.finance_accounting_transaction_lines (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.finance_accounting_transactions(id) on delete cascade,
  line_no integer not null,
  account_code text not null,
  account_name text,
  description text,
  debit numeric(18,2) not null default 0 check (debit >= 0),
  credit numeric(18,2) not null default 0 check (credit >= 0),
  department text,
  tax_code text,
  due_date date,
  party_reference text,
  metadata jsonb not null default '{}'::jsonb,
  unique(transaction_id,line_no),
  check ((debit > 0 and credit = 0) or (credit > 0 and debit = 0))
);

create table if not exists public.finance_general_ledger_postings (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.finance_accounting_transactions(id),
  transaction_line_id uuid not null references public.finance_accounting_transaction_lines(id),
  posting_date date not null,
  account_code text not null,
  account_name text,
  source_book text not null,
  source_reference text,
  description text,
  debit numeric(18,2) not null default 0,
  credit numeric(18,2) not null default 0,
  posted_by uuid,
  posted_at timestamptz not null default now(),
  unique(transaction_line_id)
);

create table if not exists public.finance_accounting_audit_trail (
  id bigint generated always as identity primary key,
  transaction_id uuid,
  actor_id uuid default auth.uid(),
  action text not null,
  source_book text,
  reference text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_fin_tx_date on public.finance_accounting_transactions(transaction_date);
create index if not exists idx_fin_tx_book on public.finance_accounting_transactions(source_book);
create index if not exists idx_fin_gl_account_date on public.finance_general_ledger_postings(account_code,posting_date);
create index if not exists idx_fin_gl_tx on public.finance_general_ledger_postings(transaction_id);

create or replace function public.finance_next_transaction_no(p_prefix text default 'TXN')
returns text
language plpgsql
security definer
set search_path=public
as $$
declare n bigint;
begin
  select coalesce(max(nullif(regexp_replace(transaction_no,'\\D','','g'),'')::bigint),0)+1 into n
  from public.finance_accounting_transactions;
  return upper(coalesce(nullif(trim(p_prefix),''),'TXN'))||'-'||to_char(current_date,'YYYYMM')||'-'||lpad(n::text,6,'0');
end;$$;

create or replace function public.finance_validate_transaction(p_transaction_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare d numeric(18,2); c numeric(18,2); lines_count integer;
begin
  select coalesce(sum(debit),0),coalesce(sum(credit),0),count(*) into d,c,lines_count
  from public.finance_accounting_transaction_lines where transaction_id=p_transaction_id;
  if lines_count < 2 then raise exception 'A double-entry transaction requires at least two lines.'; end if;
  if d <= 0 or c <= 0 then raise exception 'Debit and credit totals must both be greater than zero.'; end if;
  if round(d,2) <> round(c,2) then raise exception 'Transaction is not balanced. Debit % differs from credit %.',d,c; end if;
  update public.finance_accounting_transactions set total_debit=d,total_credit=c where id=p_transaction_id;
  return jsonb_build_object('balanced',true,'total_debit',d,'total_credit',c,'lines',lines_count);
end;$$;

create or replace function public.finance_post_transaction(p_transaction_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare t public.finance_accounting_transactions%rowtype; validation jsonb; posted_count integer;
begin
  select * into t from public.finance_accounting_transactions where id=p_transaction_id for update;
  if not found then raise exception 'Accounting transaction not found.'; end if;
  if t.status='Posted' then
    select count(*) into posted_count from public.finance_general_ledger_postings where transaction_id=p_transaction_id;
    return jsonb_build_object('success',true,'already_posted',true,'transaction_id',p_transaction_id,'postings',posted_count);
  end if;
  if t.status not in ('Approved','Submitted') then raise exception 'Only an approved/submitted transaction can be posted. Current status: %',t.status; end if;
  validation:=public.finance_validate_transaction(p_transaction_id);

  insert into public.finance_general_ledger_postings(transaction_id,transaction_line_id,posting_date,account_code,account_name,source_book,source_reference,description,debit,credit,posted_by)
  select l.transaction_id,l.id,t.transaction_date,l.account_code,l.account_name,t.source_book,t.source_reference,coalesce(l.description,t.description),l.debit,l.credit,auth.uid()
  from public.finance_accounting_transaction_lines l
  where l.transaction_id=p_transaction_id
  on conflict(transaction_line_id) do nothing;

  get diagnostics posted_count = row_count;
  update public.finance_accounting_transactions set status='Posted',posted_by=auth.uid(),posted_at=now() where id=p_transaction_id;
  insert into public.finance_accounting_audit_trail(transaction_id,action,source_book,reference,after_data)
  values(p_transaction_id,'POST_TRANSACTION',t.source_book,t.source_reference,jsonb_build_object('validation',validation,'new_postings',posted_count));
  return jsonb_build_object('success',true,'transaction_id',p_transaction_id,'postings_created',posted_count,'validation',validation);
end;$$;

create or replace function public.finance_create_double_entry(
  p_source_book text,
  p_transaction_date date,
  p_reference text,
  p_description text,
  p_debit_account_code text,
  p_debit_account_name text,
  p_credit_account_code text,
  p_credit_account_name text,
  p_amount numeric,
  p_counterparty text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare tx uuid; txno text;
begin
  if p_amount is null or p_amount<=0 then raise exception 'Amount must be greater than zero.'; end if;
  if nullif(trim(p_debit_account_code),'') is null or nullif(trim(p_credit_account_code),'') is null then raise exception 'Debit and credit account codes are required.'; end if;
  if p_debit_account_code=p_credit_account_code then raise exception 'Debit and credit accounts must be different.'; end if;
  txno:=public.finance_next_transaction_no(upper(left(coalesce(nullif(trim(p_source_book),''),'TXN'),3)));
  insert into public.finance_accounting_transactions(transaction_no,source_book,source_reference,transaction_date,description,counterparty,status,total_debit,total_credit,metadata)
  values(txno,p_source_book,p_reference,coalesce(p_transaction_date,current_date),p_description,p_counterparty,'Submitted',p_amount,p_amount,coalesce(p_metadata,'{}'::jsonb)) returning id into tx;
  insert into public.finance_accounting_transaction_lines(transaction_id,line_no,account_code,account_name,description,debit,credit,party_reference)
  values
    (tx,1,p_debit_account_code,p_debit_account_name,p_description,p_amount,0,p_counterparty),
    (tx,2,p_credit_account_code,p_credit_account_name,p_description,0,p_amount,p_counterparty);
  insert into public.finance_accounting_audit_trail(transaction_id,action,source_book,reference,after_data)
  values(tx,'CREATE_DOUBLE_ENTRY',p_source_book,p_reference,jsonb_build_object('amount',p_amount,'debit_account',p_debit_account_code,'credit_account',p_credit_account_code));
  return tx;
end;$$;

create or replace view public.finance_general_ledger as
select posting_date,account_code,account_name,source_book,source_reference,description,debit,credit,transaction_id,posted_at
from public.finance_general_ledger_postings;

create or replace view public.finance_trial_balance as
select account_code,max(account_name) as account_name,
       sum(debit) as total_debit,sum(credit) as total_credit,
       case when sum(debit-credit)>=0 then sum(debit-credit) else 0 end as debit_balance,
       case when sum(credit-debit)>0 then sum(credit-debit) else 0 end as credit_balance
from public.finance_general_ledger_postings
group by account_code;

create or replace view public.finance_posting_control as
select t.id,t.transaction_no,t.transaction_date,t.source_book,t.source_reference,t.description,t.status,t.total_debit,t.total_credit,
       (t.total_debit=t.total_credit) as balanced,
       count(g.id) as ledger_postings
from public.finance_accounting_transactions t
left join public.finance_general_ledger_postings g on g.transaction_id=t.id
group by t.id;

-- Compatibility bridge: keep existing app RPC available while routing new balanced entries
-- through the canonical transaction store. A single-line draft remains a draft until a
-- complete debit/credit pair is supplied by the enhanced UI/AI workflow.
create or replace function public.finance_create_book_entry(
  p_book_key text,
  p_entry_date date,
  p_reference text,
  p_description text,
  p_debit numeric,
  p_credit numeric,
  p_account_code text,
  p_counterparty text
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare tx uuid; txno text; amt numeric; side text;
begin
  if coalesce(p_debit,0)>0 and coalesce(p_credit,0)>0 then raise exception 'One working line cannot contain both debit and credit.'; end if;
  if coalesce(p_debit,0)<=0 and coalesce(p_credit,0)<=0 then raise exception 'Enter a debit or credit amount.'; end if;
  amt:=greatest(coalesce(p_debit,0),coalesce(p_credit,0)); side:=case when coalesce(p_debit,0)>0 then 'DEBIT' else 'CREDIT' end;
  txno:=public.finance_next_transaction_no('DRF');
  insert into public.finance_accounting_transactions(transaction_no,source_book,source_reference,transaction_date,description,counterparty,status,total_debit,total_credit,metadata)
  values(txno,p_book_key,p_reference,coalesce(p_entry_date,current_date),p_description,p_counterparty,'Draft',coalesce(p_debit,0),coalesce(p_credit,0),jsonb_build_object('working_line',true,'side',side)) returning id into tx;
  insert into public.finance_accounting_transaction_lines(transaction_id,line_no,account_code,description,debit,credit,party_reference)
  values(tx,1,coalesce(nullif(trim(p_account_code),''),'UNCLASSIFIED'),p_description,coalesce(p_debit,0),coalesce(p_credit,0),p_counterparty);
  insert into public.finance_accounting_audit_trail(transaction_id,action,source_book,reference,after_data)
  values(tx,'CREATE_WORKING_DRAFT',p_book_key,p_reference,jsonb_build_object('amount',amt,'side',side));
  return tx;
end;$$;

comment on table public.finance_accounting_transactions is 'Canonical NEBRIN ONE accounting transaction header. Record once, post everywhere.';
comment on table public.finance_general_ledger_postings is 'Immutable posted ledger lines generated by the double-entry engine.';
