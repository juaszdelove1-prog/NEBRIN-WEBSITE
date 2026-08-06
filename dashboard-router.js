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