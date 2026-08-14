import {useEffect,useMemo,useState} from 'react';
import {Linking,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {getFinanceAccountingBooks,getFinanceBookHelpDashboard,requestTreasurerBookHelp,respondTreasurerBookHelp} from '../lib/api';

type Book={key:string;title:string;group:string;mode?:'work'|'review'};

// NEBRIN ONE now routes Finance staff to the integrated Digital Finance Office.
// No OneSignal/custom notification domain and no external spreadsheet dependency.
const DIGITAL_FINANCE_OFFICE_URL='https://nebrin-website.vercel.app/digital-finance-office.html';

const BOOKS:Book[]=[
 {key:'cash_book',title:'Cash Book',group:'Cash & Receipts'},
 {key:'petty_cash',title:'Petty Cash Book',group:'Cash & Receipts'},
 {key:'receipts',title:'Receipts Register',group:'Cash & Receipts'},
 {key:'receipt_vouchers',title:'Receipt Voucher Register',group:'Cash & Receipts'},
 {key:'payment_vouchers',title:'Payment Voucher Register',group:'Payments & Expenses'},
 {key:'expenses',title:'Expense Register',group:'Payments & Expenses'},
 {key:'invoices',title:'Invoices Register',group:'Sales & Revenue'},
 {key:'revenue',title:'Income / Revenue Register',group:'Sales & Revenue'},
 {key:'journal',title:'General Journal',group:'Journals & Ledgers'},
 {key:'ledger',title:'General Ledger',group:'Journals & Ledgers'},
 {key:'subsidiary_ledgers',title:'Subsidiary Ledgers',group:'Journals & Ledgers'},
 {key:'receivables',title:'Accounts Receivable / Debtors Ledger',group:'Journals & Ledgers'},
 {key:'payables',title:'Accounts Payable / Creditors Ledger',group:'Journals & Ledgers'},
 {key:'chart_accounts',title:'Chart of Accounts',group:'Journals & Ledgers'},
 {key:'trial_balance',title:'Trial Balance',group:'Journals & Ledgers'},
 {key:'bank_book',title:'Bank Book',group:'Bank & Treasury'},
 {key:'bank_reconciliation',title:'Bank Reconciliation',group:'Bank & Treasury'},
 {key:'cheques',title:'Cheque Register',group:'Bank & Treasury'},
 {key:'budgets',title:'Budget Book & Budget vs Actual',group:'Budget & Assets'},
 {key:'fixed_assets',title:'Fixed Assets Register',group:'Budget & Assets'},
 {key:'depreciation',title:'Depreciation Schedule',group:'Budget & Assets'},
 {key:'payroll',title:'Payroll Accounting Register',group:'Payroll & Tax'},
 {key:'tax',title:'Tax / VAT Register',group:'Payroll & Tax'},
 {key:'withholding_tax',title:'Withholding Tax Register',group:'Payroll & Tax'},
 {key:'adjustments',title:'Journal Adjustments',group:'Period End'},
 {key:'accruals',title:'Accruals & Prepayments',group:'Period End'},
 {key:'closing',title:'Period / Year-End Closing Records',group:'Period End'},
 {key:'profit_loss',title:'Profit & Loss / Income Statement',group:'Financial Statements',mode:'review'},
 {key:'balance_sheet',title:'Statement of Financial Position',group:'Financial Statements',mode:'review'},
 {key:'cash_flow',title:'Cash Flow Statement',group:'Financial Statements',mode:'review'},
 {key:'equity',title:'Statement of Changes in Equity',group:'Financial Statements',mode:'review'},
 {key:'spreadsheet',title:'Digital Finance Workspace',group:'Workpapers & Records'},
 {key:'supporting_docs',title:'Supporting Documents Register',group:'Workpapers & Records'},
 {key:'audit_trail',title:'Accounting Audit Trail',group:'Workpapers & Records',mode:'review'},
 {key:'reports_archive',title:'Financial Reports Archive',group:'Workpapers & Records',mode:'review'},
];

export function AccountingBooksCentre({roleCode}:{roleCode:string}){
 const[open,setOpen]=useState(false); const[selected,setSelected]=useState<Book|null>(null); const[data,setData]=useState<any>(null); const[busy,setBusy]=useState(false); const[msg,setMsg]=useState<string|null>(null); const[helpNote,setHelpNote]=useState(''); const[helpOpen,setHelpOpen]=useState(false); const[helpData,setHelpData]=useState<any>(null);
 const groups=useMemo(()=>Array.from(new Set(BOOKS.map(x=>x.group))),[]); const canAskHelp=['CASHIER','ACCOUNTANT'].includes(roleCode); const isTreasurer=roleCode==='TREASURER';
 async function load(){try{setBusy(true);setMsg(null);const r=await getFinanceAccountingBooks();setData(r.data||{})}catch(e){setMsg(e instanceof Error?e.message:String(e))}finally{setBusy(false)}}
 async function loadHelp(){try{const r=await getFinanceBookHelpDashboard();setHelpData(r.data||{})}catch(e){setMsg(e instanceof Error?e.message:String(e))}}
 useEffect(()=>{load()},[roleCode]); useEffect(()=>{if(isTreasurer||canAskHelp)loadHelp()},[roleCode]);
 async function openWorkbook(b:Book){setSelected(b);setOpen(false);setHelpOpen(false);setHelpNote('');setMsg(null);try{const url=`${DIGITAL_FINANCE_OFFICE_URL}?module=${encodeURIComponent(b.key)}&title=${encodeURIComponent(b.title)}&source=nebrin-one`;await Linking.openURL(url);setMsg(`${b.title} opened in the NEBRIN Digital Finance Office.`)}catch(e){setMsg(`Unable to open ${b.title}. ${e instanceof Error?e.message:String(e)}`)}}
 async function requestHelp(){if(!selected)return;try{setBusy(true);setMsg(null);await requestTreasurerBookHelp(selected.key,selected.title,helpNote.trim());setHelpNote('');setHelpOpen(false);await loadHelp();setMsg('Assistance request sent to Treasurer. Notification created.')}catch(e){setMsg(e instanceof Error?e.message:String(e))}finally{setBusy(false)}}
 async function respond(id:string,status:'In Progress'|'Resolved'|'Rejected'){try{setBusy(true);setMsg(null);await respondTreasurerBookHelp(id,status,status==='In Progress'?'Treasurer is reviewing this accounting request.':status==='Resolved'?'Assistance completed by Treasurer.':'Assistance request could not be accepted.');await loadHelp();setMsg(`Request updated to ${status}. Notification sent to requester.`)}catch(e){setMsg(e instanceof Error?e.message:String(e))}finally{setBusy(false)}}
 return <View style={s.wrap}><Text style={s.h}>Digital Finance Office</Text><Text style={s.p}>Cashier, Accountant and Treasurer work in one integrated paperless accounting system. Record once; authorized posting updates the relevant accounting records automatically.</Text><Pressable style={s.select} onPress={()=>setOpen(v=>!v)}><Text style={s.label}>Select Finance Module</Text><Text style={s.selectText}>{selected?.title||'Choose accounting module'} ▼</Text></Pressable>{open&&<View style={s.menu}>{groups.map(g=><View key={g}><Text style={s.group}>{g}</Text>{BOOKS.filter(b=>b.group===g).map(b=><Pressable key={b.key} style={s.item} onPress={()=>openWorkbook(b)}><Text>{b.title}</Text><Text>›</Text></Pressable>)}</View>)}</View>}{msg&&<Text style={s.msg}>{msg}</Text>}{selected&&canAskHelp&&<View style={s.help}><Pressable onPress={()=>setHelpOpen(v=>!v)}><Text style={s.helpTitle}>Need Treasurer assistance?</Text></Pressable>{helpOpen&&<><TextInput value={helpNote} onChangeText={setHelpNote} placeholder="Describe the accounting issue" multiline style={s.input}/><Pressable disabled={busy} style={s.button} onPress={requestHelp}><Text style={s.buttonText}>Send Assistance Request</Text></Pressable></>}</View>}{isTreasurer&&Array.isArray(helpData?.requests)&&helpData.requests.length>0&&<View style={s.help}><Text style={s.helpTitle}>Treasurer Assistance Queue</Text>{helpData.requests.map((r:any)=><View key={r.id} style={s.request}><Text>{r.book_title} · {r.status}</Text><View style={s.row}><Pressable onPress={()=>respond(r.id,'In Progress')}><Text>Review</Text></Pressable><Pressable onPress={()=>respond(r.id,'Resolved')}><Text>Resolve</Text></Pressable></View></View>)}</View>}<Text style={s.small}>{busy?'Loading…':data?.role?`Secure Finance role: ${data.role}`:''}</Text></View>
}
const s=StyleSheet.create({wrap:{gap:12},h:{fontSize:25,fontWeight:'800',color:'#13213b'},p:{fontSize:15,lineHeight:22,color:'#64748b'},select:{borderWidth:1,borderColor:'#b8c6d1',borderRadius:12,padding:14},label:{fontSize:12,fontWeight:'700',color:'#64748b'},selectText:{fontSize:18,fontWeight:'700',color:'#13213b',marginTop:4},menu:{borderWidth:1,borderColor:'#d8e1e7',borderRadius:12,padding:10},group:{fontWeight:'800',color:'#08745a',paddingVertical:10},item:{flexDirection:'row',justifyContent:'space-between',paddingVertical:13,borderBottomWidth:1,borderBottomColor:'#edf0f2'},msg:{padding:10,backgroundColor:'#eef7f3',borderRadius:9,color:'#155d49'},help:{padding:12,borderWidth:1,borderColor:'#d8e1e7',borderRadius:12,gap:8},helpTitle:{fontWeight:'800',fontSize:17},input:{borderWidth:1,borderColor:'#cbd5e1',borderRadius:9,padding:10,minHeight:70},button:{backgroundColor:'#08745a',padding:12,borderRadius:9},buttonText:{color:'#fff',fontWeight:'800'},request:{paddingVertical:8,borderBottomWidth:1,borderBottomColor:'#eee'},row:{flexDirection:'row',gap:20,marginTop:6},small:{fontSize:12,color:'#64748b'}});