
window.EQ={esc:NEBUI.escape,profile:null,
async init(){
 const {data:{user}}=await supabaseClient.auth.getUser();
 if(!user){equipAccess.innerHTML='Please <a href="admin.html">sign in</a> first.';return}
 const {data:p}=await supabaseClient.from('admin_users').select('*').eq('user_id',user.id).maybeSingle();EQ.profile=p;
 if(!p||!['CEO','Super Admin','Manager','Security Officer','Security HOD','IT','IT Officer','System Administrator'].includes(p.role)&&!['Security & Risk Management','Information Technology & Digital Services'].includes(p.department)){equipAccess.textContent='Security/IT/Management authorization required.';return}
 equipAccess.classList.add('hidden');equipWorkspace.classList.remove('hidden');await EQ.load();
},
async load(){
 const [c,d,z]=await Promise.all([supabaseClient.from('security_cameras').select('*').order('camera_code'),supabaseClient.from('security_equipment').select('*').order('equipment_code'),supabaseClient.from('security_zones').select('*').order('zone_code')]);
 const cams=c.data||[],dev=d.data||[],zones=z.data||[];
 eqStats.innerHTML=[['Cameras',cams.length],['Installed',cams.filter(x=>x.installation_status==='Installed').length],['Online',cams.filter(x=>x.status==='Online').length],['Equipment',dev.length],['Zones',zones.length],['Needs Setup',cams.filter(x=>x.installation_status!=='Installed').length+dev.filter(x=>x.installation_status!=='Installed').length]].map(x=>`<div class="neb-stat"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');
 cameraList.innerHTML=cams.map(x=>`<div class="neb-row"><strong>${EQ.esc(x.camera_code)} — ${EQ.esc(x.location)}</strong><p>${EQ.esc(x.camera_type||'IP Camera')} · Install: ${EQ.esc(x.installation_status)} · System: ${EQ.esc(x.status)} · Recording: ${x.recording?'ON':'OFF'}</p></div>`).join('')||'<p>No CCTV cameras registered yet.</p>';
 deviceList.innerHTML=dev.map(x=>`<div class="neb-row"><strong>${EQ.esc(x.equipment_code)} — ${EQ.esc(x.equipment_type)}</strong><p>${EQ.esc(x.location||'')} · ${EQ.esc(x.installation_status)} · ${EQ.esc(x.status)}</p></div>`).join('')||'<p>No physical security equipment registered yet.</p>';
 zoneList.innerHTML=zones.map(x=>`<div class="neb-row"><strong>${EQ.esc(x.zone_code)} — ${EQ.esc(x.name)}</strong><p>${EQ.esc(x.zone_type)} · ${EQ.esc(x.status)}</p></div>`).join('')||'<p>No security zones registered yet.</p>';
 readiness.innerHTML=`<div class="neb-alert"><strong>Current state:</strong> ${cams.length||dev.length?'Equipment registry started.':'No physical equipment has been installed yet.'}</div>
 <p>Recommended installation order:</p><ol><li>Internet/router and secure local network</li><li>PoE IP cameras + NVR + surveillance hard drive</li><li>UPS backup power</li><li>Access-control/door devices if required</li><li>Alarm/panic/fire devices if required</li><li>Register each installed device here</li><li>IT verifies connectivity; Security verifies operational view</li></ol>
 <p><strong>Important:</strong> a device should remain <em>Not Installed</em> or <em>Offline</em> until the real hardware is physically connected and verified.</p>`;
},
addCamera(){NEBUI.modal({title:'Register CCTV Camera',subtitle:'Register planned or installed real hardware',fields:[
{name:'code',label:'Camera code',placeholder:'CAM-001',required:true},{name:'location',label:'Location',placeholder:'Main Entrance',required:true},
{name:'type',label:'Camera type',type:'select',options:['PoE IP Camera','Wi-Fi IP Camera','Analog Camera']},{name:'install',label:'Installation status',type:'select',options:['Planned','Purchased','Installed']},
{name:'nvr',label:'NVR/DVR name'},{name:'zone',label:'Security zone'}],submitText:'Register Camera',onSubmit:async v=>{const {error}=await supabaseClient.from('security_cameras').insert({camera_code:v.code,location:v.location,camera_type:v.type,installation_status:v.install,status:v.install==='Installed'?'Offline':'Not Installed',recording:false,nvr_name:v.nvr||null,security_zone:v.zone||null});if(error)throw error;NEBUI.toast('Camera registered.','success');await EQ.load();return true}})},
addDevice(){NEBUI.modal({title:'Add Security Equipment',fields:[
{name:'code',label:'Equipment code',placeholder:'SEC-EQ-001',required:true},{name:'type',label:'Equipment type',type:'select',options:['NVR / DVR','PoE Switch','UPS','Access Control Reader','Door Lock','Alarm Panel','Panic Button','Smoke/Fire Sensor','Security Radio','Siren','Gate Controller','Visitor Pass Printer','Other']},
{name:'location',label:'Location'},{name:'install',label:'Installation status',type:'select',options:['Planned','Purchased','Installed']},{name:'serial',label:'Serial / Asset number'}],submitText:'Add Equipment',onSubmit:async v=>{const {error}=await supabaseClient.from('security_equipment').insert({equipment_code:v.code,equipment_type:v.type,location:v.location,installation_status:v.install,status:v.install==='Installed'?'Needs Verification':'Not Installed',serial_number:v.serial||null});if(error)throw error;NEBUI.toast('Equipment registered.','success');await EQ.load();return true}})},
addZone(){NEBUI.modal({title:'Add Security Zone / Post',fields:[{name:'code',label:'Zone code',placeholder:'ZONE-01',required:true},{name:'name',label:'Zone / Post name',placeholder:'Main Gate',required:true},{name:'type',label:'Type',type:'select',options:['Gate','Reception','Office Area','Store / Warehouse','Parking','Restricted Area','Server / IT Room','Other']}],submitText:'Add Zone',onSubmit:async v=>{const {error}=await supabaseClient.from('security_zones').insert({zone_code:v.code,name:v.name,zone_type:v.type,status:'Active'});if(error)throw error;NEBUI.toast('Security zone added.','success');await EQ.load();return true}})}
};
EQ.init();
