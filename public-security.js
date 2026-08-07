
/* Public security telemetry - does not expose detection rules to visitors */
(()=>{let submits=0,last=Date.now();
 document.addEventListener('submit',async()=>{const now=Date.now();submits=(now-last<10000)?submits+1:1;last=now;if(submits>=5){try{await supabaseClient.rpc('report_public_security_event',{p_event_type:'Rapid Form Submission',p_severity:'Medium',p_context:location.pathname})}catch{}}},true);
 window.addEventListener('error',async ev=>{try{await supabaseClient.rpc('report_public_security_event',{p_event_type:'Public Page Script Error',p_severity:'Low',p_context:location.pathname+': '+String(ev.message||'').slice(0,180)})}catch{}});
})();
