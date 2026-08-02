const btn=document.getElementById('trackBtn'),statusBox=document.getElementById('trackStatus'),resultBox=document.getElementById('trackResult');
function show(m,t){statusBox.textContent=m;statusBox.className=`form-status full show ${t}`;}
function esc(v=''){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
btn.addEventListener('click',async()=>{
 const reference=document.getElementById('trackReference').value.trim().toUpperCase();
 const phone=document.getElementById('trackPhone').value.trim();
 resultBox.innerHTML='';
 if(!reference||!phone){show('Please enter your reference number and phone number.','error');return;}
 show('Checking your application…','success');
 const {data,error}=await supabaseClient.rpc('track_application',{p_reference:reference,p_phone:phone});
 if(error){console.error(error);show('Unable to check the application at the moment.','error');return;}
 const row=Array.isArray(data)?data[0]:data;
 if(!row){show('No matching application was found.','error');return;}
 show('Application found.','success');
 resultBox.innerHTML=`<article class="track-result-card"><div class="track-result-grid">
 <div><small>Reference</small><strong>${esc(row.reference)}</strong></div>
 <div><small>Status</small><span class="status-pill">${esc(row.status)}</span></div>
 <div><small>Service</small><strong>${esc(row.service)}</strong></div>
 <div><small>Submitted</small><strong>${new Date(row.created_at).toLocaleString()}</strong></div>
 </div><p style="margin-top:16px"><strong>Customer:</strong> ${esc(row.full_name)}</p></article>`;
});