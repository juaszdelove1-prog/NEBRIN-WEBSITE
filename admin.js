const loginPanel=document.getElementById('loginPanel'),dashboardPanel=document.getElementById('dashboardPanel'),resetPanel=document.getElementById('resetPanel');
const body=document.getElementById('applicationsBody'),mobileBox=document.getElementById('mobileApplications');let applications=[];let currentStaff=null;let staffMembers=[];
async function checkSession(){
  const {data}=await supabaseClient.auth.getSession();
  const verifiedThisTab=sessionStorage.getItem('nebrinStaffAuthenticated')==='true';
  if(data.session&&verifiedThisTab){
    showDashboard();
  }else{
    if(data.session)await supabaseClient.auth.signOut();
    loginPanel.classList.remove('hidden');
    dashboardPanel.classList.add('hidden');
  }
}
async function showDashboard(){
  loginPanel.classList.add('hidden');
  resetPanel.classList.add('hidden');
  dashboardPanel.classList.remove('hidden');
  await loadCurrentStaff();await startStaffSession('admin');
  await Promise.all([loadStaffMembers(),loadPendingStaff(),loadApplications(),loadServices(),loadAppointments(),loadFeedbackSummary(),loadPaymentMethods(),loadPaymentBillCount()]);
  subscribeRealtime();
}
document.getElementById('loginBtn').addEventListener('click',async()=>{

  const email=document.getElementById('loginEmail').value.trim();
  const password=document.getElementById('loginPassword').value;
  const status=document.getElementById('loginStatus');

  status.className='';
  status.textContent='Signing in…';

  const {data:auth,error}=await supabaseClient.auth
    .signInWithPassword({email,password});

  if(error){
    status.className='error';
    status.textContent=error.message;
    return;
  }

  const {data:officeAccess,error:officeError}
    =await supabaseClient.rpc('can_access_office_now');

  if(officeError){
    await supabaseClient.auth.signOut();
    status.className='error';
    status.textContent='Unable to verify office access. Please try again.';
    return;
  }

  const office=Array.isArray(officeAccess)
    ? officeAccess[0]
    : officeAccess;

  if(office && !office.allowed){
    await supabaseClient.auth.signOut();
    sessionStorage.removeItem('nebrinStaffAuthenticated');

    status.className='error';
    status.textContent=
      'OFFICE CLOSED — Muda rasmi wa ofisi umekwisha. Tafadhali fanya kazi zako kwa wakati.';

    return;
  }

  sessionStorage.setItem(
    'nebrinStaffAuthenticated',
    'true'
  );

  const {data:p,error:profileError}
    =await supabaseClient
      .from('admin_users')
      .select('*')
      .eq('user_id',auth.user.id)
      .maybeSingle();

  if(profileError || !p){
    sessionStorage.removeItem('nebrinStaffAuthenticated');
    await supabaseClient.auth.signOut();

    status.className='error';
    status.textContent='Staff profile could not be verified.';
    return;
  }

  if(
    p.approval_status!=='Approved' ||
    !p.is_active
  ){
    sessionStorage.removeItem('nebrinStaffAuthenticated');
    await supabaseClient.auth.signOut();

    status.className='error';
    status.textContent=
      'Your NEBRIN staff account is not approved or active.';
    return;
  }

  status.className='success';
  status.textContent='Access granted. Opening office…';

  location.href=
    window.nebrinDashboardForProfile?.(p)
    ||'staff-room.html';

});
document.getElementById('logoutBtn').addEventListener('click',async()=>{sessionStorage.removeItem('nebrinStaffAuthenticated');await supabaseClient.auth.signOut();location.reload();});
document.getElementById('refreshBtn').addEventListener('click',loadApplications);
document.getElementById('searchBox').addEventListener('input',render);
document.getElementById('statusFilter').addEventListener('change',render);
document.getElementById('departmentFilter')?.addEventListener('change',render);
document.getElementById('assignmentFilter')?.addEventListener('change',render);
document.getElementById('forgotPassword').addEventListener('click',()=>{loginPanel.classList.add('hidden');resetPanel.classList.remove('hidden');});
document.getElementById('backToLogin').addEventListener('click',()=>{resetPanel.classList.add('hidden');loginPanel.classList.remove('hidden');});
document.getElementById('sendResetBtn').addEventListener('click',async()=>{const email=document.getElementById('resetEmail').value.trim(),status=document.getElementById('resetStatus');if(!email){status.className='error';status.textContent='Enter your email.';return;}const {error}=await supabaseClient.auth.resetPasswordForEmail(email,{redirectTo:`${window.location.origin}/admin.html`});if(error){status.className='error';status.textContent=error.message;return;}status.className='success';status.textContent='Password reset email sent.';});
async function loadApplications(){
  const status=document.getElementById('dashboardStatus');
  status.textContent='Loading…';
  const {data,error}=await supabaseClient.from('applications').select('*').is('deleted_at',null).order('created_at',{ascending:false});
  if(error){status.className='error';status.textContent=error.message;return;}
  applications=(data||[]).filter(a=>!a.archived_at);
  status.textContent=`${applications.length} active application(s)`;
  updateStats();
  render();
}
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
function filteredRows(){
  const q=document.getElementById('searchBox').value.toLowerCase();
  const sf=document.getElementById('statusFilter').value;
  const df=document.getElementById('departmentFilter')?.value||'';
  const af=document.getElementById('assignmentFilter')?.value||'';

  return applications.filter(a=>{
    const haystack=`${a.reference} ${a.full_name} ${a.phone} ${a.email} ${a.service} ${a.department||''}`.toLowerCase();
    const matchesSearch=!q||haystack.includes(q);
    const matchesStatus=!sf||a.status===sf;
    const matchesDepartment=!df||a.department===df;
    const matchesAssignment=!af
      ||(af==='mine'&&a.assigned_to===currentStaff?.user_id)
      ||(af==='unassigned'&&!a.assigned_to);
    return matchesSearch&&matchesStatus&&matchesDepartment&&matchesAssignment;
  });
}
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
<td><span class="department-badge">${esc(a.department||'Unassigned')}</span></td>
<td><span class="assignment-label">${esc(staffName(a.assigned_to))}</span></td>
<td>${esc(a.message||'')}${a.admin_note ? `<div class="admin-note"><strong>Internal note:</strong> ${esc(a.admin_note)}</div>` : ''}${documentsHtml(a)}</td>
<td><span class="badge">${esc(a.status)}</span></td>
<td class="actions">
<button onclick="setStatus('${a.id}','Processing')">Processing</button><button onclick="assignApplication('${a.id}')">Assign</button><button onclick="assignApplication('${a.id}')">Assign</button>
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
  const payload={status};
  if(status==='Completed')payload.completed_at=new Date().toISOString();
  const {error}=await supabaseClient.from('applications').update(payload).eq('id',id);
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
 if(error){alert(error.message);return;}applications=applications.filter(item=>item.id!==id);updateStats();render();alert('Application removed from the active dashboard.');
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


