
/* NEBRIN V27 Final shared department engine */
window.NEBRIN=window.NEBRIN||{};
NEBRIN.esc=(v='')=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
NEBRIN.fmt=v=>v?new Date(v).toLocaleString():'—';
NEBRIN.money=v=>'TZS '+Number(v||0).toLocaleString();
NEBRIN.profile=null; NEBRIN.department=null; NEBRIN.leadership=null;

NEBRIN.auth=async function(expectedCodes=[]){
 const {data:{user}}=await supabaseClient.auth.getUser();
 const access=document.getElementById('nebAccess');
 if(!user){if(access)access.innerHTML='Please <a href="admin.html">sign in</a> first.';return false}
 const {data:p,error}=await supabaseClient.from('admin_users').select('*').eq('user_id',user.id).maybeSingle();
 if(error||!p||p.approval_status!=='Approved'||!p.is_active){if(access)access.textContent='Approved active staff access is required.';return false}
 NEBRIN.profile=p;
 let d = null;

if (expectedCodes && expectedCodes.length) {
  const r = await supabaseClient
    .from('departments')
    .select('*')
    .in('code', expectedCodes)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  d = r.data || null;
}

if (!d && p.department_id) {
  const r = await supabaseClient
    .from('departments')
    .select('*')
    .eq('id', p.department_id)
    .maybeSingle();

  d = r.data || null;
}

if (!d && p.department) {
  const r = await supabaseClient
    .from('departments')
    .select('*')
    .ilike('name', p.department)
    .maybeSingle();

  d = r.data || null;
}

NEBRIN.department = d || null;
 const management=['CEO','Super Admin','Manager'].includes(p.role);
 if(expectedCodes.length&&!management&&(!d||!expectedCodes.includes(d.code))){
   if(access)access.textContent='You do not have access to this department.';return false;
 }
 if(access)access.classList.add('hidden');
 document.getElementById('nebWorkspace')?.classList.remove('hidden');
 try{await supabaseClient.rpc('record_staff_login',{p_page:location.pathname.split('/').pop()||'department'})}catch{}
 await NEBRIN.loadLeadership();
 await Promise.all([NEBRIN.loadMyAttendance(),NEBRIN.loadSharedWork(),NEBRIN.loadSharedCorrespondence(),NEBRIN.loadOfficeCalls(),NEBRIN.loadNotifications()]);
 if(NEBRIN.isHod()) await NEBRIN.loadDepartmentStaff();
 return true;
};

NEBRIN.isManagement=()=>['CEO','Super Admin','Manager'].includes(NEBRIN.profile?.role);
NEBRIN.isHod=()=>NEBRIN.leadership?.hod_user_id===NEBRIN.profile?.user_id||NEBRIN.leadership?.deputy_user_id===NEBRIN.profile?.user_id||NEBRIN.isManagement();

NEBRIN.loadLeadership=async()=>{
 if(!NEBRIN.department)return;
 const {data}=await supabaseClient.from('department_leadership').select('*').eq('department_id',NEBRIN.department.id).eq('is_active',true).maybeSingle();
 NEBRIN.leadership=data||null;
 const label=document.getElementById('nebLeadershipLabel');
 if(label)label.textContent=NEBRIN.isHod()?'Department Control Access':'Department Staff Access';
 document.querySelectorAll('[data-hod-only]').forEach(el=>el.classList.toggle('neb-hidden',!NEBRIN.isHod()));
};

