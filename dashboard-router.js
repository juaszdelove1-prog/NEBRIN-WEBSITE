window.NEBRIN_ROLE_DASHBOARD={
'CEO':'ceo.html','Super Admin':'ceo.html','Manager':'manager.html',
'Accountant':'finance.html','Finance':'finance.html','Finance Officer':'finance.html','Cashier':'finance.html',
'Graphics':'graphics.html','Graphic Designer':'graphics.html','Printing Officer':'graphics.html',
'IT':'it.html','Information Technology':'it.html','Digital Staff':'it.html','IT Officer':'it.html','System Administrator':'it.html',
'Customer Care':'customer-care-dashboard.html','Customer Care Officer':'customer-care-dashboard.html',
'Secretary':'secretary.html','Receptionist':'secretary.html',
'HR':'hr.html','Human Resources':'hr.html','HR Officer':'hr.html',
'Registry Officer':'registry.html','Records Officer':'registry.html','Archivist':'registry.html','Librarian':'registry.html',
'Business Officer':'business.html','Business Manager':'business.html',
'Legal Officer':'legal.html','Legal Counsel':'legal.html','Company Lawyer':'legal.html',
'Sales Field Manager':'sales-field.html','Field Supervisor':'sales-field.html','Team Leader':'sales-field.html','Lipa Agent':'sales-field.html','SIM Registration Agent':'sales-field.html','Field Officer':'sales-field.html',
'Registration Officer':'registration.html','Registration Specialist':'registration.html',
'Security Officer':'security-department.html','Security HOD':'security-department.html','Risk Officer':'security-department.html',
'Staff':'staff-room.html'
};
window.nebrinOpenRoleDashboard=function(role){location.href=window.NEBRIN_ROLE_DASHBOARD[role]||'staff-room.html';};

window.nebrinDashboardForProfile=function(p){
 if(!p)return 'admin.html';
 if(['CEO','Super Admin'].includes(p.role))return 'ceo.html';
 if(p.role==='Manager')return 'manager.html';
 const codeMap={'Management':'manager.html','Secretary & Digital Reception':'secretary.html','Customer Care & Client Relations':'customer-care-dashboard.html','Human Resources & Recruitment':'hr.html','Finance & Accounts':'finance.html','Business & Entrepreneurship':'business.html','Legal & Legal Advisory':'legal.html','Registration & Government Services':'registration.html','Sales Field & Agency Operations':'sales-field.html','Graphics, Branding & Creative':'graphics.html','Information Technology & Digital Services':'it.html','Central Registry & Records':'registry.html','Security & Risk Management':'security-department.html','Publishing & Content Management':'cms.html'};
 return codeMap[p.department]||window.NEBRIN_ROLE_DASHBOARD[p.role]||'staff-room.html';
};
