const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.main-nav');

toggle?.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  toggle.setAttribute('aria-expanded', String(open));
});
document.querySelectorAll('.main-nav a').forEach(link => {
  link.addEventListener('click', () => nav.classList.remove('open'));
});
document.getElementById('year').textContent = new Date().getFullYear();

const form = document.getElementById('serviceForm');
const statusBox = document.getElementById('formStatus');
const filesInput = document.getElementById('applicationFiles');
const selectedFilesBox = document.getElementById('selectedFiles');
const MAX_FILES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const serviceSelect = document.getElementById('serviceSelect');
const serviceInfoBox = document.getElementById('serviceInfoBox');
const requiredDocumentsBox = document.getElementById('requiredDocumentsBox');
const dynamicDocumentFields = document.getElementById('dynamicDocumentFields');
let activeServices = [];
let dynamicDocumentInputs = [];

async function loadActiveServices() {
  const { data, error } = await supabaseClient
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error(error);
    serviceSelect.innerHTML = '<option value="">Unable to load services</option>';
    return;
  }

  activeServices = data || [];
  const groups = {};
  activeServices.forEach(service => {
    const category = service.category || 'Other Services';
    (groups[category] ||= []).push(service);
  });

  serviceSelect.innerHTML = '<option value="">Choose a service</option>' +
    Object.entries(groups).map(([category, services]) =>
      `<optgroup label="${escapeHtml(category)}">${
        services.map(service =>
          `<option value="${service.id}">${escapeHtml(window.i18nTranslate ? window.i18nTranslate(service.name) : service.name)}</option>`
        ).join('')
      }</optgroup>`
    ).join('');
}

serviceSelect?.addEventListener('change', () => {
  const service = activeServices.find(item => item.id === serviceSelect.value);
  renderServiceDetails(service);
});

function renderServiceDetails(service) {
  dynamicDocumentInputs = [];
  dynamicDocumentFields.innerHTML = '';

  if (!service) {
    serviceInfoBox.classList.add('hidden');
    requiredDocumentsBox.classList.add('hidden');
    return;
  }

  document.getElementById('serviceInfoName').textContent = window.i18nTranslate ? window.i18nTranslate(service.name) : service.name;
  document.getElementById('serviceInfoDescription').textContent = service.description || '';
  document.getElementById('serviceInfoPrice').textContent =
    service.price ? `Starting price: TZS ${Number(service.price).toLocaleString()}` : 'Price confirmed by admin';
  document.getElementById('serviceInfoDuration').textContent =
    service.processing_time || 'Processing time confirmed by admin';
  serviceInfoBox.classList.remove('hidden');

  const requirements = Array.isArray(service.required_documents) ? service.required_documents : [];
  if (!requirements.length) {
    requiredDocumentsBox.classList.add('hidden');
    return;
  }

  requiredDocumentsBox.classList.remove('hidden');
  requirements.forEach((doc, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = `document-upload-row ${doc.required === false ? '' : 'required'}`;
    const inputId = `requiredDoc-${index}`;
    wrapper.innerHTML = `
      <label for="${inputId}">${escapeHtml(doc.name)}</label>
      <input id="${inputId}" type="file" accept=".pdf,.jpg,.jpeg,.png" ${doc.required === false ? '' : 'required'}>
      ${doc.note ? `<small>${escapeHtml(doc.note)}</small>` : ''}
    `;
    dynamicDocumentFields.appendChild(wrapper);
    dynamicDocumentInputs.push({
      input: wrapper.querySelector('input'),
      requirement: doc
    });
  });
}

function validateRequiredDocuments() {
  for (const item of dynamicDocumentInputs) {
    if (item.requirement.required !== false && !item.input.files[0]) {
      showStatus(`Please attach: ${item.requirement.name}`, 'error');
      return false;
    }
    const file = item.input.files[0];
    if (file) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        showStatus(`Unsupported file type for ${item.requirement.name}`, 'error');
        return false;
      }
      if (file.size > MAX_FILE_SIZE) {
        showStatus(`${item.requirement.name} is larger than 5 MB.`, 'error');
        return false;
      }
    }
  }
  return true;
}

