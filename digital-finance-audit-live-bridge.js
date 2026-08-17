(()=>{
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>'TZS '+Number(v||0).toLocaleString();
  let selected='journals', cache={}, sources={}, verification={};
  const registers={
    invoices:{label:'Invoices',sources:['finance_invoices'],order:'created_at'},
    receipts:{label:'Receipts',sources:['finance_receipts'],order:'created_at'},
    transactions:{label:'Transactions',sources:['finance_accounting_transactions','finance_transactions'],order:'created_at'},
    expenses:{label:'Expenses',sources:['finance_expenses'],order:'created_at'},
    journals:{label:'Journals',sources:['finance_journals'],order:'created_at'},
    ledger:{label:'General Ledger',sources:['finance_ledger_view'],order:'entry_date'},
    trial_balance:{label:'Trial Balance',sources:['finance_trial_balance'],order:'account_code'},
    bank_accounts:{label:'Bank Accounts',sources:['finance_bank_accounts'],order:'created_at'},
    budgets:{label:'Budgets',sources:['finance_budgets'],order:'created_at'},
    cheques:{label:'Cheques',sources:['finance_cheques'],order:'created_at'}
  };
  function ensure(){
    if($('auditLiveBridge'))return;
    const anchor=$('statementsAuditCentre'); if(!anchor)return;
    const card=document.createElement('div'); card.id='auditLiveBridge'; card.className='dfo-card'; card.style.marginTop='12px';
    card.innerHTML=`<div class="dfo-top"><div><h2>Finance Audit File Room — Live Registers</h2><p class="dfo-module-note">Read-only verification against the same Finance source records used by accounting. The auditor cannot create, edit, approve, post or reverse financial entries here.</p></div><button class="btn btn-secondary-admin" id="auditLiveRefresh">Run Verification</button></div><div id="auditLiveMsg"></div><div class="dfo-kpis" style="margin:10px 0"><div class="dfo-kpi"><span>Debit</span><strong id="auditDebit">TZS 0</strong></div><div class="dfo-kpi"><span>Credit</span><strong id="auditCredit">TZS 0</strong></div><div class="dfo-kpi"><span>Difference</span><strong id="auditDifference">TZS 0</strong></div><div class="dfo-kpi"><span>Verification</span><strong id="auditVerify">Pending</strong></div></div><div class="dfo-actions" id="auditLiveTabs"></div><div style="margin-top:10px"><b>Records: <span id="auditLiveCount">0</span></b> · <span id="auditLiveSource" class="dfo-module-note"></span></div><div class="dfo-table-wrap" style="margin-top:8px"><table class="dfo-table"><thead id="auditLiveHead"></thead><tbody id="auditLiveRows"></tbody></table></div>`;
    anchor.parentNode.insertBefore(card,anchor.nextSibling);
    $('auditLiveRefresh').onclick=loadAll;
    $('auditLiveTabs').innerHTML=Object.entries(registers).map(([k,r])=>`<button class="btn btn-secondary-admin" data-audit-register="${k}">${r.label}</button>`).join('');
    $('auditLiveTabs').querySelectorAll('button').forEach(b=>b.onclick=()=>{selected=b.dataset.auditRegister;render()});
  }
  function rowFor(key,x){
    if(key==='journals')return [x.created_at||x.entry_date,x.journal_number||x.reference,x.reference||'',x.description||'',x.status||'Posted'];
    if(key==='ledger')return [x.entry_date||x.created_at,x.journal_number||x.reference,x.account_code||'',x.account_name||x.description,money(x.debit),money(x.credit),x.status||'Posted'];
    if(key==='trial_balance')return ['',x.account_code||'',x.account_name,'',money(x.total_debit),money(x.total_credit),money(x.balance)];
    if(key==='transactions')return [x.created_at||x.transaction_date,x.transaction_no||x.reference||x.source_reference,x.description,x.counterparty||x.source_book||'',money(x.amount??x.total_debit),x.status];
    if(key==='invoices')return [x.created_at,x.invoice_number||x.reference,x.customer_name||x.customer||'',x.description||'',money(x.total_amount??x.amount),x.status];
    if(key==='receipts')return [x.created_at,x.receipt_number||x.reference,x.payer_name||x.customer_name||'',x.payment_method||'',money(x.amount),x.status||'Recorded'];
    if(key==='expenses')return [x.created_at,x.expense_number||x.reference,x.description,x.payee||'',money(x.amount),x.status];
    if(key==='bank_accounts')return [x.created_at,x.account_name||x.bank_name,x.account_number||'',x.currency||'TZS',x.status||'Active'];
    if(key==='budgets')return [x.created_at,x.title||x.budget_name,x.period||'',money(x.amount??x.approved_amount),x.status];
    if(key==='cheques')return [x.created_at,x.cheque_number,x.bank_name||'',x.payee||'',money(x.amount),x.status];
    return Object.values(x).slice(0,7);
  }
  function headers(key){
    if(key==='journals')return ['Date','Journal','Reference','Description','Status'];
    if(key==='ledger')return ['Date','Journal','Account','Account Name / Description','Debit','Credit','Status'];
    if(key==='trial_balance')return ['','Account','Account Name','','Debit','Credit','Balance'];
    if(key==='bank_accounts')return ['Date','Account / Bank','Account No.','Currency','Status'];
    if(key==='budgets')return ['Date','Budget','Period','Amount','Status'];
    return ['Date','Reference','Party / Description','Details','Amount / Source','Status'];
  }
  function render(){
    ensure(); const rows=cache[selected]||[], r=registers[selected];
    $('auditLiveCount').textContent=String(rows.length);
    $('auditLiveSource').textContent=sources[selected]?`Source: ${sources[selected]}`:'Source unavailable';
    $('auditLiveTabs').querySelectorAll('button').forEach(b=>b.classList.toggle('btn-primary',b.dataset.auditRegister===selected));
    const h=headers(selected); $('auditLiveHead').innerHTML='<tr>'+h.map(v=>`<th>${esc(v)}</th>`).join('')+'</tr>';
    $('auditLiveRows').innerHTML=rows.map(x=>'<tr>'+rowFor(selected,x).map((v,i)=>`<td>${i===0&&v?esc(new Date(v).toLocaleString()):esc(v??'—')}</td>`).join('')+'</tr>').join('')||`<tr><td colspan="${h.length}">No records found in this register.</td></tr>`;
    $('auditDebit').textContent=money(verification.debit);
    $('auditCredit').textContent=money(verification.credit);
    $('auditDifference').textContent=money(verification.difference);
    $('auditVerify').textContent=verification.status||'Pending';
    $('auditLiveMsg').innerHTML=`<div class="dfo-status">${esc(r.label)} loaded from ${esc(sources[selected]||'available Finance source')} · READ ONLY</div>`;
  }
  async function read(key,r){
    let lastError='';
    for(const table of r.sources){
      let q=window.supabaseClient.from(table).select('*').limit(300);
      if(r.order)q=q.order(r.order,{ascending:false});
      const {data,error}=await q;
      if(!error){cache[key]=data||[];sources[key]=table;return {key,error:null}}
      lastError=error.message||String(error);
    }
    cache[key]=[];sources[key]='';return {key,error:lastError||'No readable source'};
  }
  function verifyBooks(){
    const ledger=cache.ledger||[], trial=cache.trial_balance||[];
    const debit=ledger.reduce((s,x)=>s+Number(x.debit||0),0);
    const credit=ledger.reduce((s,x)=>s+Number(x.credit||0),0);
    const difference=Math.abs(debit-credit);
    const trialDebit=trial.reduce((s,x)=>s+Number(x.total_debit||0),0);
    const trialCredit=trial.reduce((s,x)=>s+Number(x.total_credit||0),0);
    const trialDifference=Math.abs(trialDebit-trialCredit);
    const balanced=difference<0.005&&trialDifference<0.005;
    verification={debit,credit,difference,status:balanced?'BALANCED':'REVIEW'};
  }
  async function loadAll(){
    ensure(); $('auditLiveMsg').innerHTML='<div class="dfo-status">Running live Finance-to-Audit verification…</div>';
    const results=await Promise.all(Object.entries(registers).map(([k,r])=>read(k,r)));
    verifyBooks(); render();
    const failed=results.filter(x=>x.error);
    if(verification.status==='REVIEW'){
      $('auditLiveMsg').innerHTML='<div class="dfo-status" style="background:#fff4e5;color:#8a4b00">Verification requires review: General Ledger or Trial Balance totals are not balanced in the records visible to this role.</div>';
    }else if(failed.length){
      $('auditLiveMsg').innerHTML=`<div class="dfo-status" style="background:#fff4e5;color:#8a4b00">Core accounting verification passed. ${failed.length} optional register(s) are unavailable or restricted for this role; available records remain read only.</div>`;
    }else{
      $('auditLiveMsg').innerHTML='<div class="dfo-status">Finance-to-Audit verification passed: visible General Ledger and Trial Balance are balanced and sourced from live Finance records.</div>';
    }
  }
  window.NEBAUDLIVE={loadAll};
  document.addEventListener('DOMContentLoaded',()=>setTimeout(loadAll,2600));
})();
