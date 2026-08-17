(()=>{
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>'TZS '+Number(v||0).toLocaleString();
  let selected='journals', cache={};
  const registers={
    invoices:{label:'Invoices',table:'finance_invoices',order:'created_at'},
    receipts:{label:'Receipts',table:'finance_receipts',order:'created_at'},
    transactions:{label:'Transactions',table:'finance_transactions',order:'created_at'},
    expenses:{label:'Expenses',table:'finance_expenses',order:'created_at'},
    journals:{label:'Journals',table:'finance_accounting_entries',order:'created_at'},
    trial_balance:{label:'Trial Balance',table:'finance_accounting_trial_balance',order:'account_code'},
    bank_accounts:{label:'Bank Accounts',table:'finance_bank_accounts',order:'created_at'},
    budgets:{label:'Budgets',table:'finance_budgets',order:'created_at'},
    cheques:{label:'Cheques',table:'finance_cheques',order:'created_at'}
  };
  function ensure(){
    if($('auditLiveBridge'))return;
    const anchor=$('statementsAuditCentre'); if(!anchor)return;
    const card=document.createElement('div'); card.id='auditLiveBridge'; card.className='dfo-card'; card.style.marginTop='12px';
    card.innerHTML=`<div class="dfo-top"><div><h2>Finance Audit File Room — Live Registers</h2><p class="dfo-module-note">Read-only audit bridge to the same live Finance source records. It never creates, edits, approves, posts or reverses a financial transaction.</p></div><button class="btn btn-secondary-admin" id="auditLiveRefresh">Refresh</button></div><div id="auditLiveMsg"></div><div class="dfo-actions" id="auditLiveTabs"></div><div style="margin-top:10px"><b>Records: <span id="auditLiveCount">0</span></b></div><div class="dfo-table-wrap" style="margin-top:8px"><table class="dfo-table"><thead id="auditLiveHead"></thead><tbody id="auditLiveRows"></tbody></table></div>`;
    anchor.parentNode.insertBefore(card,anchor.nextSibling);
    $('auditLiveRefresh').onclick=loadAll;
    $('auditLiveTabs').innerHTML=Object.entries(registers).map(([k,r])=>`<button class="btn btn-secondary-admin" data-audit-register="${k}">${r.label}</button>`).join('');
    $('auditLiveTabs').querySelectorAll('button').forEach(b=>b.onclick=()=>{selected=b.dataset.auditRegister;render()});
  }
  function rowFor(key,x){
    if(key==='journals')return [x.created_at||x.entry_date,x.journal_number,x.reference,x.description,x.source_book,x.status];
    if(key==='trial_balance')return ['',x.account_code,x.account_name,'',money(x.total_debit),money(x.total_credit),money(x.balance)];
    if(key==='transactions')return [x.created_at||x.transaction_date,x.transaction_no||x.reference||x.source_reference,x.description,x.counterparty||'',money(x.amount??x.total_debit),x.status];
    if(key==='invoices')return [x.created_at,x.invoice_number,x.customer_name,x.description||'',money(x.total_amount),x.status];
    if(key==='receipts')return [x.created_at,x.receipt_number,x.payer_name,x.payment_method||'',money(x.amount),x.status||'Recorded'];
    if(key==='expenses')return [x.created_at,x.expense_number,x.description,x.payee||'',money(x.amount),x.status];
    if(key==='bank_accounts')return [x.created_at,x.account_name||x.bank_name,x.account_number||'',x.currency||'TZS',x.status||'Active'];
    if(key==='budgets')return [x.created_at,x.title||x.budget_name,x.period||'',money(x.amount??x.approved_amount),x.status];
    if(key==='cheques')return [x.created_at,x.cheque_number,x.bank_name||'',x.payee||'',money(x.amount),x.status];
    return Object.values(x).slice(0,7);
  }
  function headers(key){
    if(key==='trial_balance')return ['','Account','Account Name','', 'Debit','Credit','Balance'];
    if(key==='bank_accounts')return ['Date','Account / Bank','Account No.','Currency','Status'];
    if(key==='budgets')return ['Date','Budget','Period','Amount','Status'];
    return ['Date','Reference','Party / Description','Details','Amount / Source','Status'];
  }
  function render(){
    ensure(); const rows=cache[selected]||[], r=registers[selected];
    $('auditLiveCount').textContent=String(rows.length);
    $('auditLiveTabs').querySelectorAll('button').forEach(b=>b.classList.toggle('btn-primary',b.dataset.auditRegister===selected));
    const h=headers(selected); $('auditLiveHead').innerHTML='<tr>'+h.map(v=>`<th>${esc(v)}</th>`).join('')+'</tr>';
    $('auditLiveRows').innerHTML=rows.map(x=>'<tr>'+rowFor(selected,x).map((v,i)=>`<td>${i===0&&v?esc(new Date(v).toLocaleString()):esc(v??'—')}</td>`).join('')+'</tr>').join('')||`<tr><td colspan="${h.length}">No records found in this register.</td></tr>`;
    $('auditLiveMsg').innerHTML=`<div class="dfo-status">${esc(r.label)} loaded from the live Finance register · READ ONLY</div>`;
  }
  async function read(key,r){
    let q=window.supabaseClient.from(r.table).select('*').limit(200);
    if(r.order)q=q.order(r.order,{ascending:false});
    const {data,error}=await q;
    if(error){cache[key]=[]; return {key,error:error.message}}
    cache[key]=data||[]; return {key,error:null};
  }
  async function loadAll(){
    ensure(); $('auditLiveMsg').innerHTML='<div class="dfo-status">Loading live Finance audit registers…</div>';
    const results=await Promise.all(Object.entries(registers).map(([k,r])=>read(k,r)));
    render();
    const failed=results.filter(x=>x.error);
    if(failed.length)$('auditLiveMsg').innerHTML=`<div class="dfo-status" style="background:#fff4e5;color:#8a4b00">Live audit bridge loaded. ${failed.length} optional register(s) are unavailable for this role/database; available registers remain read only.</div>`;
  }
  window.NEBAUDLIVE={loadAll};
  document.addEventListener('DOMContentLoaded',()=>setTimeout(loadAll,2600));
})();