let paymentMethods=[];

function selectedPaymentProvider(){
  const value=document.getElementById('paymentProvider').value;
  return value==='__custom__'
    ? document.getElementById('paymentProviderCustom').value.trim()
    : value.trim();
}

document.getElementById('paymentProvider')?.addEventListener('change',()=>{
  const custom=document.getElementById('paymentProviderCustom');
  custom.classList.toggle('hidden',document.getElementById('paymentProvider').value!=='__custom__');
});

function clearPaymentMethodForm(){
  document.getElementById('paymentMethodId').value='';
  document.getElementById('paymentProvider').value='';
  document.getElementById('paymentProviderCustom').value='';
  document.getElementById('paymentProviderCustom').classList.add('hidden');
  document.getElementById('paymentType').value='Lipa Number';
  document.getElementById('paymentNumber').value='';
  document.getElementById('paymentAccountName').value='';
  document.getElementById('paymentInstructions').value='';
  document.getElementById('paymentActive').value='true';
}

async function loadPaymentMethods(){
  const status=document.getElementById('paymentManagerStatus');
  if(status) status.textContent='Loading payment methods…';

  const {data,error}=await supabaseClient
    .from('payment_methods')
    .select('*')
    .order('provider');

  if(error){
    if(status){status.className='error';status.textContent=error.message;}
    return;
  }

  paymentMethods=data||[];
  if(status){status.className='';status.textContent=`${paymentMethods.length} payment method(s)`;}
  renderPaymentMethods();
}

function renderPaymentMethods(){
  const box=document.getElementById('paymentMethodList');
  if(!box)return;

  box.innerHTML=paymentMethods.map(method=>`
    <article class="payment-method-item">
      <h3>${esc(method.provider)}</h3>
      <p><strong>${esc(method.payment_type)}:</strong> ${esc(method.account_number)}</p>
      <p><strong>Account Name:</strong> ${esc(method.account_name||'')}</p>
      <p><strong>Status:</strong> ${method.is_active?'Active':'Inactive'}</p>
      ${method.instructions?`<p>${esc(method.instructions)}</p>`:''}
      <div class="actions">
        <button onclick="editPaymentMethod('${method.id}')">Edit</button>
        <button onclick="togglePaymentMethod('${method.id}',${!method.is_active})">${method.is_active?'Deactivate':'Activate'}</button>
        <button class="btn-danger" onclick="deletePaymentMethod('${method.id}')">Delete</button>
      </div>
    </article>
  `).join('')||'<p>No payment methods added yet.</p>';
}

window.editPaymentMethod=function(id){
  const method=paymentMethods.find(item=>item.id===id);
  if(!method)return;

  document.getElementById('paymentMethodId').value=method.id;

  const providerSelect=document.getElementById('paymentProvider');
  if([...providerSelect.options].some(option=>option.value===method.provider)){
    providerSelect.value=method.provider;
    document.getElementById('paymentProviderCustom').classList.add('hidden');
  }else{
    providerSelect.value='__custom__';
    document.getElementById('paymentProviderCustom').classList.remove('hidden');
    document.getElementById('paymentProviderCustom').value=method.provider;
  }

  document.getElementById('paymentType').value=method.payment_type;
  document.getElementById('paymentNumber').value=method.account_number;
  document.getElementById('paymentAccountName').value=method.account_name||'';
  document.getElementById('paymentInstructions').value=method.instructions||'';
  document.getElementById('paymentActive').value=String(method.is_active);
};

