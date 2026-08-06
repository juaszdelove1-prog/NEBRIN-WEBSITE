
const access=document.getElementById('roleAccess'),workspace=document.getElementById('roleWorkspace');let profile=null;
function esc(v=''){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
async function getProfile(roles,page){
 const {data:{user}}=await supabaseClient.auth.getUser();
 if(!user){access.innerHTML='Please <a href="admin.html">sign in</a> first.';return null;}
 const {data:p,error}=await supabaseClient.from('admin_users').select('*').eq('user_id',user.id).single();
 if(error||!p||p.approval_status!=='Approved'||!p.is_active||!roles.includes(p.role)){access.textContent='Approved role access is required.';return null;}
 profile=p;access.classList.add('hidden');workspace.classList.remove('hidden');
 await supabaseClient.rpc('record_staff_login',{p_page:page});return p;
}
function card(row,buttons=''){return `<div class="reference-result-card"><strong>${esc(row.reference||'')} — ${esc(row.service||row.full_name||'')}</strong><p>${esc(row.full_name||'')} · ${esc(row.phone||'')} · ${esc(row.status||'')}</p><div class="reference-result-actions">${buttons}</div></div>`;}

const terms=["Information Technology", "Digital Services", "Website", "Software", "E-commerce"];
async function init(){if(!await getProfile(["CEO", "Super Admin", "Manager", "IT", "Information Technology", "Digital Staff"],'it'))return;await loadJobs();}
async function loadJobs(){const {data,error}=await supabaseClient.from('applications').select('*').is('deleted_at',null).order('created_at',{ascending:false});if(error){document.getElementById('itJobs').textContent=error.message;return;}const rows=(data||[]).filter(r=>r.assigned_to===profile.user_id||terms.some(t=>String(r.department||r.service||'').toLowerCase().includes(t.toLowerCase())));document.getElementById('itAssigned').textContent=rows.length;document.getElementById('itProcessing').textContent=rows.filter(r=>r.status==='Processing').length;document.getElementById('itBlocked').textContent=rows.filter(r=>['Review','Awaiting Review','Blocked'].includes(r.status)).length;document.getElementById('itCompleted').textContent=rows.filter(r=>r.status==='Completed').length;document.getElementById('itJobs').innerHTML=rows.map(r=>card(r,`<button onclick="setStatus('${r.id}','Processing')">Start</button><button onclick="setStatus('${r.id}','Awaiting Review')">Send Review</button><button onclick="setStatus('${r.id}','Completed')">Complete</button><button onclick="note('${r.id}')">Note</button>`)).join('')||'<p>No assigned jobs.</p>';}
window.setStatus=async(id,status)=>{const payload={status};if(status==='Completed')payload.completed_at=new Date().toISOString();const {error}=await supabaseClient.from('applications').update(payload).eq('id',id);if(error)alert(error.message);else loadJobs();};
window.note=async id=>{const note=prompt('Internal note:');if(note===null)return;const {error}=await supabaseClient.from('applications').update({admin_note:note}).eq('id',id);if(error)alert(error.message);else loadJobs();};init();
