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
  const reference = referenceNumber();
  showStatus('Submitting your request…', 'success');

  const { error } = await supabaseClient
    .from('applications')
    .insert([{ ...d, reference }]);

  if (error) {
    console.error(error);
    showStatus('The request could not be submitted. Please use WhatsApp or Email.', 'error');
    return;
  }
  showStatus(`Request submitted successfully. Your reference is ${reference}.`, 'success');
  form.reset();
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