NEBRIN.loadMyAttendance=async()=>{
 const box=document.getElementById('nebMyAttendance'); if(!box)return;
 const {data,error}=await supabaseClient.rpc('get_my_attendance_today');
 if(error){box.textContent=error.message;return}
 const r=Array.isArray(data)?data[0]:data;
 const {data:b}=await supabaseClient.rpc('get_my_current_break');
 const br=Array.isArray(b)?b[0]:b;
 let status=br?.break_id?'On Break':(r?.check_out_at?'Checked Out':(r?.check_in_at?(r.status||'Working'):'Not Checked In'));
 box.innerHTML=`<div class="neb-row"><div class="neb-row-head"><div><strong>${NEBRIN.esc(status)}</strong><p>${r?.check_in_at?'Check-in '+NEBRIN.fmt(r.check_in_at):'You have not checked in today.'}</p></div><span class="neb-tag">${NEBRIN.esc(NEBRIN.profile?.current_work_status||status)}</span></div>
 <div class="neb-actions"><a class="btn btn-secondary-admin" href="attendance.html">Open Attendance</a>${br?.break_id?'<button class="btn btn-primary" onclick="NEBRIN.endBreak()">Return from Break</button>':'<button class="btn btn-secondary-admin" onclick="NEBRIN.startBreak()">Start Break</button>'}</div></div>`;
};
NEBRIN.startBreak=async()=>{const type=prompt('Break type','Tea Break');if(!type)return;const {error}=await supabaseClient.rpc('start_staff_break',{p_break_type:type});if(error)alert(error.message);else{await NEBRIN.loadMyAttendance();NEBRIN.showLounge(true)}};
NEBRIN.endBreak=async()=>{const {error}=await supabaseClient.rpc('end_staff_break');if(error)alert(error.message);else{await NEBRIN.loadMyAttendance();NEBRIN.showLounge(false)}};

NEBRIN.loadSharedWork=async()=>{
 const box=document.getElementById('nebWorkQueue');if(!box||!NEBRIN.department)return;
 const {data,error}=await supabaseClient.from('department_work_items').select('*').eq('department_id',NEBRIN.department.id).order('created_at',{ascending:false}).limit(100);
 if(error){box.textContent=error.message;return}
 const rows=data||[];
 document.getElementById('nebWorkOpen')&&(document.getElementById('nebWorkOpen').textContent=rows.filter(x=>!['Completed','Closed','Cancelled'].includes(x.status)).length);
 document.getElementById('nebWorkUrgent')&&(document.getElementById('nebWorkUrgent').textContent=rows.filter(x=>['Urgent','Emergency'].includes(x.priority)&&!['Completed','Closed'].includes(x.status)).length);
 box.innerHTML=rows.map(x=>`<div class="neb-row"><div class="neb-row-head"><div><strong>${NEBRIN.esc(x.reference)} — ${NEBRIN.esc(x.title)}</strong><p>${NEBRIN.esc(x.work_type)} · ${NEBRIN.esc(x.status)} · ${NEBRIN.esc(x.priority)}</p></div><span class="neb-tag ${x.priority==='Emergency'?'red':x.priority==='Urgent'?'orange':''}">${NEBRIN.esc(x.priority)}</span></div><div class="neb-actions">${NEBRIN.isHod()?`<button onclick="NEBRIN.assignWork('${x.id}')">Assign</button>`:''}<button onclick="NEBRIN.progressWork('${x.id}')">Update</button></div></div>`).join('')||'<p>No department work items yet.</p>';
};
NEBRIN.createWork=async()=>{
 if(!NEBRIN.department)return;
 const title=prompt('Work title / subject:'); if(!title)return;
 const type=prompt('Work type:','Department Task')||'Department Task';
 const priority=prompt('Priority: Normal, Important, Urgent, Emergency','Normal')||'Normal';
 const {data,error}=await supabaseClient.rpc('create_department_work',{p_department_id:NEBRIN.department.id,p_title:title,p_work_type:type,p_priority:priority,p_description:''});
 if(error)alert(error.message);else{alert('Created '+data);NEBRIN.loadSharedWork()}
};
NEBRIN.assignWork=async id=>{
 if(!NEBRIN.isHod())return;
 const {data:staff,error}=await supabaseClient.from('admin_users').select('user_id,full_name,role').eq('approval_status','Approved').eq('is_active',true).ilike('department',NEBRIN.department.name).order('full_name');
 if(error){alert(error.message);return}
 const choices=(staff||[]).map((s,i)=>`${i+1}. ${s.full_name} — ${s.role}`).join('\n');
 const n=Number(prompt('Choose employee number:\n'+choices)); if(!n||!staff[n-1])return;
 const {error:e}=await supabaseClient.rpc('assign_department_work',{p_work_id:id,p_assignee:staff[n-1].user_id});
 if(e)alert(e.message);else NEBRIN.loadSharedWork();
};
NEBRIN.progressWork=async id=>{
 const status=prompt('New status: New, Assigned, In Progress, Awaiting Review, Waiting External, Completed, Closed','In Progress');if(!status)return;
 const note=prompt('Progress note:','')||'';
 const {error}=await supabaseClient.rpc('update_department_work',{p_work_id:id,p_status:status,p_note:note});
 if(error)alert(error.message);else NEBRIN.loadSharedWork();
};

