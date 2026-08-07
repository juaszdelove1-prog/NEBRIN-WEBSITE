
/* NEBRIN Post-Audit functional overrides */
(async()=>{if(!window.NEBRIN||!window.NEBUI)return;
NEBRIN.createWork=async()=>{if(!NEBRIN.department)return;NEBUI.modal({title:'Create Department Work',subtitle:`${NEBRIN.department.name} work assignment`,fields:[
{name:'title',label:'Work title / subject',required:true,full:true},{name:'type',label:'Work type',value:'Department Task'},
{name:'priority',label:'Priority',type:'select',options:['Normal','Important','Urgent','Emergency']},{name:'description',label:'Instructions / description',type:'textarea',full:true},
{name:'due',label:'Due date/time',type:'datetime-local'}],submitText:'Create Work',onSubmit:async v=>{const {data,error}=await supabaseClient.rpc('create_department_work',{p_department_id:NEBRIN.department.id,p_title:v.title,p_work_type:v.type,p_priority:v.priority,p_description:v.description});if(error)throw error;NEBUI.toast(`Created ${data}`,'success');await NEBRIN.loadSharedWork();return true}})};
NEBRIN.composeCorrespondence=async()=>{const {data:ds,error}=await supabaseClient.from('departments').select('id,name').eq('is_active',true).order('name');if(error)return NEBUI.toast(error.message,'error');
NEBUI.modal({title:'Electronic Correspondence',subtitle:'Send a traceable electronic file to another department',fields:[
{name:'to',label:'To Department',type:'select',options:(ds||[]).map(d=>({value:d.id,label:d.name})),required:true},
{name:'priority',label:'Priority',type:'select',options:['Normal','Important','Urgent','Emergency']},
{name:'classification',label:'Classification',type:'select',options:['Normal','Internal','Confidential','Highly Confidential','Executive Only']},
{name:'subject',label:'Subject',required:true,full:true},{name:'message',label:'Message / instructions',type:'textarea',full:true,required:true},
{name:'due',label:'Due date/time',type:'datetime-local'}],submitText:'Send Electronic File',onSubmit:async v=>{const {data,error:e}=await supabaseClient.rpc('create_electronic_file',{p_to_department_id:v.to,p_subject:v.subject,p_message:v.message,p_priority:v.priority,p_classification:v.classification});if(e)throw e;NEBUI.toast(`Sent ${data}`,'success');await NEBRIN.loadSharedCorrespondence();return true}})};
NEBRIN.callStaff=async()=>{if(!NEBRIN.isHod()||!NEBRIN.department)return NEBUI.toast('HOD access is required.','error');
const {data:staff,error}=await supabaseClient.from('admin_users').select('user_id,full_name,role,current_work_status').eq('approval_status','Approved').eq('is_active',true).eq('department_id',NEBRIN.department.id).neq('user_id',NEBRIN.profile.user_id).order('full_name');if(error)return NEBUI.toast(error.message,'error');
NEBUI.modal({title:'Call Department Staff',subtitle:'Internal office call',fields:[
{name:'employee',label:'Employee',type:'select',options:(staff||[]).map(s=>({value:s.user_id,label:`${s.full_name} — ${s.role} (${s.current_work_status||'Available'})`})),required:true},
{name:'priority',label:'Priority',type:'select',options:['Normal','Important','Urgent']},{name:'destination',label:'Call to',type:'select',options:['HOD Office','Manager Office','CEO Office','Meeting Room']},
{name:'message',label:'Reason / message',type:'textarea',full:true,value:'Please report to the HOD office.'}],submitText:'Send Office Call',onSubmit:async v=>{const {error:e}=await supabaseClient.from('internal_office_messages').insert({from_user_id:NEBRIN.profile.user_id,to_user_id:v.employee,from_department_id:NEBRIN.department.id,to_department_id:NEBRIN.department.id,message_type:'Office Call',priority:v.priority,subject:v.destination,message:v.message});if(e)throw e;NEBUI.toast('Office call sent.','success');await NEBRIN.loadOfficeCalls();return true}})};
NEBRIN.askAI=async()=>NEBUI.modal({title:'NEBRIN AI / IT Support',subtitle:'First-line diagnosis and automatic IT ticket routing',fields:[
{name:'category',label:'Problem category',type:'select',options:['System / Website','Account / Login','Database','Printer / Scanner','Network / Internet','Hardware','Software','Security / Suspicious Activity','Other']},
{name:'priority',label:'Urgency',type:'select',options:['Normal','Important','Urgent','Emergency']},{name:'issue',label:'Describe the problem',type:'textarea',full:true,required:true},
{name:'evidence',label:'Screenshot / supporting file',type:'file',full:true,accept:'image/*,.pdf'}],submitText:'Diagnose & Create Ticket',onSubmit:async v=>{
let suggestion='Capture the exact error and avoid repeated submissions while IT reviews the issue.';if(/login|account/i.test(v.category))suggestion='Verify the staff email, approval status and account access; never share passwords.';if(/security/i.test(v.category))suggestion='Stop the suspicious action, preserve evidence and escalate to Security/IT.';
const {data,error}=await supabaseClient.rpc('create_ai_support_request',{p_issue:v.issue,p_category:v.category,p_suggestion:suggestion});if(error)throw error;NEBUI.toast(`IT ticket ${data} created.`,'success');return true}});

const oldStart=NEBRIN.startBreak;
NEBRIN.startBreak=async()=>{const {data:a,error}=await supabaseClient.rpc('get_my_attendance_today');if(error)return NEBUI.toast(error.message,'error');const r=Array.isArray(a)?a[0]:a;if(!r?.check_in_at||r?.check_out_at)return NEBUI.toast('You must be checked in and currently working before starting a break.','error');
NEBUI.modal({title:'Start Approved Break',subtitle:'Your work status will change to On Break.',fields:[{name:'type',label:'Break type',type:'select',options:['Tea Break','Lunch Break','Short Rest']}],submitText:'Start Break',onSubmit:async v=>{const {error:e}=await supabaseClient.rpc('start_staff_break',{p_break_type:v.type});if(e)throw e;NEBUI.toast('Break started.','success');await NEBRIN.loadMyAttendance();NEBRIN.showLounge(true);return true}})};
})();
