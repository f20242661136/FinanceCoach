const {readFileSync,readdirSync}=require('node:fs');const {resolve}=require('node:path');
const assert=require('node:assert/strict');const {randomUUID,createHash}=require('node:crypto');
const project=resolve(process.env.CSV_PROJECT_ROOT||'.');
const model=require('./csv-test-loader.cjs').createLoader(project)('features/csv/csv-model.ts');
let PGlite;try{({PGlite}=require('@electric-sql/pglite'));}catch{({PGlite}=require(resolve(project,'.phase17b-test-tools/node_modules/@electric-sql/pglite')));}
async function main(){
 const db=new PGlite();await db.exec(`create role anon;create role authenticated;create role service_role;create role supabase_auth_admin;create schema auth;
 create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}',email text);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.role() returns text language sql stable as $$select current_setting('request.jwt.claim.role',true)$$;
 grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid(),auth.role() to authenticated,anon;`);
 const migrations=readdirSync(resolve(project,'supabase/migrations')).filter(f=>f.endsWith('.sql')).sort();
 for(const f of migrations){try{await db.exec(readFileSync(resolve(project,'supabase/migrations',f),'utf8').replace(/^\uFEFF/,''));}catch(e){throw Error(`${f}: ${e.message}`);}}
 console.log(`${migrations.length} migrations loaded in PostgreSQL.`);
 const alice=randomUUID(),bob=randomUUID(),account=randomUUID(),other=randomUUID(),large=randomUUID();
 await db.query('insert into auth.users(id) values($1),($2)',[alice,bob]);
 await db.query(`insert into public.accounts(id,user_id,name,account_type_code,currency_code,opening_balance_minor) values($1,$4,'Wallet','cash','USD',10000),($2,$5,'Other','cash','USD',10000),($3,$4,'Large','cash','USD',0)`,[account,other,large,alice,bob]);
 const query=async(sql,args=[]) =>(await db.query(sql,args)).rows;
 const expense=(await query("select id from public.categories where kind='expense' and is_system limit 1"))[0].id;
 const income=(await query("select id from public.categories where kind='income' and is_system limit 1"))[0].id;
 await db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${alice}',false);`);
 const payload=(patch={})=>({accountId:account,categoryId:expense,type:'expense',amountMinor:'100',transactionDate:'2026-09-30',currency:'USD',unit:2,merchant:'دکان 🪙',description:'Imported',notes:null,...patch});
 const key=()=>createHash('sha256').update(randomUUID()).digest('hex');
 async function call(p=payload(),k=key(),skip=true,source=null,id=randomUUID(),op=randomUUID()) {const v=(await query('select public.import_csv_transaction($1,$2,$3,$4::jsonb,$5,$6) AS v',[k,id,op,JSON.stringify(p),skip,source]))[0].v;model.csvAckSchema.parse(v);return v;}
 const balance=async(a=account)=>(await query('select public.get_account_balance_minor($1)::text AS v',[a]))[0].v;
 let checks=0;const check=async(name,fn)=>{await fn();checks++;console.log('PASS '+name);};let first,firstKey=key();
 await check('valid expense with system category preserves exact Unicode and balance',async()=>{first=await call(payload(),firstKey);assert.equal(first.status,'imported');assert.equal(first.snapshot.transactions[0].merchant,'دکان 🪙');assert.equal(first.snapshot.accounts[0].current_balance_minor,'9900');});
 await check('lost-response retry with new client UUIDs returns the original receipt once',async()=>{const r=await call(payload(),firstKey);assert.equal(r.replayed,true);assert.equal(r.transaction_id,first.transaction_id);assert.equal(await balance(),'9900');});
 await check('same key with changed financial data rejects without a write',async()=>{await assert.rejects(call(payload({notes:'Changed'}),firstKey),/different data/);assert.equal(await balance(),'9900');});
 await check('distinct references with identical content skip existing ledger entry',async()=>{const r=await call();assert.equal(r.status,'duplicate');assert.equal(r.transaction_id,first.transaction_id);assert.equal(await balance(),'9900');});
 await check('keep mode allows legitimate identical purchases',async()=>{const r=await call(payload(),key(),false);assert.equal(r.status,'imported');assert.notEqual(r.transaction_id,first.transaction_id);assert.equal(await balance(),'9800');});
 await check('income balance effect and client acknowledgment schema are valid',async()=>{const r=await call(payload({type:'income',categoryId:income,amountMinor:'200'}));assert.equal(await balance(),'10000');assert.equal(r.snapshot.transactions[0].amount_minor,'200');});
 await check('export source ID prevents reimport after text changes',async()=>{const r=await call(payload({notes:'Different export notes'}),key(),false,first.transaction_id);assert.equal(r.status,'duplicate');assert.equal(r.transaction_id,first.transaction_id);});
 await check('foreign accounts and missing categories are rejected',async()=>{await assert.rejects(call(payload({accountId:other})),/unavailable/);await assert.rejects(call(payload({categoryId:randomUUID()})),/Category/);});
 await check('currency and precision must match the active owned account',async()=>{for(const patch of [{currency:'EUR'},{unit:3},{unit:null}])await assert.rejects(call(payload(patch)));});
 await check('unsupported types and mismatched categories are rejected',async()=>{for(const type of ['transfer','adjustment','bad',null])await assert.rejects(call(payload({type})));await assert.rejects(call(payload({categoryId:income})));});
 await check('invalid dates, zero, negatives and overflow cannot write',async()=>{for(const amountMinor of ['0','-10','1.2','9223372036854775808','0001',null])await assert.rejects(call(payload({amountMinor})));await assert.rejects(call(payload({transactionDate:'2026-02-30'})));});
 await check('ledger merchant, description and note limits are enforced',async()=>{for(const patch of [{merchant:'x'.repeat(121)},{description:'x'.repeat(161)},{notes:'x'.repeat(2001)}])await assert.rejects(call(payload(patch)),/length/);});
 await check('large minor units stay exact beyond JS safe integer',async()=>{const r=await call(payload({accountId:large,type:'income',categoryId:income,amountMinor:'9007199254740993'}));assert.equal(r.snapshot.transactions[0].amount_minor,'9007199254740993');assert.equal(await balance(large),'9007199254740993');});
 await check('old operation ID cannot be recycled through a new CSV key',async()=>{const op=randomUUID();await call(payload({amountMinor:'11'}),key(),false,null,randomUUID(),op);await assert.rejects(call(payload({amountMinor:'11',notes:'Changed'}),key(),false,null,randomUUID(),op),/already used/);});
 await check('deleted imported transaction is not recreated by a receipt retry',async()=>{await db.exec('reset role');await query('update public.transactions set deleted_at=now() where id=$1',[first.transaction_id]);await db.exec('set role authenticated');const r=await call(payload(),firstKey);assert.ok(r.snapshot.transactions[0].deleted_at);});
 await check('inactive account rejects fresh rows but allows receipt reconciliation',async()=>{await db.exec('reset role');await query("update public.accounts set status='inactive' where id=$1",[account]);await db.exec('set role authenticated');await assert.rejects(call(payload({amountMinor:'22'})),/unavailable/);assert.equal((await call(payload(),firstKey)).replayed,true);});
 await check('private receipts are unreadable to clients',async()=>{await assert.rejects(query('select * from private.csv_import_receipts'),/permission denied/);});
 await check('keys and source transaction lookups isolate different users',async()=>{await db.exec(`select set_config('request.jwt.claim.sub','${bob}',false);`);const r=await call(payload({accountId:other}),firstKey,true,first.transaction_id);assert.notEqual(r.transaction_id,first.transaction_id);assert.ok(r.snapshot.accounts.every(a=>a.id===other));});
 await check('anonymous and signed-out callers cannot import',async()=>{await db.exec("select set_config('request.jwt.claim.sub','',false);");await assert.rejects(call(payload({accountId:other})),/Authentication/);await db.exec('set role anon');await assert.rejects(call(),/permission denied/);});
 console.log(`${checks} CSV backend checks passed.`);await db.close();
}
main().catch(e=>{console.error(e);process.exitCode=1;});