NEBRIN.loadSharedCorrespondence=async()=>{
 const box=document.getElementById('nebCorrespondence');if(!box)return;
 const {data,error}=await supabaseClient.rpc('staff_correspondence_trays');
 if(error){box.textContent=error.message;return}
 const rows=data||[];
 box.innerHTML=rows.slice(0,20).map(x=>`<div class="neb-row"><strong>${NEBRIN.esc(x.file_number)} — ${NEBRIN.esc(x.subject)}</strong><p>${NEBRIN.esc(x.direction)} · ${NEBRIN.esc(x.priority)} · ${NEBRIN.esc(x.status)}</p></div>`).join('')||'<p>No correspondence for this department.</p>';
};
NEBRIN.composeCorrespondence=async()=>{
 const {data:ds,error}=await supabaseClient.from('departments').select('id,name').eq('is_active',true).order('name');if(error){alert(error.message);return}
 const list=(ds||[]).map((d,i)=>`${i+1}. ${d.name}`).join('\n'); const n=Number(prompt('To Department:\n'+list)); if(!n||!ds[n-1])return;
 const subject=prompt('Subject:');if(!subject)return;const msg=prompt('Message / instructions:','')||'';
 const priority=prompt('Priority','Normal')||'Normal';const classification=prompt('Classification','Normal')||'Normal';
 const {data,error:e}=await supabaseClient.rpc('create_electronic_file',{p_to_department_id:ds[n-1].id,p_subject:subject,p_message:msg,p_priority:priority,p_classification:classification});
 if(e)alert(e.message);else{alert('Electronic file sent: '+data);NEBRIN.loadSharedCorrespondence()}
};

NEBRIN.loadOfficeCalls=async()=>{
 const box=document.getElementById('nebOfficeCalls');if(!box)return;
 const {data,error}=await supabaseClient.from('internal_office_messages').select('*').eq('message_type','Office Call').or(`to_user_id.eq.${NEBRIN.profile.user_id},from_user_id.eq.${NEBRIN.profile.user_id}`).order('created_at',{ascending:false}).limit(20);
 if(error){box.textContent=error.message;return}
 box.innerHTML=(data||[]).map(x=>`<div class="neb-row"><strong>${NEBRIN.esc(x.subject||'Office Call')}</strong><p>${NEBRIN.esc(x.message)} · ${NEBRIN.fmt(x.created_at)}</p>${x.to_user_id===NEBRIN.profile.user_id&&!x.acknowledged_at?`<button onclick="NEBRIN.ackCall('${x.id}')">Acknowledge</button>`:''}</div>`).join('')||'<p>No office calls.</p>';
};
NEBRIN.callStaff=async()=>{
 if(!NEBRIN.isHod()||!NEBRIN.department)return;
 const {data:staff}=await supabaseClient.from('admin_users').select('user_id,full_name,role,current_work_status').eq('approval_status','Approved').eq('is_active',true).ilike('department',NEBRIN.department.name).neq('user_id',NEBRIN.profile.user_id).order('full_name');
 const list=(staff||[]).map((s,i)=>`${i+1}. ${s.full_name} — ${s.role} (${s.current_work_status||'Available'})`).join('\n');const n=Number(prompt('Call staff:\n'+list));if(!n||!staff[n-1])return;
 const msg=prompt('Message:','Please report to the HOD office.')||'Please report to the HOD office.';
 const {error}=await supabaseClient.from('internal_office_messages').insert({from_user_id:NEBRIN.profile.user_id,to_user_id:staff[n-1].user_id,from_department_id:NEBRIN.department.id,to_department_id:NEBRIN.department.id,message_type:'Office Call',priority:'Important',subject:'HOD Office Call',message:msg});
 if(error)alert(error.message);else NEBRIN.loadOfficeCalls();
};
NEBRIN.ackCall=async id=>{const {error}=await supabaseClient.from('internal_office_messages').update({acknowledged_at:new Date().toISOString()}).eq('id',id).eq('to_user_id',NEBRIN.profile.user_id);if(error)alert(error.message);else NEBRIN.loadOfficeCalls()};

