import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import { withEncryptedReadTransaction } from '@/offline/database/encrypted-reader';
import { readSavedDebt } from '@/features/debt/debt-service';
import { assertCSVUser, hash, readCSVReport } from './csv-service';
import { CSV_LIMITS, csvLine, decimalAmount, decodeCSV, yieldToUI } from './csv-model';

const directory=()=>new Directory(Paths.cache,'finance-coach-csv');
export async function pickCSV() {
  if(Platform.OS==='web')throw Error('Use the Android or iOS app for local CSV files.');
  // Some providers label bank CSVs as octet-stream. Validate content instead of relying on MIME.
  const result=await DocumentPicker.getDocumentAsync({type:'*/*',copyToCacheDirectory:true,multiple:false});
  if(result.canceled)return null;
  const asset=result.assets[0],file=new File(asset.uri);
  try {
    const size=file.size;
    if(!file.exists||size<=0)throw Error('This file is empty or cannot be read.');
    if(size>CSV_LIMITS.bytes||(asset.size??0)>CSV_LIMITS.bytes)throw Error('CSV exceeds 10 MiB. Split it into smaller files.');
    const bytes=new Uint8Array(size),handle=file.open();let read=0;
    try{while(read<size){const chunk=handle.readBytes(Math.min(65536,size-read));if(!chunk.length)throw Error('The file changed while reading. Choose it again.');bytes.set(chunk,read);read+=chunk.length;await yieldToUI();}}
    finally{handle.close();}
    const text=await decodeCSV(bytes);return {name:asset.name,text,fileHash:await hash(text)};
  } finally {if(file.uri.startsWith(Paths.cache.uri)&&file.exists)file.delete();}
}
export function clearCSVFiles(all=false) {
  const dir=directory();if(!dir.exists)return;
  for(const entry of dir.list())if(entry instanceof File&&(all||Date.now()-(entry.modificationTime??0)>86400000))entry.delete();
}
type ExportKind='transactions'|'accounts'|'debt'|'report';
export async function exportCSV(db:SQLiteDatabase,user:string,kind:ExportKind,batch?:string,progress:(n:number)=>void=()=>{},cancelled:()=>boolean=()=>false) {
  await assertCSVUser(user);
  if(Platform.OS==='web'||!await Sharing.isAvailableAsync())throw Error('File sharing is unavailable on this device.');
  clearCSVFiles();const dir=directory();dir.create({idempotent:true,intermediates:true});
  const file=new File(dir,`${kind}-${new Date().toISOString().slice(0,10)}-${Crypto.randomUUID()}.csv`);file.create();
  const handle=file.open(),encoder=new TextEncoder();let count=0,buffer='\uFEFF';
  const append=(values:(string|null|number)[],flags:boolean[]=[])=>{buffer+=csvLine(values,flags);if(buffer.length>=32768){handle.writeBytes(encoder.encode(buffer));buffer='';}};
  const pulse=async()=>{progress(count);await assertCSVUser(user);await yieldToUI();if(cancelled())throw Error('Export cancelled. Temporary file removed.');};
  try {
    await withEncryptedReadTransaction(async reader=>{
      if(kind==='transactions') {
        append(['transaction_id','account_id','account','category_id','category','type','amount','amount_minor','currency_code','currency_minor_unit','transaction_date','merchant','description','notes','destination_account_id','destination_amount_minor','destination_currency_code','sync_status','csv_safety_version','exported_at']);
        for await(const r of reader.getEachAsync<Record<string,string|number|null>>(`SELECT t.*,a.name AS account,c.default_name AS category,
          CASE WHEN EXISTS(SELECT 1 FROM sync_queue q WHERE q.user_id=t.user_id AND q.entity_id=t.id AND q.status='failed') THEN 'failed'
          WHEN EXISTS(SELECT 1 FROM sync_queue q WHERE q.user_id=t.user_id AND q.entity_id=t.id) THEN 'pending' ELSE t.sync_status END AS export_sync_status
          FROM local_transactions t LEFT JOIN local_accounts a ON a.user_id=t.user_id AND a.id=t.account_id
          LEFT JOIN local_categories c ON c.user_id=t.user_id AND c.id=t.category_id WHERE t.user_id=? AND t.deleted_at IS NULL ORDER BY t.transaction_date,t.id`,user)) {
          append([r.id,r.account_id,r.account,r.category_id,r.category,r.type,decimalAmount(String(r.amount_minor),Number(r.currency_minor_unit)),r.amount_minor,r.currency_code,r.currency_minor_unit,r.transaction_date,r.merchant,r.description,r.notes,r.destination_account_id,r.destination_amount_minor,r.destination_currency_code,r.export_sync_status,1,new Date().toISOString()],
            [false,false,true,false,true,false,false,false,false,false,false,true,true,true]);
          if(++count%100===0)await pulse();
        }
      }else if(kind==='accounts') {
        append(['account_id','name','account_type','currency_code','opening_balance_minor','current_balance_minor','currency_minor_unit','status','sync_status','exported_at']);
        for await(const r of reader.getEachAsync<Record<string,string|number>>('SELECT * FROM local_accounts WHERE user_id=? ORDER BY name,id',user)) {
          append([r.id,r.name,r.account_type_code,r.currency_code,r.opening_balance_minor,r.current_balance_minor,r.currency_minor_unit,r.status,r.sync_status,new Date().toISOString()],[false,true,true]);if(++count%100===0)await pulse();
        }
      }else if(kind==='debt') {
        const saved=await readSavedDebt(reader,user);if(!saved)throw Error('Open Debt dashboard and refresh before exporting debt.');
        append(['loan_id','direction','counterparty','currency_code','principal_minor','paid_minor','remaining_minor','currency_minor_unit','status','due_date','snapshot_saved_at']);
        for(const r of saved.value.loans){append([r.id,r.direction,r.counterparty_name,r.currency_code,r.principal_minor,r.paid_minor,r.remaining_minor,r.currency_minor_unit,r.status,r.due_date,saved.capturedAt],[false,false,true]);if(++count%100===0)await pulse();}
      }else {
        if(!batch)throw Error('Choose an import report.');append(['csv_record','status','reason','transaction_id']);
        for(const r of await readCSVReport(reader,user,batch)){append([r.row_number,r.status,r.reason,r.transaction_id],[false,false,true]);if(++count%100===0)await pulse();}
      }
    });
    if(buffer)handle.writeBytes(encoder.encode(buffer));handle.close();await assertCSVUser(user);progress(count);
    if(cancelled())throw Error('Export cancelled. Temporary file removed.');
    await Sharing.shareAsync(file.uri,{mimeType:'text/csv',UTI:'public.comma-separated-values-text',dialogTitle:'Share financial CSV'});
    // Receivers may read after Android's chooser returns. Clear explicitly or on next use after 24h.
    return count;
  }catch(error){try{handle.close();}catch{}if(file.exists)file.delete();throw error;}
}
