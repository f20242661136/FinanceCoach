import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';
import { supabase } from '@/lib/supabase';
import { withEncryptedWriteTransaction } from '@/offline/database/encrypted-writer';
import type { SyncQueueRow } from '@/offline/database/sync-queue';
import { applySyncDelta } from '@/offline/sync/sync-repository';
import { csvAckSchema, importPayloadSchema, normalizeRow, yieldToUI, type Account, type Category, type ImportPayload, type Options, type PreviewRow, type Table } from './csv-model';

type RpcResult = { data: unknown; error: { code?: string; message: string } | null };
type Rpc = (name: string, args: Record<string, unknown>) => PromiseLike<RpcResult> & {abortSignal(signal:AbortSignal):PromiseLike<RpcResult>};
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc;
export const hash = (value: string) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value);
export async function assertCSVUser(user: string) {
  const { data, error } = await supabase.auth.getSession();
  if (error || !user || data.session?.user.id !== user) throw Error('Your account changed. Reopen CSV tools.');
}
export async function readCSVOptions(db: SQLiteDatabase, user: string) {
  const accounts = await db.getAllAsync<Account>(`SELECT id,name,currency_code,currency_minor_unit FROM local_accounts WHERE user_id=? AND status='active' ORDER BY name`, user);
  const categories = await db.getAllAsync<Category>(`SELECT id,kind,default_name FROM local_categories WHERE user_id=? AND deleted_at IS NULL ORDER BY sort_order,default_name`, user);
  return { accounts, categories };
}
function content(p: Pick<ImportPayload, 'accountId'|'categoryId'|'type'|'amountMinor'|'transactionDate'|'merchant'|'description'|'notes'>) {
  return JSON.stringify([p.accountId,p.categoryId,p.type,p.amountMinor,p.transactionDate,p.merchant,p.description,p.notes]);
}
async function duplicate(db: SQLiteDatabase, user: string, p: ImportPayload): Promise<string | null> {
  const key = await db.getFirstAsync<{ transaction_id: string; content_json:string }>('SELECT transaction_id,content_json FROM local_csv_keys WHERE user_id=? AND import_key=?',user,p.csv.key);
  if (key) { if(key.content_json!==content(p))throw Error('This CSV reference was already used with different data. Review the source record.');return key.transaction_id; }
  if (p.csv.sourceId) { const row = await db.getFirstAsync<{id:string}>('SELECT id FROM local_transactions WHERE user_id=? AND id=?',user,p.csv.sourceId); if (row) return row.id; }
  if (!p.csv.skipMatching) return null;
  const match = await db.getFirstAsync<{id:string}>(`SELECT id FROM local_transactions WHERE user_id=? AND deleted_at IS NULL
    AND account_id=? AND category_id=? AND type=? AND amount_minor=? AND transaction_date=?
    AND merchant IS ? AND description IS ? AND notes IS ? LIMIT 1`,user,p.accountId,p.categoryId,p.type,p.amountMinor,p.transactionDate,p.merchant,p.description,p.notes);
  return match?.id ?? null;
}
export async function previewCSV(db: SQLiteDatabase, user: string, table: Table, options: Options, fileHash: string,
  progress: (n: number) => void = () => {}, cancelled: () => boolean = () => false): Promise<PreviewRow[]> {
  await assertCSVUser(user);
  const indices = Object.values(options.mapping);
  if (new Set(indices).size !== indices.length || indices.some(i => i === undefined || !Number.isInteger(i) || i < 0 || i >= table.headers.length)) throw Error('Map each column to one field only.');
  if (options.mapping.amount === undefined || options.mapping.date === undefined) throw Error('Map the amount and date columns.');
  if (!options.source.trim() || options.source.length > 80) throw Error('Enter a source label of 1–80 characters. Reuse it for the same bank.');
  const { accounts, categories } = await readCSVOptions(db,user); const rows: PreviewRow[] = [], seen = new Map<string,string>();
  for (let i = 0; i < table.rows.length; i++) {
    if (cancelled()) throw Error('Preview cancelled.');
    let result: PreviewRow;
    try {
      const v = normalizeRow(table.rows[i],table.headers,options,accounts,categories);
      const base = { accountId:v.accountId,categoryId:v.categoryId,type:v.type,amountMinor:v.amountMinor,transactionDate:v.transactionDate,merchant:v.merchant,description:v.description,notes:v.notes };
      const identity = v.externalId ? ['external',v.accountId,options.source.trim(),v.externalId] : v.sourceId ? ['export',v.sourceId] : options.skipMatching ? ['content',content(base)] : ['file-row',fileHash,i];
      const key = await hash(JSON.stringify(identity));
      const payload = importPayloadSchema.parse({ ...base,transactionId:Crypto.randomUUID(),clientOperationId:Crypto.randomUUID(),csv:{key,skipMatching:options.skipMatching,sourceId:v.sourceId,currency:v.currency,unit:v.unit} });
      const existing = await duplicate(db,user,payload);
      if(seen.has(key)&&seen.get(key)!==content(payload))throw Error('The same source reference has different data in this file.');
      result = existing || seen.has(key) ? {row:i+2,status:'duplicate',reason:existing ? `Already recorded (${existing}).` : 'Repeated row in this file.'} : {row:i+2,status:'ready',reason:'Validated; ready to import.',payload};
      seen.set(key,content(payload));
    } catch (error) { result = {row:i+2,status:'invalid',reason:error instanceof Error ? error.message : String(error)}; }
    rows.push(result);
    if ((i+1)%25 === 0) { progress(i+1); await yieldToUI(); await assertCSVUser(user); }
  }
  await assertCSVUser(user); progress(table.rows.length); return rows;
}
export async function saveCSVBatch(user: string, name: string, rows: PreviewRow[]): Promise<string> {
  await assertCSVUser(user); const id = Crypto.randomUUID();
  // The complete validated journal commits before any ledger write; a restart can resume it.
  await withEncryptedWriteTransaction(async db => {
    await db.runAsync('INSERT INTO local_csv_batches(user_id,id,name,created_at) VALUES(?,?,?,?)',user,id,name.slice(0,120),new Date().toISOString());
    for (let i=0;i<rows.length;i+=50) {
      const chunk = rows.slice(i,i+50);
      const args = chunk.flatMap(r => [user,id,r.row,r.status,r.reason,r.payload ? JSON.stringify(r.payload) : null,r.payload?.csv.key??null,r.payload?.transactionId??null,r.payload?.clientOperationId??null]);
      await db.runAsync(`INSERT INTO local_csv_rows(user_id,batch_id,row_number,status,reason,payload_json,import_key,transaction_id,operation_id) VALUES ${chunk.map(()=>'(?,?,?,?,?,?,?,?,?)').join(',')}`,...args);
    }
  });
  return id;
}
type StoredRow = {row_number:number;payload_json:string};
export async function resumeCSVBatch(user: string, batch: string, progress:(n:number)=>void = ()=>{}, cancelled:()=>boolean = ()=>false) {
  let queued=0;
  while (!cancelled()) {
    await assertCSVUser(user); let remaining=0;
    await withEncryptedWriteTransaction(async db => {
      const rows=await db.getAllAsync<StoredRow>(`SELECT row_number,payload_json FROM local_csv_rows WHERE user_id=? AND batch_id=? AND status='ready' ORDER BY row_number LIMIT 25`,user,batch);
      remaining=rows.length;
      for (const row of rows) {
        const p=importPayloadSchema.parse(JSON.parse(row.payload_json)); let prior:string|null;
        try {prior=await duplicate(db,user,p);}catch(e){await db.runAsync(`UPDATE local_csv_rows SET status='invalid',reason=?,payload_json=NULL WHERE user_id=? AND batch_id=? AND row_number=?`,e instanceof Error?e.message:String(e),user,batch,row.row_number);continue;}
        if (prior) { await db.runAsync(`UPDATE local_csv_rows SET status='duplicate',reason=?,payload_json=NULL WHERE user_id=? AND batch_id=? AND row_number=?`,`Already recorded (${prior}).`,user,batch,row.row_number); continue; }
        const account=await db.getFirstAsync<Account & {status:string}>('SELECT * FROM local_accounts WHERE user_id=? AND id=?',user,p.accountId);
        const category=await db.getFirstAsync<Category & {deleted_at:string|null}>('SELECT * FROM local_categories WHERE user_id=? AND id=?',user,p.categoryId);
        if (!account || account.status!=='active' || account.currency_code!==p.csv.currency || account.currency_minor_unit!==p.csv.unit || !category || category.deleted_at || category.kind!==p.type) {
          await db.runAsync(`UPDATE local_csv_rows SET status='invalid',reason='Account or category changed. Preview this row again.',payload_json=NULL WHERE user_id=? AND batch_id=? AND row_number=?`,user,batch,row.row_number);continue;
        }
        const now=new Date().toISOString();
        await db.runAsync(`INSERT INTO local_transactions(user_id,id,account_id,category_id,type,amount_minor,currency_code,currency_minor_unit,
          transaction_date,merchant,description,notes,version,server_revision,sync_status,created_at,updated_at)
          VALUES(?,?,?,?,?,?,?,?,?,?,?,?,1,'0','pending',?,?)`,user,p.transactionId,p.accountId,p.categoryId,p.type,p.amountMinor,p.csv.currency,p.csv.unit,p.transactionDate,p.merchant,p.description,p.notes,now,now);
        await db.runAsync(`INSERT INTO sync_queue(operation_id,user_id,entity_type,mutation_kind,entity_id,payload_json,status,attempt_count,created_at,updated_at)
          VALUES(?,?,'transaction','create',?,?,'pending',0,?,?)`,p.clientOperationId,user,p.transactionId,JSON.stringify(p),now,now);
        await db.runAsync('INSERT INTO local_csv_keys(user_id,import_key,transaction_id,content_json) VALUES(?,?,?,?)',user,p.csv.key,p.transactionId,content(p));
        await db.runAsync(`UPDATE local_csv_rows SET status='pending',reason='Saved locally; awaiting server confirmation.' WHERE user_id=? AND batch_id=? AND row_number=?`,user,batch,row.row_number); queued++;
      }
    });
    progress(queued); if (remaining===0) break; await yieldToUI();
  }
  return queued;
}
export async function replayCSV(row: SyncQueueRow) {
  const p=importPayloadSchema.parse(JSON.parse(row.payload_json));
  if (p.transactionId!==row.entity_id || p.clientOperationId!==row.operation_id) throw Error('CSV queue identity mismatch.');
  await assertCSVUser(row.user_id);
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000); let result:RpcResult;
  try {result=await rpc('import_csv_transaction',{p_import_key:p.csv.key,p_transaction_id:p.transactionId,p_operation_id:p.clientOperationId,
    p_skip_matching:p.csv.skipMatching,p_source_id:p.csv.sourceId,p_payload:{...p,currency:p.csv.currency,unit:p.csv.unit}}).abortSignal(controller.signal);}finally{clearTimeout(timeout);}
  const {data,error}=result;
  if (error) return {code:error.code,message:error.code==='PGRST202' ? 'Apply the Phase 17B CSV migration, then retry sync.' : error.message};
  const ack=csvAckSchema.parse(data);
  if (ack.snapshot.transactions.length!==1 || ack.snapshot.transactions[0].id!==ack.transaction_id || !ack.snapshot.accounts.some(a=>a.id===ack.snapshot.transactions[0].account_id)) throw Error('CSV acknowledgment is incomplete. Retry sync to reconcile.');
  if (ack.status==='imported' && ack.transaction_id!==p.transactionId && !ack.replayed) throw Error('CSV import returned an unexpected transaction ID.');
  await assertCSVUser(row.user_id);
  await applySyncDelta(row.user_id,{...ack.snapshot,categories:[],next:{accounts:'0',categories:'0',transactions:'0'},has_more:{accounts:false,categories:false,transactions:false}},async db=>{
    if (ack.transaction_id!==p.transactionId) await db.runAsync(`DELETE FROM local_transactions WHERE user_id=? AND id=? AND server_revision='0' AND sync_status='pending'`,row.user_id,p.transactionId);
    await db.runAsync('UPDATE local_csv_keys SET transaction_id=? WHERE user_id=? AND import_key=?',ack.transaction_id,row.user_id,p.csv.key);
    const status=ack.transaction_id!==p.transactionId?'duplicate':ack.status;
    await db.runAsync(`UPDATE local_csv_rows SET status=?,reason=?,transaction_id=?,payload_json=NULL WHERE user_id=? AND operation_id=?`,status,status==='imported'?'Confirmed by server.':'Already recorded on server; no second entry created.',ack.transaction_id,row.user_id,row.operation_id);
    await db.runAsync('DELETE FROM sync_queue WHERE user_id=? AND operation_id=?',row.user_id,row.operation_id);
  },true);
  return {};
}
export type ReportRow = { row_number:number; status:string; reason:string; transaction_id:string|null };
export async function readCSVReport(db:SQLiteDatabase,user:string,batch:string,limit=10000):Promise<ReportRow[]> {
  return db.getAllAsync<ReportRow>(`SELECT r.row_number,CASE WHEN r.status='pending' AND q.status='failed' THEN 'failed' ELSE r.status END AS status,
    COALESCE(q.last_error,NULLIF(r.reason,''),'') AS reason,r.transaction_id FROM local_csv_rows r LEFT JOIN sync_queue q ON q.user_id=r.user_id AND q.operation_id=r.operation_id
    WHERE r.user_id=? AND r.batch_id=? ORDER BY r.row_number LIMIT ?`,user,batch,Math.min(10000,Math.max(1,limit)));
}
export async function readCSVHistory(db:SQLiteDatabase,user:string) {
  return db.getAllAsync<{id:string;name:string;created_at:string;total:number;ready:number;pending:number;imported:number;duplicate:number;invalid:number;failed:number}>(`SELECT b.*,
    COUNT(r.row_number) AS total,SUM(r.status='ready') AS ready,SUM(r.status='pending' AND COALESCE(q.status,'pending')!='failed') AS pending,
    SUM(r.status='imported') AS imported,SUM(r.status='duplicate') AS duplicate,SUM(r.status='invalid') AS invalid,SUM(r.status='pending' AND q.status='failed') AS failed
    FROM local_csv_batches b LEFT JOIN local_csv_rows r ON r.user_id=b.user_id AND r.batch_id=b.id
    LEFT JOIN sync_queue q ON q.user_id=r.user_id AND q.operation_id=r.operation_id WHERE b.user_id=? GROUP BY b.id ORDER BY b.created_at DESC LIMIT 50`,user);
}
