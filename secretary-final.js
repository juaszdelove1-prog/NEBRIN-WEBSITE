
(async()=>{if(!await NEBRIN.auth(['SEC']))return;await loadSecretary()})();
async function loadSecretary(){
 const [v,a,c]=await Promise.all([supabaseClient.from('digital_visits').select('*').order('created_at',{ascending:false}).limit(150),supabaseClient.rpc('company_attendance_today'),supabaseClient.from('customer_interactions').select('*').eq('routing_status','Secretary Review').order('created_at',{ascending:false}).limit(100)]);
 const vs=v.data||[],at=a.data||[],cc=c.data||[];const e=NEBRIN.esc;
 secStats.innerHTML=[['Visitors Waiting',vs.filter(x=>/Waiting|After-hours/.test(x.status)).length],['Customers in Service',vs.filter(x=>x.status==='In Service').length],['Staff Present',at.filter(x=>['On Time','Late','Working','On Break','Field Duty'].includes(x.status)).length],['On Break',at.filter(x=>x.work_status==='On Break').length],['Late',at.filter(x=>x.status==='Late').length],['Customer Care Files',cc.length]].map(x=>`<div class="neb-stat"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');
 secVisitors.innerHTML=vs.map(x=>`<div class="neb-row"><strong>${e(x.visitor_number)} — ${e(x.full_name)}</strong><p>${e(x.customer_tier)} · ${e(x.purpose)} · ${e(x.recommended_department)} · ${e(x.status)}</p>${/Waiting|After-hours/.test(x.status)?`<button onclick="routeVisit('${x.id}')">Route to Department</button>`:''}</div>`).join('')||'<p>No visitors.</p>';
 secAttendance.innerHTML=at.map(x=>`<div class="neb-row"><strong>${e(x.full_name)}</strong><p>${e(x.department)} · ${e(x.status)} · Work status: ${e(x.work_status||'—')}</p></div>`).join('')||'<p>No staff attendance records.</p>';
 secCare.innerHTML=cc.map(x=>`<div class="neb-row"><strong>${e(x.reference)} — ${e(x.full_name)}</strong><p>${e(x.subject)} · ${e(x.priority)}</p><button onclick="routeCare('${x.id}')">Route Detected Department</button></div>`).join('')||'<p>No Customer Care items for Secretary.</p>';
}
window.routeVisit=async id=>{const {error}=await supabaseClient.rpc('secretary_route_visit',{p_visit_id:id});if(error)alert(error.message);else loadSecretary()};
window.routeCare=async id=>{const {error}=await supabaseClient.rpc('route_customer_interaction',{p_interaction_id:id});if(error)alert(error.message);else loadSecretary()};