window.togglePaymentMethod=async function(id,is_active){
  const {error}=await supabaseClient.from('payment_methods').update({is_active}).eq('id',id);
  if(error)alert(error.message);else loadPaymentMethods();
};

window.deletePaymentMethod=async function(id){
  if(!confirm('Delete this payment method?'))return;
  const {error}=await supabaseClient.from('payment_methods').delete().eq('id',id);
  if(error)alert(error.message);else loadPaymentMethods();
};

document.getElementById('savePaymentMethodBtn')?.addEventListener('click',async()=>{
  const id=document.getElementById('paymentMethodId').value;
  const provider=selectedPaymentProvider();
  const payment_type=document.getElementById('paymentType').value;
  const account_number=document.getElementById('paymentNumber').value.trim();
  const account_name=document.getElementById('paymentAccountName').value.trim();
  const instructions=document.getElementById('paymentInstructions').value.trim();
  const is_active=document.getElementById('paymentActive').value==='true';
  const status=document.getElementById('paymentManagerStatus');

  if(!provider||!account_number){
    status.className='error';
    status.textContent='Provider and account/number are required.';
    return;
  }

  const payload={provider,payment_type,account_number,account_name,instructions,is_active};
  const result=id
    ? await supabaseClient.from('payment_methods').update(payload).eq('id',id)
    : await supabaseClient.from('payment_methods').insert([payload]);

  if(result.error){
    status.className='error';
    status.textContent=result.error.message;
    return;
  }

  status.className='success';
  status.textContent='Payment method saved successfully.';
  clearPaymentMethodForm();
  loadPaymentMethods();
});

document.getElementById('clearPaymentMethodBtn')?.addEventListener('click',clearPaymentMethodForm);



let staffHeartbeatTimer=null;
async function startStaffSession(page){
 try{await supabaseClient.rpc('record_staff_login',{p_page:page});await supabaseClient.rpc('record_staff_activity',{p_action:'Opened dashboard',p_page:page,p_details:{path:location.pathname}});
 if(staffHeartbeatTimer)clearInterval(staffHeartbeatTimer);staffHeartbeatTimer=setInterval(()=>supabaseClient.rpc('staff_session_heartbeat',{p_page:page}),120000);}catch(error){console.warn('Staff tracking:',error.message);}
}

function staffName(userId){
  if(!userId)return 'Unassigned';
  return staffMembers.find(member=>member.user_id===userId)?.full_name||'Assigned staff';
}

function roleDepartment(role){
  const map={
    'CEO':'Management','Super Admin':'Management','Manager':'Management',
    'Accountant':'Finance','Finance':'Finance',
    'Graphics':'Graphics','Graphic Designer':'Graphics',
    'Customer Care':'Customer Care',
    'HR':'Human Resources','Human Resources':'Human Resources',
    'Digital Staff':'Digital Services','Staff':'Customer Care'
  };
  return map[role]||'Customer Care';
}

async function loadCurrentStaff(){
  const {data:{user}}=await supabaseClient.auth.getUser();
  if(!user)return;
  const {data,error}=await supabaseClient.from('admin_users').select('*').eq('user_id',user.id).single();
  if(error){alert('Your staff profile was not found. Ask the CEO to add your UUID to admin_users.');return;}
  currentStaff=data;
  document.getElementById('staffIdentity').innerHTML=
    `${esc(data.full_name||user.email)} · <span class="role-badge">${esc(data.role||'Staff')}</span> · <span class="department-badge">${esc(data.department||roleDepartment(data.role))}</span>`;
  document.getElementById('dashboardTitle').textContent=`${data.role||'Staff'} Dashboard`;
  const myBtn=document.getElementById('myRoleDashboardBtn');
  if(myBtn && window.NEBRIN_ROLE_DASHBOARD?.[data.role]){
    myBtn.classList.remove('hidden');
    myBtn.onclick=()=>window.nebrinOpenRoleDashboard(data.role);
  }

  document.getElementById('managerDashboardLink')?.classList.toggle('hidden',!['CEO','Super Admin','Manager'].includes(data.role));
  document.getElementById('customerCareDashboardLink')?.classList.toggle('hidden',!['CEO','Super Admin','Manager','Customer Care'].includes(data.role));
if(['CEO','Super Admin'].includes(data.role))document.getElementById('ceoDashboardLink')?.classList.remove('hidden');
  if(['CEO','Super Admin','Manager'].includes(data.role)){
    document.getElementById('staffManagementPanel')?.classList.remove('hidden');document.getElementById('staffInvitePanel')?.classList.remove('hidden');
  }else{
    document.getElementById('staffManagementPanel')?.classList.add('hidden');document.getElementById('staffInvitePanel')?.classList.add('hidden');
    document.querySelector('.service-manager')?.classList.add('hidden');
    document.querySelector('.payment-manager')?.classList.toggle('hidden',!['Accountant','Finance'].includes(data.role));
  }
}

async function loadStaffMembers(){
  const {data,error}=await supabaseClient.from('admin_users').select('*').eq('is_active',true).order('full_name');
  if(error){console.error(error);return;}
  staffMembers=data||[];
  renderStaffMembers();
}

