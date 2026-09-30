const { readFileSync, readdirSync } = require('node:fs');
const { resolve } = require('node:path');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const project = resolve(process.env.DEBT_PROJECT_ROOT || '.');
let PGlite;
try { ({PGlite} = require('@electric-sql/pglite')); }
catch { ({PGlite} = require(resolve(project,'.phase17a-test-tools/node_modules/@electric-sql/pglite'))); }
async function main() {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create role supabase_auth_admin; create schema auth;
    create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}', email text);
    create function auth.uid() returns uuid language sql stable as
      $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.role() returns text language sql stable as
      $$select current_setting('request.jwt.claim.role',true)$$;
    grant usage on schema public, auth to authenticated, anon;
    grant execute on function auth.uid(), auth.role() to authenticated, anon;`);
  for (const file of readdirSync(resolve(project,'supabase/migrations')).filter(f=>f.endsWith('.sql')).sort()) {
    try { await db.exec(readFileSync(resolve(project,'supabase/migrations',file),'utf8').replace(/^\uFEFF/,'')); }
    catch (e) { throw new Error(`${file}: ${e.message}`, {cause:e}); }
  }
  console.log('All project migrations loaded in PostgreSQL.');
  let checks = 0;
  async function check(name, run) { await run(); checks++; console.log(`PASS ${name}`); }
  const alice = randomUUID(), bob = randomUUID();
  await db.query('insert into auth.users(id) values($1),($2)',[alice,bob]);
  const a=randomUUID(), b=randomUUID(), c=randomUUID(), foreign=randomUUID(), eur=randomUUID();
  await db.query(`insert into public.accounts(id,user_id,name,account_type_code,currency_code,opening_balance_minor)
    values($1,$6,'Wallet A','cash','USD',10000),($2,$6,'Wallet B','cash','USD',10000),
      ($3,$6,'Wallet C','cash','USD',10000),($4,$7,'Other user','cash','USD',10000),
      ($5,$6,'Euros','cash','EUR',10000)`,[a,b,c,foreign,eur,alice,bob]);
  const expenseCat = (await db.query("select id from public.categories where kind='expense' and is_system limit 1")).rows[0].id;
  const incomeCat = (await db.query("select id from public.categories where kind='income' and is_system limit 1")).rows[0].id;
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${alice}',false);`);
  async function query(sql,params=[]) {return (await db.query(sql,params)).rows;}
  async function create(type='expense', account=a, amount='100') {
    const id=randomUUID();
    await query(`select public.create_financial_transaction(p_account_id:=$1,p_category_id:=$5,
      p_type:=$2::public.transaction_type,p_amount_minor:=$3,p_transaction_id:=$4)`,[account,type,amount,id,type==='income'?incomeCat:expenseCat]);return id;
  }
  async function version(id) {return (await query('select version from public.transactions where id=$1',[id]))[0].version;}
  async function balance(id) {return (await query('select public.get_account_balance_minor($1)::text as v',[id]))[0].v;}
  const changes = (account=a, amount='200', type='expense', destination=null) => ({account_id:account,
    category_id:type==='transfer'?null:type==='income'?incomeCat:expenseCat,type,amount_minor:amount,transaction_date:'2026-09-29',merchant:'دکان',description:'Corrected',notes:null,destination_account_id:destination});
  async function correct(id,v,action='update',patch=changes(),op=randomUUID()) {
    return (await query('select public.correct_financial_transaction($1,$2,$3,$4,$5::jsonb) as v',[op,id,v,action,JSON.stringify(patch)]))[0].v;
  }
  const tx=await create();
  await check('income/expense edit returns exact money and recalculates source balance',async()=>{
    const r=await correct(tx,1);assert.equal(r.status,'applied');assert.equal(await version(tx),2);
    assert.equal(await balance(a),'9800');assert.equal(r.snapshot.accounts[0].current_balance_minor,'9800');
    assert.equal(r.snapshot.transactions[0].amount_minor,'200');assert.equal(r.snapshot.transactions[0].merchant,'دکان');
  });
  await check('account and type changes reverse old and apply new balance effects',async()=>{
    const r=await correct(tx,2,'update',changes(b,'350','income'));
    assert.equal(r.status,'applied');assert.equal(await balance(a),'10000');assert.equal(await balance(b),'10350');
    assert.equal(r.snapshot.accounts.length,2);
  });
  await check('stale version returns conflict without mutation',async()=>{
    const r=await correct(tx,1);assert.equal(r.status,'conflict');assert.equal(await version(tx),3);assert.equal(await balance(b),'10350');
  });
  await check('replayed operation applies once and mismatched payload cannot reuse its ID',async()=>{
    const op=randomUUID(), patch=changes(b,'450','income');
    const first=await correct(tx,3,'update',patch,op);assert.equal(first.status,'applied');
    const again=await correct(tx,3,'update',patch,op);assert.equal(again.replayed,true);
    assert.equal(await version(tx),4);assert.equal(await balance(b),'10450');
    await assert.rejects(correct(tx,3,'update',changes(b,'451','income'),op),/already been used/);
  });
  await check('old successful receipt returns latest transaction after another correction',async()=>{
    const op=randomUUID(), patch=changes(b,'460','income');await correct(tx,4,'update',patch,op);
    await correct(tx,5,'update',changes(c,'470','income'));
    const r=await correct(tx,4,'update',patch,op);assert.equal(r.snapshot.transactions[0].version,6);
    assert.equal(r.snapshot.transactions[0].account_id,c);
    assert.ok(r.snapshot.accounts.some(x=>x.id===c));
  });
  await check('cross currency, foreign account, invalid date, amount, and fields roll back',async()=>{
    for(const patch of [changes(eur),changes(foreign),{...changes(),amount_minor:'9223372036854775808'},
      {...changes(),transaction_date:'2026-02-30'},{...changes(),amount_minor:20},{...changes(),currency_code:'EUR'},
      {...changes(),type:'adjustment'}]) await assert.rejects(correct(tx,6,'update',patch));
    assert.equal(await version(tx),6);assert.equal(await balance(c),'10470');
  });
  await check('foreign transaction IDs expose neither rules nor transaction snapshots',async()=>{
    await db.exec('reset role');const other=randomUUID();
    await db.query(`insert into public.transactions(id,user_id,account_id,type,balance_effect,amount_minor,currency_code,category_id)
      values($1,$2,$3,'expense','debit',100,'USD',$4)`,[other,bob,foreign,expenseCat]);await db.exec('set role authenticated');
    const r=await correct(other,1);assert.equal(r.status,'missing');assert.deepEqual(r.snapshot,{accounts:[],transactions:[]});
    assert.deepEqual((await query('select public.get_transaction_correction_rules($1::uuid[]) as v',[[other]]))[0].v,[]);
  });
  await check('direct ledger and transfer updates cannot bypass expected versions',async()=>{
    assert.equal((await query(`select has_column_privilege('authenticated','public.transactions','amount_minor','UPDATE') as allowed`))[0].allowed,false);
    await assert.rejects(query('update public.transactions set amount_minor=1 where id=$1',[tx]),/permission denied/);
    assert.equal((await query(`select has_column_privilege('authenticated','public.transaction_transfers','source_amount_minor','UPDATE') as allowed`))[0].allowed,false);
    await assert.rejects(query('select * from private.transaction_correction_receipts'),/permission denied/);
  });
  const transfer=randomUUID();
  await query(`select public.create_transfer(p_from_account_id:=$1,p_to_account_id:=$2,p_source_amount_minor:=500,
    p_destination_amount_minor:=500,p_transaction_id:=$3)`,[a,b,transfer]);
  await check('transfer correction moves both sides atomically with conservation',async()=>{
    const r=await correct(transfer,1,'update',changes(b,'750','transfer',c));assert.equal(r.status,'applied');
    assert.equal(await balance(a),'10000');assert.equal(await balance(b),'9250');assert.equal(await balance(c),'11220');
    assert.equal(r.snapshot.transactions[0].destination_amount_minor,'750');assert.equal(r.snapshot.accounts.length,3);
    await assert.rejects(correct(transfer,2,'update',changes(b,'750','transfer',b)));
    await assert.rejects(correct(transfer,2,'update',changes(b,'750','transfer',eur)));
  });
  await check('transfer deletion reverses both balances and advances destination revision',async()=>{
    const prior=(await query('select server_revision::text as v from public.accounts where id=$1',[c]))[0].v;
    const r=await correct(transfer,2,'delete',{});assert.equal(r.status,'applied');assert.equal(await balance(b),'10000');assert.equal(await balance(c),'10470');
    assert.ok(r.snapshot.transactions[0].deleted_at);const latest=(await query('select server_revision::text as v from public.accounts where id=$1',[c]))[0].v;
    assert.ok(BigInt(latest)>BigInt(prior));assert.equal((await correct(transfer,2,'delete',{})).status,'conflict');
  });
  await check('expense deletion reverses the exact balance once',async()=>{
    const id=await create();const op=randomUUID();await correct(id,1,'delete',{},op);await correct(id,1,'delete',{},op);
    assert.equal(await balance(a),'10000');assert.equal(await version(id),2);
  });
  await check('linked feature metadata and adjustments are blocked server side',async()=>{
    await db.exec('reset role');const linked=randomUUID(),adjustment=randomUUID();
    await db.query(`insert into public.transactions(id,user_id,account_id,type,balance_effect,amount_minor,currency_code,metadata,category_id)
      values($1,$3,$4,'expense','debit',100,'USD','{"feature":"rosca"}',$5),($2,$3,$4,'adjustment','credit',100,'USD','{}',null)`,[linked,adjustment,alice,a,expenseCat]);
    await db.exec('set role authenticated');assert.equal((await correct(linked,1)).status,'blocked');assert.equal((await correct(adjustment,1)).status,'blocked');
  });
  await check('deletion still works if original category has since been deleted',async()=>{
    await db.exec('reset role');const cat=randomUUID();
    await db.query(`insert into public.categories(id,user_id,kind,default_name,is_system) values($1,$2,'expense','Old',false)`,[cat,alice]);
    const id=randomUUID();await db.query(`insert into public.transactions(id,user_id,account_id,category_id,type,balance_effect,amount_minor,currency_code)
      values($1,$2,$3,$4,'expense','debit',100,'USD')`,[id,alice,a,cat]);
    await db.query('update public.categories set deleted_at=now() where id=$1',[cat]);await db.exec('set role authenticated');
    assert.equal((await correct(id,1,'delete',{})).status,'applied');
  });
  await check('ROSCA contribution links block corrections even with empty transaction metadata',async()=>{
    const linked=await create();await db.exec('reset role');const group=randomUUID(),member=randomUUID(),cycle=randomUUID();
    await db.query(`insert into public.rosca_groups(id,creator_user_id,name,currency_code,contribution_amount_minor,contribution_frequency,cycle_count,start_date,join_code)
      values($1,$2,'Test group','USD',100,'monthly',2,'2026-09-01','correction-test')`,[group,alice]);
    await db.query(`insert into public.rosca_members(id,group_id,user_id,display_name,member_order) values($1,$2,$3,'Alice',1)`,[member,group,alice]);
    await db.query(`insert into public.rosca_cycles(id,group_id,cycle_number,due_date,payout_member_id) values($1,$2,1,'2026-09-30',$3)`,[cycle,group,member]);
    await db.query(`insert into public.rosca_contributions(group_id,cycle_id,member_id,user_id,planned_amount_minor,linked_transaction_id) values($1,$2,$3,$4,100,$5)`,[group,cycle,member,alice,linked]);
    await db.exec('set role authenticated');assert.equal((await correct(linked,1,'delete',{})).status,'blocked');assert.equal(await version(linked),1);
  });
  await check('deleted entries leave period totals, and changed dates move totals between periods',async()=>{
    const id=await create();const sum=async(date)=>(await query(`select coalesce(sum(amount_minor),0)::text as v from public.transactions where deleted_at is null and type='expense' and transaction_date=$1`,[date]))[0].v;
    const before=await sum('2026-08-01');await correct(id,1,'update',{...changes(a,'321'),transaction_date:'2026-08-01'});
    assert.equal(await sum('2026-08-01'),(BigInt(before)+321n).toString());await correct(id,2,'delete',{});assert.equal(await sum('2026-08-01'),before);
  });
  await check('large amounts remain decimal strings above JavaScript safe integer',async()=>{
    const id=await create('income',a);const r=await correct(id,1,'update',changes(a,'9007199254740993','income'));
    assert.equal(r.snapshot.transactions[0].amount_minor,'9007199254740993');assert.equal(typeof r.snapshot.accounts[0].current_balance_minor,'string');
    await correct(id,2,'delete',{});
  });
  await check('inactive accounts cannot receive edits but deleting an old entry is allowed',async()=>{
    const id=await create();await db.exec('reset role');await db.query("update public.accounts set status='inactive' where id=$1",[a]);await db.exec('set role authenticated');
    await assert.rejects(correct(id,1,'update',changes()),/active accounts/);assert.equal((await correct(id,1,'delete',{})).status,'applied');
    await db.exec('reset role');await db.query("update public.accounts set status='active' where id=$1",[a]);await db.exec('set role authenticated');
  });
  await check('a foreign category cannot be smuggled through a correction RPC',async()=>{
    const cat=randomUUID();await db.exec('reset role');await db.query(`insert into public.categories(id,user_id,kind,default_name,is_system) values($1,$2,'expense','Private',false)`,[cat,bob]);await db.exec('set role authenticated');
    await assert.rejects(correct(tx,6,'update',{...changes(),category_id:cat}),/does not belong/);assert.equal(await version(tx),6);
  });
  await check('anonymous and signed out correction calls are denied',async()=>{
    await db.exec(`reset role; set role anon; select set_config('request.jwt.claim.sub','',false);`);
    await assert.rejects(correct(tx,6),/permission denied/);await db.exec('reset role; set role authenticated');
    await assert.rejects(correct(tx,6),/Authentication required/);
  });
  console.log(`${checks} backend checks passed.`);
  await db.close();
}
main().catch(e=>{ console.error(e);process.exitCode=1; });
