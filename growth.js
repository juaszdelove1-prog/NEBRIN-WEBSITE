let growthServices = [];
let deferredInstallPrompt = null;

function growthEscape(value='') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));
}

async function loadGrowthServices() {
  const { data, error } = await supabaseClient
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  growthServices = data || [];
  renderPopularServices();
}

function renderPopularServices() {
  const grid = document.getElementById('popularServicesGrid');
  if (!grid) return;

  const preferred = [
    'NIDA Application',
    'TIN Registration',
    'Company Registration',
    'Business Name Registration',
    'Lipa Number Registration',
    'CRDB Account Opening',
    'Website Development',
    'Logo & Graphic Design'
  ];

  const popular = preferred
    .map(name => growthServices.find(service => service.name === name))
    .filter(Boolean)
    .slice(0, 8);

  grid.innerHTML = popular.map(service => `
    <article class="popular-service-card">
      <span class="category">${growthEscape(service.category || 'Service')}</span>
      <h3>${growthEscape(window.i18nTranslate ? window.i18nTranslate(service.name) : service.name)}</h3>
      <p>${growthEscape(service.description || 'Apply online and track your request.')}</p>
      <button type="button" onclick="chooseGrowthService('${service.id}')">Apply Now</button>
    </article>
  `).join('');
}

window.chooseGrowthService = function(serviceId) {
  const select = document.getElementById('serviceSelect');
  if (!select) return;
  select.value = serviceId;
  select.dispatchEvent(new Event('change'));
  document.getElementById('apply')?.scrollIntoView({ behavior: 'smooth' });
};

function searchGrowthServices(query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  return growthServices.filter(service =>
    `${service.name} ${service.category} ${service.description}`
      .toLowerCase()
      .includes(normalized)
  ).slice(0, 10);
}

function renderSearchResults(query) {
  const box = document.getElementById('globalSearchResults');
  if (!box) return;
  const matches = searchGrowthServices(query);

  if (!query.trim()) {
    box.classList.remove('show');
    box.innerHTML = '';
    return;
  }

  box.classList.add('show');
  box.innerHTML = matches.length
    ? matches.map(service => `
      <div class="search-result-item" onclick="chooseGrowthService('${service.id}'); document.getElementById('globalSearchResults').classList.remove('show')">
        <strong>${growthEscape(window.i18nTranslate ? window.i18nTranslate(service.name) : service.name)}</strong>
        <small>${growthEscape(service.category || '')}</small>
      </div>
    `).join('')
    : '<div class="search-result-item"><strong>No matching service found</strong><small>Contact NEBRIN on WhatsApp for assistance.</small></div>';
}

document.addEventListener('DOMContentLoaded', () => {
  loadGrowthServices();

  const input = document.getElementById('globalServiceSearch');
  const button = document.getElementById('globalServiceSearchBtn');

  input?.addEventListener('input', () => renderSearchResults(input.value));
  input?.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const match = searchGrowthServices(input.value)[0];
      if (match) chooseGrowthService(match.id);
    }
  });
  button?.addEventListener('click', () => {
    const match = searchGrowthServices(input?.value || '')[0];
    if (match) chooseGrowthService(match.id);
    else renderSearchResults(input?.value || '');
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(console.error);
  }
});

document.addEventListener('nebrin-language-changed', renderPopularServices);

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  document.getElementById('installAppBtn')?.classList.remove('hidden');
});

document.getElementById('installAppBtn')?.addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  document.getElementById('installAppBtn')?.classList.add('hidden');
});