function renderStaffMembers(){
  const box=document.getElementById('staffList');
  if(!box)return;
  box.innerHTML=staffMembers.map(member=>`<article class="staff-item">
    <div><strong>${esc(member.full_name||'Unnamed staff')}</strong><br><small>${esc(member.user_id)}</small></div>
    <select id="role-${member.user_id}">
      ${['CEO','Manager','Accountant','Graphics','Customer Care','HR','Digital Staff','Staff'].map(role=>`<option ${member.role===role?'selected':''}>${role}</option>`).join('')}
    </select>
    <select id="dept-${member.user_id}">
      ${['Management','Finance','Graphics','Customer Care','Human Resources','Digital Services'].map(dept=>`<option ${member.department===dept?'selected':''}>${dept}</option>`).join('')}
    </select>
    <button class="btn btn-primary" onclick="saveStaffRole('${member.user_id}')">Save</button>
  </article>`).join('')||'<p>No staff profiles found.</p>';
}

window.saveStaffRole=async function(userId){
  const role=document.getElementById(`role-${userId}`).value;
  const department=document.getElementById(`dept-${userId}`).value;
  const {error}=await supabaseClient.from('admin_users').update({role,department}).eq('user_id',userId);
  if(error)alert(error.message);else{alert('Staff role updated.');loadStaffMembers();}
};

window.assignApplication=async function(id){
  if(!['CEO','Super Admin','Manager'].includes(currentStaff?.role||'')){
    alert('Only the CEO or Manager can assign applications.');
    return;
  }
  const choices=staffMembers.map((member,index)=>`${index+1}. ${member.full_name} — ${member.role} / ${member.department}`).join('\n');
  const answer=prompt(`Choose staff number:\n${choices}`);
  if(answer===null)return;
  const selected=staffMembers[Number(answer)-1];
  if(!selected){alert('Invalid staff number.');return;}
  const {error}=await supabaseClient.from('applications').update({
    assigned_to:selected.user_id,
    department:selected.department||roleDepartment(selected.role)
  }).eq('id',id);
  if(error)alert(error.message);else loadApplications();
};

