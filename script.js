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
    service: String(fd.get('service') || '').trim(),
    message: String(fd.get('message') || '').trim(),
    submission_channel: 'website'
  };
}
function validate(d) {
  if (!d.full_name || !d.phone || !d.service) {
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

  const reference = referenceNumber();
  let documents = [];

  try {
    if (files.length) {
      documents = await uploadDocuments(reference, files);
    }

    showStatus('Saving your application…', 'success');
    const { error } = await supabaseClient
      .from('applications')
      .insert([{ ...d, reference, documents }]);

    if (error) throw error;

    showStatus(`Request submitted successfully. Your reference is ${reference}.`, 'success');
    form.reset();
    selectedFilesBox.innerHTML = '';
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
