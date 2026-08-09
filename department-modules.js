
/* NEBRIN V27 Final department-specific operations */
window.NEBMOD=window.NEBMOD||{};
const $=id=>document.getElementById(id);
const row=(title,body,actions='')=>`<div class="neb-row"><strong>${NEBRIN.esc(title)}</strong><p>${NEBRIN.esc(body||'')}</p><div class="neb-actions">${actions}</div></div>`;

NEBMOD.finance=async()=>{
 const [inv,rec,exp,cheq,txn,reports]=await Promise.all([
  supabaseClient.from('finance_invoices').select('*').order('created_at',{ascending:false}).limit(100),
  supabaseClient.from('finance_receipts').select('*').order('created_at',{ascending:false}).limit(100),
  supabaseClient.from('finance_expenses').select('*').order('created_at',{ascending:false}).limit(100),
  supabaseClient.from('finance_cheques').select('*').order('created_at',{ascending:false}).limit(100),
  supabaseClient.from('finance_transactions').select('*').order('created_at',{ascending:false}).limit(150),
  supabaseClient.from('management_reports').select('*').eq('report_type','Financial').order('created_at',{ascending:false}).limit(20)
 ]);
 const invoices=inv.data||[],receipts=rec.data||[],expenses=exp.data||[],cheques=cheq.data||[],txns=txn.data||[];
 $('modStats').innerHTML=[
  ['Invoices',invoices.length],['Receipts',receipts.length],['Revenue',NEBRIN.money(receipts.reduce((s,x)=>s+Number(x.amount||0),0))],
  ['Expenses',NEBRIN.money(expenses.reduce((s,x)=>s+Number(x.amount||0),0))],['Pending Cheques',cheques.filter(x=>x.status==='Pending').length],['Transactions',txns.length]
 ].map(x=>`<div class="neb-stat"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');
 $('modMain').innerHTML=`<div class="neb-grid-2">
 <article class="neb-card"><div class="neb-section-title"><h2>Invoices & Customer Accounts</h2><button class="btn btn-primary" onclick="NEBMOD.newInvoice()">New Invoice</button></div><div class="neb-panel-list">${invoices.map(x=>row(x.invoice_number,`${x.customer_name} · ${NEBRIN.money(x.total_amount)} · ${x.status}`,`<button onclick="NEBMOD.receiptForInvoice('${x.id}')">Issue Receipt</button>`)).join('')||'<p>No invoices.</p>'}</div></article>
 <article class="neb-card"><div class="neb-section-title"><h2>Bank & Cheques</h2><button class="btn btn-primary" onclick="NEBMOD.newCheque()">Record Cheque</button></div><div class="neb-panel-list">${cheques.map(x=>row(x.cheque_number,`${x.bank_name||''} · ${NEBRIN.money(x.amount)} · ${x.status}`)).join('')||'<p>No cheques.</p>'}</div></article>
 <article class="neb-card"><div class="neb-section-title"><h2>Expenses & Petty Cash</h2><button class="btn btn-primary" onclick="NEBMOD.newExpense()">Record Expense</button></div><div class="neb-panel-list">${expenses.map(x=>row(x.expense_number,`${x.description} · ${NEBRIN.money(x.amount)} · ${x.status}`)).join('')||'<p>No expenses.</p>'}</div></article>
 <article class="neb-card"><div class="neb-section-title"><h2>Official Receipts</h2></div><div class="neb-panel-list">${receipts.map(x=>row(x.receipt_number,`${x.payer_name} · ${NEBRIN.money(x.amount)} · ${x.payment_method}`,`<button onclick="NEBMOD.printReceipt('${x.id}')">Print</button>`)).join('')||'<p>No receipts.</p>'}</div></article>
 </div><article class="neb-card"><div class="neb-section-title"><h2>Management Financial Reporting</h2><button class="btn btn-primary" onclick="NEBMOD.submitFinanceReport()">Send Report to Management</button></div><p>Daily, monthly and department financial reports are filed here and forwarded electronically to Management.</p></article>`;
};
NEBMOD.newInvoice=async()=>{const name=prompt('Customer / organization name:');if(!name)return;const amount=Number(prompt('Invoice total TZS:'));if(!amount)return;const service=prompt('Service / purpose:','Service Fee')||'Service Fee';const {data,error}=await supabaseClient.rpc('finance_create_invoice',{p_customer_name:name,p_total_amount:amount,p_description:service});if(error)alert(error.message);else{alert('Invoice '+data);NEBMOD.finance()}};
NEBMOD.receiptForInvoice=async id=>{const method=prompt('Payment method: Cash / Bank / Mobile Money','Cash')||'Cash';const {data,error}=await supabaseClient.rpc('finance_issue_receipt',{p_invoice_id:id,p_payment_method:method,p_external_reference:''});if(error)alert(error.message);else{alert('Receipt '+data);NEBMOD.finance()}};
NEBMOD.newCheque=async()=>{const no=prompt('Cheque number:');if(!no)return;const bank=prompt('Bank:','');const amount=Number(prompt('Amount TZS:'));const payee=prompt('Payee / Payer:','');const {error}=await supabaseClient.from('finance_cheques').insert({cheque_number:no,bank_name:bank,amount,payee,status:'Pending',recorded_by:NEBRIN.profile.user_id,department_id:NEBRIN.department.id});if(error)alert(error.message);else NEBMOD.finance()};
NEBMOD.newExpense=async()=>{const desc=prompt('Expense description:');if(!desc)return;const amount=Number(prompt('Amount TZS:'));const {data,error}=await supabaseClient.rpc('finance_record_expense',{p_description:desc,p_amount:amount,p_department_id:NEBRIN.department.id});if(error)alert(error.message);else{alert('Expense '+data);NEBMOD.finance()}};
NEBMOD.printReceipt=async id=>{const {data}=await supabaseClient.from('finance_receipts').select('*').eq('id',id).single();if(!data)return;const w=open('','_blank');w.document.write(`<title>${data.receipt_number}</title><style>body{font-family:Arial;padding:40px}h1{color:#061b46}.box{border:1px solid #ddd;padding:20px}</style><h1>NEBRIN OFFICIAL RECEIPT</h1><div class="box"><p><b>Receipt:</b> ${NEBRIN.esc(data.receipt_number)}</p><p><b>Payer:</b> ${NEBRIN.esc(data.payer_name)}</p><p><b>Amount:</b> ${NEBRIN.money(data.amount)}</p><p><b>Method:</b> ${NEBRIN.esc(data.payment_method)}</p><p><b>Date:</b> ${NEBRIN.fmt(data.created_at)}</p></div>`);w.document.close();w.print()};
NEBMOD.submitFinanceReport=async()=>{const title=prompt('Report title:','Finance Report');if(!title)return;const summary=prompt('Summary:','');const {error}=await supabaseClient.from('management_reports').insert({department_id:NEBRIN.department.id,report_type:'Financial',title,summary,status:'Submitted',submitted_by:NEBRIN.profile.user_id});if(error)alert(error.message);else alert('Financial report sent to Management.')};

NEBMOD.business=async()=>{
 const [orders,products,suppliers,purchases,cases]=await Promise.all([
  supabaseClient.from('store_orders').select('*').order('created_at',{ascending:false}).limit(100),
  supabaseClient.from('store_products').select('*').order('name'),
  supabaseClient.from('business_suppliers').select('*').order('name'),
  supabaseClient.from('business_purchases').select('*').order('created_at',{ascending:false}).limit(100),
  supabaseClient.from('business_cases').select('*').order('created_at',{ascending:false}).limit(100)
 ]);
 const o=orders.data||[],p=products.data||[],s=suppliers.data||[],pu=purchases.data||[],c=cases.data||[];
 $('modStats').innerHTML=[['Orders',o.length],['Products',p.length],['Low Stock',p.filter(x=>x.stock_quantity<=x.low_stock_threshold).length],['Suppliers',s.length],['Purchases',pu.length],['Business Cases',c.length]].map(x=>`<div class="neb-stat"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');
 $('modMain').innerHTML=`<div class="neb-grid-2"><article class="neb-card"><div class="neb-section-title"><h2>Sales & Store Orders</h2></div>${o.map(x=>row(x.order_number,`${x.customer_name} · ${NEBRIN.money(x.total_amount)} · ${x.payment_status}`)).join('')||'<p>No orders.</p>'}</article><article class="neb-card"><div class="neb-section-title"><h2>Products & Inventory</h2><button class="btn btn-primary" onclick="NEBMOD.addProduct()">Add Product</button></div>${p.map(x=>row(x.name,`${NEBRIN.money(x.price)} · Stock ${x.stock_quantity}`)).join('')||'<p>No products.</p>'}</article><article class="neb-card"><div class="neb-section-title"><h2>Suppliers & Purchases</h2><button onclick="NEBMOD.addSupplier()">Add Supplier</button></div>${s.map(x=>row(x.name,`${x.phone||''} · ${x.email||''}`)).join('')||'<p>No suppliers.</p>'}</article><article class="neb-card"><div class="neb-section-title"><h2>Business / Entrepreneurship Cases</h2><button onclick="NEBMOD.newBusinessCase()">New Case</button></div>${c.map(x=>row(x.case_number,`${x.customer_name} · ${x.service_type} · ${x.status}`)).join('')||'<p>No cases.</p>'}</article></div>`;
};
NEBMOD.addProduct=async()=>{const name=prompt('Product name:');if(!name)return;const price=Number(prompt('Price TZS:'));const stock=Number(prompt('Stock quantity:'));const {error}=await supabaseClient.from('store_products').insert({name,price,stock_quantity:stock||0,is_active:true});if(error)alert(error.message);else NEBMOD.business()};
NEBMOD.addSupplier=async()=>{const name=prompt('Supplier name:');if(!name)return;const phone=prompt('Phone:','');const email=prompt('Email:','');const {error}=await supabaseClient.from('business_suppliers').insert({name,phone,email,created_by:NEBRIN.profile.user_id});if(error)alert(error.message);else NEBMOD.business()};
NEBMOD.newBusinessCase=async()=>{const customer=prompt('Customer name:');if(!customer)return;const service=prompt('Service type:','Business Consultation');const {data,error}=await supabaseClient.rpc('create_business_case',{p_customer_name:customer,p_service_type:service});if(error)alert(error.message);else{alert(data);NEBMOD.business()}};

NEBMOD.legal=async()=>{
 const [cases,docs]=await Promise.all([supabaseClient.from('legal_cases').select('*').order('created_at',{ascending:false}).limit(100),supabaseClient.from('legal_documents').select('*').order('created_at',{ascending:false}).limit(100)]);
 const c=cases.data||[],d=docs.data||[];
 $('modStats').innerHTML=[['Incoming',d.filter(x=>x.status==='Received').length],['Under Review',d.filter(x=>x.status==='Legal Review').length],['Correction',d.filter(x=>x.status==='Correction Required').length],['Manager',d.filter(x=>x.status==='Awaiting Manager').length],['CEO Signature',d.filter(x=>x.status==='Awaiting CEO Signature').length],['Completed',d.filter(x=>x.status==='Completed').length]].map(x=>`<div class="neb-stat"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');
 $('modMain').innerHTML=`<article class="neb-card"><div class="neb-section-title"><h2>Legal Documents & Contracts</h2><button class="btn btn-primary" onclick="NEBMOD.newLegalDoc()">Register Legal File</button></div>${d.map(x=>row(x.legal_number,`${x.title} · ${x.document_type} · ${x.status}`,`<button onclick="NEBMOD.legalAction('${x.id}')">Review / Route</button>`)).join('')||'<p>No legal documents.</p>'}</article><article class="neb-card"><h2>Legal Advice, Disputes & Compliance Cases</h2>${c.map(x=>row(x.case_number,`${x.title} · ${x.case_type} · ${x.status}`)).join('')||'<p>No legal cases.</p>'}</article>`;
};
NEBMOD.newLegalDoc=async()=>{const title=prompt('Document / contract title:');if(!title)return;const type=prompt('Document type:','Contract');const {data,error}=await supabaseClient.rpc('legal_register_document',{p_title:title,p_document_type:type});if(error)alert(error.message);else{alert(data);NEBMOD.legal()}};
NEBMOD.legalAction=async id=>{const action=prompt('Action: Legal Cleared / Correction Required / Awaiting Manager / Awaiting CEO Signature / Completed','Legal Cleared');if(!action)return;const note=prompt('Legal advice / note:','')||'';const {error}=await supabaseClient.rpc('legal_review_document',{p_document_id:id,p_action:action,p_note:note});if(error)alert(error.message);else NEBMOD.legal()};

NEBMOD.registration=async()=>{
 const {data,error}=await supabaseClient.from('registration_cases').select('*').order('created_at',{ascending:false}).limit(150);const r=data||[];
 $('modStats').innerHTML=[['Received',r.filter(x=>x.status==='Received').length],['Verification',r.filter(x=>x.status==='Documents Verification').length],['Processing',r.filter(x=>x.status==='Processing').length],['Legal Review',r.filter(x=>x.legal_review_required&&x.legal_status!=='Cleared').length],['Awaiting Authority',r.filter(x=>x.status==='Awaiting Authority').length],['Completed',r.filter(x=>x.status==='Completed').length]].map(x=>`<div class="neb-stat"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');
 $('modMain').innerHTML=`<article class="neb-card"><div class="neb-section-title"><h2>Registration & Government Services Cases</h2><button class="btn btn-primary" onclick="NEBMOD.newRegCase()">New Registration Case</button></div>${error?NEBRIN.esc(error.message):r.map(x=>row(x.case_number,`${x.customer_name} · ${x.service_type} · ${x.status}${x.legal_review_required?' · Legal '+x.legal_status:''}`,`<button onclick="NEBMOD.regAction('${x.id}')">Update</button>`)).join('')||'<p>No registration cases.</p>'}</article>`;
};
NEBMOD.newRegCase=async()=>{const customer=prompt('Customer name:');if(!customer)return;const service=prompt('Service: Birth Certificate, Marriage Certificate, TIN, Business Licence, Company Registration, Business Name, etc.','Company Registration');const needsLegal=/company|memart|agreement|partnership/i.test(service);const {data,error}=await supabaseClient.rpc('registration_create_case',{p_customer_name:customer,p_service_type:service,p_legal_required:needsLegal});if(error)alert(error.message);else{alert(data);NEBMOD.registration()}};
NEBMOD.regAction=async id=>{const status=prompt('Status: Documents Verification / Awaiting Payment / Processing / Submitted to Authority / Awaiting Authority / Correction Required / Approved / Ready for Collection / Completed','Processing');if(!status)return;const {error}=await supabaseClient.from('registration_cases').update({status,updated_at:new Date().toISOString()}).eq('id',id);if(error)alert(error.message);else NEBMOD.registration()};

NEBMOD.field=async()=>{
 const [assign,teams,targets]=await Promise.all([supabaseClient.from('field_assignments').select('*').order('created_at',{ascending:false}).limit(150),supabaseClient.from('field_teams').select('*').order('name'),supabaseClient.from('field_targets').select('*').order('period_start',{ascending:false}).limit(100)]);
 const a=assign.data||[],t=teams.data||[],tg=targets.data||[];
 $('modStats').innerHTML=[['Assignments',a.length],['In Field',a.filter(x=>x.status==='In Progress').length],['Customer Service',a.filter(x=>x.status==='With Customer').length],['SIM / Lipa Jobs',a.filter(x=>/sim|lipa|mpesa|agent/i.test(x.service_name||'')).length],['Teams',t.length],['Completed',a.filter(x=>x.status==='Completed').length]].map(x=>`<div class="neb-stat"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');
 $('modMain').innerHTML=`<div class="neb-grid-2"><article class="neb-card"><div class="neb-section-title"><h2>Field Assignments & Customer Visits</h2><button class="btn btn-primary" onclick="NEBMOD.newFieldAssignment()">New Assignment</button></div>${a.map(x=>row(x.assignment_number,`${x.customer_name} · ${x.service_name} · ${x.status}`)).join('')||'<p>No assignments.</p>'}</article><article class="neb-card"><h2>Teams, Agents & Targets</h2><p>Use HOD controls to assign staff. Team leaders can track SIM/Lipa registrations, customer visits and team targets.</p>${t.map(x=>row(x.name,x.provider||'Field Team')).join('')||'<p>No teams yet.</p>'}</article></div>`;
};
NEBMOD.newFieldAssignment=async()=>{const customer=prompt('Customer name:');if(!customer)return;const phone=prompt('Phone:','');const service=prompt('Field service:','SIM Registration');const {data,error}=await supabaseClient.rpc('field_create_assignment',{p_customer_name:customer,p_customer_phone:phone,p_service_name:service});if(error)alert(error.message);else{alert(data);NEBMOD.field()}};

NEBMOD.graphics=async()=>{
 const [jobs,prints]=await Promise.all([supabaseClient.from('creative_jobs').select('*').order('created_at',{ascending:false}).limit(150),supabaseClient.from('print_jobs').select('*').order('created_at',{ascending:false}).limit(100)]);
 const j=jobs.data||[],p=prints.data||[];
 $('modStats').innerHTML=[['New Jobs',j.filter(x=>x.status==='Received').length],['Designing',j.filter(x=>x.status==='Designing').length],['Review',j.filter(x=>/Review|Revision/.test(x.status)).length],['Approved Print',j.filter(x=>x.status==='Approved for Print').length],['Printing',p.filter(x=>x.status==='Printing').length],['Completed',j.filter(x=>x.status==='Completed').length]].map(x=>`<div class="neb-stat"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');
 $('modMain').innerHTML=`<article class="neb-card"><div class="neb-section-title"><h2>Graphics, Branding & Creative Jobs</h2><button class="btn btn-primary" onclick="NEBMOD.newCreative()">New Creative Job</button></div><p>Logo design, posters, flyers, business cards, IDs, certificates, letterheads, profiles, brochures, banners, social media, packaging, presentations and internal company design requests.</p>${j.map(x=>row(x.job_number,`${x.customer_name||x.requesting_department||'Internal'} · ${x.job_type} · ${x.status}`)).join('')||'<p>No creative jobs.</p>'}</article><article class="neb-card"><h2>Printing Centre</h2><p>A4/A3, colour/B&W, photocopy, scan, lamination, binding, passport photos, stickers, banners and finishing jobs.</p>${p.map(x=>row(x.print_number,`${x.print_type} · Qty ${x.quantity} · ${x.status}`)).join('')||'<p>No print jobs.</p>'}</article>`;
};
NEBMOD.newCreative=async()=>{const customer=prompt('Customer / department:');if(!customer)return;const type=prompt('Job type:','Logo Design');const {data,error}=await supabaseClient.rpc('creative_create_job',{p_customer_name:customer,p_job_type:type});if(error)alert(error.message);else{alert(data);NEBMOD.graphics()}};

NEBMOD.it=async()=>{
 const [tickets,incidents,assets,systems,backs]=await Promise.all([supabaseClient.from('it_tickets').select('*').order('created_at',{ascending:false}).limit(150),supabaseClient.from('it_incidents').select('*').order('created_at',{ascending:false}).limit(100),supabaseClient.from('it_assets').select('*').order('asset_number').limit(200),supabaseClient.from('it_systems').select('*').order('name'),supabaseClient.from('it_backups').select('*').order('created_at',{ascending:false}).limit(30)]);
 const t=tickets.data||[],i=incidents.data||[],a=assets.data||[],s=systems.data||[],b=backs.data||[];
 $('modStats').innerHTML=[['Open Tickets',t.filter(x=>!['Resolved','Closed'].includes(x.status)).length],['Critical Incidents',i.filter(x=>x.severity==='Critical'&&x.status!=='Closed').length],['Systems',s.length],['Security/Access',t.filter(x=>/security|access|login/i.test(x.category||'')).length],['Assets Repair',a.filter(x=>x.status==='Under Repair').length],['Backups',b.length?b[0].status:'No record']].map(x=>`<div class="neb-stat"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');
 $('modMain').innerHTML=`<div class="neb-grid-2"><article class="neb-card"><div class="neb-section-title"><h2>IT Help Desk</h2><button class="btn btn-primary" onclick="NEBRIN.askAI()">AI Diagnose / Ticket</button></div>${t.map(x=>row(x.ticket_number,`${x.category} · ${x.priority} · ${x.status}`)).join('')||'<p>No IT tickets.</p>'}</article><article class="neb-card"><h2>Systems & Website Operations</h2>${s.map(x=>row(x.name,`${x.system_type} · ${x.status}`)).join('')||'<p>No systems registered.</p>'}</article><article class="neb-card"><h2>Cybersecurity & Incidents</h2>${i.map(x=>row(x.incident_number,`${x.title} · ${x.severity} · ${x.status}`)).join('')||'<p>No IT incidents.</p>'}</article><article class="neb-card"><h2>Assets, Network, Backup & Recovery</h2><p>Computers, laptops, printers, scanners, routers, phones, software licences, preventive maintenance and recovery records.</p>${a.slice(0,30).map(x=>row(x.asset_number,`${x.asset_type} · ${x.status}`)).join('')||'<p>No assets registered.</p>'}</article></div>`;
};

NEBMOD.registry=async()=>{
 const [records,refs,pubs]=await Promise.all([supabaseClient.from('registry_records').select('*').order('received_at',{ascending:false}).limit(150),supabaseClient.from('registry_reference_requests').select('*').order('requested_at',{ascending:false}).limit(100),supabaseClient.from('library_publications').select('*').order('created_at',{ascending:false}).limit(100)]);
 const r=records.data||[],ref=refs.data||[],p=pubs.data||[];
 $('modStats').innerHTML=[['Records',r.length],['Confidential',r.filter(x=>/Confidential|Restricted/i.test(x.classification)).length],['On Reference',ref.filter(x=>x.status==='Approved'||x.status==='On Reference').length],['Retention Review',r.filter(x=>x.retention_until&&new Date(x.retention_until)<=new Date()).length],['Publications',p.length],['Public Website',p.filter(x=>x.is_public).length]].map(x=>`<div class="neb-stat"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');
 $('modMain').innerHTML=`<div class="neb-grid-2"><article class="neb-card"><h2>Records, Archives & File Tracking</h2><p>Incoming, outgoing and internal documents; reference/file numbers; physical archive location; retention; confidential records and complete movement history.</p>${r.map(x=>row(x.file_number,`${x.subject} · ${x.classification} · ${x.status}`)).join('')||'<p>No registry records.</p>'}</article><article class="neb-card"><div class="neb-section-title"><h2>Library, Books, Journals & Publications</h2><button onclick="NEBMOD.newPublication()">Add Publication</button></div>${p.map(x=>row(x.title,`${x.publication_type} · ${x.is_public?'Published on Website':'Internal'}`)).join('')||'<p>No publications.</p>'}</article></div>`;
};
NEBMOD.newPublication=async()=>{const title=prompt('Title:');if(!title)return;const type=prompt('Type: Book / Journal / Magazine / Report','Book');const is_public=confirm('Display this publication on the public website?');const {error}=await supabaseClient.from('library_publications').insert({title,publication_type:type,is_public,created_by:NEBRIN.profile.user_id});if(error)alert(error.message);else NEBMOD.registry()};
/* ============================================================
   NEBRIN HR FINAL UPGRADE
   PHASE 1C
   HR MASTER DIRECTORY + FUNCTIONAL HR WORKSPACE
   ============================================================ */

NEBMOD.hrState={
 employees:[],
 leave:[],
 discipline:[],
 recruitment:[],
 currentView:'overview'
};

NEBMOD.hr=async()=>{

 const [
   emp,
   leave,
   discipline,
   recruit
 ]=await Promise.all([

   supabaseClient
     .from('hr_employee_master')
     .select('*')
     .order('employee_number',{ascending:true}),

   supabaseClient
     .from('leave_requests')
     .select('*')
     .order('created_at',{ascending:false})
     .limit(150),

   supabaseClient
     .from('time_discipline_cases')
     .select('*')
     .order('created_at',{ascending:false})
     .limit(100),

   supabaseClient
     .from('hr_recruitment_cases')
     .select('*')
     .order('created_at',{ascending:false})
     .limit(100)

 ]);


 if(emp.error){
   console.error('HR employee master error:',emp.error);
 }

 if(leave.error){
   console.error('HR leave error:',leave.error);
 }

 if(discipline.error){
   console.error(
     'HR discipline error:',
     discipline.error
   );
 }

 if(recruit.error){
   console.error(
     'HR recruitment error:',
     recruit.error
   );
 }


 const e=emp.data||[];
 const l=leave.data||[];
 const d=discipline.data||[];
 const r=recruit.data||[];


 NEBMOD.hrState.employees=e;
 NEBMOD.hrState.leave=l;
 NEBMOD.hrState.discipline=d;
 NEBMOD.hrState.recruitment=r;


 const now=new Date();

 const thirtyDays=
   new Date(
     Date.now()+
     30*24*60*60*1000
   );


 const contractsReview=e.filter(x=>{

   if(
     !x.contract_end_date ||
     x.employment_status==='Terminated'
   ){
     return false;
   }

   const end=
     new Date(x.contract_end_date);

   return (
     end>=now &&
     end<=thirtyDays
   );

 }).length;


 const onboardingPending=e.filter(x=>{

   return (
     x.onboarding_status &&
     ![
       'Completed',
       'Approved',
       'Onboarding Completed'
     ].includes(x.onboarding_status)
   );

 }).length;


 $('modStats').innerHTML=[

   [
     'Employees',
     e.filter(x=>
       x.is_active!==false &&
       x.employment_status!=='Terminated'
     ).length
   ],

   [
     'Leave Pending',
     l.filter(x=>
       x.status==='Pending'
     ).length
   ],

   [
     'Recruitment',
     r.filter(x=>
       ![
         'Hired',
         'Closed',
         'Rejected'
       ].includes(x.status)
     ).length
   ],

   [
     'Discipline',
     d.filter(x=>
       x.status==='Open'
     ).length
   ],

   [
     'Contracts Review',
     contractsReview
   ],

   [
     'Onboarding',
     onboardingPending
   ]

 ].map(x=>`

   <div class="neb-stat">
     <span>${NEBRIN.esc(x[0])}</span>
     <strong>${NEBRIN.esc(x[1])}</strong>
   </div>

 `).join('');


 NEBMOD.hrOverview();

};


/* ============================================================
   HR MAIN OVERVIEW
   ============================================================ */

NEBMOD.hrOverview=()=>{

 NEBMOD.hrState.currentView='overview';

 const e=
   NEBMOD.hrState.employees||[];

 const l=
   NEBMOD.hrState.leave||[];

 const d=
   NEBMOD.hrState.discipline||[];

 const r=
   NEBMOD.hrState.recruitment||[];


 $('modMain').innerHTML=`

 <article class="neb-card">

   <div class="neb-section-title">

     <div>
       <p class="section-label">
         HR CONTROL CENTRE
       </p>

       <h2>
         Human Resources Operations
       </h2>
     </div>

   </div>

   <p>
     Recruitment, employee records,
     onboarding, contracts, leave,
     discipline and complete employee
     lifecycle management.
   </p>

   <div class="neb-actions">

     <button
       class="btn btn-primary"
       onclick="NEBMOD.hrEmployees()"
     >
       Employees
     </button>

     <button
       class="btn btn-secondary-admin"
       onclick="NEBMOD.hrRecruitment()"
     >
       Recruitment
     </button>

     <button
       class="btn btn-secondary-admin"
       onclick="NEBMOD.hrLeave()"
     >
       Leave
     </button>

     <button
       class="btn btn-secondary-admin"
       onclick="NEBMOD.hrDiscipline()"
     >
       Discipline
     </button>

     <button
       class="btn btn-secondary-admin"
       onclick="NEBMOD.hrOnboarding()"
     >
       Onboarding
     </button>

     <a
       class="btn btn-secondary-admin"
       href="staffing-requests.html"
     >
       Staffing Requests
     </a>

   </div>

 </article>


 <div class="neb-grid-2">

   <article class="neb-card">

     <div class="neb-section-title">

       <h2>
         Employee Master Directory
       </h2>

       <button
         class="btn btn-primary"
         onclick="NEBMOD.hrEmployees()"
       >
         Open Employees
       </button>

     </div>

     <p>
       HR master register containing
       employees hired by HR, CEO and
       authorized Management.
     </p>

     ${
       e.slice(0,5).map(emp=>

         row(
           emp.employee_number||
           'Pending Employee No.',

           `${
             emp.full_name||''
           } · ${
             emp.job_title||
             emp.role||
             ''
           } · ${
             emp.department||''
           }`
         )

       ).join('')||
       '<p>No employees found.</p>'
     }

   </article>


   <article class="neb-card">

     <div class="neb-section-title">

       <h2>
         Recruitment & Employee Lifecycle
       </h2>

       <button
         class="btn btn-primary"
         onclick="NEBMOD.hrRecruitment()"
       >
         Open Recruitment
       </button>

     </div>

     <p>
       Staffing request → vacancy →
       applications → shortlisting →
       interview → approval → hiring →
       onboarding.
     </p>

     ${
       r.slice(0,5).map(x=>

         row(
           x.reference||
           'Recruitment Case',

           `${
             x.applicant_name||''
           } · ${
             x.position||''
           } · ${
             x.status||''
           }`
         )

       ).join('')||
       '<p>No recruitment cases.</p>'
     }

   </article>


   <article class="neb-card">

     <div class="neb-section-title">

       <h2>
         Leave, Permission &
         Employee Relations
       </h2>

       <button
         onclick="NEBMOD.hrLeave()"
       >
         Open Leave
       </button>

     </div>

     ${
       l.slice(0,5).map(x=>

         row(
           x.request_type||
           'Leave Request',

           `${
             x.status||''
           } · ${
             NEBRIN.fmt(
               x.created_at
             )
           }`
         )

       ).join('')||
       '<p>No leave requests.</p>'
     }

   </article>


   <article class="neb-card">

     <div class="neb-section-title">

       <h2>
         Discipline &
         Employee Relations
       </h2>

       <button
         onclick="NEBMOD.hrDiscipline()"
       >
         Open Discipline
       </button>

     </div>

     ${
       d.slice(0,5).map(x=>

         row(
           x.case_type||
           'Discipline Case',

           `${
             x.stage||''
           } · ${
             x.status||''
           }`
         )

       ).join('')||
       '<p>No discipline cases.</p>'
     }

   </article>


   <article class="neb-card">

     <div class="neb-section-title">

       <h2>
         Onboarding & Documents
       </h2>

       <button
         class="btn btn-primary"
         onclick="NEBMOD.hrOnboarding()"
       >
         Open Onboarding
       </button>

     </div>

     <p>
       Employment onboarding,
       professional certificates,
       identity documents,
       personnel records and
       employee ID management.
     </p>

   </article>


   <article class="neb-card">

     <h2>
       CEO ↔ HR Hiring Synchronization
     </h2>

     <p>
       Employees hired by CEO,
       HR or authorized Management
       are synchronized automatically
       with the HR Master Personnel
       File.
     </p>

     ${
       e.filter(x=>
         x.hiring_source==='CEO'
       ).slice(0,5).map(x=>

         row(
           x.employee_number||
           'Employee',

           `${
             x.full_name||''
           } · Hired by CEO · ${
             x.department||''
           }`
         )

       ).join('')||
       '<p>No CEO hiring records yet.</p>'
     }

   </article>

 </div>

 `;

};


/* ============================================================
   EMPLOYEE MASTER DIRECTORY
   ============================================================ */

NEBMOD.hrEmployees=()=>{

 NEBMOD.hrState.currentView='employees';

 const employees=
   NEBMOD.hrState.employees||[];


 $('modMain').innerHTML=`

 <article class="neb-card">

   <div class="neb-section-title">

     <div>
       <p class="section-label">
         HR MASTER REGISTER
       </p>

       <h2>
         Employee Directory
       </h2>
     </div>

     <button
       onclick="NEBMOD.hrOverview()"
     >
       Back to HR Overview
     </button>

   </div>


   <div class="neb-actions">

     <input
       id="hrMasterSearch"
       type="search"
       placeholder="Search employee, number, job title or department"
       style="
         flex:1;
         min-width:240px;
         padding:14px;
         border:1px solid #d8dfeb;
         border-radius:12px;
       "
     >

     <button
       class="btn btn-primary"
       onclick="NEBMOD.hrEmployeeSearch()"
     >
       Search
     </button>

     <a
       class="btn btn-secondary-admin"
       href="hr-onboarding.html"
     >
       Full HR Onboarding
     </a>

   </div>


   <div
     id="hrMasterEmployeeList"
     class="neb-panel-list"
     style="margin-top:20px"
   >
     ${NEBMOD.renderHrEmployees(employees)}
   </div>

 </article>

 `;

};


/* ============================================================
   EMPLOYEE DIRECTORY RENDER
   ============================================================ */

NEBMOD.renderHrEmployees=employees=>{

 if(!employees.length){

   return `
     <p>
       No employees found.
     </p>
   `;
 }


 return employees.map(emp=>{

   const contract=
     emp.contract_end_date
     ? `Contract ends ${new Date(
         emp.contract_end_date
       ).toLocaleDateString()}`
     : 'No contract end date';


   const onboarding=
     emp.onboarding_status||
     'No onboarding record';


   return `

   <article class="reference-result-card">

     <div class="neb-section-title">

       <div>

         <strong>
           ${NEBRIN.esc(
             emp.employee_number||
             'Pending Employee Number'
           )}
           —
           ${NEBRIN.esc(
             emp.full_name||
             'Unnamed Employee'
           )}
         </strong>

       </div>

       <span class="neb-tag">

         ${NEBRIN.esc(
           emp.employment_status||
           'Active'
         )}

       </span>

     </div>


     <p>

       ${NEBRIN.esc(
         emp.job_title||
         emp.role||
         ''
       )}

       ·

       ${NEBRIN.esc(
         emp.department||
         ''
       )}

       ·

       ${NEBRIN.esc(
         emp.employment_type||
         ''
       )}

     </p>


     <p>

       <strong>Hiring Source:</strong>

       ${NEBRIN.esc(
         emp.hiring_source||
         'SYSTEM'
       )}

       ·

       <strong>Onboarding:</strong>

       ${NEBRIN.esc(
         onboarding
       )}

     </p>


     <p>

       <strong>Documents:</strong>

       ${NEBRIN.esc(
         emp.document_count||0
       )}

       ·

       ${NEBRIN.esc(
         contract
       )}

     </p>


     <div class="neb-actions">

       <button
         class="btn btn-secondary-admin"
         onclick="NEBMOD.hrEmployeeProfile('${emp.user_id}')"
       >
         View Personnel File
       </button>

     </div>

   </article>

   `;

 }).join('');

};


/* ============================================================
   EMPLOYEE SEARCH
   ============================================================ */

NEBMOD.hrEmployeeSearch=()=>{

 const input=
   document.getElementById(
     'hrMasterSearch'
   );

 const q=
   String(
     input?.value||''
   )
   .trim()
   .toLowerCase();


 const employees=
   NEBMOD.hrState.employees||[];


 if(!q){

   document.getElementById(
     'hrMasterEmployeeList'
   ).innerHTML=
     NEBMOD.renderHrEmployees(
       employees
     );

   return;
 }


 const results=
   employees.filter(emp=>{

     const text=`

       ${emp.employee_number||''}

       ${emp.full_name||''}

       ${emp.email||''}

       ${emp.phone||''}

       ${emp.job_title||''}

       ${emp.role||''}

       ${emp.department||''}

       ${emp.employment_type||''}

       ${emp.employment_status||''}

     `.toLowerCase();


     return text.includes(q);

   });


 document.getElementById(
   'hrMasterEmployeeList'
 ).innerHTML=
   NEBMOD.renderHrEmployees(
     results
   );

};


/* ============================================================
   EMPLOYEE PERSONNEL FILE
   ============================================================ */

NEBMOD.hrEmployeeProfile=userId=>{

 const emp=
   (
     NEBMOD.hrState.employees||
     []
   ).find(x=>
     x.user_id===userId
   );


 if(!emp){
   alert(
     'Employee record not found.'
   );
   return;
 }


 const role=
   NEBRIN.profile?.role||'';


 const canSeeSensitive=
   [
     'HR',
     'CEO',
     'Super Admin',
     'Manager'
   ].includes(role);


 const money=value=>{

   if(
     value===null ||
     value===undefined
   ){
     return 'Not set';
   }

   return new Intl.NumberFormat(
     'en-TZ'
   ).format(
     Number(value||0)
   );

 };


 $('modMain').innerHTML=`

 <article class="neb-card">

   <div class="neb-section-title">

     <div>

       <p class="section-label">
         CONFIDENTIAL HR PERSONNEL FILE
       </p>

       <h2>
         ${NEBRIN.esc(
           emp.full_name||
           'Employee'
         )}
       </h2>

     </div>

     <button
       onclick="NEBMOD.hrEmployees()"
     >
       Back to Employees
     </button>

   </div>


   <div class="neb-grid-2">


     <article class="neb-card">

       <h3>
         Employment Identity
       </h3>

       <p>
         <strong>Employee Number:</strong><br>
         ${NEBRIN.esc(
           emp.employee_number||
           'Pending'
         )}
       </p>

       <p>
         <strong>Role:</strong><br>
         ${NEBRIN.esc(
           emp.role||''
         )}
       </p>

       <p>
         <strong>Job Title:</strong><br>
         ${NEBRIN.esc(
           emp.job_title||
           'Not assigned'
         )}
       </p>

       <p>
         <strong>Department:</strong><br>
         ${NEBRIN.esc(
           emp.department||
           ''
         )}
       </p>

       <p>
         <strong>Employment Type:</strong><br>
         ${NEBRIN.esc(
           emp.employment_type||
           ''
         )}
       </p>

       <p>
         <strong>Status:</strong><br>
         ${NEBRIN.esc(
           emp.employment_status||
           ''
         )}
       </p>

     </article>


     <article class="neb-card">

       <h3>
         Contact & HR File
       </h3>

       <p>
         <strong>Email:</strong><br>
         ${NEBRIN.esc(
           emp.email||
           'Not recorded'
         )}
       </p>

       <p>
         <strong>Phone:</strong><br>
         ${NEBRIN.esc(
           emp.phone||
           'Not recorded'
         )}
       </p>

       <p>
         <strong>Hiring Source:</strong><br>
         ${NEBRIN.esc(
           emp.hiring_source||
           'SYSTEM'
         )}
       </p>

       <p>
         <strong>Personnel File Status:</strong><br>
         ${NEBRIN.esc(
           emp.file_status||
           ''
         )}
       </p>

       <p>
         <strong>Documents:</strong><br>
         ${NEBRIN.esc(
           emp.document_count||0
         )}
       </p>

       <p>
         <strong>Onboarding:</strong><br>
         ${NEBRIN.esc(
           emp.onboarding_status||
           'No onboarding record'
         )}
       </p>

     </article>


     <article class="neb-card">

       <h3>
         Contract
       </h3>

       <p>
         <strong>Start:</strong><br>
         ${
           emp.contract_start_date
           ? new Date(
               emp.contract_start_date
             ).toLocaleDateString()
           : 'Not recorded'
         }
       </p>

       <p>
         <strong>End:</strong><br>
         ${
           emp.contract_end_date
           ? new Date(
               emp.contract_end_date
             ).toLocaleDateString()
           : 'Not recorded'
         }
       </p>

       <p>
         <strong>Salary Grade:</strong><br>
         ${NEBRIN.esc(
           emp.salary_grade||
           'Not assigned'
         )}
       </p>

     </article>


     ${
       canSeeSensitive
       ?`

       <article class="neb-card">

         <h3>
           Confidential Compensation
         </h3>

         <p>
           <strong>Basic Salary:</strong><br>
           ${NEBRIN.esc(
             emp.currency||'TZS'
           )}
           ${money(
             emp.basic_salary
           )}
         </p>

         <p>
           <strong>Payment Method:</strong><br>
           ${NEBRIN.esc(
             emp.payment_method||
             'Not recorded'
           )}
         </p>

         <p>
           This information is restricted
           to authorized HR and Management.
         </p>

       </article>

       `
       :''
     }

   </div>

 </article>

 `;

};


/* ============================================================
   RECRUITMENT
   ============================================================ */

NEBMOD.hrRecruitment=()=>{

 const rows=
   NEBMOD.hrState.recruitment||[];


 $('modMain').innerHTML=`

 <article class="neb-card">

   <div class="neb-section-title">

     <div>

       <p class="section-label">
         TALENT ACQUISITION
       </p>

       <h2>
         Recruitment & Vacancy Management
       </h2>

     </div>

     <button
       onclick="NEBMOD.hrOverview()"
     >
       Back to Overview
     </button>

   </div>


   <p>
     Staffing request → approved vacancy →
     applications → shortlist → interview →
     management decision → hiring →
     onboarding.
   </p>


   <div class="neb-actions">

     <a
       class="btn btn-primary"
       href="staffing-requests.html"
     >
       Staffing Requests
     </a>

   </div>


   <div
     class="neb-panel-list"
     style="margin-top:20px"
   >

     ${
       rows.map(x=>

         row(
           x.reference||
           'Recruitment Case',

           `${
             x.applicant_name||''
           } · ${
             x.position||''
           } · ${
             x.status||''
           }`
         )

       ).join('')||
       '<p>No recruitment cases.</p>'
     }

   </div>

 </article>

 `;

};


/* ============================================================
   LEAVE
   ============================================================ */

NEBMOD.hrLeave=()=>{

 const rows=
   NEBMOD.hrState.leave||[];


 $('modMain').innerHTML=`

 <article class="neb-card">

   <div class="neb-section-title">

     <h2>
       Leave & Permission Management
     </h2>

     <button
       onclick="NEBMOD.hrOverview()"
     >
       Back to Overview
     </button>

   </div>


   ${
     rows.map(x=>

       row(
         x.request_type||
         'Leave Request',

         `${
           x.status||''
         } · ${
           NEBRIN.fmt(
             x.created_at
           )
         }`
       )

     ).join('')||
     '<p>No leave requests.</p>'
   }

 </article>

 `;

};


/* ============================================================
   DISCIPLINE
   ============================================================ */

NEBMOD.hrDiscipline=()=>{

 const rows=
   NEBMOD.hrState.discipline||[];


 $('modMain').innerHTML=`

 <article class="neb-card">

   <div class="neb-section-title">

     <h2>
       Discipline &
       Employee Relations
     </h2>

     <button
       onclick="NEBMOD.hrOverview()"
     >
       Back to Overview
     </button>

   </div>


   <p>
     Confidential disciplinary cases,
     warnings, employee responses,
     hearings and management decisions.
   </p>


   ${
     rows.map(x=>

       row(
         x.case_type||
         'Discipline Case',

         `${
           x.stage||''
         } · ${
           x.status||''
         }`
       )

     ).join('')||
     '<p>No discipline cases.</p>'
   }

 </article>

 `;

};


/* ============================================================
   ONBOARDING
   ============================================================ */

NEBMOD.hrOnboarding=()=>{

 const employees=
   NEBMOD.hrState.employees||[];


 const pending=
   employees.filter(x=>

     x.onboarding_status &&
     ![
       'Completed',
       'Approved',
       'Onboarding Completed'
     ].includes(
       x.onboarding_status
     )

   );


 $('modMain').innerHTML=`

 <article class="neb-card">

   <div class="neb-section-title">

     <div>

       <p class="section-label">
         EMPLOYEE ENTRY
       </p>

       <h2>
         Onboarding & Documents
       </h2>

     </div>

     <button
       onclick="NEBMOD.hrOverview()"
     >
       Back to Overview
     </button>

   </div>


   <div class="neb-actions">

     <a
       class="btn btn-primary"
       href="hr-onboarding.html"
     >
       Open Full HR Onboarding
     </a>

   </div>


   <h3 style="margin-top:24px">
     Pending / Active Onboarding
   </h3>


   ${
     pending.map(x=>

       row(
         x.employee_number||
         'Employee',

         `${
           x.full_name||''
         } · ${
           x.onboarding_status||''
         } · ${
           x.department||''
         }`
       )

     ).join('')||
     '<p>No pending onboarding records.</p>'
   }

 </article>

 `;

};

NEBMOD.cms=async()=>{
 const {data,error}=await supabaseClient.from('cms_posts').select('*,departments(name)').order('created_at',{ascending:false}).limit(150);const p=data||[];
 $('modStats').innerHTML=[['Drafts',p.filter(x=>x.status==='Draft').length],['Pending HOD',p.filter(x=>x.status==='HOD Review').length],['Legal Review',p.filter(x=>x.status==='Legal Review').length],['Manager Approval',p.filter(x=>x.status==='Manager Approval').length],['Scheduled',p.filter(x=>x.status==='Scheduled').length],['Published',p.filter(x=>x.status==='Published').length]].map(x=>`<div class="neb-stat"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');
 $('modMain').innerHTML=`<article class="neb-card"><div class="neb-section-title"><h2>Publishing & Content Management Centre</h2><button class="btn btn-primary" onclick="NEBMOD.newCms()">Create Draft</button></div><p>News, offers, vacancies, public notices, services, publications, products, events and downloadable documents. Department → HOD → Legal when required → Manager/CEO according to approval rules → Website.</p>${error?NEBRIN.esc(error.message):p.map(x=>row(x.title,`${x.departments?.name||''} · ${x.content_type} · ${x.status}`,`<button onclick="NEBMOD.cmsAction('${x.id}')">Review</button>`)).join('')||'<p>No content.</p>'}</article>`;
};
NEBMOD.newCms=async()=>{const title=prompt('Title:');if(!title)return;const type=prompt('Content type: News / Offer / Job Vacancy / Public Notice / Event / Publication','News');const body=prompt('Content:','');const {error}=await supabaseClient.from('cms_posts').insert({content_type:type,department_id:NEBRIN.department?.id,title,body,status:'HOD Review',created_by:NEBRIN.profile.user_id});if(error)alert(error.message);else NEBMOD.cms()};
NEBMOD.cmsAction=async id=>{const status=prompt('Next status: Changes Requested / Legal Review / Manager Approval / CEO Approval / Scheduled / Published / Rejected','Manager Approval');if(!status)return;const {error}=await supabaseClient.from('cms_posts').update({status,published_at:status==='Published'?new Date().toISOString():null}).eq('id',id);if(error)alert(error.message);else NEBMOD.cms()};


NEBMOD.security=async()=>{
 const [inc,pub,work]=await Promise.all([
  supabaseClient.from('security_incidents').select('*').eq('ceo_confidential',false).order('created_at',{ascending:false}).limit(100),
  supabaseClient.from('public_security_events').select('*').order('created_at',{ascending:false}).limit(100),
  supabaseClient.from('department_work_items').select('*').eq('department_id',NEBRIN.department.id).order('created_at',{ascending:false}).limit(100)
 ]);
 const i=inc.data||[],p=pub.data||[],w=work.data||[];
 $('modStats').innerHTML=[['Open Alerts',i.filter(x=>x.status!=='Closed').length],['Critical',i.filter(x=>x.severity==='Critical'&&x.status!=='Closed').length],['Public Website Events',p.length],['Security Work',w.filter(x=>!['Completed','Closed'].includes(x.status)).length],['Under Review',i.filter(x=>/Review|Investigation/.test(x.status)).length],['Closed',i.filter(x=>x.status==='Closed').length]].map(x=>`<div class="neb-stat"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');
 $('modMain').innerHTML=`<div class="neb-grid-2"><article class="neb-card neb-security"><h2>Security Operations Alerts</h2><p>Operational security alerts are visible here. CEO-confidential fraud/theft-sensitive alerts remain visible only to CEO/Super Admin.</p>${i.map(x=>row(x.incident_number,`${x.title} · ${x.severity} · ${x.status}`)).join('')||'<p>No operational security alerts.</p>'}</article><article class="neb-card"><h2>Public Website Security Events</h2>${p.map(x=>row(x.event_type,`${x.severity} · ${new Date(x.created_at).toLocaleString()}`)).join('')||'<p>No public website events.</p>'}</article></div>`;
};

NEBMOD.load=async module=>{
 if(NEBMOD[module])await NEBMOD[module]();
};
