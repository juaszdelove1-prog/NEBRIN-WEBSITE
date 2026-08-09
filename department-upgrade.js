/* ============================================================
   NEBRIN DEPARTMENT PROFESSIONAL UPGRADE
   HR NAVIGATION FIX + CORPORATE DEPARTMENT SHELL
   ============================================================ */

/* Makes each department operationally distinct;
   shared tools remain secondary. */

const DEPT_META={

 finance:{
   title:'Finance & Accounting Control',
   sub:'Accounting books, cashier, treasury and financial reporting',
   nav:[
     'Overview',
     'Transactions',
     'Journal',
     'Ledger',
     'Trial Balance',
     'Reports'
   ]
 },

 business:{
   title:'Business & Commercial Operations',
   sub:'Sales, inventory, suppliers, purchases and entrepreneurship',
   nav:[
     'Overview',
     'Sales',
     'Inventory',
     'Purchases',
     'Suppliers',
     'Business Cases'
   ]
 },

 legal:{
   title:'Legal Practice & Compliance',
   sub:'Contracts, legal files, advisory, disputes and compliance',
   nav:[
     'Overview',
     'Legal Files',
     'Contracts',
     'Cases',
     'Compliance',
     'Signatures'
   ]
 },

 registration:{
   title:'Registration Service Operations',
   sub:'Customer registrations, document verification and authority tracking',
   nav:[
     'Overview',
     'New Case',
     'Verification',
     'Processing',
     'Legal Review',
     'Authority'
   ]
 },

 field:{
   title:'Sales Field Operations',
   sub:'Field assignments, agents, teams, targets and customer visits',
   nav:[
     'Overview',
     'Assignments',
     'Teams',
     'Targets',
     'Visits',
     'Reports'
   ]
 },

 graphics:{
   title:'Creative Production Studio',
   sub:'Design jobs, brand assets, approvals and printing',
   nav:[
     'Overview',
     'Creative Jobs',
     'Reviews',
     'Print Queue',
     'Brand Library',
     'Delivery'
   ]
 },

 it:{
   title:'IT Systems Operations',
   sub:'Help desk, infrastructure, cybersecurity, assets and system monitoring',
   nav:[
     'Control Wall',
     'Tickets',
     'Systems',
     'Assets',
     'Backup',
     'Knowledge Base'
   ]
 },

 registry:{
   title:'Registry, Records & Archives',
   sub:'Document control, file movement, archives, retention and library',
   nav:[
     'Registry Desk',
     'Incoming',
     'Outgoing',
     'Archives',
     'Retention',
     'Library'
   ]
 },

 hr:{
   title:'People & HR Operations',
   sub:'Recruitment, employee lifecycle, leave, discipline and workforce planning',

   nav:[
     'Overview',
     'Recruitment',
     'Employees',
     'Leave',
     'Discipline',
     'Onboarding'
   ]
 },

 cms:{
   title:'Publishing & Content Control',
   sub:'Content creation, approval, scheduling and website publishing',
   nav:[
     'Content Desk',
     'Drafts',
     'Approval Queue',
     'Calendar',
     'Media',
     'Published'
   ]
 },

 security:{
   title:'Security Operations Command',
   sub:'CCTV, incidents, guards, access control, patrols and risk',
   nav:[
     'Command Wall',
     'CCTV',
     'Incidents',
     'Guard Posts',
     'Patrols',
     'Risk Register'
   ]
 }

};


/* ============================================================
   HR NAVIGATION ROUTES
   ============================================================ */

