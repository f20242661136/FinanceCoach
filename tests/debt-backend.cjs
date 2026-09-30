const { readFileSync, readdirSync } = require('node:fs');
const { resolve } = require('node:path');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const project = resolve(process.env.DEBT_PROJECT_ROOT || '.');
const model=require('./debt-test-loader.cjs').createLoader(project)('features/debt/debt-model.ts');
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
  let checks=0;
  async function check(name,fn){await fn();checks++;console.log(`PASS ${name}`);}
  const alice=randomUUID(),bob=randomUUID();await db.query('insert into auth.users(id) values($1),($2)',[alice,bob]);
  const query=async(sql,args=[])=> (await db.query(sql,args)).rows;
  await db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${alice}',false);`);
  const dashboard=async(date='2026-09-30')=>(await query('select public.get_debt_dashboard($1) as v',[date]))[0].v;
  const page=async(direction='borrowed',cursor=null,limit=40)=>(await query('select public.get_debt_repayment_page($1,$2,$3,$4) as v',[direction,cursor?.date??null,cursor?.id??null,limit]))[0].v;
  async function loan({direction='borrowed',amount='10000',currency='USD',start='2026-04-01',due='2026-10-01',name='دکان',frequency='monthly',scheduled='1000'}={}){
    const id=randomUUID();await query(`select public.create_loan(p_loan_id:=$1,p_direction:=$2,p_counterparty_name:=$3,p_currency_code:=$4,
      p_principal_minor:=$5,p_start_date:=$6,p_due_date:=$7,p_payment_frequency:=$8,p_scheduled_payment_minor:=$9)`,[id,direction,name,currency,amount,start,due,frequency,scheduled]);return id;
  }
  async function pay(id,amount,date){const payment=randomUUID();await query('select public.add_loan_payment($1,$2,$3,$4)',[payment,id,amount,date]);return payment;}
  await check('empty dashboard and history are valid empty results',async()=>{
    const d=await dashboard();assert.deepEqual(d.loans,[]);assert.deepEqual(d.trends,[]);assert.deepEqual(await page(),{items:[],next:null});
  });
  const borrowed=await loan(),lent=await loan({direction:'given',amount:'20000'}),pkr=await loan({currency:'PKR',amount:'30000'});
  await pay(borrowed,'2000','2026-05-03');await pay(borrowed,'1000','2026-09-30');await pay(lent,'5000','2026-09-15');await pay(pkr,'10000','2026-08-01');
  await check('dashboard derives exact principal, paid, remaining, count and currency precision',async()=>{
    const d=await dashboard(),l=d.loans.find(l=>l.id===borrowed);assert.equal(l.principal_minor,'10000');assert.equal(l.paid_minor,'3000');assert.equal(l.remaining_minor,'7000');assert.equal(l.payment_count,'2');assert.equal(l.currency_minor_unit,2);assert.equal(l.counterparty_name,'دکان');
    assert.equal(d.loans.length,3);assert.equal(d.as_of,'2026-09-30');
    assert.equal(model.debtSnapshotSchema.safeParse(d).success,true);
  });
  await check('trends separate directions and currencies and include zero-filled months',async()=>{
    const d=await dashboard();assert.equal(d.trends.length,18);
    const t=(dir,curr,month)=>d.trends.find(r=>r.direction===dir&&r.currency_code===curr&&r.month===month);
    assert.equal(t('borrowed','USD','2026-04').principal_added_minor,'10000');assert.equal(t('borrowed','USD','2026-05').paid_minor,'2000');
    assert.equal(t('borrowed','USD','2026-06').paid_minor,'0');assert.equal(t('borrowed','USD','2026-09').outstanding_minor,'7000');
    assert.equal(t('given','USD','2026-09').paid_minor,'5000');assert.equal(t('borrowed','PKR','2026-08').paid_minor,'10000');
  });
  await check('history direction filters and notes retain exact Unicode and money',async()=>{
    const d=await page();assert.equal(d.items.length,3);assert.ok(d.items.every(p=>p.loan_id!==lent));
    assert.equal((await page('given')).items.length,1);assert.equal(d.items[0].amount_minor,'1000');assert.equal(d.items[0].counterparty_name,'دکان');
    assert.equal(model.repaymentPageSchema.safeParse(d).success,true);
  });
  await check('totals include recorded future repayments, trends respect as-of date',async()=>{
    await pay(borrowed,'500','2026-10-01');const d=await dashboard(),l=d.loans.find(l=>l.id===borrowed);assert.equal(l.paid_minor,'3500');
    assert.equal(d.trends.find(t=>t.direction==='borrowed'&&t.currency_code==='USD'&&t.month==='2026-09').outstanding_minor,'7000');
    assert.equal((await page()).items[0].payment_date,'2026-10-01');
  });
  await check('local date parameter changes overdue status and days to due',async()=>{
    assert.equal((await dashboard('2026-10-02')).loans.find(l=>l.id===borrowed).is_overdue,true);
    assert.equal((await dashboard('2026-10-01')).loans.find(l=>l.id===borrowed).is_overdue,false);
    assert.equal((await dashboard('2026-09-30')).loans.find(l=>l.id===borrowed).days_to_due,1);
  });
  await check('settled loan remains in totals and repayment history',async()=>{
    const settled=await loan({amount:'750'});const payment=await pay(settled,'750','2026-09-20');const d=await dashboard();
    assert.equal(d.loans.find(l=>l.id===settled).status,'settled');assert.equal(d.loans.find(l=>l.id===settled).remaining_minor,'0');
    assert.ok((await page()).items.some(p=>p.id===payment));
  });
  await check('archived/deleted loans and deleted repayments are excluded consistently',async()=>{
    const archived=await loan(),deleted=await loan(),payment=await pay(pkr,'111','2026-09-29');await pay(archived,'222','2026-09-28');await pay(deleted,'333','2026-09-27');
    await db.exec('reset role');await query("update public.loans set status='archived' where id=$1",[archived]);await query('update public.loans set deleted_at=now() where id=$1',[deleted]);await query('update public.loan_payments set deleted_at=now() where id=$1',[payment]);await db.exec('set role authenticated');
    const d=await dashboard();assert.ok(d.loans.every(l=>l.id!==archived&&l.id!==deleted));assert.equal(d.loans.find(l=>l.id===pkr).paid_minor,'10000');
    const h=await page();assert.ok(h.items.every(p=>![archived,deleted].includes(p.loan_id)&&p.id!==payment));
  });
  await check('large amounts stay strings without losing precision',async()=>{
    const id=await loan({amount:'9007199254740993'});await pay(id,'9007199254740000','2026-09-15');const l=(await dashboard()).loans.find(l=>l.id===id);
    assert.equal(l.principal_minor,'9007199254740993');assert.equal(l.paid_minor,'9007199254740000');assert.equal(l.remaining_minor,'993');
  });
  await check('history keyset pagination reaches all tied-date payments without duplicates',async()=>{
    const id=await loan({amount:'100000'});for(let i=0;i<105;i++)await pay(id,'1','2026-09-21');
    const ids=[];let cursor=null;do{const p=await page('borrowed',cursor,17);ids.push(...p.items.map(x=>x.id));cursor=p.next;}while(cursor);
    assert.equal(new Set(ids).size,ids.length);const count=(await query(`select count(*)::int as n from public.loan_payments p join public.loans l on l.id=p.loan_id where p.user_id=$1 and p.deleted_at is null and l.direction='borrowed' and l.deleted_at is null and l.status<>'archived'`,[alice]))[0].n;
    assert.equal(ids.length,count);
  });
  await check('newer payments cannot shift or duplicate previously paged history',async()=>{
    const first=await page('borrowed',null,8);await pay(pkr,'1','2026-12-31');const next=await page('borrowed',first.next,8);
    assert.ok(next.items.every(p=>!first.items.some(x=>x.id===p.id)));
  });
  await check('foreign loans/payments and malicious cross-owner payment links cannot leak',async()=>{
    await db.exec(`select set_config('request.jwt.claim.sub','${bob}',false)`);const other=await loan({name:'Private other user'});await pay(other,'555','2026-09-22');
    await db.exec('reset role');await query(`insert into public.loan_payments(id,loan_id,user_id,amount_minor,payment_date) values($1,$2,$3,99,'2026-09-22')`,[randomUUID(),borrowed,bob]);
    await db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${alice}',false)`);
    assert.ok((await dashboard()).loans.every(l=>l.id!==other));assert.equal((await dashboard()).loans.find(l=>l.id===borrowed).paid_minor,'3500');assert.ok((await page()).items.every(p=>p.loan_id!==other&&p.amount_minor!=='99'));
  });
  await check('invalid directions, null dates, half cursors and oversized pages fail clearly',async()=>{
    await assert.rejects(page('invalid'));await assert.rejects(page('borrowed',null,101));await assert.rejects(page('borrowed',{date:'2026-01-01',id:null}));
    await assert.rejects(dashboard(null));await assert.rejects(dashboard('1000-01-01'));
  });
  await check('currency precisions zero, three and four flow through snapshot and history',async()=>{
    await db.exec('reset role');await query(`insert into public.currencies(code,name,symbol,minor_unit) values('JPY','Yen','Y',0),('KWD','Dinar','K',3),('TST','Test','T',4)`);await db.exec('set role authenticated');
    for(const [code,unit] of [['JPY',0],['KWD',3],['TST',4]]){
      const id=await loan({currency:code,amount:'1000'});const payment=await pay(id,'123','2026-09-28');
      const d=(await dashboard()).loans.find(l=>l.id===id);assert.equal(d.currency_minor_unit,unit);
      assert.equal((await page()).items.find(p=>p.id===payment).currency_minor_unit,unit);
    }
  });
  await check('signed out calls and anonymous execution are denied',async()=>{
    await db.exec("select set_config('request.jwt.claim.sub','',false)");await assert.rejects(dashboard(),/Authentication required/);await assert.rejects(page(),/Authentication required/);
    await db.exec('reset role;set role anon');await assert.rejects(dashboard(),/permission denied/);await assert.rejects(page(),/permission denied/);
  });
  console.log(`${checks} debt backend checks passed.`);await db.close();
}
main().catch(e=>{console.error(e);process.exitCode=1;});
