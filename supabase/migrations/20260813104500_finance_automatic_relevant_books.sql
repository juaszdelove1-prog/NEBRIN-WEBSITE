create or replace view public.finance_automatic_book_postings as
select 'journal'::text as book_key,g.* from public.finance_general_ledger_postings g
union all
select 'ledger',g.* from public.finance_general_ledger_postings g
union all
select 'subsidiary_ledgers',g.* from public.finance_general_ledger_postings g
union all
select 'cash_book',g.* from public.finance_general_ledger_postings g where lower(coalesce(g.account_name,'')) like '%cash%' or lower(coalesce(g.source_book,'')) in ('cash_book','petty_cash','receipts','receipt_vouchers','payment_vouchers')
union all
select 'petty_cash',g.* from public.finance_general_ledger_postings g where lower(coalesce(g.account_name,'')) like '%petty cash%' or lower(coalesce(g.source_book,''))='petty_cash'
union all
select 'bank_book',g.* from public.finance_general_ledger_postings g where lower(coalesce(g.account_name,'')) like '%bank%' or lower(coalesce(g.account_name,'')) like '%mobile money%' or lower(coalesce(g.source_book,'')) in ('bank_book','bank_reconciliation','cheques')
union all
select 'receivables',g.* from public.finance_general_ledger_postings g where lower(coalesce(g.account_name,'')) like '%receivable%' or lower(coalesce(g.account_name,'')) like '%debtor%' or lower(coalesce(g.source_book,'')) in ('invoices','receivables')
union all
select 'payables',g.* from public.finance_general_ledger_postings g where lower(coalesce(g.account_name,'')) like '%payable%' or lower(coalesce(g.account_name,'')) like '%creditor%' or lower(coalesce(g.source_book,'')) in ('payables','expenses','payment_vouchers')
union all
select 'revenue',g.* from public.finance_general_ledger_postings g where g.account_code like '4%' or lower(coalesce(g.account_name,'')) like '%revenue%' or lower(coalesce(g.account_name,'')) like '%sales%' or lower(coalesce(g.account_name,'')) like '%income%'
union all
select 'expenses',g.* from public.finance_general_ledger_postings g where g.account_code like '5%' or lower(coalesce(g.account_name,'')) like '%expense%' or lower(coalesce(g.account_name,'')) like '%cost%';

