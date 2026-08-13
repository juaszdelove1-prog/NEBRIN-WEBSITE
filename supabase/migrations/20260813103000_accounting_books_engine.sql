begin;

create table if not exists public.finance_accounting_entries (
  id uuid primary key default gen_random_uuid(),
  journal_number text not null unique default ('JRN-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
  entry_date date not null default current_date,
  reference text,
  description text not null,
  counterparty text,
  source_book text not null default 'general_journal',
  source_document_id uuid,
  status text not null default 'Posted' check (status in ('Draft','Posted','Reversed')),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  posted_at timestamptz
);

create table if not exists public.finance_accounting_lines (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.finance_accounting_entries(id) on delete cascade,
  account_code text not null,
  account_name text not null,
  debit numeric(18,2) not null default 0 check (debit >= 0),
  credit numeric(18,2) not null default 0 check (credit >= 0),
  created_at timestamptz not null default now(),
  check ((debit > 0 and credit = 0) or (credit > 0 and debit = 0))
);

create index if not exists finance_accounting_lines_entry_idx on public.finance_accounting_lines(entry_id);
create index if not exists finance_accounting_lines_account_idx on public.finance_accounting_lines(account_code);

create or replace function public.finance_post_balanced_transaction(
 p_entry_date date,p_reference text,p_description text,p_counterparty text,
 p_source_book text,p_debit_account_code text,p_debit_account_name text,
 p_credit_account_code text,p_credit_account_name text,p_amount numeric
) returns text language plpgsql security definer set search_path='public' as $$
declare v_id uuid; v_no text;
begin
 if not public.current_staff_is_approved() then raise exception 'Approved staff required'; end if;
 if coalesce(p_amount,0)<=0 then raise exception 'Amount must be greater than zero'; end if;
 if trim(coalesce(p_debit_account_code,''))='' or trim(coalesce(p_credit_account_code,''))='' then raise exception 'Debit and credit accounts are required'; end if;
 if p_debit_account_code=p_credit_account_code then raise exception 'Debit and credit accounts must be different'; end if;
 insert into public.finance_accounting_entries(entry_date,reference,description,counterparty,source_book,status,created_by,posted_at)
 values(coalesce(p_entry_date,current_date),p_reference,p_description,p_counterparty,coalesce(nullif(p_source_book,''),'general_journal'),'Posted',auth.uid(),now())
 returning id,journal_number into v_id,v_no;
 insert into public.finance_accounting_lines(entry_id,account_code,account_name,debit,credit) values
 (v_id,p_debit_account_code,p_debit_account_name,p_amount,0),
 (v_id,p_credit_account_code,p_credit_account_name,0,p_amount);
 return v_no;
end $$;

create or replace view public.finance_accounting_ledger as
select e.id entry_id,e.journal_number,e.entry_date,e.reference,e.description,e.counterparty,e.source_book,
 l.id line_id,l.account_code,l.account_name,l.debit,l.credit,e.status,e.created_at
from public.finance_accounting_entries e join public.finance_accounting_lines l on l.entry_id=e.id
where e.status='Posted';

create or replace view public.finance_accounting_trial_balance as
select account_code,account_name,sum(debit) total_debit,sum(credit) total_credit,
 sum(debit-credit) balance
from public.finance_accounting_ledger group by account_code,account_name;

create or replace view public.finance_cash_book as
select * from public.finance_accounting_ledger
where lower(account_name) like '%cash%' or lower(source_book) in ('cash_book','petty_cash_book','receipts_register','payment_voucher_register');

create or replace view public.finance_bank_book as
select * from public.finance_accounting_ledger
where lower(account_name) like '%bank%' or lower(source_book) in ('bank_book','bank_reconciliation','cheque_register');

create or replace view public.finance_receivables_ledger as
select * from public.finance_accounting_ledger
where lower(account_name) like '%receivable%' or lower(account_name) like '%debtor%' or lower(source_book) in ('invoice_register','receivables_ledger');

create or replace view public.finance_payables_ledger as
select * from public.finance_accounting_ledger
where lower(account_name) like '%payable%' or lower(account_name) like '%creditor%' or lower(source_book) in ('payables_ledger','expense_register');

create or replace view public.finance_revenue_ledger as
select * from public.finance_accounting_ledger
where account_code like '4%' or lower(account_name) like '%revenue%' or lower(account_name) like '%sales%' or lower(account_name) like '%income%';

create or replace view public.finance_expense_ledger as
select * from public.finance_accounting_ledger
where account_code like '5%' or lower(account_name) like '%expense%' or lower(account_name) like '%cost%';

commit;