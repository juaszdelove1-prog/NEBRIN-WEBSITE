
/* Makes each department operationally distinct; shared tools are secondary. */
const DEPT_META={
 finance:{title:'Finance & Accounting Control',sub:'Accounting books, cashier, treasury and financial reporting',nav:['Overview','Transactions','Journal','Ledger','Trial Balance','Reports']},
 business:{title:'Business & Commercial Operations',sub:'Sales, inventory, suppliers, purchases and entrepreneurship',nav:['Overview','Sales','Inventory','Purchases','Suppliers','Business Cases']},
 legal:{title:'Legal Practice & Compliance',sub:'Contracts, legal files, advisory, disputes and compliance',nav:['Overview','Legal Files','Contracts','Cases','Compliance','Signatures']},
 registration:{title:'Registration Service Operations',sub:'Customer registrations, document verification and authority tracking',nav:['Overview','New Case','Verification','Processing','Legal Review','Authority']},
 field:{title:'Sales Field Operations',sub:'Field assignments, agents, teams, targets and customer visits',nav:['Overview','Assignments','Teams','Targets','Visits','Reports']},
 graphics:{title:'Creative Production Studio',sub:'Design jobs, brand assets, approvals and printing',nav:['Overview','Creative Jobs','Reviews','Print Queue','Brand Library','Delivery']},
 it:{title:'IT Systems Operations',sub:'Help desk, infrastructure, cybersecurity, assets and system monitoring',nav:['Control Wall','Tickets','Systems','Assets','Backup','Knowledge Base']},
 registry:{title:'Registry, Records & Archives',sub:'Document control, file movement, archives, retention and library',nav:['Registry Desk','Incoming','Outgoing','Archives','Retention','Library']},
 hr:{title:'People & HR Operations',sub:'Recruitment, employee lifecycle, leave, discipline and workforce planning',nav:['Overview','Recruitment','Employees','Leave','Discipline','Onboarding']},
 cms:{title:'Publishing & Content Control',sub:'Content creation, approval, scheduling and website publishing',nav:['Content Desk','Drafts','Approval Queue','Calendar','Media','Published']},
 security:{title:'Security Operations Command',sub:'CCTV, incidents, guards, access control, patrols and risk',nav:['Command Wall','CCTV','Incidents','Guard Posts','Patrols','Risk Register']}
};
function transformDepartment(){
 const body=document.body,module=body.dataset.module;if(!module||!DEPT_META[module])return;
 const main=document.querySelector('main.neb-shell');const workspace=document.getElementById('nebWorkspace');if(!main||!workspace)return;
 const meta=DEPT_META[module];const oldHeader=document.querySelector('.site-header');if(oldHeader)oldHeader.style.display='none';
 body.classList.add('neb-professional-department');
 const access=document.getElementById('nebAccess');if(access)access.style.margin='25px';
 const oldIntro=workspace.querySelector('.v21-section-intro');const cmd=workspace.querySelector('.neb-commandbar');const stats=document.getElementById('modStats');const mod=document.getElementById('modMain');
 const deptOps=[...workspace.children].find(x=>x.classList?.contains('neb-section-title')&&x.textContent.includes('Department Operations'));
 let opsGrid=deptOps?.nextElementSibling;
 const lounge=document.getElementById('nebLounge');
 const shell=document.createElement('div');shell.className='neb-pro-shell';
 const side=document.createElement('aside');side.className='neb-pro-side';side.innerHTML=`<div class="brand-mini">NEBRIN<small>${NEBUI.escape(meta.title)}</small></div><nav class="neb-pro-nav">${meta.nav.map((n,i)=>`<button class="${i===0?'active':''}">${NEBUI.escape(n)}</button>`).join('')}<a href="staff-room.html">Staff Room</a><a href="staffing-requests.html">Staffing Requests</a></nav>`;
 const content=document.createElement('div');content.className='neb-pro-main';
 const top=document.createElement('div');top.className='neb-pro-top';top.innerHTML=`<div><h1>${NEBUI.escape(meta.title)}</h1><p>${NEBUI.escape(meta.sub)}</p></div><div class="neb-pro-actions"><button class="btn btn-primary" onclick="NEBRIN.createWork()">New Work</button><button class="btn btn-secondary-admin" onclick="NEBRIN.composeCorrespondence()">Correspondence</button><button class="btn btn-secondary-admin" onclick="NEBRIN.callStaff()">Call Staff</button></div>`;
 content.appendChild(top);if(stats)content.appendChild(stats);if(mod)content.appendChild(mod);
 if(opsGrid){const details=document.createElement('details');details.className='neb-corporate-tools';details.innerHTML='<summary>Shared Corporate Tools — Attendance, HOD Staff, Correspondence & Office Calls</summary><div class="corp-content"></div>';details.querySelector('.corp-content').appendChild(opsGrid);content.appendChild(details)}
 if(lounge)content.appendChild(lounge);shell.append(side,content);workspace.innerHTML='';workspace.appendChild(shell);
 if(oldIntro)oldIntro.remove();if(cmd)cmd.remove();if(deptOps)deptOps.remove();
}
document.addEventListener('DOMContentLoaded',()=>setTimeout(transformDepartment,40));
