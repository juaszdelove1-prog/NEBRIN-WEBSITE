import{supabase}from'./supabase';import type{BootstrapPayload,CommandCentrePayload,DigitalOfficeStatus,HRPayload,WorkflowPayload}from'../types/app';
export function errorMessage(e:unknown){return e instanceof Error?e.message:String((e as any)?.message||'Unexpected error')}
async function call<T>(name:string,body:Record<string,unknown>):Promise<T>{const{data,error}=await supabase.functions.invoke(name,{method:'POST',body});if(error)throw new Error(error.message);if(!data?.success)throw new Error(data?.error||`Unable to load ${name}.`);return data as T}
export const bootstrapApp=()=>call<BootstrapPayload>('nebrin-app-bootstrap',{});
export const getDigitalOfficeStatus=()=>call<DigitalOfficeStatus>('nebrin-digital-office',{action:'status'});
export const digitalOfficeAction=(action:'check_in'|'check_out'|'start_break'|'end_break')=>call<any>('nebrin-digital-office',{action});
export const getCommandCentre=()=>call<CommandCentrePayload>('nebrin-command-centre',{});
export const getHRCentre=()=>call<HRPayload>('nebrin-hr-centre',{action:'dashboard'});
export const getWorkflowCentre=()=>call<WorkflowPayload>('nebrin-workflow-centre',{action:'overview'});
export const secretaryRouteCase=(case_id:string,to_department_id:string,instruction?:string)=>call<any>('nebrin-workflow-centre',{action:'secretary_route',case_id,to_department_id,instruction:instruction||null});
export const routeWorkflowFile=(file_id:string,to_department_id:string,instruction?:string)=>call<any>('nebrin-workflow-centre',{action:'route_file',file_id,to_department_id,instruction:instruction||null});
export const claimWorkflowFile=(file_id:string)=>call<any>('nebrin-workflow-centre',{action:'claim_file',file_id});
export const returnWorkflowFile=(file_id:string,note?:string)=>call<any>('nebrin-workflow-centre',{action:'return_file',file_id,note:note||'Returned after action'});
