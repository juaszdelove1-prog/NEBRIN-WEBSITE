window.NEBRIN_ROLE_DASHBOARD={
 'CEO':'ceo.html','Super Admin':'ceo.html','Manager':'manager.html',
 'Accountant':'finance.html','Finance':'finance.html',
 'Graphics':'graphics.html','Graphic Designer':'graphics.html',
 'IT':'it.html','Information Technology':'it.html','Digital Staff':'it.html',
 'Customer Care':'customer-care.html','Secretary':'secretary.html',
 'HR':'hr.html','Human Resources':'hr.html'
};
window.nebrinOpenRoleDashboard=function(role){
 const target=window.NEBRIN_ROLE_DASHBOARD[role]||'admin.html';
 location.href=target;
};
Object.assign(window.NEBRIN_ROLE_DASHBOARD,{
'Secretary':'secretary.html','Customer Care':'customer-care-dashboard.html',
'Registry Officer':'registry.html','Records Officer':'registry.html',
'Business Officer':'business.html','Business Manager':'business.html',
'Legal Officer':'legal.html','Legal Counsel':'legal.html',
'Sales Field Manager':'sales-field.html','Field Supervisor':'sales-field.html','Team Leader':'sales-field.html',
'Lipa Agent':'sales-field.html','SIM Registration Agent':'sales-field.html','Field Officer':'sales-field.html',
'Registration Officer':'registration.html'
});
