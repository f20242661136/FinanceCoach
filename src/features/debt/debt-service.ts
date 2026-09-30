import { z } from 'zod';
import * as Crypto from 'expo-crypto';
import NetInfo from '@react-native-community/netinfo';
import type { SQLiteDatabase } from 'expo-sqlite';
import { supabase } from '@/lib/supabase';
import { withEncryptedWriteTransaction } from '@/offline/database/encrypted-writer';
import { debtSnapshotSchema, repaymentPageSchema, type DebtSnapshot, type Direction, type RepaymentCursor, type RepaymentPage } from './debt-model';

export type Saved<T>={capturedAt:string;value:T};
type RpcResult={data:unknown;error:{message:string;code?:string}|null};
type Rpc=(name:string,args:Record<string,unknown>)=>PromiseLike<RpcResult>&{abortSignal(signal:AbortSignal):PromiseLike<RpcResult>};
const rpc=supabase.rpc.bind(supabase) as unknown as Rpc;
const snapshotKey=(user:string)=>`debt.dashboard.v1:${user}`;
const historyKey=(user:string,direction:Direction,cursor:RepaymentCursor)=>`debt.history.v1:${user}:${direction}:${cursor?`${cursor.date}:${cursor.id}`:'first'}`;
export const dirtyDebtKey=(user:string)=>`debt.dirty.v1:${user}`;
export class DebtRequestError extends Error{
  constructor(public readonly kind:'offline'|'setup'|'session'|'server',message:string){super(message);}
}
async function assertUser(user:string){
  const {data,error}=await supabase.auth.getSession();
  if(error||!user||data.session?.user.id!==user)throw new DebtRequestError('session','Your session changed. Reopen the dashboard for your current account.');
}
async function request(user:string,name:string,args:Record<string,unknown>){
  const network=await NetInfo.fetch();
  if(network.isConnected===false||network.isInternetReachable===false)throw new DebtRequestError('offline','You are offline. Connect to refresh your debt records.');
  await assertUser(user);
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),15000);
  try{
    const {data,error}=await rpc(name,args).abortSignal(controller.signal);
    if(error){
      if(error.code==='PGRST202'||error.code==='42883')throw new DebtRequestError('setup','Debt dashboard setup is missing. Apply the Phase 17A Supabase migration, then retry.');
      throw new DebtRequestError('server',controller.signal.aborted?'Refresh timed out. Your saved data remains available.':error.message);
    }
    await assertUser(user);return data;
  }finally{clearTimeout(timeout);}
}
async function readSaved<T extends z.ZodType>(db:SQLiteDatabase,key:string,schema:T):Promise<Saved<z.infer<T>>|null>{
  const row=await db.getFirstAsync<{value:string}>('SELECT value FROM local_meta WHERE key=?',key);
  if(!row)return null;
  try{const parsed=z.object({capturedAt:z.string().datetime(),value:z.unknown()}).parse(JSON.parse(row.value));return {capturedAt:parsed.capturedAt,value:schema.parse(parsed.value)};}
  catch{return null;} // A bad cache cannot become a false zero balance or block a fresh server read.
}
async function persist(key:string,data:Saved<unknown>){
  await withEncryptedWriteTransaction(async db=>{
    await db.runAsync(`INSERT INTO local_meta(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`,key,JSON.stringify(data),data.capturedAt);
  });
}
export async function readSavedDebt(db:SQLiteDatabase,user:string){
  if(!user)throw new DebtRequestError('session','Authentication required.');
  return readSaved(db,snapshotKey(user),debtSnapshotSchema);
}
export async function fetchDebtSnapshot(db:SQLiteDatabase,user:string,asOf:string):Promise<Saved<DebtSnapshot>>{
  const dirtyBefore=await db.getFirstAsync<{value:string}>('SELECT value FROM local_meta WHERE key=?',dirtyDebtKey(user));
  const data=debtSnapshotSchema.parse(await request(user,'get_debt_dashboard',{p_as_of:asOf}));
  if(data.as_of!==asOf)throw Error('The server returned an unexpected dashboard date.');
  const saved={capturedAt:new Date().toISOString(),value:data};
  let selected=saved;
  await withEncryptedWriteTransaction(async db=>{
    const old=await readSavedDebt(db,user);
    if(!old||Date.parse(old.value.generated_at)<=Date.parse(data.generated_at)){
      await db.runAsync(`INSERT INTO local_meta(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`,snapshotKey(user),JSON.stringify(saved),saved.capturedAt);
      // A repayment accepted while this request was in flight leaves a new marker.
      if(dirtyBefore)await db.runAsync('DELETE FROM local_meta WHERE key=? AND value=?',dirtyDebtKey(user),dirtyBefore.value);
    } else selected=old;
  });
  return selected;
}
export async function readSavedRepayments(db:SQLiteDatabase,user:string,direction:Direction,cursor:RepaymentCursor){
  if(!user)throw new DebtRequestError('session','Authentication required.');
  return readSaved(db,historyKey(user,direction,cursor),repaymentPageSchema);
}
export type RepaymentResult=Saved<RepaymentPage>&{source:'server'|'saved';warning?:string};
export async function fetchRepaymentPage(db:SQLiteDatabase,user:string,direction:Direction,cursor:RepaymentCursor):Promise<RepaymentResult>{
  try{
    const page=repaymentPageSchema.parse(await request(user,'get_debt_repayment_page',{
      p_direction:direction,p_after_date:cursor?.date??null,p_after_id:cursor?.id??null,p_limit:40,
    }));
    if(page.items.length>40||page.items.some((row,i)=>i>0 && (row.payment_date>page.items[i-1].payment_date || (row.payment_date===page.items[i-1].payment_date&&row.id>=page.items[i-1].id))))throw Error('Invalid repayment page order.');
    if(cursor && page.items.some(row=>row.payment_date>cursor.date || (row.payment_date===cursor.date&&row.id>=cursor.id)))throw Error('Invalid repayment cursor response.');
    if(page.next && (!page.items.length || page.next.id!==page.items.at(-1)!.id || page.next.date!==page.items.at(-1)!.payment_date))throw Error('Invalid next repayment cursor.');
    const saved={capturedAt:new Date().toISOString(),value:page};
    await persist(historyKey(user,direction,cursor),saved);return {...saved,source:'server'};
  }catch(error){
    // Authentication changes must not release the previous account's cache to a new screen.
    if(error instanceof DebtRequestError && error.kind==='session')throw error;
    const cached=await readSavedRepayments(db,user,direction,cursor);
    if(cached)return {...cached,source:'saved',warning:error instanceof Error?error.message:'Could not refresh repayment history.'};
    throw error;
  }
}
export async function markDebtChanged(user:string){
  if(!user)return;
  await persist(dirtyDebtKey(user),{capturedAt:new Date().toISOString(),value:Crypto.randomUUID()});
}
export async function readDebtDirty(db:SQLiteDatabase,user:string){
  return Boolean(await db.getFirstAsync('SELECT key FROM local_meta WHERE key=?',dirtyDebtKey(user)));
}
