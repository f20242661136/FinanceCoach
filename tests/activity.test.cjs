const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync, existsSync } = require('node:fs');
const { resolve, dirname } = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const ts = require('typescript');
const { QueryClient, InfiniteQueryObserver, QueryObserver, onlineManager } = require('@tanstack/query-core');

const sourceRoot = resolve(__dirname, '../src');
const projectRoot = process.env.ACTIVITY_PROJECT_ROOT && resolve(process.env.ACTIVITY_PROJECT_ROOT);
let currentDb, currentUser = 'alice';
const overrides = {
  '@tanstack/react-query': { useQuery: options => options, useInfiniteQuery: options => options },
  'expo-sqlite': { useSQLiteContext: () => currentDb },
  '@/features/auth/auth-context': { useAuth: () => ({ session: { user: { id: currentUser } } }) },
  '@/offline/sync/queue-health': { useRetryQueuedMutations: () => ({}) },
  'react-native': { StyleSheet: { create: value => value }, Platform: { OS: 'ios', select: value => value.ios ?? value.default }, Text: 'Text', View: 'View', Pressable: 'Pressable', ActivityIndicator: 'ActivityIndicator' },
  '@expo/vector-icons/Ionicons': { glyphMap: {} },
};
const compiled = new Map();
function load(name) {
  if (overrides[name]) return overrides[name];
  const file = resolve(sourceRoot, name);
  if (compiled.has(file)) return compiled.get(file).exports;
  const module = { exports: {} }; compiled.set(file, module);
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  function localRequire(id) {
    if (overrides[id]) return overrides[id];
    if (id.startsWith('.') || id.startsWith('@/')) {
      const path = id.startsWith('@/') ? resolve(sourceRoot, id.slice(2)) : resolve(dirname(file), id);
      const candidate = `${path}.ts`;
      const target = existsSync(candidate) ? candidate : `${path}.tsx`;
      if (existsSync(target)) return load(target);
      if (projectRoot && id.startsWith('@/')) {
        const base = resolve(projectRoot, 'src', id.slice(2));
        return load(existsSync(`${base}.ts`) ? `${base}.ts` : `${base}.tsx`);
      }
      throw new Error(`Missing dependency ${id}; run after merging src/tests into your project, or set ACTIVITY_PROJECT_ROOT to the installed project.`);
    }
    return require(id);
  }
  new Function('require', 'module', 'exports', code)(localRequire, module, module.exports);
  return module.exports;
}
const model = load('features/activity/activity-model.ts');
const sql = load('features/activity/activity-sql.ts');
const repo = load('features/activity/activity-repository.ts');
const hooks = load('features/activity/activity-hooks.ts');
const schema = readFileSync(resolve(__dirname, 'schema.sql'), 'utf8');
const filters = patch => ({ ...model.EMPTY_FILTERS, ...patch });
const uuid = number => `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;

function fixture() {
  const native = new DatabaseSync(':memory:'); native.exec(schema);
  const db = {
    async getAllAsync(query, params) { return native.prepare(query).all(...params); },
    async getFirstAsync(query, params) { return native.prepare(query).get(...params) ?? null; },
    async *getEachAsync(query, params) { yield* native.prepare(query).iterate(...params); },
  };
  function account(id, { user = 'alice', name = `Wallet ${id}`, currency = 'USD', unit = 2, status = 'active' } = {}) {
    native.prepare(`INSERT INTO local_accounts (user_id,id,name,account_type_code,balance_class,currency_code,currency_minor_unit,opening_balance_minor,current_balance_minor,status) VALUES (?,?,?,'cash','asset',?,?,'0','0',?)`).run(user,id,name,currency,unit,status);
  }
  function category(id = 'cat', { user = 'alice', name = 'Groceries' } = {}) {
    native.prepare(`INSERT INTO local_categories (user_id,id,kind,default_name,is_system) VALUES (?,?,'expense',?,0)`).run(user,id,name);
  }
  function transaction(number, { user = 'alice', account = 'a', category = 'cat', kind = 'expense', amount = '100', currency = 'USD', unit = 2, date = '2026-09-30', merchant = null, description = null, notes = null, sync = 'synced', deleted = null, destination = null, destinationAmount = null, destinationCurrency = null, destinationUnit = null, created = null } = {}) {
    const id = uuid(number);
    native.prepare(`INSERT INTO local_transactions (user_id,id,account_id,category_id,type,amount_minor,currency_code,currency_minor_unit,transaction_date,merchant,description,notes,sync_status,deleted_at,destination_account_id,destination_amount_minor,destination_currency_code,destination_currency_minor_unit,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(user,id,account,category,kind,amount,currency,unit,date,merchant,description,notes,sync,deleted,destination,destinationAmount,destinationCurrency,destinationUnit,created);
    return id;
  }
  function queue(number, { user = 'alice', status = 'failed', entity = 'transaction', entityId = uuid(number) } = {}) {
    native.prepare(`INSERT INTO sync_queue (operation_id,user_id,entity_type,mutation_kind,entity_id,payload_json,status,created_at,updated_at) VALUES (?,?,?,'create',?,'{}',?,'2026-09-30','2026-09-30')`).run(`${user}-${entity}-${number}-${status}`,user,entity,entityId,status);
  }
  account('a'); category();
  return { native, db, account, category, transaction, queue, close: () => native.close() };
}
async function withFixture(run) { const f = fixture(); try { return await run(f); } finally { f.close(); } }

