import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { useNetInfo } from '@react-native-community/netinfo';
import { useAuth } from '@/features/auth/auth-context';
import { AppButton } from '@/components/ui/app-button';
import { colors } from '@/design/tokens';
import { useRefreshLocalFinance } from '@/offline/sync/sync-refresh';
import { useRetryQueuedMutations } from '@/offline/sync/queue-health';
import { autoMapping, fields, parseCSV, type Field, type Options, type PreviewRow, type Table } from './csv-model';
import { clearCSVFiles, exportCSV, pickCSV } from './csv-files';
import { previewCSV, readCSVHistory, readCSVOptions, readCSVReport, resumeCSVBatch, saveCSVBatch } from './csv-service';
import { syncCSVQueue } from './csv-sync';

const names:Record<Field,string>={amount:'Amount',date:'Date',type:'Income / expense',account:'Account name or ID',category:'Category name or ID',currency:'Currency code',merchant:'Merchant',description:'Description',notes:'Notes',externalId:'Bank reference / external ID',sourceId:'Finance Coach transaction ID'};
type Choice={value:string;label:string};
function Select({label,value,choices,onChange,disabled=false}:{label:string;value:string;choices:Choice[];onChange:(v:string)=>void;disabled?:boolean}) {
  const [open,setOpen]=useState(false);
  return <><Pressable disabled={disabled} accessibilityRole="button" accessibilityLabel={`${label}: ${choices.find(c=>c.value===value)?.label??'Choose'}`} style={styles.select} onPress={()=>setOpen(true)}>
    <Text style={styles.label}>{label}</Text><Text style={styles.body}>{choices.find(c=>c.value===value)?.label??'Choose'} ▾</Text>
  </Pressable><Modal visible={open} transparent animationType="slide" onRequestClose={()=>setOpen(false)}><View style={styles.overlay}><View style={styles.modal}>
    <Text accessibilityRole="header" style={styles.heading}>{label}</Text><FlatList data={choices} keyExtractor={c=>c.value} renderItem={({item})=><Pressable accessibilityRole="radio" accessibilityState={{selected:item.value===value}} style={styles.select} onPress={()=>{onChange(item.value);setOpen(false);}}><Text style={styles.body}>{item.label}</Text></Pressable>}/>
    <AppButton label="Close" variant="ghost" onPress={()=>setOpen(false)}/></View></View></Modal></>;
}
export function CSVScreen(){const {session}=useAuth();return <CSVTools key={session?.user.id} user={session?.user.id??''}/>;}
function CSVTools({user}:{user:string}) {
  const db=useSQLiteContext(),client=useQueryClient(),router=useRouter(),network=useNetInfo(),sync=useRefreshLocalFinance(),retry=useRetryQueuedMutations();
  const stop=useRef(false),running=useRef(false),mounted=useRef(true);
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
  const [file,setFile]=useState<Awaited<ReturnType<typeof pickCSV>>>(null),[table,setTable]=useState<Table|null>(null),[delimiter,setDelimiter]=useState(',');
  const [preview,setPreview]=useState<PreviewRow[]|null>(null),[batch,setBatch]=useState(''),[visible,setVisible]=useState(50),[filter,setFilter]=useState('all');
  const [options,setOptions]=useState<Options>({mapping:{},accountId:'',incomeCategory:'',expenseCategory:'',defaultType:'expense',dateFormat:'iso',decimal:'.',signed:false,skipMatching:true,source:'CSV'});
  const queryOptions={enabled:Boolean(user),networkMode:'always' as const,retry:false,staleTime:Infinity};
  const reference=useQuery({...queryOptions,queryKey:['local-finance','csv-options',user],queryFn:()=>readCSVOptions(db,user)});
  const history=useQuery({...queryOptions,queryKey:['local-finance','csv-history',user],queryFn:()=>readCSVHistory(db,user),refetchInterval:busy?false:5000});
  const report=useQuery({...queryOptions,enabled:Boolean(user&&batch),queryKey:['local-finance','csv-report',user,batch],queryFn:()=>readCSVReport(db,user,batch),refetchInterval:busy?false:5000});
  useEffect(()=>{mounted.current=true;try{clearCSVFiles();}catch{}return()=>{mounted.current=false;stop.current=true;};},[]);
  function update(patch:Partial<Options>){setOptions(o=>({...o,...patch}));setPreview(null);setVisible(50);}
  async function run(task:()=>Promise<void>){
    if(running.current)return;running.current=true;stop.current=false;setBusy(true);setError('');setMessage('Working…');
    try{await task();}catch(e){if(mounted.current){setMessage('');setError(e instanceof Error?e.message:String(e));}}
    finally{running.current=false;if(mounted.current){setBusy(false);await client.invalidateQueries({queryKey:['local-finance']});}}
  }
  async function chooseFile(){
    const picked=await pickCSV();if(!picked){if(mounted.current)setMessage('No file selected.');return;}
    const parsed=await parseCSV(picked.text,delimiter);if(!mounted.current||stop.current)return;
    setFile(picked);setTable(parsed);setOptions(o=>({...o,mapping:autoMapping(parsed.headers)}));setPreview(null);setVisible(50);setMessage(`${parsed.rows.length} records loaded. Check the column mapping.`);
  }
  async function changeDelimiter(next:string){if(file){const parsed=await parseCSV(file.text,next);if(!mounted.current||stop.current)return;setTable(parsed);setOptions(o=>({...o,mapping:autoMapping(parsed.headers)}));}setDelimiter(next);setPreview(null);setMessage('Separator updated. Check the mapping.');}
  async function validate(){if(!file||!table)return;setPreview(null);setMessage('Validating all rows and checking duplicates…');
    const result=await previewCSV(db,user,table,options,file.fileHash,n=>{if(mounted.current)setMessage(`Validated ${n} / ${table.rows.length} records`);},()=>stop.current);
    if(mounted.current&&!stop.current){setPreview(result);setVisible(50);setFilter('all');setMessage('Preview complete. Review before importing.');}
  }
  async function resume(id:string){const n=await resumeCSVBatch(user,id,n=>{if(mounted.current)setMessage(`${n} rows saved locally…`);},()=>stop.current);if(mounted.current)setMessage(`${n} rows saved locally. ${stop.current?'Remaining ready rows can be resumed.':'Use Sync to confirm them on the server.'}`);}
  async function importRows(){if(!file||!preview)return;setMessage('Saving the validated batch…');const id=await saveCSVBatch(user,file.name,preview);if(mounted.current){setBatch(id);setPreview(null);setFile(null);setTable(null);setVisible(50);}await resume(id);}
  async function share(kind:Parameters<typeof exportCSV>[2]){const n=await exportCSV(db,user,kind,batch,n=>{if(mounted.current)setMessage(`Exporting ${n} rows…`);},()=>stop.current);if(mounted.current)setMessage(`${n} rows prepared and share sheet opened. Choose a destination to save the CSV.`);}
  async function syncRows(){await syncCSVQueue(db,user,n=>{if(mounted.current)setMessage(`${n} queued operations confirmed…`);},()=>stop.current);if(!stop.current)await sync.mutateAsync();if(mounted.current)setMessage(stop.current?'Sync paused. Confirmed rows are kept.':'Sync completed. Review the report for each row’s status.');}
  const rows=preview??report.data??[],displayed=rows.filter(r=>filter==='all'||r.status===filter).slice(0,visible);
  const counts=(status:string)=>rows.filter(r=>r.status===status).length;
  const choices=(items:{id:string;name?:string;default_name?:string}[])=>[{value:'',label:'Choose'},...items.map(i=>({value:i.id,label:i.name??i.default_name??i.id}))];
  const selectedHistory=history.data?.find(b=>b.id===batch),offline=network.isConnected===false||network.isInternetReachable===false;
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <AppButton label="Back to Plan" variant="ghost" disabled={busy} onPress={()=>{if(router.canGoBack())router.back();else router.replace('/plan' as never);}}/>
    <Text accessibilityRole="header" style={styles.title}>CSV import & export</Text><Text style={styles.body}>Import income and expenses, or share a CSV of your saved financial data.</Text>
    {offline&&<Text style={styles.notice}>Offline · import to this device and export saved data. Confirmation waits for sync.</Text>}
    {error&&<Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}{!!message&&<Text accessibilityLiveRegion="polite" style={styles.notice}>{message}</Text>}
    {busy&&<><ActivityIndicator color={colors.primary}/><AppButton label="Stop after the current step" variant="ghost" onPress={()=>{stop.current=true;setMessage('Stopping after the current step. Committed rows will be kept.');}}/></>}
    <View style={styles.card}><Text accessibilityRole="header" style={styles.heading}>Export</Text><Text style={styles.body}>Uses data saved on this device. Sync first for the latest server data. Amounts stay separate by currency.</Text>
      <AppButton label="Export transactions" disabled={busy} variant="secondary" onPress={()=>{void run(()=>share('transactions'));}}/>
      <AppButton label="Export accounts & balances" disabled={busy} variant="secondary" onPress={()=>{void run(()=>share('accounts'));}}/>
      <AppButton label="Export saved debt dashboard" disabled={busy} variant="secondary" onPress={()=>{void run(()=>share('debt'));}}/>
      <Text style={styles.body}>CSV files are unencrypted. Choose a trusted destination. Temporary export copies are cleared after 24 hours when you next use these tools.</Text>
      <AppButton label="Clear temporary CSV files" disabled={busy} variant="ghost" onPress={()=>{void run(async()=>{clearCSVFiles(true);setMessage('Temporary CSV copies cleared. Files saved to another app remain there.');});}}/>
    </View>
    <View style={styles.card}><Text accessibilityRole="header" style={styles.heading}>Import</Text><Text style={styles.body}>Up to 10 MiB and 10,000 records per file. UTF-8 or UTF-16 with BOM. Transfers and adjustments need their original entry tools.</Text>
      {reference.isPending?<ActivityIndicator/>:reference.isError?<><Text style={styles.error}>Saved accounts and categories could not load.</Text><AppButton label="Retry loading" onPress={()=>{void reference.refetch();}}/></>:!reference.data?.accounts.length?<Text style={styles.notice}>Create an active account and sync categories before importing.</Text>:null}
      <Select label="Separator" value={delimiter} choices={[{value:',',label:'Comma'},{value:';',label:'Semicolon'},{value:'\t',label:'Tab'}]} disabled={busy} onChange={v=>{void run(()=>changeDelimiter(v));}}/>
      <AppButton label={file?'Choose another CSV':'Choose CSV file'} disabled={busy||reference.isPending||reference.isError||!reference.data?.accounts.length} onPress={()=>{void run(chooseFile);}}/>
      {file&&table&&<><Text style={styles.label}>{file.name} · {table.rows.length} records</Text>
        <Text style={styles.heading}>Column mapping</Text><Text style={styles.body}>Amount and date are required. Blank account, category, and type cells use the defaults below. Unknown names are reported as errors.</Text>
        {fields.map(field=><Select key={field} label={names[field]} value={options.mapping[field]===undefined?'':String(options.mapping[field])} disabled={busy} choices={[{value:'',label:'Not mapped'},...table.headers.map((h,i)=>({value:String(i),label:h}))]} onChange={v=>{const mapping={...options.mapping};if(v==='')delete mapping[field];else mapping[field]=Number(v);update({mapping});}}/>)}
        <Select label="Default account" value={options.accountId} choices={choices(reference.data?.accounts??[])} disabled={busy} onChange={accountId=>update({accountId})}/>
        <Select label="Default transaction type" value={options.defaultType} choices={[{value:'expense',label:'Expense'},{value:'income',label:'Income'}]} disabled={busy} onChange={v=>update({defaultType:v as Options['defaultType']})}/>
        <Select label="Default income category" value={options.incomeCategory} choices={choices(reference.data?.categories.filter(c=>c.kind==='income')??[])} disabled={busy} onChange={incomeCategory=>update({incomeCategory})}/>
        <Select label="Default expense category" value={options.expenseCategory} choices={choices(reference.data?.categories.filter(c=>c.kind==='expense')??[])} disabled={busy} onChange={expenseCategory=>update({expenseCategory})}/>
        <Select label="Date format" value={options.dateFormat} choices={[{value:'iso',label:'YYYY-MM-DD'},{value:'dmy',label:'DD/MM/YYYY'},{value:'mdy',label:'MM/DD/YYYY'}]} disabled={busy} onChange={v=>update({dateFormat:v as Options['dateFormat']})}/>
        <Select label="Decimal separator (no thousands separators)" value={options.decimal} choices={[{value:'.',label:'Dot: 1234.50'},{value:',',label:'Comma: 1234,50'}]} disabled={busy} onChange={v=>update({decimal:v as Options['decimal']})}/>
        <View style={styles.toggle}><Text style={styles.body}>Signed amounts: negative expense, positive income</Text><Switch accessibilityLabel="Use signed amounts" disabled={busy} value={options.signed} onValueChange={signed=>update({signed})}/></View>
        <View style={styles.toggle}><Text style={styles.body}>Skip identical transactions</Text><Switch accessibilityLabel="Skip identical transactions" disabled={busy} value={options.skipMatching} onValueChange={skipMatching=>update({skipMatching})}/></View>
        <Text style={styles.body}>{options.skipMatching?'Matches amount, date, account, category and text.':'Keeps identical rows from different records. Reimporting this exact file or a known reference still skips duplicates.'}</Text>
        <Text style={styles.label}>Source label</Text><TextInput accessibilityLabel="CSV source label" editable={!busy} value={options.source} maxLength={80} onChangeText={source=>update({source})} style={styles.input}/>
        <Text style={styles.body}>Reuse this label for the same bank when mapping external references.</Text>
        <AppButton label="Validate & preview" loading={busy} disabled={!table.rows.length} onPress={()=>{void run(validate);}}/>
      </>}
    </View>
    {preview&&<View style={styles.card}><Text accessibilityRole="header" style={styles.heading}>Import preview</Text><Text style={styles.body}>{counts('ready')} ready · {counts('invalid')} invalid · {counts('duplicate')} duplicates</Text>
      <Text style={styles.body}>Import saves the ready rows to this device. Invalid and duplicate rows are skipped and included in the report.</Text>
      <AppButton label={`Import ${counts('ready')} valid rows`} disabled={busy||!counts('ready')} onPress={()=>{void run(importRows);}}/></View>}
    <View style={styles.card}><Text accessibilityRole="header" style={styles.heading}>Saved imports</Text>
      {history.isPending?<ActivityIndicator/>:history.isError?<><Text style={styles.error}>Import history could not load.</Text><AppButton label="Retry history" onPress={()=>{void history.refetch();}}/></>:!history.data?.length?<Text style={styles.body}>No imports yet.</Text>:history.data.map(b=><Pressable key={b.id} disabled={busy} accessibilityRole="button" accessibilityLabel={`Open report ${b.name}`} style={styles.select} onPress={()=>{setBatch(b.id);setPreview(null);setVisible(50);setFilter('all');}}>
        <Text style={styles.label}>{b.name}</Text><Text style={styles.body}>{b.created_at.slice(0,16).replace('T',' ')} UTC · {b.total} records</Text>
        <Text style={styles.body}>{b.imported} confirmed · {b.pending} awaiting sync · {b.ready} ready · {b.failed} failed · {b.invalid} invalid · {b.duplicate} duplicates</Text></Pressable>)}
      {!!batch&&!preview&&<><Text style={styles.label}>{selectedHistory?.name??'Selected import'}</Text>
        {report.isPending?<ActivityIndicator/>:report.isError?<><Text style={styles.error}>This report could not load.</Text><AppButton label="Retry report" onPress={()=>{void report.refetch();}}/></>:null}
        {!!counts('ready')&&<AppButton label="Resume remaining ready rows" disabled={busy} onPress={()=>{void run(()=>resume(batch));}}/>}
        <AppButton label="Export import report" variant="secondary" disabled={busy||report.isPending||report.isError} onPress={()=>{void run(()=>share('report'));}}/></>}
      <AppButton label="Sync pending rows" loading={busy||sync.isPending} disabled={offline} variant="secondary" onPress={()=>{void run(syncRows);}}/>
      <AppButton label="Retry failed sync rows" loading={busy||retry.isPending} disabled={offline} variant="ghost" onPress={()=>{void run(async()=>{await retry.mutateAsync();await syncRows();});}}/>
    </View>
    {rows.length>0&&<View style={styles.card}><Text accessibilityRole="header" style={styles.heading}>{preview?'Preview records':'Import report'}</Text>
      <Select label="Show records" value={filter} disabled={busy} choices={['all','ready','invalid','duplicate','pending','imported','failed'].map(value=>({value,label:value}))} onChange={v=>{setFilter(v);setVisible(50);}}/>
      <Text style={styles.body}>Numbers count nonempty CSV records, including header 1. A quoted cell may span multiple physical lines.</Text>
      {displayed.map(r=><View key={'row' in r?r.row:r.row_number} style={styles.select}><Text style={styles.label}>Record {'row' in r?r.row:r.row_number} · {r.status}</Text>
        {'payload' in r&&r.payload&&<Text style={styles.body}>{r.payload.transactionDate} · {r.payload.type} · {r.payload.amountMinor} minor units {r.payload.csv.currency} · {r.payload.merchant??r.payload.description??''}</Text>}
        <Text style={styles.body}>{r.reason}</Text></View>)}
      {rows.filter(r=>filter==='all'||r.status===filter).length>visible&&<AppButton label="Show 50 more records" variant="ghost" onPress={()=>setVisible(v=>v+50)}/>}
    </View>}
  </ScrollView>;
}
const styles=StyleSheet.create({screen:{flex:1,backgroundColor:colors.background},content:{padding:20,paddingBottom:48,gap:16,maxWidth:920,width:'100%',alignSelf:'center'},title:{fontSize:28,fontWeight:'700',color:colors.text},heading:{fontSize:20,fontWeight:'600',color:colors.text},label:{fontSize:15,fontWeight:'600',color:colors.text},body:{fontSize:14,lineHeight:22,color:colors.textSecondary,flexShrink:1},card:{padding:20,gap:14,borderRadius:18,backgroundColor:colors.surface},notice:{padding:14,borderRadius:12,backgroundColor:colors.primarySoft,color:colors.textSecondary,lineHeight:22},error:{color:colors.danger,lineHeight:22},select:{padding:12,borderBottomWidth:1,borderColor:colors.borderStrong,gap:4},toggle:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},input:{borderWidth:1,borderColor:colors.borderStrong,padding:12,borderRadius:10,color:colors.text},overlay:{flex:1,justifyContent:'center',padding:20,backgroundColor:'rgba(0,0,0,0.4)'},modal:{backgroundColor:colors.surface,borderRadius:18,padding:20,maxHeight:'80%',gap:16}});
