
/* NEBRIN Professional UI Kit - replaces browser prompt workflows */
window.NEBUI=window.NEBUI||{};
NEBUI.escape=(v='')=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
NEBUI.toast=(message,type='info')=>{
 let host=document.getElementById('nebToastHost');
 if(!host){host=document.createElement('div');host.id='nebToastHost';host.className='neb-toast-host';document.body.appendChild(host)}
 const n=document.createElement('div');n.className=`neb-toast ${type}`;n.textContent=message;host.appendChild(n);
 setTimeout(()=>n.remove(),4200);
};
NEBUI.modal=({title,subtitle='',fields=[],submitText='Save',danger=false,onSubmit})=>{
 document.querySelector('.neb-modal-backdrop')?.remove();
 const back=document.createElement('div');back.className='neb-modal-backdrop';
 const fieldHtml=fields.map(f=>{
   const id='neb_'+f.name, req=f.required?'required':'', full=f.full?'full':'';
   if(f.type==='textarea')return `<label class="${full}">${NEBUI.escape(f.label)}<textarea id="${id}" rows="${f.rows||4}" ${req} placeholder="${NEBUI.escape(f.placeholder||'')}">${NEBUI.escape(f.value||'')}</textarea></label>`;
   if(f.type==='select')return `<label class="${full}">${NEBUI.escape(f.label)}<select id="${id}" ${req}>${(f.options||[]).map(o=>typeof o==='string'?`<option>${NEBUI.escape(o)}</option>`:`<option value="${NEBUI.escape(o.value)}">${NEBUI.escape(o.label)}</option>`).join('')}</select></label>`;
   if(f.type==='file')return `<label class="${full}">${NEBUI.escape(f.label)}<input id="${id}" type="file" ${f.accept?`accept="${NEBUI.escape(f.accept)}"`:''}></label>`;
   return `<label class="${full}">${NEBUI.escape(f.label)}<input id="${id}" type="${f.type||'text'}" ${req} value="${NEBUI.escape(f.value||'')}" placeholder="${NEBUI.escape(f.placeholder||'')}"></label>`;
 }).join('');
 back.innerHTML=`<section class="neb-modal"><header><div><h2>${NEBUI.escape(title)}</h2>${subtitle?`<p>${NEBUI.escape(subtitle)}</p>`:''}</div><button class="neb-modal-close" aria-label="Close">×</button></header><form class="neb-modal-form"><div class="neb-form">${fieldHtml}</div><footer><button type="button" class="btn btn-secondary-admin neb-cancel">Cancel</button><button type="submit" class="btn ${danger?'btn-danger':'btn-primary'}">${NEBUI.escape(submitText)}</button></footer></form></section>`;
 document.body.appendChild(back);
 const close=()=>back.remove();back.querySelector('.neb-modal-close').onclick=close;back.querySelector('.neb-cancel').onclick=close;
 back.addEventListener('click',e=>{if(e.target===back)close()});
 back.querySelector('form').onsubmit=async e=>{
   e.preventDefault();const values={};
   for(const f of fields){const el=document.getElementById('neb_'+f.name);values[f.name]=f.type==='file'?el.files?.[0]:(f.type==='number'?Number(el.value||0):el.value)}
   const btn=e.submitter;btn.disabled=true;btn.textContent='Working…';
   try{const ok=await onSubmit(values);if(ok!==false)close()}catch(err){NEBUI.toast(err.message||String(err),'error')}
   finally{if(document.body.contains(btn)){btn.disabled=false;btn.textContent=submitText}}
 };
 back.querySelector('input,select,textarea')?.focus();
};
NEBUI.confirm=({title,message,confirmText='Confirm',onConfirm})=>NEBUI.modal({
 title,subtitle:message,fields:[{name:'note',label:'Note / reason',type:'textarea',full:true}],submitText:confirmText,onSubmit:async v=>onConfirm(v.note)
});