create or replace function public.finance_accounting_book_detail(p_book_key text)
returns jsonb language plpgsql security definer set search_path='public' as $$
declare v_role text:=public.finance_current_role();v_rows jsonb:='[]'::jsonb;v_total_debit numeric:=0;v_total_credit numeric:=0;v_source_rows jsonb:='[]'::jsonb;v_table text;v_rel regclass;
begin
 if v_role not in ('CASHIER','ACCOUNTANT','TREASURER','INTERNAL_AUDITOR','MANAGER','CEO','SUPER_ADMIN') then raise exception 'Finance access required'; end if;
 if p_book_key in ('journal','ledger','subsidiary_ledgers','cash_book','petty_cash','bank_book','receivables','payables','revenue','expenses') then
  select coalesce(jsonb_agg(to_jsonb(x) order by x.entry_date desc,x.posted_at desc),'[]'::jsonb),coalesce(sum(x.debit),0),coalesce(sum(x.credit),0)
  into v_rows,v_total_debit,v_total_credit from (
   select g.posting_date entry_date,g.source_reference reference,g.description,g.account_code,g.account_name,t.counterparty,g.debit,g.credit,t.status,t.id transaction_id,g.id,g.posted_at,g.source_book
   from public.finance_automatic_book_postings g join public.finance_accounting_transactions t on t.id=g.transaction_id where g.book_key=p_book_key order by g.posting_date desc,g.posted_at desc limit 500
  ) x;
 else
  select coalesce(jsonb_agg(to_jsonb(x) order by x.entry_date desc,x.created_at desc),'[]'::jsonb),coalesce(sum(x.debit),0),coalesce(sum(x.credit),0)
  into v_rows,v_total_debit,v_total_credit from (
   select t.transaction_date entry_date,t.source_reference reference,coalesce(l.description,t.description) description,l.account_code,l.account_name,t.counterparty,l.debit,l.credit,t.status,t.id transaction_id,l.id,t.created_at,t.source_book
   from public.finance_accounting_transactions t join public.finance_accounting_transaction_lines l on l.transaction_id=t.id where t.source_book=p_book_key order by t.transaction_date desc,t.created_at desc,l.line_no limit 500
  ) x;
 end if;
 if jsonb_array_length(v_rows)=0 then select coalesce(jsonb_agg(to_jsonb(x) order by x.entry_date desc,x.created_at desc),'[]'::jsonb),coalesce(sum(x.debit),0),coalesce(sum(x.credit),0) into v_rows,v_total_debit,v_total_credit from (select * from public.finance_accounting_workbook_entries where book_key=p_book_key order by entry_date desc,created_at desc limit 250)x; end if;
 v_table:=case p_book_key when 'cash_book' then 'finance_cashbook' when 'petty_cash' then 'finance_petty_cash' when 'receipts' then 'finance_receipts' when 'receipt_vouchers' then 'finance_vouchers' when 'payment_vouchers' then 'finance_vouchers' when 'expenses' then 'finance_expenses' when 'invoices' then 'finance_invoices' when 'revenue' then 'finance_transactions' when 'journal' then 'finance_journals' when 'ledger' then 'finance_ledger_view' when 'subsidiary_ledgers' then 'finance_ledger_view' when 'receivables' then 'finance_ledger_view' when 'payables' then 'finance_ledger_view' when 'chart_accounts' then 'finance_chart_of_accounts' when 'trial_balance' then 'finance_trial_balance' when 'bank_book' then 'finance_transactions' when 'bank_reconciliation' then 'finance_bank_reconciliations' when 'cheques' then 'finance_cheques' when 'budgets' then 'finance_budgets' when 'fixed_assets' then 'finance_fixed_assets' when 'depreciation' then 'finance_fixed_assets' when 'payroll' then 'finance_payroll_register' when 'tax' then 'finance_tax_register' when 'withholding_tax' then 'finance_tax_register' when 'adjustments' then 'finance_journals' when 'accruals' then 'finance_journals' when 'closing' then 'finance_journals' when 'spreadsheet' then 'finance_spreadsheet_books' when 'supporting_docs' then 'finance_vouchers' when 'audit_trail' then 'finance_accounting_audit_trail' when 'reports_archive' then 'finance_internal_audit_engagements' else null end;
 if v_table is not null then v_rel:=to_regclass('public.'||v_table);if v_rel is not null then execute format('select coalesce(jsonb_agg(to_jsonb(t)),''[]''::jsonb) from (select * from %s limit 250)t',v_rel) into v_source_rows;end if;end if;
 if p_book_key='trial_balance' then select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) into v_source_rows from (select * from public.finance_trial_balance order by account_code)t;end if;
 if p_book_key in ('profit_loss','balance_sheet','cash_flow','equity') then begin select coalesce(public.finance_audit_financial_report(),'{}'::jsonb) into v_source_rows;exception when others then v_source_rows:='{}'::jsonb;end;end if;
 return jsonb_build_object('book_key',p_book_key,'viewer_role',v_role,'read_only',v_role='INTERNAL_AUDITOR','working_rows',v_rows,'source_rows',v_source_rows,'summary',jsonb_build_object('total_debit',v_total_debit,'total_credit',v_total_credit,'balance',v_total_debit-v_total_credit,'working_count',jsonb_array_length(v_rows),'source_count',case when jsonb_typeof(v_source_rows)='array' then jsonb_array_length(v_source_rows) else 1 end));
end$$;