const HR_NAVIGATION={

 'Overview':()=>{
   if(window.NEBMOD?.hrOverview){
     NEBMOD.hrOverview();
   }
 },

 'Recruitment':()=>{
   if(window.NEBMOD?.hrRecruitment){
     NEBMOD.hrRecruitment();
   }
 },

 'Employees':()=>{
   if(window.NEBMOD?.hrEmployees){
     NEBMOD.hrEmployees();
   }
 },

 'Leave':()=>{
   if(window.NEBMOD?.hrLeave){
     NEBMOD.hrLeave();
   }
 },

 'Discipline':()=>{
   if(window.NEBMOD?.hrDiscipline){
     NEBMOD.hrDiscipline();
   }
 },

 'Onboarding':()=>{
   if(window.NEBMOD?.hrOnboarding){
     NEBMOD.hrOnboarding();
   }
 }

};


/* ============================================================
   SET ACTIVE NAVIGATION BUTTON
   ============================================================ */

function setDepartmentActiveNav(navElement,button){

 if(!navElement || !button)return;

 navElement
   .querySelectorAll('button')
   .forEach(btn=>{
     btn.classList.remove('active');
   });

 button.classList.add('active');

}


/* ============================================================
   CONNECT DEPARTMENT NAVIGATION
   ============================================================ */

function connectDepartmentNavigation(
 module,
 navElement
){

 if(!navElement)return;


 const buttons=
   [...navElement.querySelectorAll(
     'button[data-dept-nav]'
   )];


 buttons.forEach(button=>{

   button.addEventListener(
     'click',
     async()=>{

       const section=
         button.dataset.deptNav;


       /* ------------------------------------------
          HR FUNCTIONAL NAVIGATION
          ------------------------------------------ */

       if(module==='hr'){

         const action=
           HR_NAVIGATION[section];

         if(action){

           setDepartmentActiveNav(
             navElement,
             button
           );

           try{

             await action();

             window.scrollTo({
               top:0,
               behavior:'smooth'
             });

           }catch(error){

             console.error(
               'NEBRIN HR navigation error:',
               error
             );

             alert(
               'Unable to open this HR section.'
             );

           }

         }

         return;

       }


       /* ------------------------------------------
          OTHER DEPARTMENTS
          Currently retain their overview module.
          Detailed routing will be connected when
          each department is upgraded.
          ------------------------------------------ */

       setDepartmentActiveNav(
         navElement,
         button
       );

       console.log(
         `NEBRIN ${module} navigation:`,
         section
       );

     }

   );

 });

}


/* ============================================================
   TRANSFORM DEPARTMENT
   ============================================================ */

