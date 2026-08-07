
const SR={esc:v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[m])),
async init(){if(!await NEBRIN.auth())return;newStaffReq.onclick=()=>SR.create();refreshStaffReq.onclick=()=>SR.load();await SR.load()},
async create(){if(!NEBRIN.isHod()){alert('Only a Head of Department can create this request.');return}
 const position=prompt('Position / job title required:');if(!position)return;
 const n=Number(prompt('Number of employees required:','1')||1);
 const reason=prompt('Explain why your department needs additional employee(s):');if(!reason)return;
 const skills=prompt('Required skills / qualifications (optional):','')||'';
 const attachment=prompt('Supporting file URL (optional):','')||'';
 const {data,error}=await supabaseClient.rpc('submit_staffing_request',{p_position_title:position,p_number_required:n,p_reason:reason,p_required_skills:skills,p_preferred_start_date:null,p_attachment_url:attachment||null});
 alert(error?error.message:'Request submitted: '+data);if(!error)SR.load();
},
async act(id,action){const note=prompt('Note / response:','')||'';const {error}=await supabaseClient.rpc('route_staffing_request',{p_request_id:id,p_action:action,p_note:note});alert(error?error.message:'Workflow updated.');if(!error)SR.load()},
async ai(id){const deadline=prompt('Vacancy deadline (YYYY-MM-DD):');if(!deadline)return;const {data,error}=await supabaseClient.rpc('hr_ai_create_vacancy_draft',{p_request_id:id,p_deadline:deadline});alert(error?error.message:'AI vacancy draft created. Review it before publishing.');if(!error)SR.load()},
async publish(id){if(!confirm('Publish this vacancy to the public Careers/Vacancy page?'))return;const {error}=await supabaseClient.rpc('hr_publish_vacancy',{p_vacancy_id:id});alert(error?error.message:'Vacancy published.');if(!error)SR.load()},
buttons(x){let b='';
 const dep=NEBRIN.profile.department,role=NEBRIN.profile.role;
 if(x.current_holder==='Secretary'&&dep==='Secretary & Digital Reception')b+=`<button onclick="SR.act('${x.id}','Forward to HR')">Forward to HR HOD</button>`;
 if(x.current_holder==='HR HOD'&&dep==='Human Resources & Recruitment'&&x.manager_decision==null)b+=`<button onclick="SR.act('${x.id}','Forward to Manager')">Forward to Manager</button>`;
 if(x.current_holder==='Manager'&&['Manager','CEO','Super Admin'].includes(role))b+=`<button onclick="SR.act('${x.id}','Approve Need')">Approve Need</button> <button onclick="SR.act('${x.id}','Reject Need')">Reject</button>`;
 if(dep==='Human Resources & Recruitment'&&x.manager_decision==='Approved'&&!x.vacancy_id)b+=`<button onclick="SR.ai('${x.id}')">AI Draft Vacancy</button>`;
 if(dep==='Human Resources & Recruitment'&&x.vacancy_id)b+=` <button onclick="SR.publish('${x.vacancy_id}')">Publish Vacancy</button> <button onclick="SR.act('${x.id}','Close & Notify HOD')">Reply to Requesting HOD</button>`;
 if(dep==='Human Resources & Recruitment'&&x.manager_decision==='Rejected')b+=`<button onclick="SR.act('${x.id}','Close & Notify HOD')">Reply to Requesting HOD</button>`;
 return b;
},
async load(){const {data,error}=await supabaseClient.from('staffing_requests').select('*,departments(name)').order('created_at',{ascending:false});
 staffReqStatus.innerHTML=error?SR.esc(error.message):`Signed in as <strong>${SR.esc(NEBRIN.profile.full_name)}</strong> · ${SR.esc(NEBRIN.profile.role)} · ${SR.esc(NEBRIN.profile.department||'')}`;
 staffReqList.innerHTML=(data||[]).map(x=>`<article class="neb-card"><div class="neb-section-title"><h2>${SR.esc(x.request_number)} — ${SR.esc(x.position_title)}</h2><span class="neb-tag">${SR.esc(x.status)}</span></div><p><strong>Department:</strong> ${SR.esc(x.departments?.name||'')} · <strong>Required:</strong> ${x.number_required}</p><p>${SR.esc(x.reason)}</p><p><strong>Skills:</strong> ${SR.esc(x.required_skills||'Not specified')}</p><p><strong>Current holder:</strong> ${SR.esc(x.current_holder)} ${x.manager_decision?'· Manager: '+SR.esc(x.manager_decision):''}</p>${x.attachment_url?`<p><a href="${SR.esc(x.attachment_url)}" target="_blank" rel="noopener">Open supporting file</a></p>`:''}<div class="neb-commandbar">${SR.buttons(x)}</div></article>`).join('')||'<article class="neb-card"><p>No staffing requests yet.</p></article>';
}}
SR.init();