async function uploadRequiredDocuments(reference) {
  const uploaded = [];
  for (let index = 0; index < dynamicDocumentInputs.length; index++) {
    const item = dynamicDocumentInputs[index];
    const file = item.input.files[0];
    if (!file) continue;

    showStatus(`Uploading ${item.requirement.name}…`, 'success');
    const randomPart = crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
    const path = `${reference}/required/${Date.now()}-${randomPart}-${safeFilename(file.name)}`;
    const { error } = await supabaseClient.storage
      .from('application-documents')
      .upload(path, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false
      });
    if (error) throw error;

    uploaded.push({
      requirement_name: item.requirement.name,
      name: file.name,
      path,
      type: file.type,
      size: file.size,
      required: item.requirement.required !== false
    });
  }
  return uploaded;
}

loadActiveServices();


filesInput?.addEventListener('change', () => {
  const files = [...filesInput.files];
  selectedFilesBox.innerHTML = files.map(file =>
    `<span class="file-chip">${escapeHtml(file.name)} · ${(file.size / 1024 / 1024).toFixed(2)} MB</span>`
  ).join('');
});

function escapeHtml(value='') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[char]));
}

function validateFiles(files) {
  if (files.length > MAX_FILES) {
    showStatus(`You may upload a maximum of ${MAX_FILES} files.`, 'error');
    return false;
  }
  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      showStatus(`Unsupported file type: ${file.name}`, 'error');
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      showStatus(`${file.name} is larger than 5 MB.`, 'error');
      return false;
    }
  }
  return true;
}

function safeFilename(name) {
  const extension = name.includes('.') ? name.split('.').pop().toLowerCase() : 'file';
  const base = name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 60);
  return `${base || 'document'}.${extension}`;
}

async function uploadDocuments(reference, files) {
  const uploaded = [];
  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    showStatus(`Uploading document ${index + 1} of ${files.length}…`, 'success');
    const randomPart = crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
    const path = `${reference}/${Date.now()}-${randomPart}-${safeFilename(file.name)}`;

    const { error } = await supabaseClient.storage
      .from('application-documents')
      .upload(path, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false
      });

    if (error) throw error;
    uploaded.push({
      name: file.name,
      path,
      type: file.type,
      size: file.size
    });
  }
  return uploaded;
}


function readForm() {
  const fd = new FormData(form);
  return {
    full_name: String(fd.get('name') || '').trim(),
    phone: String(fd.get('phone') || '').trim(),
    email: String(fd.get('email') || '').trim(),
    service_id: String(fd.get('service') || '').trim(),
    service: activeServices.find(item => item.id === String(fd.get('service') || ''))?.name || '',
    message: String(fd.get('message') || '').trim(),
    submission_channel: 'website'
  };
}
function validate(d) {
  if (!d.full_name || !d.phone || !d.service_id || !d.service) {
    showStatus('Please enter your name, phone number and service.', 'error');
    return false;
  }
  return true;
}
function showStatus(message, type) {
  statusBox.textContent = message;
  statusBox.className = `form-status full show ${type}`;
}
function referenceNumber() {
  const date = new Date();
  const ymd = date.toISOString().slice(0,10).replaceAll('-','');
  const random = crypto.getRandomValues(new Uint32Array(1))[0].toString(36).toUpperCase().slice(0,6);
  return `NEB-${ymd}-${random}`;
}
function messageText(d, ref='') {
  return [
    'Hello NEBRIN Online Service Company Limited,',
    '',
    ref ? `Reference: ${ref}` : '',
    `Name: ${d.full_name}`,
    `Phone: ${d.phone}`,
    d.email ? `Email: ${d.email}` : '',
    `Service: ${d.service}`,
    d.message ? `Message: ${d.message}` : '',
    '',
    'Please contact me with the next steps.'
  ].filter(Boolean).join('\n');
}

