import {useEffect,useState} from 'react';
import {Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {
  createFinanceInternalAudit,
  createFinanceInternalAuditFinding,
  getFinanceInternalAudit,
  respondFinanceInternalAuditFinding,
  verifyFinanceInternalAuditAction,
} from '../lib/api';

const AUDIT_TYPES=['Risk-Based Review','Compliance Audit','Operational Audit','Financial Audit','Fraud / Investigation','Follow-up Audit'];
const RISK_LEVELS=['Low','Medium','High','Critical'];

export function InternalAuditWorkspace({onChanged}:{onChanged?:()=>Promise<void>|void}){
  const [data,setData]=useState<any>(null);
  const [busy,setBusy]=useState<string|null>(null);
  const [msg,setMsg]=useState<string|null>(null);
  const [showCreate,setShowCreate]=useState(false);
  const [auditType,setAuditType]=useState('Risk-Based Review');
  const [auditArea,setAuditArea]=useState('');
  const [auditRisk,setAuditRisk]=useState('Medium');
  const [auditTitle,setAuditTitle]=useState('');
  const [auditObjective,setAuditObjective]=useState('');
  const [auditScope,setAuditScope]=useState('');
  const [findingEngagement,setFindingEngagement]=useState('');
  const [findingCategory,setFindingCategory]=useState('');
  const [findingRisk,setFindingRisk]=useState('Medium');
  const [findingTitle,setFindingTitle]=useState('');
  const [findingCondition,setFindingCondition]=useState('');
  const [findingCriteria,setFindingCriteria]=useState('');
  const [findingCause,setFindingCause]=useState('');
  const [findingEffect,setFindingEffect]=useState('');
  const [findingRecommendation,setFindingRecommendation]=useState('');
  const [responseFinding,setResponseFinding]=useState('');
  const [responseText,setResponseText]=useState('');
  const [correctiveAction,setCorrectiveAction]=useState('');
  const [dueDate,setDueDate]=useState('');

  async function refresh(){
    try{
      setMsg(null);
      const r=await getFinanceInternalAudit();
      setData(r.data||{});
    }catch(e){setMsg(e instanceof Error?e.message:String(e))}
  }

  useEffect(()=>{refresh()},[]);

  async function run(id:string,fn:()=>Promise<any>){
    try{
      setBusy(id);setMsg(null);await fn();await refresh();if(onChanged)await onChanged();
    }catch(e){setMsg(e instanceof Error?e.message:String(e))}finally{setBusy(null)}
  }

  if(!data)return <View style={s.box}><Text style={s.h}>Internal Audit</Text><Text>{msg||'Loading Internal Audit…'}</Text></View>;

  const cap=data.capabilities||{};
  const summary=data.summary||{};
  const engagements=Array.isArray(data.engagements)?data.engagements:[];
  const findings=Array.isArray(data.findings)?data.findings:[];
  const actions=Array.isArray(data.actions)?data.actions:[];
  const areas=Array.isArray(data.audit_areas)?data.audit_areas:[];

  async function createAudit(){
    const title=auditTitle.trim()||auditArea||`${auditType} - Finance`;
    const objective=auditObjective.trim()||`Evaluate controls, compliance and risk in ${auditArea||'Finance & Accounts'}.`;
    const scope=auditScope.trim()||auditArea||'Finance & Accounts';
    await createFinanceInternalAudit(auditType,title,objective,scope,auditRisk);
    setAuditTitle('');setAuditObjective('');setAuditScope('');setShowCreate(false);
  }

  async function createFinding(){
    await createFinanceInternalAuditFinding(findingEngagement,findingCategory||'Control Exception',findingTitle.trim(),findingCondition.trim(),findingCriteria.trim(),findingCause.trim(),findingEffect.trim(),findingRisk,findingRecommendation.trim());
    setFindingTitle('');setFindingCondition('');setFindingCriteria('');setFindingCause('');setFindingEffect('');setFindingRecommendation('');
  }

  async function submitResponse(){
    await respondFinanceInternalAuditFinding(responseFinding,responseText.trim(),correctiveAction.trim(),dueDate.trim()||undefined);
    setResponseText('');setCorrectiveAction('');setDueDate('');
  }

  return <View style={s.box}>
    <Text style={s.h}>Internal Audit & Assurance</Text>
    <Text style={s.note}>Independent risk-based audit workspace: planning, control testing, evidence, findings, management responses, corrective actions and follow-up verification.</Text>

    <View style={s.metrics}>
      <Metric n={summary.active_engagements||0} label="Active audits"/>
      <Metric n={summary.open_findings||0} label="Open findings"/>
      <Metric n={summary.high_critical_findings||0} label="High/Critical"/>
      <Metric n={summary.overdue_actions||0} label="Overdue actions"/>
      <Metric n={summary.evidence_items||0} label="Evidence items"/>
      <Metric n={summary.tests_with_exceptions||0} label="Exceptions"/>
    </View>

    <Sub title="Audit Coverage">
      <View style={s.wrap}>{areas.map((x:string)=><View key={x} style={s.tag}><Text style={s.tagText}>{x}</Text></View>)}</View>
    </Sub>

    {cap.execute?<Sub title="Audit Planning & Execution">
      <Pressable style={s.primary} onPress={()=>setShowCreate(v=>!v)}><Text style={s.white}>{showCreate?'Close New Audit Form':'Start New Internal Audit'}</Text></Pressable>
      {showCreate?<View style={s.form}>
        <Label text="Audit type"/><View style={s.wrap}>{AUDIT_TYPES.map(x=><Choice key={x} label={x} selected={auditType===x} onPress={()=>setAuditType(x)}/>)}</View>
        <Label text="Audit area"/><View style={s.wrap}>{areas.map((x:string)=><Choice key={x} label={x} selected={auditArea===x} onPress={()=>setAuditArea(x)}/>)}</View>
        <Label text="Risk rating"/><View style={s.wrap}>{RISK_LEVELS.map(x=><Choice key={x} label={x} selected={auditRisk===x} onPress={()=>setAuditRisk(x)}/>)}</View>
        <TextInput style={s.input} placeholder="Audit title (optional)" value={auditTitle} onChangeText={setAuditTitle}/>
        <TextInput style={s.input} placeholder="Audit objective" value={auditObjective} onChangeText={setAuditObjective} multiline/>
        <TextInput style={s.input} placeholder="Audit scope" value={auditScope} onChangeText={setAuditScope} multiline/>
        <Pressable disabled={!!busy||!auditArea} style={[s.primary,(!auditArea||!!busy)&&s.disabled]} onPress={()=>run('create-audit',createAudit)}><Text style={s.white}>Create Audit Engagement</Text></Pressable>
      </View>:null}
    </Sub>:null}

    <Sub title="Audit Engagements">
      {engagements.slice(0,20).map((x:any)=><View key={x.id} style={s.row}>
        <Text style={s.rowTitle}>{x.audit_reference} · {x.title}</Text>
        <Text>{x.audit_type} · {x.risk_rating} Risk</Text>
        <Text style={s.meta}>{x.status} · Scope: {x.scope}</Text>
      </View>)}
      {!engagements.length?<Text>No internal audit engagements yet.</Text>:null}
    </Sub>

    {cap.execute&&engagements.length?<Sub title="Record Audit Finding">
      <Label text="Audit engagement"/><View style={s.wrap}>{engagements.slice(0,10).map((x:any)=><Choice key={x.id} label={x.audit_reference} selected={findingEngagement===x.id} onPress={()=>setFindingEngagement(x.id)}/>)}</View>
      <Label text="Finding category"/><View style={s.wrap}>{['Control Weakness','Reconciliation Exception','Compliance Breach','Unauthorized Transaction','Documentation Gap','Segregation of Duties','Fraud Indicator','Reporting Error'].map(x=><Choice key={x} label={x} selected={findingCategory===x} onPress={()=>setFindingCategory(x)}/>)}</View>
      <Label text="Risk rating"/><View style={s.wrap}>{RISK_LEVELS.map(x=><Choice key={x} label={x} selected={findingRisk===x} onPress={()=>setFindingRisk(x)}/>)}</View>
      <TextInput style={s.input} placeholder="Finding title" value={findingTitle} onChangeText={setFindingTitle}/>
      <TextInput style={s.input} placeholder="Condition / what was found" value={findingCondition} onChangeText={setFindingCondition} multiline/>
      <TextInput style={s.input} placeholder="Criteria / expected control or policy" value={findingCriteria} onChangeText={setFindingCriteria} multiline/>
      <TextInput style={s.input} placeholder="Cause" value={findingCause} onChangeText={setFindingCause} multiline/>
      <TextInput style={s.input} placeholder="Effect / risk exposure" value={findingEffect} onChangeText={setFindingEffect} multiline/>
      <TextInput style={s.input} placeholder="Recommendation" value={findingRecommendation} onChangeText={setFindingRecommendation} multiline/>
      <Pressable disabled={!!busy||!findingEngagement||!findingTitle.trim()||!findingCondition.trim()||!findingRecommendation.trim()} style={[s.primary,(!!busy||!findingEngagement||!findingTitle.trim()||!findingCondition.trim()||!findingRecommendation.trim())&&s.disabled]} onPress={()=>run('finding',createFinding)}><Text style={s.white}>Record Audit Finding</Text></Pressable>
    </Sub>:null}

    <Sub title="Findings & Recommendations">
      {findings.slice(0,30).map((x:any)=><View key={x.id} style={s.row}>
        <Text style={s.rowTitle}>{x.finding_reference} · {x.title}</Text>
        <Text>{x.risk_rating} Risk · {x.status}</Text>
        <Text style={s.meta}>Recommendation: {x.recommendation}</Text>
        {x.management_response?<Text style={s.meta}>Management response: {x.management_response}</Text>:null}
      </View>)}
      {!findings.length?<Text>No audit findings recorded.</Text>:null}
    </Sub>

    {cap.respond&&findings.some((x:any)=>!['Closed','Accepted Risk'].includes(x.status))?<Sub title="Management Response & Corrective Action">
      <Label text="Finding"/><View style={s.wrap}>{findings.filter((x:any)=>!['Closed','Accepted Risk'].includes(x.status)).slice(0,15).map((x:any)=><Choice key={x.id} label={x.finding_reference} selected={responseFinding===x.id} onPress={()=>setResponseFinding(x.id)}/>)}</View>
      <TextInput style={s.input} placeholder="Management response" value={responseText} onChangeText={setResponseText} multiline/>
      <TextInput style={s.input} placeholder="Corrective action" value={correctiveAction} onChangeText={setCorrectiveAction} multiline/>
      <TextInput style={s.input} placeholder="Due date YYYY-MM-DD (optional)" value={dueDate} onChangeText={setDueDate}/>
      <Pressable disabled={!!busy||!responseFinding||!responseText.trim()||!correctiveAction.trim()} style={[s.primary,(!!busy||!responseFinding||!responseText.trim()||!correctiveAction.trim())&&s.disabled]} onPress={()=>run('response',submitResponse)}><Text style={s.white}>Submit Management Response</Text></Pressable>
    </Sub>:null}

    <Sub title="Corrective Action Tracking & Follow-up">
      {actions.slice(0,30).map((x:any)=><View key={x.id} style={s.row}>
        <Text style={s.rowTitle}>{x.action_text}</Text>
        <Text>{x.owner_role||'Management'} · {x.status}</Text>
        <Text style={s.meta}>Due: {x.due_date||'Not set'}</Text>
        {cap.followup&&!['Verified','Closed'].includes(x.status)?<View style={s.actions}>
          <Pressable disabled={!!busy} style={s.primary} onPress={()=>run(`verify-${x.id}`,()=>verifyFinanceInternalAuditAction(x.id,'Verified','Follow-up evidence verified'))}><Text style={s.white}>Verify & Close</Text></Pressable>
          <Pressable disabled={!!busy} style={s.secondary} onPress={()=>run(`reopen-${x.id}`,()=>verifyFinanceInternalAuditAction(x.id,'Reopen','Further corrective action required'))}><Text style={s.secondaryText}>Reopen</Text></Pressable>
        </View>:null}
      </View>)}
      {!actions.length?<Text>No corrective actions recorded.</Text>:null}
    </Sub>

    <Sub title="Governance & Independence">
      <Text style={s.note}>Internal Auditor executes tests, controls evidence and verifies remediation. Finance management may respond to findings but cannot erase audit evidence or self-close findings. CEO/Manager retain oversight and External Auditor access remains controlled and read-only.</Text>
    </Sub>

    {msg?<Text style={s.err}>{msg}</Text>:null}
  </View>;
}

function Metric({n,label}:{n:number;label:string}){return <View style={s.metric}><Text style={s.num}>{n}</Text><Text style={s.meta}>{label}</Text></View>}
function Sub({title,children}:{title:string;children:any}){return <View style={s.sub}><Text style={s.subTitle}>{title}</Text>{children}</View>}
function Label({text}:{text:string}){return <Text style={s.label}>{text}</Text>}
function Choice({label,selected,onPress}:{label:string;selected:boolean;onPress:()=>void}){return <Pressable onPress={onPress} style={[s.choice,selected&&s.choiceSelected]}><Text style={[s.choiceText,selected&&s.choiceTextSelected]}>{selected?'✓ ':''}{label}</Text></Pressable>}

const s=StyleSheet.create({
  box:{borderTopWidth:1,borderTopColor:'#e5e7eb',marginTop:14,paddingTop:14},
  h:{fontWeight:'900',fontSize:18,color:'#14213d'},
  note:{fontSize:12,color:'#64748b',lineHeight:18,marginTop:5},
  metrics:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:12},
  metric:{width:'47%',backgroundColor:'#eef6f3',padding:11,borderRadius:12},
  num:{fontWeight:'900',fontSize:22,color:'#08745a'},
  meta:{fontSize:12,color:'#64748b'},
  sub:{borderTopWidth:1,borderTopColor:'#e5e7eb',marginTop:14,paddingTop:12},
  subTitle:{fontWeight:'900',fontSize:16,color:'#14213d',marginBottom:7},
  wrap:{flexDirection:'row',flexWrap:'wrap',gap:7},
  tag:{backgroundColor:'#eef2f7',paddingVertical:7,paddingHorizontal:9,borderRadius:9},
  tagText:{fontSize:12,color:'#334155'},
  form:{marginTop:10},
  label:{fontWeight:'800',fontSize:13,color:'#334155',marginTop:10,marginBottom:6},
  choice:{borderWidth:1,borderColor:'#cbd5e1',backgroundColor:'#fff',borderRadius:9,paddingVertical:8,paddingHorizontal:9},
  choiceSelected:{borderColor:'#0b5d45',backgroundColor:'#dff1eb'},
  choiceText:{fontSize:12,color:'#334155'},
  choiceTextSelected:{fontWeight:'900',color:'#0b5d45'},
  input:{borderWidth:1,borderColor:'#cbd5e1',backgroundColor:'#fff',borderRadius:9,padding:10,marginTop:8},
  primary:{backgroundColor:'#0b5d45',padding:9,borderRadius:9,alignSelf:'flex-start',marginTop:8},
  secondary:{backgroundColor:'#e2e8f0',padding:9,borderRadius:9,marginTop:8},
  secondaryText:{fontWeight:'800',color:'#14213d'},
  white:{color:'#fff',fontWeight:'800'},
  disabled:{opacity:.5},
  row:{borderTopWidth:1,borderTopColor:'#e5e7eb',paddingVertical:10,gap:4},
  rowTitle:{fontWeight:'900'},
  actions:{flexDirection:'row',flexWrap:'wrap',gap:8},
  err:{color:'#9b1c1c',marginTop:8},
});