async function loadPendingStaff(){const box=document.getElementById('pendingStaffList');if(!box)return;const {data,error}=await supabaseClient.from('admin_users').select('*').eq('approval_status','Pending').order('created_at',{ascending:false});if(error){console.error(error);box.innerHTML='<p>Unable to load pending staff.</p>';return;}box.innerHTML=(data||[]).map(m=>`<article class="staff-item"><div><strong>${esc(m.full_name||m.email||'Pending staff')}</strong><br><small>${esc(m.email||'')} · ${esc(m.phone||'')}</small></div><span class="role-badge">${esc(m.role||'Staff')}</span><span class="department-badge">${esc(m.department||'Unassigned')}</span><div><button class="btn btn-primary" onclick="approveStaff('${m.user_id}')">Approve</button><button class="btn-danger" onclick="rejectStaff('${m.user_id}')">Reject</button></div></article>`).join('')||'<p>No pending staff registrations.</p>';}window.approveStaff=async userId=>{const {error}=await supabaseClient.from('admin_users').update({approval_status:'Approved',is_active:true,approved_by:currentStaff?.user_id||null,approved_at:new Date().toISOString()}).eq('user_id',userId);if(error)alert(error.message);else{loadPendingStaff();loadStaffMembers();}};window.rejectStaff=async userId=>{if(!confirm('Reject this staff registration?'))return;const {error}=await supabaseClient.from('admin_users').update({approval_status:'Rejected',is_active:false}).eq('user_id',userId);if(error)alert(error.message);else loadPendingStaff();};document.getElementById('createStaffInviteBtn')?.addEventListener('click',async()=>{const email=document.getElementById('inviteEmail').value.trim().toLowerCase(),role=document.getElementById('inviteRole').value,department=document.getElementById('inviteDepartment').value,expiryHours=Number(document.getElementById('inviteExpiryHours').value),status=document.getElementById('staffInviteStatus');if(!email){status.className='error';status.textContent='Enter the employee email.';return;}const {data,error}=await supabaseClient.rpc('create_staff_invite',{p_email:email,p_role:role,p_department:department,p_expiry_hours:expiryHours});if(error){status.className='error';status.textContent=error.message;return;}const link=`${window.location.origin}/staff-signup.html?invite=${encodeURIComponent(data)}`;document.getElementById('generatedInviteLink').value=link;document.getElementById('generatedInviteBox').classList.remove('hidden');status.className='success';status.textContent='Registration link created successfully.';});document.getElementById('copyInviteLinkBtn')?.addEventListener('click',async()=>{const input=document.getElementById('generatedInviteLink');try{await navigator.clipboard.writeText(input.value);document.getElementById('staffInviteStatus').textContent='Registration link copied.';}catch{input.select();document.execCommand('copy');}});document.getElementById('referenceSearchBtn')?.addEventListener('click',findCustomerReferences);document.getElementById('referenceSearchInput')?.addEventListener('keydown',e=>{if(e.key==='Enter')findCustomerReferences();});async function findCustomerReferences(){const query=document.getElementById('referenceSearchInput').value.trim(),box=document.getElementById('referenceSearchResults');if(query.length<3){box.innerHTML='<p>Enter at least three characters.</p>';return;}box.innerHTML='<p>Searching…</p>';const {data,error}=await supabaseClient.rpc('admin_find_customer_references',{p_query:query});if(error){box.innerHTML=`<p class="error">${esc(error.message)}</p>`;return;}box.innerHTML=(data||[]).map(i=>`<article class="reference-result-card"><strong>${esc(i.reference)}</strong><p>${esc(i.full_name)} · ${esc(i.phone)} · ${esc(i.email||'')}</p><p>${esc(i.record_type)} — ${esc(i.service_or_office)} — ${esc(i.status)}</p><div class="reference-result-actions"><button onclick="copyCustomerReference('${esc(i.reference)}')">Copy Reference</button><a class="btn btn-whatsapp" target="_blank" rel="noopener" href="https://wa.me/${String(i.phone||'').replace(/\D/g,'').replace(/^0/,'255')}?text=${encodeURIComponent('Your NEBRIN tracking reference is: '+i.reference)}">Send WhatsApp</a>${i.email?`<a class="btn btn-email" href="mailto:${encodeURIComponent(i.email)}?subject=${encodeURIComponent('Your NEBRIN Tracking Reference')}&body=${encodeURIComponent('Your NEBRIN tracking reference is: '+i.reference)}">Send Email</a>`:''}</div></article>`).join('')||'<p>No matching customer records found.</p>';}window.copyCustomerReference=async r=>{await navigator.clipboard.writeText(r);alert('Reference copied: '+r);};
checkSession();
let appointments=[];
async function loadAppointments(){
 const {data,error}=await supabaseClient.from('appointments').select('*').order('appointment_date').order('appointment_time');
 if(error){console.error(error);return;}appointments=data||[];
 document.getElementById('statAppointmentPending').textContent=appointments.filter(a=>a.status==='Pending').length;
 document.getElementById('statAppointmentConfirmed').textContent=appointments.filter(a=>a.status==='Confirmed').length;
 document.getElementById('appointmentList').innerHTML=appointments.map(a=>`<article class="appointment-item"><h3>${esc(a.full_name)} — ${esc(a.office)}</h3><div class="appointment-meta"><span>${esc(a.appointment_date)}</span><span>${esc(a.appointment_time)}</span><span>${esc(a.status)}</span><span>${esc(a.phone)}</span></div><p>${esc(a.purpose)}</p><div class="actions"><button onclick="setAppointmentStatus('${a.id}','Confirmed')">Confirm</button><button onclick="setAppointmentStatus('${a.id}','Completed')">Complete</button><button class="btn-danger" onclick="setAppointmentStatus('${a.id}','Cancelled')">Cancel</button></div></article>`).join('')||'<p>No appointments yet.</p>';
}
window.setAppointmentStatus=async function(id,status){const {error}=await supabaseClient.from('appointments').update({status}).eq('id',id);if(error)alert(error.message);else loadAppointments();};
async function loadFeedbackSummary(){
 const {data,error}=await supabaseClient.from('customer_feedback').select('rating');if(error){console.error(error);return;}
 const rows=data||[];document.getElementById('statAverageRating').textContent=(rows.length?rows.reduce((s,r)=>s+Number(r.rating),0)/rows.length:0).toFixed(1);document.getElementById('statFeedbackCount').textContent=rows.length;
}
function subscribeRealtime(){
 supabaseClient.channel('nebrin-admin-live').on('postgres_changes',{event:'*',schema:'public',table:'applications'},()=>loadApplications()).on('postgres_changes',{event:'*',schema:'public',table:'appointments'},()=>loadAppointments()).on('postgres_changes',{event:'*',schema:'public',table:'customer_feedback'},()=>loadFeedbackSummary()).subscribe();
}

async function loadPaymentBillCount(){
  const {count,error}=await supabaseClient
    .from('payment_requests')
    .select('*',{count:'exact',head:true});
  if(error){console.error(error);return;}
  const el=document.getElementById('statPaymentBills');
  if(el)el.textContent=count||0;
}


/*
====================================================
        NEBRIN - HIRE EMPLOYEE
        JOB + CONTRACT + SALARY + PAYMENT
====================================================
*/

