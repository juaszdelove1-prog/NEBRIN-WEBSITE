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
 const row=Array.isArray(data)?data[0]:data;window.currentTrackedApplication=row||null;if(row)document.dispatchEvent(new CustomEvent('nebrin-tracked-application',{detail:row}));
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

let selectedRating=0;
const feedbackBox=document.getElementById('feedbackBox'),feedbackStatus=document.getElementById('feedbackStatus');
document.querySelectorAll('#ratingStars button').forEach(button=>button.addEventListener('click',()=>{
  selectedRating=Number(button.dataset.rating);
  document.querySelectorAll('#ratingStars button').forEach(star=>star.classList.toggle('active',Number(star.dataset.rating)<=selectedRating));
}));
document.getElementById('submitFeedbackBtn')?.addEventListener('click',async()=>{
  const app=window.currentTrackedApplication;
  if(!app){feedbackStatus.textContent='Track your application first.';feedbackStatus.className='form-status show error';return;}
  if(selectedRating<1){feedbackStatus.textContent='Choose a rating from 1 to 5.';feedbackStatus.className='form-status show error';return;}
  const {error}=await supabaseClient.rpc('submit_customer_feedback',{p_reference:app.reference,p_phone:document.getElementById('trackPhone').value.trim(),p_rating:selectedRating,p_comment:document.getElementById('feedbackComment').value.trim()});
  if(error){feedbackStatus.textContent=error.message;feedbackStatus.className='form-status show error';return;}
  feedbackStatus.textContent='Thank you. Your feedback has been submitted.';feedbackStatus.className='form-status show success';
});
document.addEventListener('nebrin-tracked-application',event=>feedbackBox.classList.toggle('hidden',event.detail.status!=='Completed'));


const paymentRequestBox=document.getElementById('paymentRequestBox');
const paymentProviderSelector=document.getElementById('paymentProviderSelector');
const paymentBillResult=document.getElementById('paymentBillResult');
const paymentRequestStatus=document.getElementById('paymentRequestStatus');

function showPaymentRequestStatus(message,type){
  paymentRequestStatus.textContent=message;
  paymentRequestStatus.className=`form-status show ${type}`;
}

async function loadPaymentProvidersForRequest(){
  const {data,error}=await supabaseClient
    .from('payment_methods')
    .select('id,provider,payment_type,account_number,account_name,instructions')
    .eq('is_active',true)
    .order('provider');

  if(error){
    console.error(error);
    paymentProviderSelector.innerHTML='<option value="">Payment methods unavailable</option>';
    return;
  }

  window.activePaymentProviders=data||[];
  paymentProviderSelector.innerHTML='<option value="">Choose mobile network or bank</option>'+
    window.activePaymentProviders.map(method=>
      `<option value="${method.id}">${esc(method.provider)} — ${esc(method.payment_type)}</option>`
    ).join('');
}

function buildPaymentBillMessage(app,method){
  const amount=Number(app.quoted_amount||0);
  return [
    'NEBRIN ONLINE SERVICE COMPANY LIMITED',
    'PAYMENT BILL',
    '',
    `Application Reference: ${app.reference}`,
    `Customer: ${app.full_name}`,
    `Service: ${app.service}`,
    `Amount to Pay: TZS ${amount.toLocaleString()}`,
    '',
    `Payment Provider: ${method.provider}`,
    `Payment Type: ${method.payment_type}`,
    `Payment Number/Account: ${method.account_number}`,
    `Account Name: ${method.account_name||'NEBRIN Online Service Company Limited'}`,
    method.instructions?`Instructions: ${method.instructions}`:'',
    '',
    'After payment, upload the payment proof through the application tracking page.'
  ].filter(Boolean).join('\n');
}

function renderPaymentBill(app,method,billReference){
  const amount=Number(app.quoted_amount||0);
  const message=buildPaymentBillMessage(app,method);

  paymentBillResult.innerHTML=`
    <h3>Payment Bill</h3>
    <div class="bill-grid">
      <div><small>Bill Reference</small><strong>${esc(billReference)}</strong></div>
      <div><small>Application Reference</small><strong>${esc(app.reference)}</strong></div>
      <div><small>Customer</small><strong>${esc(app.full_name)}</strong></div>
      <div><small>Service</small><strong>${esc(app.service)}</strong></div>
      <div><small>Amount</small><strong>TZS ${amount.toLocaleString()}</strong></div>
      <div><small>Provider</small><strong>${esc(method.provider)}</strong></div>
      <div><small>Payment Type</small><strong>${esc(method.payment_type)}</strong></div>
      <div><small>Number / Account</small><strong>${esc(method.account_number)}</strong></div>
      <div><small>Account Name</small><strong>${esc(method.account_name||'NEBRIN Online Service Company Limited')}</strong></div>
      <div><small>Payment Status</small><strong>${esc(app.payment_status||'Pending')}</strong></div>
    </div>
    <div id="generatedBillMessage" class="bill-message">${esc(message)}</div>
    <div class="bill-actions">
      <button id="copyBillBtn" class="bill-copy" type="button">Copy Bill</button>
      <a class="bill-whatsapp" target="_blank" rel="noopener"
         href="https://wa.me/?text=${encodeURIComponent(message)}">Send to WhatsApp</a>
      <a class="bill-email"
         href="mailto:?subject=${encodeURIComponent('NEBRIN Payment Bill - '+app.reference)}&body=${encodeURIComponent(message)}">Send by Email</a>
      <button class="print-btn" type="button" onclick="window.print()">Print / Save PDF</button>
    </div>
  `;
  paymentBillResult.classList.remove('hidden');

  document.getElementById('copyBillBtn')?.addEventListener('click',async()=>{
    try{
      await navigator.clipboard.writeText(message);
      showPaymentRequestStatus('Payment bill copied successfully.','success');
    }catch{
      showPaymentRequestStatus('Unable to copy automatically. Select and copy the bill message.','error');
    }
  });
}

document.getElementById('generatePaymentBillBtn')?.addEventListener('click',async()=>{
  const app=window.currentTrackedApplication;
  const methodId=paymentProviderSelector.value;

  if(!app){
    showPaymentRequestStatus('Track your application first.','error');
    return;
  }
  if(!app.quoted_amount||Number(app.quoted_amount)<=0){
    showPaymentRequestStatus('Admin has not set the service fee yet.','error');
    return;
  }
  if(!methodId){
    showPaymentRequestStatus('Choose a payment provider.','error');
    return;
  }

  const method=(window.activePaymentProviders||[]).find(item=>item.id===methodId);
  if(!method){
    showPaymentRequestStatus('Selected payment method was not found.','error');
    return;
  }

  showPaymentRequestStatus('Preparing your payment bill…','success');

  const {data,error}=await supabaseClient.rpc('request_payment_bill',{
    p_reference:app.reference,
    p_phone:document.getElementById('trackPhone').value.trim(),
    p_payment_method_id:methodId
  });

  if(error){
    console.error(error);
    showPaymentRequestStatus(error.message||'Unable to prepare payment bill.','error');
    return;
  }

  renderPaymentBill(app,method,data);
  showPaymentRequestStatus('Payment bill generated successfully.','success');
});

document.addEventListener('nebrin-tracked-application',event=>{
  const app=event.detail;
  if(app.status==='Deleted'){
    paymentRequestBox.classList.add('hidden');
    return;
  }
  if(app.quoted_amount&&Number(app.quoted_amount)>0){
    paymentRequestBox.classList.remove('hidden');
    loadPaymentProvidersForRequest();
  }else{
    paymentRequestBox.classList.add('hidden');
  }
});