NEBRIN.loadNotifications=async()=>{
 const box=document.getElementById('nebNotifications');if(!box)return;
 const {data}=await supabaseClient.from('department_notifications').select('*').or(`recipient_user_id.eq.${NEBRIN.profile.user_id},department_id.eq.${NEBRIN.department?.id||'00000000-0000-0000-0000-000000000000'}`).order('created_at',{ascending:false}).limit(20);
 box.innerHTML=(data||[]).map(n=>`<div class="neb-row"><strong>${NEBRIN.esc(n.title)}</strong><p>${NEBRIN.esc(n.message)} · ${NEBRIN.fmt(n.created_at)}</p></div>`).join('')||'<p>No new notifications.</p>';
};

NEBRIN.askAI=async()=>{
 const issue=prompt('Describe the system/problem you need help with:');if(!issue)return;
 const lower=issue.toLowerCase();let category='General IT',suggestion='Record the exact error, refresh once, and avoid repeated submissions until the issue is reviewed.';
 if(/password|login|sign in|account/.test(lower)){category='Account Access';suggestion='Confirm the correct staff email, network connection and account approval. Do not share your password.'}
 else if(/printer|print|scanner|scan/.test(lower)){category='Hardware / Printing';suggestion='Check power, cable/network, paper and selected printer. If it persists, IT should inspect the device.'}
 else if(/database|column|supabase|sql/.test(lower)){category='Database / System';suggestion='This requires IT/database review. Do not edit production data manually.'}
 else if(/404|website|page|link/.test(lower)){category='Website';suggestion='Confirm the page address and deployment. IT should check the production route and deployment logs.'}
 else if(/security|suspicious|hack|fraud|wizi/.test(lower)){category='Security';suggestion='Do not continue the suspicious action. Preserve the details and escalate to Security/IT immediately.'}
 const {data,error}=await supabaseClient.rpc('create_ai_support_request',{p_issue:issue,p_category:category,p_suggestion:suggestion});
 if(error)alert(error.message);else alert(`NEBRIN AI Triage\nCategory: ${category}\nSuggested first action: ${suggestion}\nTicket: ${data}`);
};

NEBRIN.showLounge=(force)=>{
 const lounge=document.getElementById('nebLounge');if(!lounge)return;
 if(force===false){lounge.classList.add('neb-hidden');return}
 lounge.classList.remove('neb-hidden');
};
NEBRIN.quickRefresh=()=>{
 const items=[
  ['Quick Riddle','What has keys but cannot open locks?','A keyboard.'],
  ['Brain Break','Name 5 things you can see, then stretch your shoulders for 20 seconds.','Done — return refreshed.'],
  ['Mini Quiz','Which planet is known as the Red Planet?','Mars.'],
  ['Word Challenge','Make as many words as you can from: ENTERPRISE','Try for 2 minutes.'],
  ['Focus Reset','Look away from the screen for 30 seconds and focus on something far away.','Good reset.']
 ];
 const x=items[Math.floor(Math.random()*items.length)];
 alert(`${x[0]}\n\n${x[1]}\n\n${x[2]}`);
};

NEBRIN.loadDepartmentStaff=async()=>{
 const box=document.getElementById('nebDepartmentStaff');if(!box||!NEBRIN.department||!NEBRIN.isHod())return;
 const {data,error}=await supabaseClient.rpc('department_attendance_today',{p_department_id:NEBRIN.department.id});
 if(error){box.textContent=error.message;return}
 box.innerHTML=(data||[]).map(x=>`<div class="neb-row"><strong>${NEBRIN.esc(x.full_name)}</strong><p>${NEBRIN.esc(x.role)} · Attendance ${NEBRIN.esc(x.status)} · Current ${NEBRIN.esc(x.work_status)}</p></div>`).join('')||'<p>No active staff in this department.</p>';
};
