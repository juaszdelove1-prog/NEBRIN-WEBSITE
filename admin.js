const loginPanel=document.getElementById('loginPanel'),dashboardPanel=document.getElementById('dashboardPanel'),resetPanel=document.getElementById('resetPanel');
const body=document.getElementById('applicationsBody'),mobileBox=document.getElementById('mobileApplications');let applications=[];
async function checkSession(){const {data}=await supabaseClient.auth.getSession();if(data.session)showDashboard();}
async function showDashboard(){loginPanel.classList.add('hidden');resetPanel.classList.add('hidden');dashboardPanel.classList.remove('hidden');await loadApplications();}
document.getElementById('loginBtn').addEventListener('click',async()=>{const email=document.getElementById('loginEmail').value.trim(),password=document.getElementById('loginPassword').value,status=document.getElementById('loginStatus');status.textContent='Signing in…';const {error}=await supabaseClient.auth.signInWithPassword({email,password});if(error){status.className='error';status.textContent=error.message;return;}await showDashboard();});
document.getElementById('logoutBtn').addEventListener('click',async()=>{await supabaseClient.auth.signOut();location.reload();});
document.getElementById('refreshBtn').addEventListener('click',loadApplications);
document.getElementById('searchBox').addEventListener('input',render);
document.getElementById('statusFilter').addEventListener('change',render);
document.getElementById('forgotPassword').addEventListener('click',()=>{loginPanel.classList.add('hidden');resetPanel.classList.remove('hidden');});
document.getElementById('backToLogin').addEventListener('click',()=>{resetPanel.classList.add('hidden');loginPanel.classList.remove('hidden');});
document.getElementById('sendResetBtn').addEventListener('click',async()=>{const email=document.getElementById('resetEmail').value.trim(),status=document.getElementById('resetStatus');if(!email){status.className='error';status.textContent='Enter your email.';return;}const {error}=await supabaseClient.auth.resetPasswordForEmail(email,{redirectTo:`${window.location.origin}/admin.html`});if(error){status.className='error';status.textContent=error.message;return;}status.className='success';status.textContent='Password reset email sent.';});
async function loadApplications(){const status=document.getElementById('dashboardStatus');status.textContent='Loading…';const {data,error}=await supabaseClient.from('applications').select('*').order('created_at',{ascending:false});if(error){status.className='error';status.textContent=error.message;return;}applications=data||[];status.textContent=`${applications.length} application(s)`;updateStats();render();}
function updateStats(){document.getElementById('statTotal').textContent=applications.length;document.getElementById('statNew').textContent=applications.filter(a=>a.status==='New').length;document.getElementById('statProcessing').textContent=applications.filter(a=>a.status==='Processing').length;document.getElementById('statCompleted').textContent=applications.filter(a=>a.status==='Completed').length;}
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
<td>${esc(a.service)}${a.quoted_amount ? `<div class="fee-label">TZS ${Number(a.quoted_amount).toLocaleString()}</div>` : ''}</td>
<td>${esc(a.message||'')}${a.admin_note ? `<div class="admin-note"><strong>Internal note:</strong> ${esc(a.admin_note)}</div>` : ''}${documentsHtml(a)}</td>
<td><span class="badge">${esc(a.status)}</span></td>
<td class="actions">
<button onclick="setStatus('${a.id}','Processing')">Processing</button>
<button onclick="setStatus('${a.id}','Completed')">Complete</button>
<button onclick="setStatus('${a.id}','Rejected')">Reject</button>
<button onclick="setFee('${a.id}', '${a.quoted_amount ?? ''}')">Set Fee</button>
<button onclick="setNote('${a.id}', ${JSON.stringify(a.admin_note || '')})">Add Note</button>
</td></tr>`).join('');

mobileBox.innerHTML=r.map(a=>`<article class="mobile-app-card">
<h3>${esc(a.service)}</h3><p><strong>${esc(a.reference)}</strong></p>
<p>${esc(a.full_name)} · ${esc(a.phone)}</p>
${a.quoted_amount ? `<p class="fee-label">TZS ${Number(a.quoted_amount).toLocaleString()}</p>` : ''}
<p><span class="badge">${esc(a.status)}</span></p>
${a.admin_note ? `<div class="admin-note"><strong>Internal note:</strong> ${esc(a.admin_note)}</div>` : ''}
${documentsHtml(a)}
<div class="card-actions">
<button onclick="setStatus('${a.id}','Processing')">Processing</button>
<button onclick="setStatus('${a.id}','Completed')">Complete</button>
<button onclick="setStatus('${a.id}','Rejected')">Reject</button>
<button onclick="setFee('${a.id}', '${a.quoted_amount ?? ''}')">Set Fee</button>
<button onclick="setNote('${a.id}', ${JSON.stringify(a.admin_note || '')})">Add Note</button>
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

checkSession();