async function allRows(f, input = filters(), user = 'alice') {
  let cursor = null; const items = [];
  do { const page = await repo.readActivityPage(f.db,user,input,cursor); items.push(...page.items); cursor = page.next; } while (cursor);
  return items;
}

test('calendar dates reject impossible values and reversed ranges', () => {
  assert.equal(model.validActivityDate('2026-02-29'),false);
  assert.equal(model.validActivityDate('2024-02-29'),true);
  assert.match(model.filterError(filters({ from:'2026-09-30',to:'2026-09-01' })),/end date/);
  assert.match(model.filterError(filters({ from:'bad' })),/start date/);
  assert.equal(model.filterError(filters({ from:'2026-09-01',to:'2026-09-30' })),null);
});
test('relative date headings respect Karachi midnight and calendar month boundaries', () => {
  const today = model.todayInZone(new Date('2026-09-29T20:00:00Z'),'Asia/Karachi');
  assert.equal(today,'2026-09-30');
  assert.equal(model.dateHeading(today,today),'Today');
  assert.equal(model.dateHeading('2026-09-29',today),'Yesterday');
  assert.equal(model.shiftDay('2026-03-01',-1),'2026-02-28');
  assert.equal(model.shiftDay('2024-03-01',-1),'2024-02-29');
});
test('filter count covers all dimensions and does not count whitespace', () => {
  assert.equal(model.filterCount(filters({search:' '})),0);
  assert.equal(model.filterCount(filters({search:'food',kind:'expense',accountId:'a',currency:'USD',status:'failed',from:'2026-01-01'})),6);
});
test('date grouping removes overlapping page IDs without changing order', () => {
  const rows = [{id:'b',transaction_date:'2026-09-30'},{id:'a',transaction_date:'2026-09-30'},{id:'c',transaction_date:'2026-09-29'}];
  const groups = model.groupActivity([...rows,rows[0]]);
  assert.deepEqual(groups.map(g=>g.data.map(r=>r.id)),[['b','a'],['c']]);
});
test('titles use merchant, description, category, then actual kind; unknown sync status is explicit', () => {
  assert.equal(model.activityTitle({merchant:' ',description:' Rent ',category_name:'Housing',type:'expense'}),'Rent');
  assert.equal(model.activityTitle({merchant:null,description:null,category_name:null,type:'transfer'}),'Transfer');
  assert.equal(model.syncLabel('unknown'),'Status unavailable');
});
test('SQL never interpolates a search term, account ID, currency, or cursor', () => {
  const input = `x' OR 1=1 --`;
  const query = sql.activityPageQuery('alice', filters({search:input,accountId:input,currency:input}),{date:input,id:input});
  assert.ok(!query.sql.includes(input)); assert.ok(query.params.includes(input));
});
test('complete history pages beyond 100 records with tied dates and null creation times', async () => withFixture(async f => {
  for(let i=1;i<=123;i++) f.transaction(i);
  const first = await repo.readActivityPage(f.db,'alice',filters(),null);
  assert.equal(first.items.length,40); assert.equal(first.next.id,uuid(84));
  const rows = await allRows(f);
  assert.equal(rows.length,123); assert.equal(new Set(rows.map(r=>r.id)).size,123);
  assert.equal(rows[0].id,uuid(123)); assert.equal(rows.at(-1).id,uuid(1));
  assert.equal((await repo.readActivitySummary(f.db,'alice',filters())).count,123);
}));
test('a new record above the cursor cannot duplicate or shift older pages', async () => withFixture(async f => {
  for(let i=1;i<=65;i++) f.transaction(i);
  const page = await repo.readActivityPage(f.db,'alice',filters(),null);
  f.transaction(99);
  const next = await repo.readActivityPage(f.db,'alice',filters(),page.next);
  assert.equal(next.items.length,25); assert.equal(next.items[0].id,uuid(25));
  assert.equal(new Set([...page.items,...next.items].map(r=>r.id)).size,65);
  assert.equal((await repo.readActivityPage(f.db,'alice',filters(),null)).items[0].id,uuid(99));
}));
test('paging continues across transaction dates with stable ordering', async () => withFixture(async f => {
  for(let i=1;i<=55;i++) f.transaction(i,{date:i<=20?'2026-09-29':'2026-09-30'});
  const rows = await allRows(f);
  assert.deepEqual(rows.slice(0,35).map(r=>r.transaction_date),Array(35).fill('2026-09-30'));
  assert.equal(rows[35].id,uuid(20)); assert.equal(rows.at(-1).id,uuid(1));
}));
test('search finds older entries, merchant/description/notes/account/category, with literal wildcards', async () => withFixture(async f => {
  f.transaction(1,{merchant:'Old Cafe',date:'2020-01-01'});
  for(let i=2;i<=120;i++) f.transaction(i);
  assert.equal((await allRows(f,filters({search:'old CAFE'}))).length,1);
  f.transaction(200,{description:'Subscription 100%_done',notes:'Annual renewal'});
  assert.equal((await allRows(f,filters({search:'100%_done'}))).length,1);
  assert.equal((await allRows(f,filters({search:'annual'}))).length,1);
  assert.equal((await allRows(f,filters({search:'wallet a'}))).length,121);
  assert.equal((await allRows(f,filters({search:'groceries'}))).length,121);
  assert.equal((await allRows(f,filters({search:"' OR 1=1 --"}))).length,0);
}));
test('Unicode text survives search and joined labels', async () => withFixture(async f => {
  f.transaction(1,{merchant:'کراچی مارکیٹ'});
  const rows = await allRows(f,filters({search:'کراچی'}));
  assert.equal(rows.length,1); assert.equal(rows[0].merchant,'کراچی مارکیٹ');
}));
test('combined type/account/currency/status/date filters are inclusive and totals use the same matches', async () => withFixture(async f => {
  f.transaction(1,{sync:'pending',date:'2026-09-01',amount:'101'});
  f.transaction(2,{sync:'pending',date:'2026-09-30',amount:'202'});
  f.transaction(3,{date:'2026-09-30'}); f.transaction(4,{kind:'income',sync:'pending'});
  f.transaction(5,{sync:'pending',date:'2026-08-31'});
  const input = filters({kind:'expense',accountId:'a',currency:'USD',status:'pending',from:'2026-09-01',to:'2026-09-30'});
  assert.deepEqual((await allRows(f,input)).map(r=>r.id),[uuid(2),uuid(1)]);
  const summary = await repo.readActivitySummary(f.db,'alice',input);
  assert.equal(summary.count,2); assert.equal(summary.currencies[0].expenseMinor,'303');
}));
test('transfers match either account/currency and preserve both amounts and precisions', async () => withFixture(async f => {
  f.account('j',{currency:'JPY',unit:0,name:'Yen wallet'});
  f.transaction(1,{kind:'transfer',amount:'1200',category:null,destination:'j',destinationAmount:'1750',destinationCurrency:'JPY',destinationUnit:0});
  const rows = await allRows(f,filters({accountId:'j',currency:'JPY',search:'Yen'}));
  assert.equal(rows.length,1); assert.equal(rows[0].currency_minor_unit,2);
  assert.equal(rows[0].destination_currency_minor_unit,0); assert.equal(rows[0].destination_amount_minor,'1750');
  const summary = await repo.readActivitySummary(f.db,'alice',filters({currency:'JPY'}));
  assert.equal(summary.count,1); assert.equal(summary.currencies.length,0);
}));
test('failed/processing queue states override stale ledger status without duplicating transactions', async () => withFixture(async f => {
  f.transaction(1,{sync:'pending'}); f.queue(1); f.queue(1,{status:'pending'});
  f.transaction(2,{sync:'synced'}); f.queue(2,{status:'processing'});
  f.transaction(3,{sync:'pending'}); f.queue(3,{status:'failed',entity:'account'});
  assert.deepEqual((await allRows(f,filters({status:'failed'}))).map(r=>r.id),[uuid(1)]);
  assert.deepEqual((await allRows(f,filters({status:'pending'}))).map(r=>r.id),[uuid(3),uuid(2)]);
  assert.equal((await repo.readActivityDetail(f.db,'alice',uuid(1))).sync_status,'failed');
}));
test('transfer queue failures are detected too', async () => withFixture(async f => {
  f.transaction(1,{kind:'transfer'}); f.queue(1,{entity:'transfer'});
  assert.equal((await allRows(f,filters({status:'failed'}))).length,1);
}));
test('queue states belonging to another user cannot affect your rows or counts', async () => withFixture(async f => {
  f.transaction(1); f.queue(1,{user:'bob'});
  assert.equal((await allRows(f))[0].sync_status,'synced');
  assert.deepEqual(await repo.readActivityQueue(f.db,'alice'),{waiting:0,failed:0});
}));
test('user isolation covers rows, detail lookup, joins, totals, options, and shared transaction IDs', async () => withFixture(async f => {
  f.account('a',{user:'bob',name:'Secret wallet'}); f.category('cat',{user:'bob',name:'Secret category'});
  f.transaction(1,{amount:'123'}); f.transaction(1,{user:'bob',amount:'999',merchant:'Secret'});
  f.transaction(2,{user:'bob',currency:'EUR'});
  const rows = await allRows(f); assert.equal(rows.length,1); assert.equal(rows[0].account_name,'Wallet a');
  assert.equal(rows[0].category_name,'Groceries');
  assert.equal(await repo.readActivityDetail(f.db,'alice',uuid(2)),null);
  assert.equal((await repo.readActivitySummary(f.db,'alice',filters())).currencies[0].expenseMinor,'123');
  assert.deepEqual((await repo.readActivityOptions(f.db,'alice')).currencies,['USD']);
  assert.equal((await repo.readActivityOptions(f.db,'alice')).accounts.length,1);
}));
test('deleted entries are excluded everywhere; missing or archived accounts do not erase history', async () => withFixture(async f => {
  f.transaction(1,{deleted:'2026-09-30'}); f.transaction(2,{account:'missing',category:null});
  f.account('old',{status:'archived'}); f.transaction(3,{account:'old'});
  assert.equal((await allRows(f)).length,2); assert.equal(await repo.readActivityDetail(f.db,'alice',uuid(1)),null);
  assert.equal((await repo.readActivityDetail(f.db,'alice',uuid(2))).account_name,'Account unavailable');
  assert.equal((await repo.readActivitySummary(f.db,'alice',filters())).count,2);
  assert.ok((await repo.readActivityOptions(f.db,'alice')).accounts.some(a=>a.status==='archived'));
}));
test('very large money totals are exact, mixed precision is normalized, and currencies stay separate', async () => withFixture(async f => {
  f.transaction(1,{kind:'income',amount:'999999999999999999999999',unit:2});
  f.transaction(2,{kind:'income',amount:'1',unit:0});
  f.transaction(3,{amount:'105',unit:2});
  f.transaction(4,{currency:'JPY',unit:0,amount:'900'});
  f.transaction(5,{kind:'transfer',amount:'999999'}); f.transaction(6,{kind:'adjustment',amount:'999999'});
  const summary = await repo.readActivitySummary(f.db,'alice',filters());
  assert.equal(summary.count,6);
  assert.deepEqual(summary.currencies,[{currency:'JPY',minorUnit:0,incomeMinor:'0',expenseMinor:'900'},{currency:'USD',minorUnit:2,incomeMinor:'1000000000000000000000099',expenseMinor:'105'}]);
}));
test('summary covers older matching entries beyond the first page', async () => withFixture(async f => {
  for(let i=1;i<=205;i++) f.transaction(i,{amount:'1'});
  assert.equal((await repo.readActivityPage(f.db,'alice',filters(),null)).items.length,40);
  assert.equal((await repo.readActivitySummary(f.db,'alice',filters())).currencies[0].expenseMinor,'205');
}));
test('invalid dates and missing user fail before querying', async () => withFixture(async f => {
  await assert.rejects(repo.readActivityPage(f.db,'alice',filters({to:'2026-02-30'}),null),/end date/);
  await assert.rejects(repo.readActivitySummary(f.db,'',filters()),/Authentication/);
}));
test('canceled streaming totals close the iterator and remain retryable', async () => withFixture(async f => {
  f.transaction(1); const controller = new AbortController(); controller.abort();
  await assert.rejects(repo.readActivitySummary(f.db,'alice',filters(),controller.signal),/canceled/);
  assert.equal((await repo.readActivitySummary(f.db,'alice',filters())).count,1);
}));
test('actual hook options use offline-capable queries and keys scoped to user and filters', async () => withFixture(async f => {
  currentDb=f.db; currentUser='alice';
  const a=hooks.useActivityHistory(filters({search:'food'}));
  currentUser='bob'; const b=hooks.useActivityHistory(filters({search:'food'}));
  for(const options of [a.history,a.summary,a.options,hooks.useActivityDetail(uuid(1)),hooks.useActivityQueue()]) {
    assert.equal(options.networkMode,'always'); assert.equal(options.queryKey[0],'local-finance');
  }
  assert.notDeepEqual(a.history.queryKey,b.history.queryKey);
  assert.notDeepEqual(a.history.queryKey,hooks.useActivityHistory(filters({search:'rent'})).history.queryKey);
  assert.equal(hooks.useActivityHistory(filters({from:'invalid'})).history.enabled,false);
  assert.equal(hooks.useActivityDetail('').enabled,false);
  currentUser='alice';
}));
test('real query observers read local history offline and refresh all loaded pages after local invalidation', async () => withFixture(async f => {
  for(let i=1;i<=65;i++) f.transaction(i);
  currentDb=f.db;currentUser='alice';
  const options=hooks.useActivityHistory(filters());
  const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:Infinity}}});
  const observer=new InfiniteQueryObserver(client,options.history);
  const totals=new QueryObserver(client,options.summary);
  const unsubscribe=observer.subscribe(()=>{}), unsubscribeTotals=totals.subscribe(()=>{});
  onlineManager.setOnline(false);
  try {
    await observer.refetch(); await totals.refetch(); await observer.fetchNextPage();
    assert.equal(observer.getCurrentResult().data.pages.flatMap(p=>p.items).length,65);
    assert.equal(totals.getCurrentResult().data.count,65);
    f.transaction(99,{amount:'200'});
    await client.invalidateQueries({queryKey:['local-finance']});
    const rows=observer.getCurrentResult().data.pages.flatMap(p=>p.items);
    assert.equal(rows.length,66); assert.equal(new Set(rows.map(r=>r.id)).size,66); assert.equal(rows[0].id,uuid(99));
    assert.equal(totals.getCurrentResult().data.count,66);
    assert.equal(totals.getCurrentResult().data.currencies[0].expenseMinor,'6700');
  } finally { onlineManager.setOnline(true);unsubscribe();unsubscribeTotals();client.clear(); }
}));

