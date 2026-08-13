import {useEffect,useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {acceptFinanceAIDraft,askFinanceAccountingAI,createFinanceBookEntry,getFinanceAccountingBookDetail} from '../lib/api';

type Book={key:string;title:string;group:string;mode?:'work'|'review'};

export function WorkingAccountingBook({book,roleCode,onChanged}:{book:Book;roleCode:string;onChanged?:()=>Promise<void>|void}){
 const[detail,setDetail]=useState<any>(null),[busy,setBusy]=useState<string|null>(null),[msg,setMsg]=useState<string|null>(null);
 const[entryOpen,setEntryOpen]=useState(false),[aiOpen,setAiOpen]=useState(false),[sourceOpen,setSourceOpen]=useState(false);
 const[date,setDate]=useState(new Date().toISOString().slice(0,10)),[reference,setReference]=useState(''),[description,setDescription]=useState(''),[accountCode,setAccountCode]=useState(''),[counterparty,setCounterparty]=useState(''),[debit,setDebit]=useState(''),[credit,setCredit]=useState('');
 const[aiTask,setAiTask]=useState(''),[aiDraft,setAiDraft]=useState<any>(null);
 const isReviewOnly=book.mode==='review'||['profit_loss','balance_sheet','cash_flow','equity'].includes(book.key);
 async function load(){try{setBusy('load');setMsg(null);const r=await getFinanceAccountingBookDetail(book.key);setDetail(r.data||{})}catch(e){setMsg(e instanceof Error?e.message:String(e))}finally{setBusy(null)}}
 useEffect(()=>{load();setEntryOpen(false);setAiOpen(false);setSourceOpen(false);setAiDraft(null)},[book.key]);
 const working=Array.isArray(detail?.working_rows)?detail.working_rows:[];
 const source=Array.isArray(detail?.source_rows)?detail.source_rows:[];
 const summary=detail?.summary||{};
 const canDraft=['CASHIER','ACCOUNTANT','TREASURER'].includes(roleCode)&&!isReviewOnly;
 async function createEntry(){try{setBusy('entry');setMsg(null);await createFinanceBookEntry(book.key,date,reference.trim(),description.trim(),Number(debit||0),Number(credit||0),accountCode.trim(),counterparty.trim());setReference('');setDescription('');setAccountCode('');setCounterparty('');setDebit('');setCredit('');await load();if(onChanged)await onChanged();setMsg('Draft accounting line recorded successfully.')}catch(e){setMsg(e instanceof Error?e.message:String(e))}finally{setBusy(null)}}
 async function askAI(){try{setBusy('ai');setMsg(null);const r=await askFinanceAccountingAI(book.key,aiTask.trim());setAiDraft(r.data||null)}catch(e){setMsg(e instanceof Error?e.message:String(e))}finally{setBusy(null)}}
 async function acceptAI(){if(!aiDraft?.id)return;try{setBusy('accept-ai');setMsg(null);await acceptFinanceAIDraft(aiDraft.id);setAiDraft(null);setAiTask('');await load();if(onChanged)await onChanged();setMsg('AI draft accepted as a Draft accounting line. It still requires normal human review/posting controls.')}catch(e){setMsg(e instanceof Error?e.message:String(e))}finally{setBusy(null)}}
 const ai=aiDraft?.suggestion||{};
 return <View style={s.box}>
  <View style={s.header}><View style={{flex:1}}><Text style={s.title}>{book.title}</Text><Text style={s.note}>{isReviewOnly?'Generated / review book':'Live accounting workbook'} · {roleCode.replaceAll('_',' ')}</Text></View><Pressable style={s.refresh} onPress={load}><Text style={s.refreshText}>Refresh</Text></Pressable></View>
  <View style={s.metrics}><Metric label="Debit" value={Number(summary.total_debit||0)}/><Metric label="Credit" value={Number(summary.total_credit||0)}/><Metric label="Balance" value={Number(summary.balance||0)}/><Metric label="Lines" value={Number(summary.working_count||0)}/></View>
  {msg?<View style={s.message}><Text style={s.messageText}>{msg}</Text></View>:null}

  {canDraft?<Drop title="New Accounting Entry" open={entryOpen} onPress={()=>setEntryOpen(v=>!v)}>
    <View style={s.row2}><Field label="Date" value={date} onChange={setDate} placeholder="YYYY-MM-DD"/><Field label="Reference" value={reference} onChange={setReference} placeholder="Receipt/Invoice/Journal ref"/></View>
    <Field label="Description" value={description} onChange={setDescription} placeholder="Accounting narration / description" multiline/>
    <View style={s.row2}><Field label="Account Code" value={accountCode} onChange={setAccountCode} placeholder="e.g. 1000"/><Field label="Counterparty" value={counterparty} onChange={setCounterparty} placeholder="Customer / supplier"/></View>
    <View style={s.row2}><Field label="Debit (TZS)" value={debit} onChange={setDebit} placeholder="0" keyboard="decimal-pad"/><Field label="Credit (TZS)" value={credit} onChange={setCredit} placeholder="0" keyboard="decimal-pad"/></View>
    <Text style={s.note}>Enter either Debit or Credit for this working-book line. Entries are created as Draft so review controls remain in place.</Text>
    <Pressable disabled={!!busy||!description.trim()} style={[s.primary,(!!busy||!description.trim())&&s.disabled]} onPress={createEntry}><Text style={s.white}>{busy==='entry'?'Recording…':'Record Draft Entry'}</Text></Pressable>
  </Drop>:null}

  {['CASHIER','ACCOUNTANT','TREASURER'].includes(roleCode)?<Drop title="AI Accounting Assistant" open={aiOpen} onPress={()=>setAiOpen(v=>!v)}>
    <Text style={s.aiIntro}>Ask for full accounting help inside this book: classify a transaction, prepare a journal draft, check debit/credit treatment, explain reconciliation, summarize records, or prepare a draft record. AI suggestions never post automatically.</Text>
    <Field label="What do you need help with?" value={aiTask} onChange={setAiTask} placeholder={`Example: Prepare the correct entry in ${book.title} for this transaction...`} multiline/>
    <Pressable disabled={!!busy||!aiTask.trim()} style={[s.aiButton,(!!busy||!aiTask.trim())&&s.disabled]} onPress={askAI}><Text style={s.white}>{busy==='ai'?'AI is working…':'Ask NEBRIN Accounting AI'}</Text></Pressable>
    {aiDraft?<View style={s.aiDraft}><Text style={s.aiTitle}>AI Draft — Human Review Required</Text><KV k="Date" v={ai.entry_date}/><KV k="Reference" v={ai.reference}/><KV k="Description" v={ai.description}/><KV k="Account code" v={ai.account_code}/><KV k="Counterparty" v={ai.counterparty}/><KV k="Debit" v={money(ai.debit)}/><KV k="Credit" v={money(ai.credit)}/><Text style={s.aiLabel}>Accounting explanation</Text><Text style={s.aiText}>{ai.explanation||'—'}</Text>{Array.isArray(ai.checks)&&ai.checks.length?<><Text style={s.aiLabel}>Checks before accepting</Text>{ai.checks.map((x:string,i:number)=><Text key={i} style={s.check}>• {x}</Text>)}</>:null>{canDraft?<Pressable disabled={!!busy} style={[s.primary,!!busy&&s.disabled]} onPress={acceptAI}><Text style={s.white}>{busy==='accept-ai'?'Accepting…':'Accept as Draft Entry'}</Text></Pressable>:<Text style={s.note}>This book is review-only; use the AI explanation without creating an entry.</Text>}</View>:null}
  </Drop>:null}

  <Drop title={`Working Book Lines (${working.length})`} open={true} onPress={()=>{}} fixed>
    <ScrollView horizontal showsHorizontalScrollIndicator><View style={s.table}><TableHead/>{working.map((x:any,i:number)=><View key={x.id||i} style={s.tr}><Cell w={90} text={fmtDate(x.entry_date)}/><Cell w={105} text={x.reference||'—'}/><Cell w={220} text={x.description||'—'}/><Cell w={90} text={x.account_code||'—'}/><Cell w={120} text={x.counterparty||'—'}/><Cell w={115} text={money(x.debit)}/><Cell w={115} text={money(x.credit)}/><Cell w={90} text={x.status||'Draft'}/></View>)}</View></ScrollView>
    {!working.length?<Text style={s.note}>No working-book lines yet.</Text>:null}
  </Drop>

  <Drop title={`Linked Source Records (${Number(summary.source_count||0)})`} open={sourceOpen} onPress={()=>setSourceOpen(v=>!v)}>
    <Text style={s.note}>These are synchronized source records from the NEBRIN Finance system. They are shown here so the book can be worked from real records instead of duplicated data.</Text>
    {source.map((x:any,i:number)=><SourceCard key={x.id||i} row={x}/>) }
    {!source.length&&detail?.source_rows&&typeof detail.source_rows==='object'&&!Array.isArray(detail.source_rows)?<SourceCard row={detail.source_rows}/>:null}
    {!source.length&&!detail?.source_rows?<Text style={s.note}>No linked source records yet.</Text>:null}
  </Drop>
 </View>
}

function Drop({title,open,onPress,children,fixed=false}:{title:string;open:boolean;onPress:()=>void;children:any;fixed?:boolean}){return <View style={s.drop}><Pressable disabled={fixed} style={s.dropHead} onPress={onPress}><Text style={s.dropTitle}>{title}</Text>{!fixed?<Text style={s.arrow}>{open?'▲':'▼'}</Text>:null}</Pressable>{open?<View style={s.dropBody}>{children}</View>:null}</View>}
function Field({label,value,onChange,placeholder,multiline=false,keyboard}:{label:string;value:string;onChange:(v:string)=>void;placeholder:string;multiline?:boolean;keyboard?:any}){return <View style={s.field}><Text style={s.fieldLabel}>{label}</Text><TextInput style={[s.input,multiline&&s.multi]} value={value} onChangeText={onChange} placeholder={placeholder} multiline={multiline} keyboardType={keyboard}/></View>}
function Metric({label,value}:{label:string;value:number}){return <View style={s.metric}><Text style={s.metricValue}>{label==='Lines'?String(value):money(value)}</Text><Text style={s.note}>{label}</Text></View>}
function KV({k,v}:{k:string;v:any}){return <View style={s.kv}><Text style={s.k}>{k}</Text><Text style={s.v}>{v===null||v===undefined||v===''?'—':String(v)}</Text></View>}
function TableHead(){return <View style={[s.tr,s.th]}><Cell w={90} text="Date" bold/><Cell w={105} text="Reference" bold/><Cell w={220} text="Description" bold/><Cell w={90} text="Account" bold/><Cell w={120} text="Counterparty" bold/><Cell w={115} text="Debit" bold/><Cell w={115} text="Credit" bold/><Cell w={90} text="Status" bold/></View>}
function Cell({w,text,bold=false}:{w:number;text:string;bold?:boolean}){return <View style={[s.td,{width:w}]}><Text numberOfLines={3} style={[s.cellText,bold&&s.bold]}>{text}</Text></View>}
function SourceCard({row}:{row:any}){const entries=Object.entries(row||{}).filter(([k])=>!['created_by','updated_by'].includes(k)).slice(0,18);return <View style={s.sourceCard}>{entries.map(([k,v])=><View key={k} style={s.sourceLine}><Text style={s.sourceKey}>{pretty(k)}</Text><Text style={s.sourceValue}>{display(v)}</Text></View>)}</View>}
function money(v:any){return `TZS ${Number(v||0).toLocaleString()}`}
function fmtDate(v:any){return v?String(v).slice(0,10):'—'}
function pretty(v:string){return v.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}
function display(v:any){if(v===null||v===undefined||v==='')return '—';if(typeof v==='object')return JSON.stringify(v);return String(v)}

const s=StyleSheet.create({box:{marginTop:10},header:{flexDirection:'row',alignItems:'center',gap:8},title:{fontSize:17,fontWeight:'900',color:'#0b5d45'},note:{fontSize:12,color:'#64748b',lineHeight:18,marginTop:3},refresh:{backgroundColor:'#e2e8f0',borderRadius:8,padding:8},refreshText:{fontSize:11,fontWeight:'800',color:'#334155'},metrics:{flexDirection:'row',flexWrap:'wrap',gap:7,marginTop:10},metric:{width:'48%',backgroundColor:'#fff',borderRadius:9,padding:9},metricValue:{fontWeight:'900',fontSize:15,color:'#14213d'},message:{backgroundColor:'#eef6f3',borderRadius:9,padding:9,marginTop:8},messageText:{color:'#0b5d45',fontWeight:'700',fontSize:12},drop:{borderTopWidth:1,borderTopColor:'#dbe5df',marginTop:10},dropHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingVertical:12},dropTitle:{fontSize:14,fontWeight:'900',color:'#14213d'},arrow:{fontWeight:'900',color:'#08745a'},dropBody:{paddingBottom:8},row2:{flexDirection:'row',gap:8},field:{flex:1,marginTop:7},fieldLabel:{fontSize:11,fontWeight:'800',color:'#64748b',marginBottom:4},input:{borderWidth:1,borderColor:'#cbd5e1',backgroundColor:'#fff',borderRadius:8,padding:9},multi:{minHeight:74,textAlignVertical:'top'},primary:{backgroundColor:'#0b5d45',padding:9,borderRadius:8,alignSelf:'flex-start',marginTop:9},aiButton:{backgroundColor:'#14213d',padding:10,borderRadius:8,alignSelf:'flex-start',marginTop:9},disabled:{opacity:.45},white:{color:'#fff',fontWeight:'800'},aiIntro:{fontSize:12,color:'#475569',lineHeight:18},aiDraft:{borderWidth:1,borderColor:'#b9c8d3',backgroundColor:'#fff',borderRadius:10,padding:10,marginTop:10},aiTitle:{fontWeight:'900',color:'#14213d',marginBottom:6},kv:{flexDirection:'row',borderTopWidth:1,borderTopColor:'#eef2f7',paddingVertical:6},k:{width:105,fontSize:11,fontWeight:'800',color:'#64748b'},v:{flex:1,fontSize:12,color:'#243447'},aiLabel:{fontWeight:'900',fontSize:12,color:'#14213d',marginTop:8},aiText:{fontSize:12,color:'#334155',lineHeight:18,marginTop:3},check:{fontSize:12,color:'#475569',lineHeight:18},table:{borderWidth:1,borderColor:'#d7e0e7',borderRadius:8,overflow:'hidden',marginTop:4},tr:{flexDirection:'row'},th:{backgroundColor:'#eef2f7'},td:{borderRightWidth:1,borderRightColor:'#e5e7eb',borderBottomWidth:1,borderBottomColor:'#e5e7eb',padding:7},cellText:{fontSize:11,color:'#334155'},bold:{fontWeight:'900',color:'#14213d'},sourceCard:{borderWidth:1,borderColor:'#e2e8f0',backgroundColor:'#fff',borderRadius:9,padding:8,marginTop:8},sourceLine:{flexDirection:'row',borderTopWidth:1,borderTopColor:'#f1f5f9',paddingVertical:5},sourceKey:{width:125,fontSize:10,fontWeight:'800',color:'#64748b'},sourceValue:{flex:1,fontSize:11,color:'#334155'}});