function transformDepartment(){

 const body=
   document.body;

 const module=
   body.dataset.module;


 if(
   !module ||
   !DEPT_META[module]
 ){
   return;
 }


 const main=
   document.querySelector(
     'main.neb-shell'
   );

 const workspace=
   document.getElementById(
     'nebWorkspace'
   );


 if(
   !main ||
   !workspace
 ){
   return;
 }


 const meta=
   DEPT_META[module];


 /* ------------------------------------------
    Hide old page header
    ------------------------------------------ */

 const oldHeader=
   document.querySelector(
     '.site-header'
   );

 if(oldHeader){
   oldHeader.style.display='none';
 }


 body.classList.add(
   'neb-professional-department'
 );


 const access=
   document.getElementById(
     'nebAccess'
   );

 if(access){
   access.style.margin='25px';
 }


 /* ------------------------------------------
    Capture original sections before rebuild
    ------------------------------------------ */

 const oldIntro=
   workspace.querySelector(
     '.v21-section-intro'
   );

 const cmd=
   workspace.querySelector(
     '.neb-commandbar'
   );

 const stats=
   document.getElementById(
     'modStats'
   );

 const mod=
   document.getElementById(
     'modMain'
   );


 const deptOps=
   [...workspace.children]
   .find(
     x=>
       x.classList?.contains(
         'neb-section-title'
       ) &&
       x.textContent.includes(
         'Department Operations'
       )
   );


 let opsGrid=
   deptOps?.nextElementSibling;


 const lounge=
   document.getElementById(
     'nebLounge'
   );


 /* ============================================================
    PROFESSIONAL SHELL
    ============================================================ */

 const shell=
   document.createElement('div');

 shell.className=
   'neb-pro-shell';


 /* ============================================================
    SIDEBAR
    ============================================================ */

 const side=
   document.createElement('aside');

 side.className=
   'neb-pro-side';


 side.innerHTML=`

   <div class="brand-mini">

     NEBRIN

     <small>
       ${NEBUI.escape(
         meta.title
       )}
     </small>

   </div>


   <nav class="neb-pro-nav">

     ${
       meta.nav.map(
         (name,index)=>`

           <button
             type="button"
             data-dept-nav="${NEBUI.escape(name)}"
             class="${
               index===0
               ?'active'
               :''
             }"
           >
             ${NEBUI.escape(name)}
           </button>

         `
       ).join('')
     }


     <a
       href="staff-room.html"
     >
       Staff Room
     </a>


     <a
       href="staffing-requests.html"
     >
       Staffing Requests
     </a>

   </nav>

 `;


 /* ============================================================
    MAIN CONTENT
    ============================================================ */

 const content=
   document.createElement('div');

 content.className=
   'neb-pro-main';


 /* ============================================================
    TOP COMMAND BAR
    ============================================================ */

 const top=
   document.createElement('div');

 top.className=
   'neb-pro-top';


 top.innerHTML=`

   <div>

     <h1>
       ${NEBUI.escape(
         meta.title
       )}
     </h1>

     <p>
       ${NEBUI.escape(
         meta.sub
       )}
     </p>

   </div>


   <div class="neb-pro-actions">

     <button
       type="button"
       class="btn btn-primary"
       onclick="NEBRIN.createWork()"
     >
       New Work
     </button>


     <button
       type="button"
       class="btn btn-secondary-admin"
       onclick="NEBRIN.composeCorrespondence()"
     >
       Correspondence
     </button>


     <button
       type="button"
       class="btn btn-secondary-admin"
       onclick="NEBRIN.callStaff()"
     >
       Call Staff
     </button>

   </div>

 `;


 content.appendChild(top);


 /* ============================================================
    STATISTICS
    ============================================================ */

 if(stats){
   content.appendChild(stats);
 }


 /* ============================================================
    DEPARTMENT MODULE
    ============================================================ */

 if(mod){
   content.appendChild(mod);
 }


 /* ============================================================
    SHARED CORPORATE TOOLS
    ============================================================ */

 if(opsGrid){

   const details=
     document.createElement(
       'details'
     );

   details.className=
     'neb-corporate-tools';


   details.innerHTML=`

     <summary>
       Shared Corporate Tools —
       Attendance, HOD Staff,
       Correspondence & Office Calls
     </summary>

     <div class="corp-content"></div>

   `;


   details
     .querySelector(
       '.corp-content'
     )
     .appendChild(
       opsGrid
     );


   content.appendChild(
     details
   );

 }


 /* ============================================================
    BREAK LOUNGE
    ============================================================ */

 if(lounge){
   content.appendChild(
     lounge
   );
 }


 /* ============================================================
    BUILD PAGE
    ============================================================ */

 shell.append(
   side,
   content
 );


 workspace.innerHTML='';

 workspace.appendChild(
   shell
 );


 /* ============================================================
    REMOVE OLD UI
    ============================================================ */

 if(oldIntro){
   oldIntro.remove();
 }

 if(cmd){
   cmd.remove();
 }

 if(deptOps){
   deptOps.remove();
 }


 /* ============================================================
    ACTIVATE NAVIGATION
    ============================================================ */

 const navElement=
   side.querySelector(
     '.neb-pro-nav'
   );


 connectDepartmentNavigation(
   module,
   navElement
 );

}


/* ============================================================
   START
   ============================================================ */

document.addEventListener(
 'DOMContentLoaded',
 ()=>{

   setTimeout(
     transformDepartment,
     40
   );

 }
);