let currentProfile=null;
const accessBox=document.getElementById('attendanceAccess');
const workspace=document.getElementById('attendanceWorkspace');
function esc(v=''){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function fmt(value){return value?new Date(value).toLocaleString(): '—';}
async function initAttendance(){
 const {data:{user}}=await supabaseClient.auth.getUser();
 if(!user){accessBox.innerHTML='Please <a href="admin.html">log in</a> first.';return;}
 const {data,error}=await supabaseClient.from('admin_users').select('*').eq('user_id',user.id).single();
 if(error||!data||data.approval_status!=='Approved'||!data.is_active){accessBox.textContent='Approved staff access is required.';return;}
 currentProfile=data; accessBox.classList.add('hidden');workspace.classList.remove('hidden');
 document.getElementById('welcomeStaff').textContent=`Welcome, ${data.full_name}`;
 if(['CEO','Super Admin'].includes(data.role))document.getElementById('ceoLink').classList.remove('hidden');
 await supabaseClient.rpc('record_staff_login',{p_page:'attendance'});
 await Promise.all([loadToday(),loadHistory()]);
}
async function loadToday(){
 const {data,error}=await supabaseClient.rpc('get_my_attendance_today');
 if(error){document.getElementById('attendanceStatus').textContent=error.message;return;}
 const row=Array.isArray(data)?data[0]:data;
 const schedule=row?.scheduled_start||'08:00';
 document.getElementById('todaySchedule').innerHTML=`<strong>Official start: ${esc(schedule)}</strong><span>Grace period: ${esc(row?.grace_minutes??15)} minutes</span>`;
 document.getElementById('todayAttendance').innerHTML=row?.attendance_id?`<div class="attendance-summary"><span class="attendance-badge ${String(row.status).toLowerCase().replaceAll(' ','-')}">${esc(row.status)}</span><p><strong>Check-in:</strong> ${fmt(row.check_in_at)}</p><p><strong>Check-out:</strong> ${fmt(row.check_out_at)}</p></div>`:'<div class="attendance-summary"><span class="attendance-badge not-checked-in">Not checked in</span></div>';
 document.getElementById('checkInBtn').disabled=Boolean(row?.check_in_at);
 document.getElementById('checkOutBtn').disabled=!row?.check_in_at||Boolean(row?.check_out_at);
}
async function loadHistory(){
 const {data,error}=await supabaseClient.from('staff_attendance').select('*').eq('user_id',currentProfile.user_id).order('work_date',{ascending:false}).limit(14);
 const box=document.getElementById('myAttendanceHistory');
 if(error){box.textContent=error.message;return;}
 box.innerHTML=(data||[]).map(r=>`<div class="attendance-row"><strong>${esc(r.work_date)}</strong><span class="attendance-badge ${String(r.status).toLowerCase().replaceAll(' ','-')}">${esc(r.status)}</span><span>${r.check_in_at?new Date(r.check_in_at).toLocaleTimeString():'—'} → ${r.check_out_at?new Date(r.check_out_at).toLocaleTimeString():'—'}</span></div>`).join('')||'<p>No attendance records yet.</p>';
}
async function mark(action){
 const button=document.getElementById(action==='in'?'checkInBtn':'checkOutBtn');button.disabled=true;
 const {error}=await supabaseClient.rpc(action==='in'?'staff_check_in':'staff_check_out',{p_source:'Web Log Book'});
 document.getElementById('attendanceStatus').textContent=error?error.message:(action==='in'?'Check-in recorded.':'Check-out recorded.');
 await Promise.all([loadToday(),loadHistory()]);
}
document.getElementById('checkInBtn').addEventListener('click',()=>mark('in'));
document.getElementById('checkOutBtn').addEventListener('click',()=>mark('out'));
initAttendance();