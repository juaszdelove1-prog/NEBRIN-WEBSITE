import {useEffect,useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {getFinanceAccountingBooks} from '../lib/api';

type Book={key:string;title:string;group:string;roles:string[];mode?:'work'|'review'};
const BOOKS:Book[]=[
 {key:'cash_book',title:'Cash Book',group:'Cash & Receipts',roles:['CASHIER','ACCOUNTANT','TREASURER']},
 {key:'petty_cash',title:'Petty Cash Book',group:'Cash & Receipts',roles:['CASHIER','ACCOUNTANT','TREASURER']},
 {key:'receipts',title:'Receipts Register',group:'Cash & Receipts',roles:['CASHIER','ACCOUNTANT','TREASURER']},
 {key:'receipt_vouchers',title:'Receipt Voucher Register',group:'Cash & Receipts',roles:['CASHIER','ACCOUNTANT','TREASURER']},
 {key:'payment_vouchers',title:'Payment Voucher Register',group:'Payments & Expenses',roles:['CASHIER','ACCOUNTANT','TREASURER']},
 {key:'expenses',title:'Expense Register',group:'Payments & Expenses',roles:['ACCOUNTANT','TREASURER']},
 {key:'invoices',title:'Invoices Register',group:'Sales & Revenue',roles:['ACCOUNTANT','TREASURER']},
 {key:'revenue',title:'Income / Revenue Register',group:'Sales & Revenue',roles:['ACCOUNTANT','TREASURER']},
 {key:'journal',title:'General Journal',group:'Journals & Ledgers',roles:['ACCOUNTANT','TREASURER']},
 {key:'ledger',title:'General Ledger',group:'Journals & Ledgers',roles:['ACCOUNTANT','TREASURER']},
 {key:'subsidiary_ledgers',title:'Subsidiary Ledgers',group:'Journals & Ledgers',roles:['ACCOUNTANT','TREASURER']},
 {key:'receivables',title:'Accounts Receivable / Debtors Ledger',group:'Journals & Ledgers',roles:['ACCOUNTANT','TREASURER']},
 {key:'payables',title:'Accounts Payable / Creditors Ledger',group:'Journals & Ledgers',roles:['ACCOUNTANT','TREASURER']},
 {key:'chart_accounts',title:'Chart of Accounts',group:'Journals & Ledgers',roles:['ACCOUNTANT','TREASURER']},
 {key:'trial_balance',title:'Trial Balance',group:'Journals & Ledgers',roles:['ACCOUNTANT','TREASURER']},
 {key:'bank_book',title:'Bank Book',group:'Bank & Treasury',roles:['ACCOUNTANT','TREASURER']},
 {key:'bank_reconciliation',title:'Bank Reconciliation',group:'Bank & Treasury',roles:['ACCOUNTANT','TREASURER']},
 {key:'cheques',title:'Cheque Register',group:'Bank & Treasury',roles:['TREASURER','ACCOUNTANT']},
 {key:'budgets',title:'Budget Book & Budget vs Actual',group:'Budget & Assets',roles:['ACCOUNTANT','TREASURER']},
 {key:'fixed_assets',title:'Fixed Assets Register',group:'Budget & Assets',roles:['ACCOUNTANT','TREASURER']},
 {key:'depreciation',title:'Depreciation Schedule',group:'Budget & Assets',roles:['ACCOUNTANT','TREASURER']},
 {key:'payroll',title:'Payroll Accounting Register',group:'Payroll & Tax',roles:['ACCOUNTANT','TREASURER']},
 {key:'tax',title:'Tax / VAT Register',group:'Payroll & Tax',roles:['ACCOUNTANT','TREASURER']},
 {key:'withholding_tax',title:'Withholding Tax Register',group:'Payroll & Tax',roles:['ACCOUNTANT','TREASURER']},
 {key:'adjustments',title:'Journal Adjustments',group:'Period End',roles:['ACCOUNTANT','TREASURER']},
 {key:'accruals',title:'Accruals & Prepayments',group:'Period End',roles:['ACCOUNTANT','TREASURER']},
 {key:'closing',title:'Period / Year-End Closing Records',group:'Period End',roles:['ACCOUNTANT','TREASURER']},
 {key:'profit_loss',title:'Profit & Loss / Income Statement',group:'Financial Statements',roles:['ACCOUNTANT','TREASURER']},
 {key:'balance_sheet',title:'Statement of Financial Position',group:'Financial Statements',roles:['ACCOUNTANT','TREASURER']},
 {key:'cash_flow',title:'Cash Flow Statement',group:'Financial Statements',roles:['ACCOUNTANT','TREASURER']},
 {key:'equity',title:'Statement of Changes in Equity',group:'Financial Statements',roles:['ACCOUNTANT','TREASURER']},
 {key:'spreadsheet',title:'Spreadsheet / Excel-style Workspace',group:'Workpapers & Records',roles:['CASHIER','ACCOUNTANT','TREASURER']},
 {key:'supporting_docs',title:'Supporting Documents Register',group:'Workpapers & Records',roles:['CASHIER','ACCOUNTANT','TREASURER']},
 {key:'audit_trail',title:'Accounting Audit Trail',group:'Workpapers & Records',roles:['ACCOUNTANT','TREASURER'],mode:'review'},
 {key:'reports_archive',title:'Financial Reports Archive',group:'Workpapers & Records',roles:['ACCOUNTANT','TREASURER'],mode:'review'},
];

export function AccountingBooksCentre({roleCode}:{roleCode:string}){
 const[open,setOpen]=useState(false),[selected,setSelected]=useState<Book|null>(null),[data,setData]=useState<any>(null),[busy,setBusy]=useState(false),[msg,setMsg]=useState<string|null>(null);
 const allowed=useMemo(()=>BOOKS.filter(x=>x.roles.includes(roleCode)),[roleCode]);
 const groups=useMemo(()=>Array.from(new Set(allowed.map(x=>x.group))),[allowed]);
 async function load(){try{setBusy(true);setMsg(null);const r=await getFinanceAccountingBooks();setData(r.data||{})}catch(e){setMsg(e instanceof Error?e.message:String(e))}finally{setBusy(false)}}
 useEffect(()=>{if(open&&!data)load()},[open]);
 function choose(b:Book){setSelected(b);setOpen(false)}
 const count=(k:string)=>Number(data?.counts?.[k]??0);
 return <View style={s.box}>
  <Text style={s.title}>Books of Account</Text><Text style={s.note}>Choose the accounting book you want to work with. Books shown here follow your Finance role and permissions.</Text>
  <Pressable style={s.dropdown} onPress={()=>setOpen(v=>!v)}><View style={{flex:1}}><Text style={s.label}>Select Book of Account</Text><Text style={s.value}>{selected?.title||'Choose accounting book'}</Text></View><Text style={s.arrow}>{open?'▲':'▼'}</Text></Pressable>
  {open?<View style={s.menu}>{groups.map(g=><View key={g}><Text style={s.group}>{g}</Text>{allowed.filter(x=>x.group===g).map(b=><Pressable key={b.key} style={s.option} onPress={()=>choose(b)}><Text style={s.optionText}>{b.title}</Text><Text style={s.chev}>›</Text></Pressable>)}</View>)}</View>:null}
  {busy?<Text style={s.note}>Loading accounting books…</Text>:null}{msg?<Text style={s.err}>{msg}</Text>:null}
  {selected?<View style={s.book}><View style={s.bookHead}><View style={{flex:1}}><Text style={s.bookTitle}>{selected.title}</Text><Text style={s.note}>{selected.mode==='review'?'Review / oversight view':'Accounting work book'} · {roleCode.replaceAll('_',' ')}</Text></View><Pressable style={s.change} onPress={()=>setOpen(true)}><Text style={s.changeText}>Change Book ▼</Text></Pressable></View><View style={s.summary}><Text style={s.summaryNum}>{count(selected.key)}</Text><Text style={s.note}>Current records / lines</Text></View><Text style={s.help}>This book will open inside the same Finance system so entries remain synchronized with journals, ledgers, reports and Audit. Role permissions determine whether you can enter, post, approve or only review records.</Text></View>:null}
 </View>
}
const s=StyleSheet.create({box:{borderTopWidth:1,borderTopColor:'#e5e7eb',marginTop:14,paddingTop:14},title:{fontWeight:'900',fontSize:18,color:'#14213d'},note:{fontSize:12,color:'#64748b',lineHeight:18,marginTop:4},dropdown:{borderWidth:1,borderColor:'#b9c8d3',backgroundColor:'#fff',borderRadius:11,padding:11,marginTop:11,flexDirection:'row',alignItems:'center'},label:{fontSize:11,fontWeight:'800',color:'#64748b'},value:{fontSize:14,fontWeight:'900',color:'#14213d',marginTop:2},arrow:{fontWeight:'900',color:'#08745a'},menu:{borderWidth:1,borderColor:'#d7e0e7',borderRadius:11,backgroundColor:'#fff',marginTop:5,padding:8},group:{fontSize:12,fontWeight:'900',color:'#08745a',paddingHorizontal:8,paddingTop:9,paddingBottom:4},option:{flexDirection:'row',alignItems:'center',borderTopWidth:1,borderTopColor:'#eef2f7',paddingVertical:10,paddingHorizontal:8},optionText:{flex:1,fontSize:13,color:'#243447'},chev:{fontSize:20,color:'#64748b'},book:{borderWidth:1,borderColor:'#bbd8cf',backgroundColor:'#f5faf8',borderRadius:12,padding:12,marginTop:10},bookHead:{flexDirection:'row',alignItems:'center',gap:8},bookTitle:{fontSize:16,fontWeight:'900',color:'#0b5d45'},change:{backgroundColor:'#e2e8f0',borderRadius:8,padding:8},changeText:{fontSize:11,fontWeight:'800',color:'#334155'},summary:{backgroundColor:'#fff',borderRadius:10,padding:10,marginTop:10},summaryNum:{fontSize:24,fontWeight:'900',color:'#08745a'},help:{fontSize:12,color:'#475569',lineHeight:18,marginTop:9},err:{color:'#9b1c1c',marginTop:8}});
