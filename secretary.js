
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

async function init(){if(!await getProfile(['CEO','Super Admin','Manager','Secretary','Customer Care'],'secretary'))return;await Promise.all([loadBookings(),loadRecruitment()]);}
async function loadBookings(){const today=new Date().toISOString().slice(0,10);const {data,error}=await supabaseClient.from('appointments').select('*').order('appointment_date');if(error){document.getElementById('secretaryAppointments').textContent=error.message;return;}const rows=data||[];document.getElementById('secretaryBookings').textContent=rows.filter(r=>r.appointment_date===today).length;document.getElementById('secretaryWaiting').textContent=rows.filter(r=>r.status==='Pending').length;document.getElementById('secretaryAppointments').innerHTML=rows.map(r=>`<div class="reference-result-card"><strong>${esc(r.reference)} — ${esc(r.full_name)}</strong><p>${esc(r.office)} · ${esc(r.appointment_date)} ${esc(r.appointment_time)} · ${esc(r.status)}</p><div class="reference-result-actions"><button onclick="booking('${r.id}','Confirmed')">Confirm</button><button onclick="booking('${r.id}','Completed')">Complete</button></div></div>`).join('')||'<p>No appointments.</p>';}
window.booking=async(id,status)=>{const {error}=await supabaseClient.from('appointments').update({status}).eq('id',id);if(error)alert(error.message);else loadBookings();};
async function loadRecruitment(){const {data,error}=await supabaseClient.from('recruitment_applications').select('*').order('created_at',{ascending:false});if(error){document.getElementById('secretaryApplications').textContent=error.message;return;}const rows=data||[];document.getElementById('secretaryRecruitment').textContent=rows.length;document.getElementById('secretaryRouted').textContent=rows.filter(r=>r.workflow_status!=='Submitted to Secretary').length;document.getElementById('secretaryApplications').innerHTML=rows.map(r=>`<div class="reference-result-card"><strong>${esc(r.reference)} — ${esc(r.full_name)}</strong><p>${esc(r.position_applied)} · ${esc(r.workflow_status)}</p>${r.workflow_status==='Submitted to Secretary'?`<button onclick="sendHR('${r.id}')">Send to HR</button>`:''}</div>`).join('')||'<p>No recruitment applications.</p>';}
window.sendHR=async id=>{const {error}=await supabaseClient.rpc('advance_recruitment_workflow',{p_application_id:id,p_new_status:'Sent to HR',p_note:''});if(error)alert(error.message);else loadRecruitment();};init();
