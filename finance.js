
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

async function init(){if(!await getProfile(['CEO','Super Admin','Manager','Accountant','Finance'],'finance'))return;await Promise.all([loadApps(),loadMethods()]);}
async function loadApps(){const {data,error}=await supabaseClient.from('applications').select('*').is('deleted_at',null).order('created_at',{ascending:false});if(error){document.getElementById('financeApplications').textContent=error.message;return;}const rows=data||[];document.getElementById('financePending').textContent=rows.filter(r=>!r.payment_status||r.payment_status==='Pending').length;document.getElementById('financeSubmitted').textContent=rows.filter(r=>r.payment_status==='Submitted').length;document.getElementById('financeConfirmed').textContent=rows.filter(r=>r.payment_status==='Confirmed').length;document.getElementById('financeRevenue').textContent='TZS '+rows.filter(r=>r.payment_status==='Confirmed').reduce((s,r)=>s+Number(r.quoted_amount||0),0).toLocaleString();document.getElementById('financeApplications').innerHTML=rows.filter(r=>r.quoted_amount||r.payment_status).map(r=>card(r,`<button onclick="setPay('${r.id}','Confirmed')">Confirm</button><button onclick="setPay('${r.id}','Rejected')">Reject</button><button onclick="setFee('${r.id}',${Number(r.quoted_amount||0)})">Set Fee</button>`)).join('')||'<p>No payment applications.</p>';}
window.setPay=async(id,status)=>{const {error}=await supabaseClient.from('applications').update({payment_status:status}).eq('id',id);if(error)alert(error.message);else loadApps();};
window.setFee=async(id,current)=>{const fee=Number(prompt('Service fee (TZS):',current||''));if(!fee)return;const {error}=await supabaseClient.from('applications').update({quoted_amount:fee}).eq('id',id);if(error)alert(error.message);else loadApps();};
async function loadMethods(){const {data,error}=await supabaseClient.from('payment_methods').select('*').order('display_order');document.getElementById('financeMethods').innerHTML=error?esc(error.message):(data||[]).map(m=>`<div class="online-row"><strong>${esc(m.method_name)}</strong><span>${esc(m.account_number)} · ${esc(m.account_name)}</span></div>`).join('');}init();