document.getElementById('submitWebsite')?.addEventListener('click', async () => {
  const d = readForm();
  if (!validate(d)) return;

  const files = filesInput ? [...filesInput.files] : [];
  if (!validateFiles(files)) return;
  if (!validateRequiredDocuments()) return;

  const reference = referenceNumber();
  let documents = [];

  try {
    const requiredDocuments = await uploadRequiredDocuments(reference);
    if (files.length) {
      documents = await uploadDocuments(reference, files);
    }
    documents = [...requiredDocuments, ...documents];

    showStatus('Saving your application…', 'success');
    const { error } = await supabaseClient
      .from('applications')
      .insert([{ ...d, reference, documents }]);

    if (error) throw error;

    showStatus(`Request submitted successfully. Your reference is ${reference}.`, 'success');
    form.reset();
    selectedFilesBox.innerHTML = '';
    dynamicDocumentFields.innerHTML = '';
    serviceInfoBox.classList.add('hidden');
    requiredDocumentsBox.classList.add('hidden');
    dynamicDocumentInputs = [];
  } catch (error) {
    console.error(error);
    showStatus('The request could not be submitted. Please use WhatsApp or Email.', 'error');
  }
});

document.getElementById('submitWhatsApp')?.addEventListener('click', () => {
  const d = readForm();
  if (!validate(d)) return;
  const url = `https://wa.me/255742479785?text=${encodeURIComponent(messageText(d))}`;
  window.open(url, '_blank', 'noopener');
});

document.getElementById('submitEmail')?.addEventListener('click', () => {
  const d = readForm();
  if (!validate(d)) return;
  const subject = `Service Request: ${d.service}`;
  window.location.href =
    `mailto:nebrinonline@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(messageText(d))}`;
});

document.addEventListener('nebrin-language-changed', () => {
  if (typeof loadActiveServices === 'function') loadActiveServices();
  const selected = activeServices.find(item => item.id === serviceSelect?.value);
  if (selected) renderServiceDetails(selected);
});

const appointmentForm=document.getElementById('appointmentForm');
const appointmentStatus=document.getElementById('appointmentStatus');
function showAppointmentStatus(message,type){
  appointmentStatus.textContent=window.i18nTranslate?window.i18nTranslate(message):message;
  appointmentStatus.className=`form-status full show ${type}`;
}
appointmentForm?.addEventListener('submit',async(event)=>{
  event.preventDefault();
  const data=new FormData(appointmentForm);
  const payload={
    full_name:String(data.get('appointment_name')||'').trim(),
    phone:String(data.get('appointment_phone')||'').trim(),
    email:String(data.get('appointment_email')||'').trim(),
    office:String(data.get('appointment_office')||'').trim(),
    appointment_date:String(data.get('appointment_date')||'').trim(),
    appointment_time:String(data.get('appointment_time')||'').trim(),
    purpose:String(data.get('appointment_purpose')||'').trim()
  };
  if(!payload.full_name||!payload.phone||!payload.office||!payload.appointment_date||!payload.appointment_time||!payload.purpose){
    showAppointmentStatus('Please complete all required appointment fields.','error');return;
  }
  showAppointmentStatus('Submitting appointment request…','success');
  const {data:result,error}=await supabaseClient.rpc('book_appointment',payload);
  if(error){showAppointmentStatus(error.message||'Unable to book appointment.','error');return;}
  showAppointmentStatus(`Appointment request submitted. Reference: ${result}`,'success');
  appointmentForm.reset();
});

async function loadPublicPaymentMethods(){
  const box=document.getElementById('publicPaymentMethods');
  if(!box)return;

  const {data,error}=await supabaseClient
    .from('payment_methods')
    .select('*')
    .eq('is_active',true)
    .order('provider');

  if(error){
    console.error(error);
    box.innerHTML='<p>Payment methods are temporarily unavailable.</p>';
    return;
  }

  const methods=data||[];
  box.innerHTML=methods.map(method=>`
    <article class="public-payment-card">
      <h3>${escapeHtml(method.provider)}</h3>
      <p><strong>${escapeHtml(method.payment_type)}:</strong> ${escapeHtml(method.account_number)}</p>
      <p><strong>Account Name:</strong> ${escapeHtml(method.account_name||'NEBRIN')}</p>
      ${method.instructions?`<p>${escapeHtml(method.instructions)}</p>`:''}
    </article>
  `).join('')||'<p>No active payment methods yet.</p>';
}

loadPublicPaymentMethods();
