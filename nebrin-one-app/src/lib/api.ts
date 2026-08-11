import { supabase } from './supabase';
import type { BootstrapPayload, CommandCentrePayload, DigitalOfficeStatus } from '../types/app';

export function errorMessage(error: unknown) { if (error instanceof Error) return error.message; return String((error as any)?.message || 'Unexpected error'); }
async function invoke<T>(name:string, body:Record<string,unknown>):Promise<T>{ const {data,error}=await supabase.functions.invoke(name,{method:'POST',body}); if(error) throw new Error(error.message); if(!data?.success) throw new Error(data?.error || `Unable to load ${name}.`); return data as T; }
export const bootstrapApp=()=>invoke<BootstrapPayload>('nebrin-app-bootstrap',{});
export const getDigitalOfficeStatus=()=>invoke<DigitalOfficeStatus>('nebrin-digital-office',{action:'status'});
export const digitalOfficeAction=(action:'check_in'|'check_out'|'start_break'|'end_break',extra:Record<string,unknown>={})=>invoke<any>('nebrin-digital-office',{action,...extra});
export const getCommandCentre=()=>invoke<CommandCentrePayload>('nebrin-command-centre',{});
