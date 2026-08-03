const loginPanel=document.getElementById('loginPanel'),dashboardPanel=document.getElementById('dashboardPanel'),resetPanel=document.getElementById('resetPanel');
const body=document.getElementById('applicationsBody'),mobileBox=document.getElementById('mobileApplications');let applications=[];
async function checkSession(){const {data}=await supabaseClient.auth.getSession();if(data.session)showDashboard();}
async function showDashboard(){loginPanel.classList.add('hidden');resetPanel.classList.add('hidden');dashboardPanel.classList.remove('hidden');await Promise.all([loadApplications(), loadServices()]);}
document.getElementById('loginBtn').addEventListener('click',async()=>{const email=document.getElementById('loginEmail').value.trim(),password=document.getElementById('loginPassword').value,status=document.getElementById('loginStatus');status.textContent='Signing in…';const {error}=await supabaseClient.auth.signInWithPassword({email,password});if(error){status.className='error';status.textContent=error.message;return;}await showDashboard();});
document.getElementById('logoutBtn').addEventListener('click',async()=>{await supabaseClient.auth.signOut();location.reload();});
document.getElementById('refreshBtn').addEventListener('click',loadApplications);
document.getElementById('searchBox').addEventListener('input',render);
document.getElementById('statusFilter').addEventListener('change',render);
document.getElementById('forgotPassword').addEventListener('click',()=>{loginPanel.classList.add('hidden');resetPanel.classList.remove('hidden');});
document.getElementById('backToLogin').addEventListener('click',()=>{resetPanel.classList.add('hidden');loginPanel.classList.remove('hidden');});
document.getElementById('sendResetBtn').addEventListener('click',async()=>{const email=document.getElementById('resetEmail').value.trim(),status=document.getElementById('resetStatus');if(!email){status.className='error';status.textContent='Enter your email.';return;}const {error}=await supabaseClient.auth.resetPasswordForEmail(email,{redirectTo:`${window.location.origin}/admin.html`});if(error){status.className='error';status.textContent=error.message;return;}status.className='success';status.textContent='Password reset email sent.';});
async function loadApplications(){const status=document.getElementById('dashboardStatus');status.textContent='Loading…';const {data,error}=await supabaseClient.from('applications').select('*').order('created_at',{ascending:false});if(error){status.className='error';status.textContent=error.message;return;}applications=data||[];status.textContent=`${applications.length} application(s)`;updateStats();render();}
function updateStats(){
  document.getElementById('statTotal').textContent=applications.length;
  document.getElementById('statNew').textContent=applications.filter(a=>a.status==='New').length;
  document.getElementById('statProcessing').textContent=applications.filter(a=>a.status==='Processing').length;
  document.getElementById('statCompleted').textContent=applications.filter(a=>a.status==='Completed').length;

  const revenue=applications
    .filter(a=>a.payment_status==='Confirmed')
    .reduce((sum,a)=>sum+Number(a.quoted_amount||0),0);

  document.getElementById('statRevenue').textContent=`TZS ${revenue.toLocaleString()}`;
  document.getElementById('statDeleted').textContent=applications.filter(a=>a.status==='Deleted').length;
  document.getElementById('statPaymentSubmitted').textContent=applications.filter(a=>a.payment_status==='Submitted').length;
  document.getElementById('statPaymentConfirmed').textContent=applications.filter(a=>a.payment_status==='Confirmed').length;
  renderReportSummary();
}
function esc(v=''){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function filteredRows(){const q=document.getElementById('searchBox').value.toLowerCase(),sf=document.getElementById('statusFilter').value;return applications.filter(a=>{const h=`${a.reference} ${a.full_name} ${a.phone} ${a.email} ${a.service}`.toLowerCase();return(!q||h.includes(q))&&(!sf||a.status===sf);});}
function documentsHtml(a) {
  const documents = Array.isArray(a.documents) ? a.documents : [];
  if (!documents.length) return '<span class="admin-detail">No documents</span>';
  return `<div class="document-list">${documents.map((doc, index) =>
    `<button class="document-link" onclick="openDocument('${encodeURIComponent(doc.path)}')">Document ${index + 1}: ${esc(doc.name)}</button>`
  ).join('')}</div>`;
}

function render(){const r=filteredRows();body.innerHTML=r.map(a=>`<tr>
<td>${new Date(a.created_at).toLocaleString()}</td>
<td><strong>${esc(a.reference)}</strong></td>
<td>${esc(a.full_name)}<br>${esc(a.phone)}<br>${esc(a.email||'')}</td>
<td>${esc(a.service)}${a.quoted_amount ? `<div class="fee-label">TZS ${Number(a.quoted_amount).toLocaleString()}</div><div class="admin-detail">Payment: ${esc(a.payment_status||'Pending')}</div>` : ''}</td>
<td>${esc(a.message||'')}${a.admin_note ? `<div class="admin-note"><strong>Internal note:</strong> ${esc(a.admin_note)}</div>` : ''}${documentsHtml(a)}</td>
<td><span class="badge">${esc(a.status)}</span></td>
<td class="actions">
<button onclick="setStatus('${a.id}','Processing')">Processing</button>
<button onclick="setStatus('${a.id}','Completed')">Complete</button>
<button onclick="setStatus('${a.id}','Rejected')">Reject</button>
<button onclick="setFee('${a.id}', '${a.quoted_amount ?? ''}')">Set Fee</button><button onclick="setPaymentStatus('${a.id}','Confirmed')">Confirm Payment</button><button onclick="setPaymentStatus('${a.id}','Rejected')">Reject Payment</button>${a.payment_proof?.path?`<button onclick="openDocument('${encodeURIComponent(a.payment_proof.path)}')">View Payment Proof</button>`:''}
<button onclick="setNote('${a.id}', ${JSON.stringify(a.admin_note || '')})">Add Note</button>
<button class="btn-danger" onclick="deleteApplication('${a.id}','${esc(a.reference)}')">Delete Application</button>
</td></tr>`).join('');

mobileBox.innerHTML=r.map(a=>`<article class="mobile-app-card">
<h3>${esc(a.service)}</h3><p><strong>${esc(a.reference)}</strong></p>
<p>${esc(a.full_name)} · ${esc(a.phone)}</p>
${a.quoted_amount ? `<p class="fee-label">TZS ${Number(a.quoted_amount).toLocaleString()}</p><p>Payment: ${esc(a.payment_status||'Pending')}</p>` : ''}
<p><span class="badge">${esc(a.status)}</span></p>
${a.admin_note ? `<div class="admin-note"><strong>Internal note:</strong> ${esc(a.admin_note)}</div>` : ''}
${documentsHtml(a)}
<div class="card-actions">
<button onclick="setStatus('${a.id}','Processing')">Processing</button>
<button onclick="setStatus('${a.id}','Completed')">Complete</button>
<button onclick="setStatus('${a.id}','Rejected')">Reject</button>
<button onclick="setFee('${a.id}', '${a.quoted_amount ?? ''}')">Set Fee</button><button onclick="setPaymentStatus('${a.id}','Confirmed')">Confirm Payment</button><button onclick="setPaymentStatus('${a.id}','Rejected')">Reject Payment</button>${a.payment_proof?.path?`<button onclick="openDocument('${encodeURIComponent(a.payment_proof.path)}')">View Payment Proof</button>`:''}
<button onclick="setNote('${a.id}', ${JSON.stringify(a.admin_note || '')})">Add Note</button>
<button class="btn-danger" onclick="deleteApplication('${a.id}','${esc(a.reference)}')">Delete Application</button>
</div></article>`).join('');}

window.setStatus=async function(id,status){
  const {error}=await supabaseClient.from('applications').update({status}).eq('id',id);
  if(error) alert(error.message); else loadApplications();
};

window.setFee=async function(id,current){
  const value=prompt('Enter quoted amount in TZS:', current || '');
  if(value===null) return;
  const clean=value.replace(/,/g,'').trim();
  if(clean && (!Number.isFinite(Number(clean)) || Number(clean)<0)){
    alert('Enter a valid amount.');
    return;
  }
  const {error}=await supabaseClient.from('applications')
    .update({quoted_amount: clean ? Number(clean) : null}).eq('id',id);
  if(error) alert(error.message); else loadApplications();
};

window.setNote=async function(id,current){
  const value=prompt('Enter an internal note. This is visible only to admin:', current || '');
  if(value===null) return;
  const {error}=await supabaseClient.from('applications')
    .update({admin_note:value.trim()}).eq('id',id);
  if(error) alert(error.message); else loadApplications();
};

window.openDocument=async function(encodedPath){
  const path=decodeURIComponent(encodedPath);
  const {data,error}=await supabaseClient.storage
    .from('application-documents')
    .createSignedUrl(path,300);
  if(error){alert(error.message);return;}
  window.open(data.signedUrl,'_blank','noopener');
};



const SERVICE_PRESETS=[
'TIN Registration','NIDA Application','Birth Certificate Support','Death Certificate Support',
'Marriage Certificate Support','Passport Application','Visa Application','Driving Licence Services',
'Police Clearance Certificate','Company Registration','Business Name Registration',
'Business License Processing','Tax Clearance Certificate','TIN Amendment','TRA Services',
'BRELA Services','RITA Services','NSSF Services','OSHA Services','HESLB Services',
'M-Pesa Registration','Lipa Number Registration','Airtel Money Registration',
'Mixx by Yas Registration','HaloPesa Registration','CRDB Account Opening','NMB Account Opening',
'NBC Account Opening','Website Development','Mobile App Development','E-commerce Solutions',
'Logo & Graphic Design','Digital Marketing','CV Writing & Job Application',
'Entrepreneurship Training','Business Development Training','Youth Recruitment'
];
const CATEGORY_PRESETS=[
'Government Services','Business Services','Tax Services','Legal Services','Immigration Services',
'Banking Services','Mobile Financial Services','Digital Services','Creative Services',
'Education Services','Employment Services','Training Services','Other Services'
];
const SERVICE_DOCUMENT_TEMPLATES={
'TIN Registration':['NIDA Copy','Passport Photo?'],
'NIDA Application':['Birth Certificate','Local Government Introduction Letter','Passport Photo'],
'Birth Certificate Support':['Parent or Guardian NIDA Copy','Birth Notification or Supporting Letter?'],
'Company Registration':['Director NIDA Copies','Proposed Company Names','Director Contact Details'],
'Business Name Registration':['NIDA Copy','Proposed Business Names'],
'Business License Processing':['TIN Certificate','Business Registration Certificate','Premises Information'],
'M-Pesa Registration':['NIDA Copy','Passport Photo','Business License?'],
'Lipa Number Registration':['NIDA Copy','Business License','TIN Certificate','Passport Photo?'],
'CRDB Account Opening':['NIDA Copy','Passport Photo','Proof of Address?','TIN Certificate?'],
'Website Development':['Company Profile or Business Information','Logo?','Sample Content or References?'],
'Mobile App Development':['Project Requirements','Logo?','Reference Screens or Examples?'],
'Logo & Graphic Design':['Design Brief','Reference Images?']
};

const SERVICE_CATEGORY_MAP = {
  'TIN Registration':'Tax Services','NIDA Application':'Government Services',
  'Birth Certificate Support':'Government Services','Death Certificate Support':'Government Services',
  'Marriage Certificate Support':'Government Services','Passport Application':'Immigration Services',
  'Visa Application':'Immigration Services','Driving Licence Services':'Government Services',
  'Police Clearance Certificate':'Government Services','Company Registration':'Business Services',
  'Business Name Registration':'Business Services','Business License Processing':'Business Services',
  'Tax Clearance Certificate':'Tax Services','TIN Amendment':'Tax Services','TRA Services':'Tax Services',
  'BRELA Services':'Business Services','RITA Services':'Government Services','NSSF Services':'Government Services',
  'OSHA Services':'Business Services','HESLB Services':'Education Services',
  'M-Pesa Registration':'Mobile Financial Services','Lipa Number Registration':'Mobile Financial Services',
  'Airtel Money Registration':'Mobile Financial Services','Mixx by Yas Registration':'Mobile Financial Services',
  'HaloPesa Registration':'Mobile Financial Services','CRDB Account Opening':'Banking Services',
  'NMB Account Opening':'Banking Services','NBC Account Opening':'Banking Services',
  'Website Development':'Digital Services','Mobile App Development':'Digital Services',
  'E-commerce Solutions':'Digital Services','Logo & Graphic Design':'Creative Services',
  'Digital Marketing':'Digital Services','CV Writing & Job Application':'Employment Services',
  'Entrepreneurship Training':'Training Services','Business Development Training':'Training Services',
  'Youth Recruitment':'Employment Services'
};
function autoSelectCategory(serviceName){
  const category=SERVICE_CATEGORY_MAP[serviceName]; if(!category)return;
  const categorySelect=document.getElementById('serviceCategorySelect');
  const customInput=document.getElementById('serviceCategoryCustom');
  if([...categorySelect.options].some(o=>o.value===category)){
    categorySelect.value=category; categorySelect.classList.add('auto-filled');
    customInput.classList.add('hidden'); customInput.value='';
  }else{
    categorySelect.value='__custom__'; categorySelect.classList.remove('auto-filled');
    customInput.classList.remove('hidden'); customInput.value=category;
  }
}

function populatePresetSelects(){
 const ns=document.getElementById('serviceNameSelect'),cs=document.getElementById('serviceCategorySelect');
 const names=[...new Set([...SERVICE_PRESETS,...services.map(s=>s.name)])].sort();
 ns.innerHTML='<option value="">Choose service</option>'+names.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('')+'<option value="__custom__">Other / Custom</option>';
 cs.innerHTML='<option value="">Choose category</option>'+CATEGORY_PRESETS.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('')+'<option value="__custom__">Other / Custom</option>';
}
document.getElementById('serviceNameSelect')?.addEventListener('change',()=>{
 const s=document.getElementById('serviceNameSelect'),c=document.getElementById('serviceNameCustom');
 c.classList.toggle('hidden',s.value!=='__custom__');
 if(s.value&&s.value!=='__custom__'){
   autoSelectCategory(s.value);
   if(SERVICE_DOCUMENT_TEMPLATES[s.value]&&!document.getElementById('serviceDocuments').value.trim())
     document.getElementById('serviceDocuments').value=SERVICE_DOCUMENT_TEMPLATES[s.value].join('\n');
 }
});
document.getElementById('serviceCategorySelect')?.addEventListener('change',()=>{
 const s=document.getElementById('serviceCategorySelect');
 document.getElementById('serviceCategoryCustom').classList.toggle('hidden',s.value!=='__custom__');
 document.getElementById('serviceCategorySelect').classList.remove('auto-filled');
});
function selectedServiceName(){const v=document.getElementById('serviceNameSelect').value;return v==='__custom__'?document.getElementById('serviceNameCustom').value.trim():v.trim();}
function selectedCategory(){const v=document.getElementById('serviceCategorySelect').value;return v==='__custom__'?document.getElementById('serviceCategoryCustom').value.trim():v.trim();}

let services=[];

function parseRequiredDocuments(text){
  return text.split('\n')
    .map(line=>line.trim())
    .filter(Boolean)
    .map(line=>{
      const optional=line.endsWith('?');
      const name=optional?line.slice(0,-1).trim():line;
      return {name,required:!optional,note:''};
    });
}

function clearServiceForm(){
  document.getElementById('serviceId').value='';
  document.getElementById('serviceNameSelect').value='';
  document.getElementById('serviceNameCustom').value='';
  document.getElementById('serviceNameCustom').classList.add('hidden');
  document.getElementById('serviceCategorySelect').value='';
  document.getElementById('serviceCategorySelect').classList.remove('auto-filled');
  document.getElementById('serviceCategoryCustom').value='';
  document.getElementById('serviceCategoryCustom').classList.add('hidden');
  document.getElementById('servicePrice').value='';
  document.getElementById('serviceProcessingTime').value='';
  document.getElementById('serviceDescription').value='';
  document.getElementById('serviceDocuments').value='';
  document.getElementById('serviceActive').value='true';
}

async function loadServices(){
  const status=document.getElementById('serviceManagerStatus');
  status.textContent='Loading services…';
  const {data,error}=await supabaseClient.from('services').select('*').order('category').order('name');
  if(error){status.className='error';status.textContent=error.message;return;}
  services=data||[];
  populatePresetSelects();
  status.className='';status.textContent=`${services.length} service(s)`;
  renderServices();
}

function renderServices(){
  const box=document.getElementById('serviceList');
  box.innerHTML=services.map(service=>{
    const docs=Array.isArray(service.required_documents)?service.required_documents:[];
    return `<article class="service-item">
      <h3>${esc(service.name)}</h3>
      <div class="meta">
        <span>${esc(service.category||'Other')}</span>
        <span>${service.is_active?'Active':'Inactive'}</span>
        <span>${service.price?`TZS ${Number(service.price).toLocaleString()}`:'Price not set'}</span>
        <span>${esc(service.processing_time||'Time not set')}</span>
      </div>
      <p>${esc(service.description||'')}</p>
      <div class="docs"><strong>Required documents:</strong> ${
        docs.length?docs.map(doc=>`${esc(doc.name)}${doc.required===false?' (optional)':''}`).join(', '):'None'
      }</div>
      <div class="actions">
        <button class="btn-secondary-admin" onclick="editService('${service.id}')">Edit</button>
        <button onclick="toggleService('${service.id}',${!service.is_active})">${service.is_active?'Deactivate':'Activate'}</button>
        <button class="btn-danger" onclick="deleteService('${service.id}')">Delete</button>
      </div>
    </article>`;
  }).join('');
}

window.editService=function(id){
  const service=services.find(item=>item.id===id);
  if(!service)return;
  document.getElementById('serviceId').value=service.id;
  const ns=document.getElementById('serviceNameSelect'),cs=document.getElementById('serviceCategorySelect');
  if([...ns.options].some(o=>o.value===service.name)){ns.value=service.name;document.getElementById('serviceNameCustom').classList.add('hidden');}
  else{ns.value='__custom__';document.getElementById('serviceNameCustom').classList.remove('hidden');document.getElementById('serviceNameCustom').value=service.name||'';}
  if([...cs.options].some(o=>o.value===service.category)){cs.value=service.category;document.getElementById('serviceCategoryCustom').classList.add('hidden');}
  else{cs.value='__custom__';document.getElementById('serviceCategoryCustom').classList.remove('hidden');document.getElementById('serviceCategoryCustom').value=service.category||'';}
  document.getElementById('servicePrice').value=service.price??'';
  document.getElementById('serviceProcessingTime').value=service.processing_time||'';
  document.getElementById('serviceDescription').value=service.description||'';
  document.getElementById('serviceDocuments').value=(service.required_documents||[])
    .map(doc=>`${doc.name}${doc.required===false?'?':''}`).join('\n');
  document.getElementById('serviceActive').value=String(service.is_active);
  document.getElementById('serviceNameSelect').scrollIntoView({behavior:'smooth'});
};

window.toggleService=async function(id,is_active){
  const {error}=await supabaseClient.from('services').update({is_active}).eq('id',id);
  if(error)alert(error.message);else loadServices();
};

window.deleteService=async function(id){
  if(!confirm('Delete this service? Existing applications will remain, but the service will be removed from the customer form.'))return;
  const {error}=await supabaseClient.from('services').delete().eq('id',id);
  if(error)alert(error.message);else loadServices();
};

document.getElementById('saveServiceBtn')?.addEventListener('click',async()=>{
  const id=document.getElementById('serviceId').value;
  const name=selectedServiceName();
  const category=selectedCategory();
  const priceText=document.getElementById('servicePrice').value.trim();
  const processing_time=document.getElementById('serviceProcessingTime').value.trim();
  const description=document.getElementById('serviceDescription').value.trim();
  const required_documents=parseRequiredDocuments(document.getElementById('serviceDocuments').value);
  const is_active=document.getElementById('serviceActive').value==='true';
  const status=document.getElementById('serviceManagerStatus');

  if(!name){status.className='error';status.textContent='Service name is required.';return;}
  const payload={
    name,category:category||'Other Services',
    price:priceText?Number(priceText):null,
    processing_time,description,required_documents,is_active
  };

  let result;
  if(id) result=await supabaseClient.from('services').update(payload).eq('id',id);
  else result=await supabaseClient.from('services').insert([payload]);

  if(result.error){status.className='error';status.textContent=result.error.message;return;}
  status.className='success';status.textContent='Service saved successfully.';
  clearServiceForm();
  await loadServices();
});

document.getElementById('clearServiceBtn')?.addEventListener('click',clearServiceForm);


window.setPaymentStatus=async function(id,payment_status){const {error}=await supabaseClient.from('applications').update({payment_status}).eq('id',id);if(error)alert(error.message);else loadApplications();};
window.deleteApplication=async function(id,reference){
 const reason=prompt('Enter the reason the customer will see:','Your application was deleted because the submitted information or documents did not meet the stated requirements.');
 if(reason===null)return;if(!reason.trim()){alert('A deletion reason is required.');return;}
 if(!confirm(`Delete application ${reference}? Uploaded documents will also be removed.`))return;
 const app=applications.find(x=>x.id===id),docs=Array.isArray(app?.documents)?app.documents:[];
 for(const doc of docs){if(doc.path){const {error}=await supabaseClient.storage.from('application-documents').remove([doc.path]);if(error)console.warn(error.message);}}
 const {error}=await supabaseClient.from('applications').update({status:'Deleted',deletion_reason:reason.trim(),deleted_at:new Date().toISOString(),documents:[]}).eq('id',id);
 if(error){alert(error.message);return;}alert('Application deleted and customer message saved.');loadApplications();
};


function downloadCsv(filename, rows){
  if(!rows.length){alert('No data available.');return;}
  const headers=[...new Set(rows.flatMap(row=>Object.keys(row)))];
  const escapeValue=value=>{
    const text=value===null||value===undefined?'':typeof value==='object'?JSON.stringify(value):String(value);
    return `"${text.replaceAll('"','""')}"`;
  };
  const csv=[headers.map(escapeValue).join(','),...rows.map(row=>headers.map(h=>escapeValue(row[h])).join(','))].join('\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;link.download=filename;link.click();
  URL.revokeObjectURL(url);
}

function renderReportSummary(){
  const summary=document.getElementById('reportSummary');
  if(!summary)return;
  const byService={};
  applications.forEach(a=>byService[a.service]=(byService[a.service]||0)+1);
  const topServices=Object.entries(byService).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const today=new Date().toISOString().slice(0,10);
  const todayCount=applications.filter(a=>String(a.created_at||'').slice(0,10)===today).length;
  const confirmedRevenue=applications.filter(a=>a.payment_status==='Confirmed').reduce((s,a)=>s+Number(a.quoted_amount||0),0);
  summary.innerHTML=`<div class="report-grid">
    <div class="report-card"><h4>Today's Applications</h4><p>${todayCount}</p></div>
    <div class="report-card"><h4>Confirmed Revenue</h4><p>TZS ${confirmedRevenue.toLocaleString()}</p></div>
    <div class="report-card"><h4>Top Services</h4>${topServices.map(([name,count])=>`<p>${esc(name)}: ${count}</p>`).join('')||'<p>No data</p>'}</div>
  </div>`;
}

document.getElementById('exportCsvBtn')?.addEventListener('click',()=>{
  const rows=applications.map(a=>({
    reference:a.reference,
    created_at:a.created_at,
    full_name:a.full_name,
    phone:a.phone,
    email:a.email,
    service:a.service,
    status:a.status,
    quoted_amount:a.quoted_amount,
    payment_status:a.payment_status,
    deletion_reason:a.deletion_reason,
    admin_note:a.admin_note
  }));
  downloadCsv(`nebrin-applications-${new Date().toISOString().slice(0,10)}.csv`,rows);
});

document.getElementById('exportAuditBtn')?.addEventListener('click',async()=>{
  const {data,error}=await supabaseClient.from('audit_logs').select('*').order('created_at',{ascending:false});
  if(error){alert(error.message);return;}
  downloadCsv(`nebrin-audit-log-${new Date().toISOString().slice(0,10)}.csv`,data||[]);
});

checkSession();