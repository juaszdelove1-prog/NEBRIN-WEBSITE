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
