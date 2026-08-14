// NEBRIN V27 client security guard.
// Server-side RLS remains the source of truth; this file adds session timeout and office-hours UX.
(()=>{
  const INTERNAL=/^(\/)?(admin|ceo|manager|hr|finance|digital-finance-office|graphics|it|secretary|registry|correspondence|staff-room|cms|business|legal|sales-field|registration|customer-care-dashboard|office-call|attendance)(\.html)?$/i;
  const page=location.pathname.split('/').pop()||'index.html';
  if(!INTERNAL.test(page)) return;

  const IDLE_MS=30*60*1000;
  let timer;
  const reset=()=>{clearTimeout(timer);timer=setTimeout(async()=>{try{await supabaseClient.auth.signOut()}catch{} location.href='admin.html?reason=session_timeout';},IDLE_MS)};
  ['click','keydown','touchstart','mousemove'].forEach(ev=>addEventListener(ev,reset,{passive:true}));
  reset();

  async function enforce(){
    try{
      const {data:{user}}=await supabaseClient.auth.getUser();
      if(!user) return;
      const {data:profile}=await supabaseClient.from('admin_users')
        .select('role,approval_status,is_active,after_hours_authorized,mfa_required')
        .eq('user_id',user.id).maybeSingle();
      if(!profile || profile.approval_status!=='Approved' || !profile.is_active){
        await supabaseClient.auth.signOut(); location.href='admin.html?reason=access_denied'; return;
      }
      const {data:office}=await supabaseClient.rpc('public_office_status');
      const o=Array.isArray(office)?office[0]:office;
      const managementAccess = ['CEO','Super Admin','Manager'].includes(profile.role);
      if(o && !o.is_open && !managementAccess && !profile.after_hours_authorized){
        document.body.innerHTML=`<main class="staff-signup-shell"><section class="staff-signup-card"><p class="section-label">DIGITAL OFFICE CLOSED</p><h1>Office hours have ended</h1><p>NEBRIN staff working hours are ${o.open_time}–${o.close_time} Tanzania time. Muda wa kazi wa leo umekwisha. Tafadhali fanya na ukamilishe kazi zako ndani ya muda rasmi wa ofisi.</p><p>Your session will close automatically.</p></section></main>`;
        setTimeout(async()=>{await supabaseClient.auth.signOut();location.href='admin.html?reason=office_closed';},4000);
        return;
      }
    }catch(e){console.error('NEBRIN security guard:',e)}
  }
  setTimeout(enforce,150);
  setInterval(enforce,60000);
})();