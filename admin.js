const loginPanel = document.getElementById('loginPanel');
const dashboardPanel = document.getElementById('dashboardPanel');
const body = document.getElementById('applicationsBody');
let applications = [];

async function checkSession() {
  const { data } = await supabaseClient.auth.getSession();
  if (data.session) showDashboard();
}
async function showDashboard() {
  loginPanel.classList.add('hidden');
  dashboardPanel.classList.remove('hidden');
  await loadApplications();
}
document.getElementById('loginBtn').addEventListener('click', async () => {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const status = document.getElementById('loginStatus');
  status.textContent = 'Signing in…';
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) { status.className='error'; status.textContent=error.message; return; }
  status.className='success'; status.textContent='Signed in.';
  await showDashboard();
});
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await supabaseClient.auth.signOut(); location.reload();
});
document.getElementById('refreshBtn').addEventListener('click', loadApplications);
document.getElementById('searchBox').addEventListener('input', render);
document.getElementById('statusFilter').addEventListener('change', render);

async function loadApplications() {
  const status = document.getElementById('dashboardStatus');
  status.textContent = 'Loading…';
  const { data, error } = await supabaseClient
    .from('applications').select('*').order('created_at', { ascending:false });
  if (error) { status.className='error'; status.textContent=error.message; return; }
  applications = data || [];
  status.className=''; status.textContent=`${applications.length} application(s)`;
  render();
}
function esc(v=''){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function render() {
  const q = document.getElementById('searchBox').value.toLowerCase();
  const sf = document.getElementById('statusFilter').value;
  const rows = applications.filter(a => {
    const hay = `${a.reference} ${a.full_name} ${a.phone} ${a.email} ${a.service}`.toLowerCase();
    return (!q || hay.includes(q)) && (!sf || a.status === sf);
  });
  body.innerHTML = rows.map(a => `
  <tr>
    <td>${new Date(a.created_at).toLocaleString()}</td>
    <td><strong>${esc(a.reference)}</strong></td>
    <td>${esc(a.full_name)}<br>${esc(a.phone)}<br>${esc(a.email||'')}</td>
    <td>${esc(a.service)}<br><small>${esc(a.submission_channel)}</small></td>
    <td>${esc(a.message||'')}</td>
    <td><span class="badge">${esc(a.status)}</span></td>
    <td class="actions">
      <button onclick="setStatus('${a.id}','Processing')">Processing</button>
      <button onclick="setStatus('${a.id}','Completed')">Complete</button>
      <button onclick="setStatus('${a.id}','Rejected')">Reject</button>
    </td>
  </tr>`).join('');
}
window.setStatus = async function(id, status) {
  const { error } = await supabaseClient.from('applications').update({status}).eq('id', id);
  if (error) alert(error.message); else loadApplications();
};
checkSession();
