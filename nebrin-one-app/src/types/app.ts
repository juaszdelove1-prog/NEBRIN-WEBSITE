export type BootstrapPayload={success:boolean;access:{full_name?:string|null;email?:string|null;role?:string|null;role_code?:string|null;department?:string|null;department_name?:string|null;job_title?:string|null;approval_status?:string|null;current_work_status?:string|null;permissions?:string[]};navigation:{home:string;modules:Record<string,boolean>}};

export type DigitalOfficeStatus={success:boolean;office_access:{allowed:boolean;reason:string;scheduled_end:string|null}|null;attendance:{check_in_at:string|null;check_out_at:string|null;status:string|null}|null;active_break:Record<string,unknown>|null};

export type CommandCentrePayload={success:boolean;data:{departments?:Array<Record<string,any>>|{error:string};attendance?:Array<Record<string,any>>|{error:string};online?:Array<Record<string,any>>|{error:string};reports?:Array<Record<string,any>>|{error:string};security?:Array<Record<string,any>>|{error:string};workflow?:Array<Record<string,any>>|{error:string}}};

export type HREmployee={user_id:string;employee_number?:string|null;full_name?:string|null;email?:string|null;phone?:string|null;role?:string|null;department?:string|null;is_active?:boolean|null;job_title?:string|null;employment_type?:string|null;employment_status?:string|null;salary_grade?:string|null;contract_end_date?:string|null;document_count?:number|null};

export type HRStaffingRequest={id:string;request_number?:string|null;position_title?:string|null;number_required?:number|null;reason?:string|null;status?:string|null;current_holder?:string|null;created_at?:string|null};

export type HRPayload={success:boolean;summary:{active_employees:number;probation:number;contracts_ending_soon:number;open_staffing_requests:number};employees:HREmployee[];staffing_requests:HRStaffingRequest[]};