test('money display preserves zero, huge values, and zero/three/four-decimal currencies', () => {
  const { activityMoney } = load('features/activity/activity-ui.tsx');
  assert.equal(activityMoney('0',2,'USD'),'USD 0.00');
  assert.equal(activityMoney('1740',0,'JPY'),'JPY 1,740');
  assert.equal(activityMoney('12345',3,'KWD'),'KWD 12.345');
  assert.equal(activityMoney('12345',4,'CLF'),'CLF 1.2345');
  assert.equal(activityMoney('123456789012345678901',2,'USD'),'USD 1,234,567,890,123,456,789.01');
  assert.equal(activityMoney(null,2,'USD'),'Amount unavailable');
  assert.equal(activityMoney('100',null,'USD'),'Amount unavailable');
  assert.equal(activityMoney('NaN',2,'USD'),'Amount unavailable');
});
test('transfer rows show both amounts, and accessible status matches the effective queue status', () => {
  const ui=load('features/activity/activity-ui.tsx');
  const item={ id:uuid(1),type:'transfer',amount_minor:'1200',currency_code:'USD',currency_minor_unit:2,
    account_name:'Dollar wallet',destination_account_name:'Yen wallet',destination_amount_minor:'1740',
    destination_currency_code:'JPY',destination_currency_minor_unit:0,merchant:null,description:null,category_name:null,sync_status:'failed' };
  const element=ui.ActivityRow({item,onPress:()=>{}});
  assert.equal(element.props.accessibilityRole,'button');
  assert.match(element.props.accessibilityLabel,/Failed/);
  assert.match(element.props.accessibilityLabel,/received JPY 1,740 in Yen wallet/);
  function texts(node) {
    if(Array.isArray(node)) return node.flatMap(texts);
    if(typeof node==='string') return [node];
    return node?.props?.children ? texts(node.props.children) : [];
  }
  const text=texts(element).join(' ');
  assert.match(text,/USD 12\.00/);assert.match(text,/JPY 1,740/);
});
