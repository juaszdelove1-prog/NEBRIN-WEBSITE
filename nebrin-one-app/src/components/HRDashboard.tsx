import{StyleSheet,Text,View}from'react-native';import type{HRPayload}from'../types/app';import{Card}from'./Card';

function list<T>(value:T[]|undefined){return Array.isArray(value)?value:[]}

export function HRDashboard({payload}:{payload:HRPayload|null}){
 if(!payload)return null;
 const employees=list(payload.employees),requests=list(payload.staffing_requests);
 const raw:any=payload as any;
 const s=raw.summary||raw.stats||{};
 const active=Number(s.active_employees||0);
 const probation=Number(s.probation||0);
 const openRequests=Number(s.open_staffing_requests||0);
 const contractsEnding=Number(s.contracts_ending_soon||employees.filter((x:any)=>{if(!x.contract_end_date)return false;const end=new Date(x.contract_end_date).getTime();const now=Date.now();return end>=now&&end-now<=1000*60*60*24*60}).length||0);
 return <>
  <Card title="HR Command Centre">
   <View style={st.grid}>
    <K n={active} t="Active Employees"/>
    <K n={probation} t="Probation"/>
    <K n={contractsEnding} t="Contracts Ending"/>
    <K n={openRequests} t="Staffing Requests"/>
   </View>
  </Card>
  <Card title="Employee Directory">
   {employees.slice(0,12).map(x=><View key={x.user_id} style={st.row}><Text style={st.strong}>{x.full_name||x.email||'Employee'}</Text><Text style={st.muted}>{x.job_title||x.role||'Staff'} · {x.department||'No department'}</Text><Text style={st.small}>{x.employment_status||'—'}{x.employee_number?` · ${x.employee_number}`:''}</Text></View>)}
   {!employees.length?<Text>No employee records available.</Text>:null}
  </Card>
  <Card title="Staffing & Recruitment Requests">
   {requests.slice(0,10).map(x=><View key={x.id} style={st.row}><Text style={st.strong}>{x.position_title||'Staffing Request'}</Text><Text style={st.muted}>{x.request_number||''} · Required {x.number_required||1}</Text><Text style={st.small}>{x.status||'Pending'}{x.current_holder?` · ${x.current_holder}`:''}</Text></View>)}
   {!requests.length?<Text>No open staffing requests.</Text>:null}
  </Card>
 </>
}
function K({n,t}:{n:number;t:string}){return <View style={st.kpi}><Text style={st.num}>{n||0}</Text><Text style={st.label}>{t}</Text></View>}
const st=StyleSheet.create({grid:{flexDirection:'row',flexWrap:'wrap',gap:10},kpi:{width:'47%',backgroundColor:'#eef6f3',borderRadius:14,padding:14},num:{fontSize:25,fontWeight:'900',color:'#0b5d45'},label:{fontSize:12,fontWeight:'700',color:'#334155',marginTop:4},row:{paddingVertical:11,borderBottomWidth:1,borderBottomColor:'#e8edf2'},strong:{fontWeight:'900',color:'#14213d'},muted:{color:'#475569',marginTop:3},small:{fontSize:12,color:'#64748b',marginTop:3}});