(function initNebrinHireEmployee(){

  let jobCatalog = [];

  function start(){

    const panel =
      document.getElementById('staffInvitePanel');

    if(!panel){
      console.warn(
        'NEBRIN: staffInvitePanel not found'
      );
      return;
    }

    panel.innerHTML = `
      <h2>Hire Employee</h2>

      <p>
        Create a NEBRIN staff account,
        assign job, employment, salary,
        contract and payment information.
      </p>

      <div class="service-form-grid">

        <label>
          Full Name
          <input
            id="hireFullName"
            type="text"
            placeholder="Employee full name"
            autocomplete="name"
          >
        </label>

        <label>
          Email
          <input
            id="hireEmail"
            type="email"
            placeholder="employee@example.com"
            autocomplete="email"
          >
        </label>

        <label>
          Phone Number
          <input
            id="hirePhone"
            type="tel"
            placeholder="07XXXXXXXX"
            autocomplete="tel"
          >
        </label>

        <label>
          Job Title
          <select id="hireJobTitle">
            <option value="">
              Loading jobs...
            </option>
          </select>
        </label>

        <label>
          Role
          <input
            id="hireRole"
            type="text"
            placeholder="Auto-filled from job title"
            readonly
          >
        </label>

        <label>
          Department
          <input
            id="hireDepartment"
            type="text"
            placeholder="Auto-filled from job title"
            readonly
          >
        </label>

        <label>
          Salary Grade
          <input
            id="hireSalaryGrade"
            type="text"
            placeholder="Auto-filled"
            readonly
          >
        </label>

        <label>
          Employment Type
          <select id="hireEmploymentType">
            <option value="Permanent">
              Permanent
            </option>

            <option value="Contract">
              Contract
            </option>

            <option value="Temporary">
              Temporary
            </option>

            <option value="Part Time">
              Part Time
            </option>

            <option value="Internship">
              Internship
            </option>
          </select>
        </label>

      </div>


      <div
        id="hireContractFields"
        class="service-form-grid hidden"
        style="margin-top:16px"
      >

        <label>
          Contract Start Date
          <input
            id="hireContractStartDate"
            type="date"
          >
        </label>

        <label>
          Contract End Date
          <input
            id="hireContractEndDate"
            type="date"
          >
        </label>

      </div>


      <div
        class="service-form-grid"
        style="margin-top:16px"
      >

        <label>
          Basic Salary (TZS)
          <input
            id="hireBasicSalary"
            type="number"
            min="0"
            step="1"
            placeholder="e.g. 600000"
          >
        </label>

        <label>
          Employment Status
          <select id="hireEmploymentStatus">

            <option value="Active">
              Active
            </option>

            <option value="Probation">
              Probation
            </option>

          </select>
        </label>

        <label>
          Payment Method
          <select id="hirePaymentMethod">

            <option value="">
              Choose payment method
            </option>

            <option value="BANK">
              Bank Account
            </option>

            <option value="MOBILE_MONEY">
              Mobile Money
            </option>

          </select>
        </label>

      </div>


      <div
        id="hireBankFields"
        class="service-form-grid hidden"
        style="margin-top:16px"
      >

        <label>
          Bank Name
          <input
            id="hireBankName"
            type="text"
            placeholder="e.g. CRDB"
          >
        </label>

        <label>
          Account Name
          <input
            id="hireBankAccountName"
            type="text"
            placeholder="Account holder name"
          >
        </label>

        <label>
          Account Number
          <input
            id="hireBankAccountNumber"
            type="text"
            placeholder="Bank account number"
          >
        </label>

      </div>


      <div
        id="hireMobileFields"
        class="service-form-grid hidden"
        style="margin-top:16px"
      >

        <label>
          Mobile Network
          <select id="hireMobileNetwork">

            <option value="">
              Choose network
            </option>

            <option value="M-Pesa">
              M-Pesa
            </option>

            <option value="Mixx by Yas">
              Mixx by Yas
            </option>

            <option value="Airtel Money">
              Airtel Money
            </option>

            <option value="HaloPesa">
              HaloPesa
            </option>

          </select>
        </label>

        <label>
          Mobile Account Name
          <input
            id="hireMobileAccountName"
            type="text"
            placeholder="Registered account name"
          >
        </label>

        <label>
          Mobile Number
          <input
            id="hireMobileNumber"
            type="tel"
            placeholder="07XXXXXXXX"
          >
        </label>

      </div>


      <div style="margin-top:18px">

        <label
          style="
            display:flex;
            align-items:center;
            gap:10px
          "
        >

          <input
            id="hireCertificateRequired"
            type="checkbox"
            style="width:auto"
          >

          Certificate required for this position

        </label>

        <small>
          Leave unchecked when certificates
          are not required.
        </small>

      </div>


      <div style="margin-top:20px">

        <button
          id="hireEmployeeBtn"
          class="btn btn-primary"
          type="button"
        >
          Hire Employee
        </button>

      </div>


      <p id="hireEmployeeStatus"></p>

      <div
        id="hireEmployeeResult"
        class="generated-invite-box hidden"
        style="margin-top:16px"
      ></div>
    `;


    document
      .getElementById('hirePaymentMethod')
      ?.addEventListener(
        'change',
        updatePaymentFields
      );


    document
      .getElementById('hireEmploymentType')
      ?.addEventListener(
        'change',
        updateContractFields
      );


    document
      .getElementById('hireJobTitle')
      ?.addEventListener(
        'change',
        updateJobDetails
      );


    document
      .getElementById('hireEmployeeBtn')
      ?.addEventListener(
        'click',
        hireEmployee
      );


    loadJobCatalog();

    updateContractFields();

    updatePaymentFields();
  }


  async function loadJobCatalog(){

    const jobSelect =
      document.getElementById(
        'hireJobTitle'
      );

    const status =
      document.getElementById(
        'hireEmployeeStatus'
      );

    if(!jobSelect){
      return;
    }

    try{

      const {
        data,
        error
      } = await supabaseClient
        .from('job_catalog')
        .select(
          `
          id,
          job_title,
          role,
          department,
          salary_grade,
          default_salary
          `
        )
        .eq('is_active', true)
        .order('job_title');


      if(error){
        throw error;
      }


      jobCatalog = data || [];


      jobSelect.innerHTML = `
        <option value="">
          Choose job title
        </option>
      `;


      jobCatalog.forEach(job => {

        const option =
          document.createElement(
            'option'
          );

        option.value =
          job.id;

        option.textContent =
          job.job_title;

        jobSelect.appendChild(
          option
        );
      });


    }catch(err){

      console.error(
        'NEBRIN job catalog error:',
        err
      );

      jobSelect.innerHTML = `
        <option value="">
          Unable to load jobs
        </option>
      `;

      if(status){

        status.className =
          'error';

        status.textContent =
          'Unable to load Job Catalog.';

      }
    }
  }


  function getSelectedJob(){

    const jobId =
      document
        .getElementById(
          'hireJobTitle'
        )
        ?.value;

    if(!jobId){
      return null;
    }

    return (
      jobCatalog.find(
        job => job.id === jobId
      ) || null
    );
  }


  function updateJobDetails(){

    const job =
      getSelectedJob();


    const roleInput =
      document.getElementById(
        'hireRole'
      );

    const departmentInput =
      document.getElementById(
        'hireDepartment'
      );

    const gradeInput =
      document.getElementById(
        'hireSalaryGrade'
      );

    const salaryInput =
      document.getElementById(
        'hireBasicSalary'
      );


    if(!job){

      if(roleInput){
        roleInput.value = '';
      }

      if(departmentInput){
        departmentInput.value = '';
      }

      if(gradeInput){
        gradeInput.value = '';
      }

      return;
    }


    if(roleInput){

      roleInput.value =
        job.role || '';

    }


    if(departmentInput){

      departmentInput.value =
        job.department || '';

    }


    if(gradeInput){

      gradeInput.value =
        job.salary_grade || '';

    }


    const defaultSalary =
      Number(
        job.default_salary || 0
      );


    if(
      salaryInput &&
      defaultSalary > 0
    ){

      salaryInput.value =
        String(defaultSalary);

    }
  }


  function updateContractFields(){

    const employmentType =
      document
        .getElementById(
          'hireEmploymentType'
        )
        ?.value;


    const contractFields =
      document.getElementById(
        'hireContractFields'
      );


    contractFields
      ?.classList
      .toggle(
        'hidden',
        employmentType !== 'Contract'
      );
  }


  function updatePaymentFields(){

    const method =
      document
        .getElementById(
          'hirePaymentMethod'
        )
        ?.value;


    const bankFields =
      document.getElementById(
        'hireBankFields'
      );


    const mobileFields =
      document.getElementById(
        'hireMobileFields'
      );


    bankFields
      ?.classList
      .toggle(
        'hidden',
        method !== 'BANK'
      );


    mobileFields
      ?.classList
      .toggle(
        'hidden',
        method !== 'MOBILE_MONEY'
      );
  }


  function value(id){

    return (
      document
        .getElementById(id)
        ?.value || ''
    ).trim();
  }


  async function hireEmployee(){

    const fullName =
      value('hireFullName');


    const email =
      value('hireEmail')
        .toLowerCase();


    const phone =
      value('hirePhone');


    const job =
      getSelectedJob();


    const jobCatalogId =
      job?.id || null;


    const jobTitle =
      job?.job_title || '';


    const role =
      job?.role || '';


    const department =
      job?.department || '';


    const salaryGrade =
      job?.salary_grade || null;


    const employmentType =
      value(
        'hireEmploymentType'
      ) || 'Permanent';


    const contractStartDate =
      value(
        'hireContractStartDate'
      );


    const contractEndDate =
      value(
        'hireContractEndDate'
      );


    const employmentStatus =
      value(
        'hireEmploymentStatus'
      ) || 'Active';


    const basicSalary =
      Number(
        value(
          'hireBasicSalary'
        ) || 0
      );


    const paymentMethod =
      value(
        'hirePaymentMethod'
      );


    const certificateRequired =
      document
        .getElementById(
          'hireCertificateRequired'
        )
        ?.checked === true;


    const bankName =
      value(
        'hireBankName'
      );


    const bankAccountName =
      value(
        'hireBankAccountName'
      );


    const bankAccountNumber =
      value(
        'hireBankAccountNumber'
      );


    const mobileNetwork =
      value(
        'hireMobileNetwork'
      );


    const mobileAccountName =
      value(
        'hireMobileAccountName'
      );


    const mobileNumber =
      value(
        'hireMobileNumber'
      );


    const status =
      document.getElementById(
        'hireEmployeeStatus'
      );


    const result =
      document.getElementById(
        'hireEmployeeResult'
      );


    const button =
      document.getElementById(
        'hireEmployeeBtn'
      );


    if(
      !fullName ||
      !email ||
      !job ||
      !jobTitle ||
      !role ||
      !department
    ){

      status.className =
        'error';

      status.textContent =
        'Full name, email and job title are required.';

      return;
    }


    if(
      employmentType === 'Contract'
    ){

      if(
        !contractStartDate ||
        !contractEndDate
      ){

        status.className =
          'error';

        status.textContent =
          'Contract start date and end date are required.';

        return;
      }


      if(
        new Date(
          contractEndDate
        ) <=
        new Date(
          contractStartDate
        )
      ){

        status.className =
          'error';

        status.textContent =
          'Contract end date must be after contract start date.';

        return;
      }
    }


    if(
      !Number.isFinite(
        basicSalary
      ) ||
      basicSalary < 0
    ){

      status.className =
        'error';

      status.textContent =
        'Enter a valid basic salary.';

      return;
    }


    if(!paymentMethod){

      status.className =
        'error';

      status.textContent =
        'Choose employee payment method.';

      return;
    }


    if(
      paymentMethod === 'BANK' &&
      (
        !bankName ||
        !bankAccountName ||
        !bankAccountNumber
      )
    ){

      status.className =
        'error';

      status.textContent =
        'Complete the employee bank account details.';

      return;
    }


    if(
      paymentMethod ===
      'MOBILE_MONEY' &&
      (
        !mobileNetwork ||
        !mobileAccountName ||
        !mobileNumber
      )
    ){

      status.className =
        'error';

      status.textContent =
        'Complete the employee mobile money details.';

      return;
    }


    try{

      button.disabled =
        true;


      status.className =
        '';


      status.textContent =
        'Creating NEBRIN employee account...';


      result
        ?.classList
        .add('hidden');


      const payload = {

        full_name:
          fullName,

        email,

        phone:
          phone || null,


        job_catalog_id:
          jobCatalogId,

        job_title:
          jobTitle,

        role,

        department,

        salary_grade:
          salaryGrade,


        employment_type:
          employmentType,

        employment_status:
          employmentStatus,


        contract_start_date:
          employmentType ===
          'Contract'
            ? contractStartDate
            : null,

        contract_end_date:
          employmentType ===
          'Contract'
            ? contractEndDate
            : null,


        basic_salary:
          basicSalary,

        currency:
          'TZS',


        payment_method:
          paymentMethod,


        bank_name:
          paymentMethod === 'BANK'
            ? bankName
            : null,

        bank_account_name:
          paymentMethod === 'BANK'
            ? bankAccountName
            : null,

        bank_account_number:
          paymentMethod === 'BANK'
            ? bankAccountNumber
            : null,


        mobile_network:
          paymentMethod ===
          'MOBILE_MONEY'
            ? mobileNetwork
            : null,

        mobile_account_name:
          paymentMethod ===
          'MOBILE_MONEY'
            ? mobileAccountName
            : null,

        mobile_number:
          paymentMethod ===
          'MOBILE_MONEY'
            ? mobileNumber
            : null,


        certificate_required:
          certificateRequired
      };


      const {
        data,
        error
      } =
        await supabaseClient
          .functions
          .invoke(
            'hire-employee',
            {
              body: payload
            }
          );


      if(error){
        throw error;
      }


      if(!data?.success){

        throw new Error(
          data?.error ||
          'Employee could not be hired.'
        );
      }


      status.className =
        'success';


      status.textContent =
        'Employee hired successfully.';


      if(result){

        result.innerHTML =
          '';


        const title =
          document.createElement(
            'strong'
          );


        title.textContent =
          '🎉 NEBRIN Employment Successful';


        result.appendChild(
          title
        );


        const employeeText =
          document.createElement(
            'p'
          );


        employeeText.textContent =
          fullName +
          ' has been successfully added to the NEBRIN staff system.';


        result.appendChild(
          employeeText
        );


        const jobText =
          document.createElement(
            'p'
          );


        jobText.textContent =
          'Job Title: ' +
          jobTitle;


        result.appendChild(
          jobText
        );


        const roleText =
          document.createElement(
            'p'
          );


        roleText.textContent =
          'Role: ' +
          role;


        result.appendChild(
          roleText
        );


        const departmentText =
          document.createElement(
            'p'
          );


        departmentText.textContent =
          'Department: ' +
          department;


        result.appendChild(
          departmentText
        );


        const salaryText =
          document.createElement(
            'p'
          );


        salaryText.textContent =
          'Basic Salary: TZS ' +
          basicSalary.toLocaleString();


        result.appendChild(
          salaryText
        );


        if(
          employmentType ===
          'Contract'
        ){

          const contractText =
            document.createElement(
              'p'
            );


          contractText.textContent =
            'Contract: ' +
            contractStartDate +
            ' to ' +
            contractEndDate;


          result.appendChild(
            contractText
          );
        }


        const temporaryPin =
          data
            ?.onboarding
            ?.temporary_pin;


        if(temporaryPin){

          const pinText =
            document.createElement(
              'p'
            );


          pinText.textContent =
            'Temporary PIN: ' +
            temporaryPin;


          result.appendChild(
            pinText
          );


          const warning =
            document.createElement(
              'p'
            );


          warning.textContent =
            'The employee must create a private PIN during first login.';


          result.appendChild(
            warning
          );
        }


        result
          .classList
          .remove(
            'hidden'
          );
      }


    }catch(err){

      console.error(
        'NEBRIN hire employee error:',
        err
      );


      status.className =
        'error';


      status.textContent =
        err?.message ||
        'Employee hiring failed. Please try again.';


    }finally{

      button.disabled =
        false;

    }
  }


  if(
    document.readyState ===
    'loading'
  ){

    document.addEventListener(
      'DOMContentLoaded',
      start
    );

  }else{

    start();

  }

})();