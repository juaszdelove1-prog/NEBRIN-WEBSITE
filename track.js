const btn=document.getElementById('trackBtn'),statusBox=document.getElementById('trackStatus'),resultBox=document.getElementById('trackResult');
function show(m,t){statusBox.textContent=window.i18nTranslate?window.i18nTranslate(m):m;statusBox.className=`form-status full show ${t}`;}
function esc(v=''){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
btn.addEventListener('click',async()=>{
 const reference=document.getElementById('trackReference').value.trim().toUpperCase();
 const phone=document.getElementById('trackPhone').value.trim();
 resultBox.innerHTML='';
 if(!reference||!phone){show('Please enter your reference number and phone number.','error');return;}
 show('Checking your application…','success');
 const {data,error}=await supabaseClient.rpc('track_application',{p_reference:reference,p_phone:phone});
 if(error){console.error(error);show('Unable to check the application at the moment.','error');return;}
 const row=Array.isArray(data)?data[0]:data;window.currentTrackedApplication=row||null;
 if(!row){show('No matching application was found.','error');return;}
 if(row.status==='Deleted'){
 show('This application has been deleted.','error');
 resultBox.innerHTML=`<article class="track-result-card"><div class="danger-note"><strong>Application Deleted</strong><br>${esc(row.deletion_reason||'The application did not meet the stated requirements.')}</div><div class="track-result-grid" style="margin-top:14px"><div><small>Reference</small><strong>${esc(row.reference)}</strong></div><div><small>Status</small><span class="deleted-badge">Deleted</span></div><div><small>Service</small><strong>${esc(window.i18nTranslate?window.i18nTranslate(row.service):row.service)}</strong></div><div><small>Submitted</small><strong>${new Date(row.created_at).toLocaleString()}</strong></div></div></article>`;return;
}
 show('Application found.','success');
 resultBox.innerHTML=`<article class="track-result-card"><div class="track-result-grid">
 <div><small>Reference</small><strong>${esc(row.reference)}</strong></div>
 <div><small>Status</small><span class="status-pill">${esc(row.status)}</span></div>
 <div><small>Service</small><strong>${esc(window.i18nTranslate?window.i18nTranslate(row.service):row.service)}</strong></div>
 <div><small>Submitted</small><strong>${new Date(row.created_at).toLocaleString()}</strong></div>
 </div><p style="margin-top:16px"><strong>Customer:</strong> ${esc(row.full_name)}</p>${row.quoted_amount?`<div class="payment-box"><h3>Payment Information</h3><div class="payment-grid"><div><small>Quoted Amount</small><strong>TZS ${Number(row.quoted_amount).toLocaleString()}</strong></div><div><small>Payment Status</small><span class="payment-status">${esc(row.payment_status||'Pending')}</span></div></div><div class="payment-actions"><button class="print-btn" onclick="window.print()">Print / Save PDF</button></div></div>`:''}</article>`;const paymentBox=document.getElementById('paymentUploadBox');if(row.quoted_amount&&!['Confirmed','Not Required'].includes(row.payment_status||'Pending'))paymentBox.classList.remove('hidden');else paymentBox.classList.add('hidden');
});
const paymentProofInput=document.getElementById('paymentProofFile'),paymentUploadStatus=document.getElementById('paymentUploadStatus');
function showPaymentStatus(m,t){paymentUploadStatus.textContent=m;paymentUploadStatus.className=`form-status show ${t}`;}
document.getElementById('uploadPaymentProofBtn')?.addEventListener('click',async()=>{const app=window.currentTrackedApplication,file=paymentProofInput.files[0];if(!app){showPaymentStatus('Track your application first.','error');return;}if(!file){showPaymentStatus('Choose a payment proof file.','error');return;}if(!['application/pdf','image/jpeg','image/png'].includes(file.type)||file.size>5*1024*1024){showPaymentStatus('Use PDF, JPG or PNG up to 5 MB.','error');return;}try{showPaymentStatus('Uploading…','success');const safe=file.name.replace(/[^a-zA-Z0-9._-]+/g,'-').slice(0,80),path=`${app.reference}/payment/${Date.now()}-${safe}`;const {error:u}=await supabaseClient.storage.from('application-documents').upload(path,file,{contentType:file.type,cacheControl:'3600',upsert:false});if(u)throw u;const {error}=await supabaseClient.rpc('submit_payment_proof',{p_reference:app.reference,p_phone:document.getElementById('trackPhone').value.trim(),p_path:path,p_name:file.name,p_type:file.type,p_size:file.size});if(error)throw error;showPaymentStatus('Payment proof submitted successfully.','success');app.payment_status='Submitted';}catch(e){showPaymentStatus(e.message||'Upload failed.','error');}});
