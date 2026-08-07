
/* V27 Final: dynamic departments/roles + HOD control */
(async()=>{
 try{
  const {data:deps}=await supabaseClient.from('departments').select('*').eq('is_active',true).order('name');
  const select=document.getElementById('inviteDepartment');
  if(select&&deps?.length)select.innerHTML=deps.map(d=>`<option value="${d.name}">${d.name}</option>`).join('');
  const roles=['Manager','Secretary','Customer Care','HR','Accountant','Finance Officer','Business Officer','Legal Officer','Registration Officer','Sales Field Manager','Field Supervisor','Team Leader','Lipa Agent','SIM Registration Agent','Graphic Designer','Printing Officer','IT Officer','System Administrator','Registry Officer','Records Officer','Security Officer','Staff'];
  const rs=document.getElementById('inviteRole');if(rs)rs.innerHTML=roles.map(r=>`<option>${r}</option>`).join('');
  const panel=document.getElementById('staffManagementPanel');
  if(panel&&!document.getElementById('hodManagementBox')){
    const div=document.createElement('div');div.id='hodManagementBox';div.innerHTML='<h3>Department Heads (HOD)</h3><p>Assign one active HOD per department. HOD controls department work, staff assignments, correspondence and operational monitoring.</p><div id="hodAdminList"></div>';panel.appendChild(div);loadHods();
  }
 }catch(e){console.warn(e)}
})();
async function loadHods(){const box=document.getElementById('hodAdminList');if(!box)return;const {data}=await supabaseClient.from('department_leadership_view').select('*').order('department_name');box.innerHTML=(data||[]).map(x=>`<div class="reference-result-card"><strong>${x.department_name}</strong><p>HOD: ${x.hod_name||'Not assigned'} · Deputy: ${x.deputy_name||'Not assigned'}</p></div>`).join('')||'<p>No departments.</p>'}
