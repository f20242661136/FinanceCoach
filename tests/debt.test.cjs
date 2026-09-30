const {test}=require('node:test');
const assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite');
const {randomUUID}=require('node:crypto');
const {resolve}=require('node:path');
const {createLoader}=require('./debt-test-loader.cjs');
const project=resolve(process.env.DEBT_PROJECT_ROOT||resolve(__dirname,'..'));
let currentDb,currentUser='alice',online=true,rpcHandler,hookState,invalidations=[],authError=null;
const overrides={
 '@/lib/supabase':{supabase:{auth:{getSession:async()=>({data:{session:currentUser?{user:{id:currentUser}}:null},error:authError})},rpc:(name,args)=>({abortSignal:()=>rpcHandler(name,args)})}},
 'expo-crypto':{randomUUID},
 '@react-native-community/netinfo':{fetch:async()=>({isConnected:online,isInternetReachable:online}),useNetInfo:()=>({isConnected:online,isInternetReachable:online})},
 '@/offline/database/encrypted-writer':{withEncryptedWriteTransaction:async fn=>currentDb.withTransactionAsync(()=>fn(currentDb))},
 '@/features/auth/auth-context':{useAuth:()=>({session:{user:{id:currentUser}},profile:{timezone:'Asia/Karachi'}})},
 'expo-sqlite':{useSQLiteContext:()=>currentDb},
 '@tanstack/react-query':{useQuery:options=>options,useInfiniteQuery:options=>options,useQueryClient:()=>({invalidateQueries:async o=>{invalidations.push(o.queryKey);}}),useMutation:options=>options},
 react:{...require('react'),useState:init=>[typeof init==='function'?init():init,()=>{}],useCallback:fn=>fn,useEffect:()=>{}},
 'expo-router':{useRouter:()=>({push:()=>{},back:()=>{},replace:()=>{},canGoBack:()=>true}),useFocusEffect:()=>{}},
 'react-native':{StyleSheet:{create:v=>v},Text:'Text',View:'View',Pressable:'Pressable',ScrollView:'ScrollView',RefreshControl:'RefreshControl',Platform:{OS:'android',select:o=>o.android??o.default}},
 '@/components/ui/app-button':{AppButton:({label,...props})=>({type:'Button',props:{...props,children:label}})},
 '@/components/ui/choice-chip':{ChoiceChip:({label,...props})=>({type:'Chip',props:{...props,children:label}})},
 '@/components/ui/text-field':{TextField:({label,...props})=>({type:'Input',props:{...props,children:label}})},
};
overrides[resolve(project,'src/lib/supabase.ts')]=overrides['@/lib/supabase'];
const load=createLoader(project,overrides);
const model=load('features/debt/debt-model.ts');
const service=load('features/debt/debt-service.ts');
function loan(patch={}){return {id:randomUUID(),direction:'borrowed',counterparty_name:'دکان',currency_code:'USD',currency_minor_unit:2,principal_minor:'10000',paid_minor:'2500',remaining_minor:'7500',interest_rate_basis_points:null,start_date:'2026-01-31',due_date:'2026-12-31',payment_frequency:'monthly',scheduled_payment_minor:'1000',status:'active',notes:null,payment_count:'2',last_payment_date:'2026-03-15',days_to_due:92,is_overdue:false,...patch};}
function snapshot(loans=[loan()],patch={}){return {as_of:'2026-09-30',generated_at:'2026-09-30T04:30:00+00:00',loans,trends:[],...patch};}
function fixture(){
 const native=new DatabaseSync(':memory:');native.exec('create table local_meta(key text primary key,value text not null,updated_at text not null)');
 const db={async getFirstAsync(sql,...args){return native.prepare(sql).get(...args)??null;},async runAsync(sql,...args){return native.prepare(sql).run(...args);},async withTransactionAsync(fn){native.exec('begin immediate');try{await fn();native.exec('commit');}catch(e){native.exec('rollback');throw e;}}};
 currentDb=db;currentUser='alice';online=true;authError=null;rpcHandler=async()=>{throw Error('network unavailable');};invalidations=[];
 return {native,db,close:()=>native.close()};
}
async function withFixture(fn){const f=fixture();try{await fn(f);}finally{f.close();}}
test('summaries separate borrowed from lent and currencies, retain settled debt principal',()=>{
 const a=loan(),b=loan({paid_minor:'10000',remaining_minor:'0',status:'settled'}),c=loan({direction:'given'}),d=loan({currency_code:'PKR'});
 const s=model.summarizeDebt([a,b,c,d],'borrowed','2026-09-30');assert.equal(s.active,2);assert.equal(s.paidOff,1);assert.equal(s.loans.length,3);
 assert.deepEqual(s.currencies.map(x=>[x.currency,x.principal,x.paid,x.remaining]),[['PKR','10000','2500','7500'],['USD','20000','12500','7500']]);
});
test('money totals and percentage stay exact beyond safe integer',()=>{
 const l=loan({principal_minor:'9007199254740993',paid_minor:'9007199254740000',remaining_minor:'993'});
 const s=model.summarizeDebt([l,l],'borrowed','2026-09-30');assert.equal(s.currencies[0].principal,'18014398509481986');assert.equal(s.currencies[0].remaining,'1986');
 assert.equal(model.repaymentPercent('1','3'),33.33);assert.equal(model.repaymentPercent('4','3'),100);assert.equal(model.trendPercent('1','3'),33.33);assert.equal(model.trendPercent('0','0'),0);
});
test('mixed precision for one currency is rejected instead of silently added',()=>{
 assert.throws(()=>model.summarizeDebt([loan(),loan({currency_minor_unit:3})],'borrowed','2026-09-30'),/precision/);
});
test('debt statuses use local today and distinguish defaulted, overdue, paid off, and inconsistent settled',()=>{
 assert.equal(model.debtStatus(loan({due_date:'2026-09-29'}),'2026-09-30'),'overdue');assert.equal(model.debtStatus(loan({due_date:'2026-09-30'}),'2026-09-30'),'active');
 assert.equal(model.debtStatus(loan({status:'defaulted'}),'2026-09-30'),'defaulted');assert.equal(model.debtStatus(loan({status:'settled'}),'2026-09-30'),'review');
  assert.equal(model.debtStatus(loan({paid_minor:'10000',remaining_minor:'0'}),'2026-09-30'),'paid-off');
  const s=model.summarizeDebt([loan({status:'defaulted',due_date:'2026-09-29'})],'borrowed','2026-09-30');assert.equal(s.overdue,1);assert.equal(s.defaulted,1);
});
test('monthly schedule preserves the original day through February and leap years',()=>{
 const l=loan({paid_minor:'0',remaining_minor:'10000',due_date:null});assert.equal(model.nextRepayment(l).date,'2026-02-28');
 assert.equal(model.nextRepayment({...l,paid_minor:'1000',remaining_minor:'9000'}).date,'2026-03-31');
 assert.equal(model.nextRepayment({...l,start_date:'2024-01-31'}).date,'2024-02-29');
});
test('partial repayments reduce the next estimated installment and final principal caps it',()=>{
 assert.equal(model.nextRepayment(loan()).amount,'500');
 assert.equal(model.nextRepayment(loan({paid_minor:'9800',remaining_minor:'200'})).amount,'200');
});
test('weekly dates and final due date are deterministic and never project past final due',()=>{
 const l=loan({start_date:'2026-09-01',payment_frequency:'weekly',paid_minor:'1000',remaining_minor:'9000',due_date:null});assert.equal(model.nextRepayment(l).date,'2026-09-15');
 const result=model.nextRepayment({...l,due_date:'2026-09-10'});assert.equal(result.date,'2026-09-10');assert.equal(result.amount,'9000');assert.equal(result.estimated,false);
});
test('unscheduled/custom loans use only known final dates, settled loans have no upcoming repayment',()=>{
 assert.equal(model.nextRepayment(loan({payment_frequency:'none',scheduled_payment_minor:null,due_date:null})),null);
 assert.equal(model.nextRepayment(loan({payment_frequency:'custom'})).label,'Final due date');
 assert.equal(model.nextRepayment(loan({remaining_minor:'0',paid_minor:'10000',status:'settled'})),null);
});
test('huge schedule counts cannot overflow dates or loop through millions of periods',()=>{
 const l=loan({principal_minor:'9223372036854775807',paid_minor:'9223372036854775806',remaining_minor:'1',scheduled_payment_minor:'1',due_date:null});
 assert.equal(model.nextRepayment(l),null);assert.equal(model.nextRepayment({...l,payment_frequency:'weekly'}),null);
});
test('snapshot rejects duplicate IDs, bad money and inconsistent principal remaining',()=>{
 const l=loan();assert.equal(model.debtSnapshotSchema.safeParse(snapshot([l,l])).success,false);assert.equal(model.debtSnapshotSchema.safeParse(snapshot([{...l,remaining_minor:'1'}])).success,false);
 assert.equal(model.debtSnapshotSchema.safeParse(snapshot([{...l,paid_minor:'bad'}])).success,false);
});
test('valid snapshots persist with user-scoped encrypted metadata and can be read offline',()=>withFixture(async f=>{
 rpcHandler=async()=>({data:snapshot(),error:null});const result=await service.fetchDebtSnapshot(f.db,'alice','2026-09-30');
 const cached=await service.readSavedDebt(f.db,'alice');assert.deepEqual(cached.value,result.value);assert.equal(await service.readSavedDebt(f.db,'bob'),null);
 online=false;await assert.rejects(service.fetchDebtSnapshot(f.db,'alice','2026-09-30'),e=>e.kind==='offline');assert.ok(await service.readSavedDebt(f.db,'alice'));
}));
test('bad caches become unavailable, never a false zero debt balance',()=>withFixture(async f=>{
 f.native.prepare('insert into local_meta values(?,?,?)').run('debt.dashboard.v1:alice','{bad}','now');assert.equal(await service.readSavedDebt(f.db,'alice'),null);
 rpcHandler=async()=>({data:snapshot([]),error:null});assert.equal((await service.fetchDebtSnapshot(f.db,'alice','2026-09-30')).value.loans.length,0);
}));
test('missing backend migration is reported explicitly',()=>withFixture(async f=>{
 rpcHandler=async()=>({data:null,error:{code:'PGRST202',message:'missing function'}});
 await assert.rejects(service.fetchDebtSnapshot(f.db,'alice','2026-09-30'),e=>e.kind==='setup'&&e.message.includes('Phase 17A'));
}));
test('malformed and wrong-date responses cannot replace a previously valid snapshot',()=>withFixture(async f=>{
 rpcHandler=async()=>({data:snapshot(),error:null});await service.fetchDebtSnapshot(f.db,'alice','2026-09-30');
 rpcHandler=async()=>({data:snapshot([],{as_of:'2026-09-29'}),error:null});await assert.rejects(service.fetchDebtSnapshot(f.db,'alice','2026-09-30'),/unexpected dashboard date/);
 rpcHandler=async()=>({data:{},error:null});await assert.rejects(service.fetchDebtSnapshot(f.db,'alice','2026-09-30'));assert.equal((await service.readSavedDebt(f.db,'alice')).value.loans.length,1);
}));
test('account switches during a request prevent caching another account response',()=>withFixture(async f=>{
 rpcHandler=async()=>{currentUser='bob';return {data:snapshot(),error:null};};await assert.rejects(service.fetchDebtSnapshot(f.db,'alice','2026-09-30'),e=>e.kind==='session');
 assert.equal(await service.readSavedDebt(f.db,'alice'),null);assert.equal(await service.readSavedDebt(f.db,'bob'),null);
}));
test('dirty markers are cleared by refresh but preserved for mutations arriving during refresh',()=>withFixture(async f=>{
 await service.markDebtChanged('alice');assert.equal(await service.readDebtDirty(f.db,'alice'),true);
 rpcHandler=async()=>({data:snapshot(),error:null});await service.fetchDebtSnapshot(f.db,'alice','2026-09-30');assert.equal(await service.readDebtDirty(f.db,'alice'),false);
 await service.markDebtChanged('alice');rpcHandler=async()=>{await service.markDebtChanged('alice');return {data:snapshot(),error:null};};
 await service.fetchDebtSnapshot(f.db,'alice','2026-09-30');assert.equal(await service.readDebtDirty(f.db,'alice'),true);
}));
test('older concurrent snapshot responses cannot replace newer cached server data',()=>withFixture(async f=>{
 rpcHandler=async()=>({data:snapshot([],{generated_at:'2026-09-30T04:35:00Z'}),error:null});await service.fetchDebtSnapshot(f.db,'alice','2026-09-30');
 rpcHandler=async()=>({data:snapshot(),error:null});await service.fetchDebtSnapshot(f.db,'alice','2026-09-30');assert.equal((await service.readSavedDebt(f.db,'alice')).value.loans.length,0);
}));
function payment(patch={}){return {id:randomUUID(),loan_id:randomUUID(),amount_minor:'9007199254740993',payment_date:'2026-09-30',note:'قسط',created_at:'2026-09-30',counterparty_name:'دکان',currency_code:'USD',currency_minor_unit:2,...patch};}
test('repayment pages retain exact money/Unicode and cached pages are available offline',()=>withFixture(async f=>{
 const p=payment();rpcHandler=async()=>({data:{items:[p],next:null},error:null});await service.fetchRepaymentPage(f.db,'alice','borrowed',null);
 online=false;const cached=await service.fetchRepaymentPage(f.db,'alice','borrowed',null);assert.equal(cached.source,'saved');assert.equal(cached.value.items[0].note,'قسط');assert.equal(cached.value.items[0].amount_minor,'9007199254740993');
 await assert.rejects(service.fetchRepaymentPage(f.db,'alice','given',null),e=>e.kind==='offline');
}));
test('uncached older pages fail offline and stay retryable rather than returning empty history',()=>withFixture(async f=>{
 online=false;await assert.rejects(service.fetchRepaymentPage(f.db,'alice','borrowed',{date:'2026-09-01',id:randomUUID()}),e=>e.kind==='offline');
}));
test('history rejects non-advancing cursors and invalid order',()=>withFixture(async f=>{
 const p=payment();rpcHandler=async()=>({data:{items:[p],next:{date:p.payment_date,id:randomUUID()}},error:null});await assert.rejects(service.fetchRepaymentPage(f.db,'alice','borrowed',null),/next repayment cursor/);
 rpcHandler=async()=>({data:{items:[p],next:null},error:null});await assert.rejects(service.fetchRepaymentPage(f.db,'alice','borrowed',{date:p.payment_date,id:p.id}),/cursor response/);
}));
test('successful loan creation and repayment invalidate debt queries and mark cached snapshots changed',()=>withFixture(async f=>{
 const hooks=load('features/loans/loan-query.ts');await hooks.useCreateLoan().onSuccess();assert.equal(await service.readDebtDirty(f.db,'alice'),true);assert.ok(invalidations.some(k=>k[0]==='debt-dashboard'));
 invalidations=[];await hooks.useAddLoanPayment().onSuccess('id',{loanId:'loan'});assert.ok(invalidations.some(k=>k[0]==='debt-dashboard'));assert.ok(invalidations.some(k=>k[0]==='loans'&&k[1]==='history'));
}));
test('local hooks use user-scoped query keys and read saved snapshots with the network offline',()=>withFixture(async f=>{
 rpcHandler=async()=>({data:snapshot(),error:null});await service.fetchDebtSnapshot(f.db,'alice','2026-09-30');online=false;
 const cleanOverrides={...overrides};delete cleanOverrides['@/features/debt/debt-hooks'];delete cleanOverrides[resolve(project,'src/features/debt/debt-hooks.ts')];
 const hooks=createLoader(project,cleanOverrides)('features/debt/debt-hooks.ts');const values=hooks.useDebtDashboard('borrowed');
 assert.equal(values.saved.networkMode,'always');assert.ok(values.saved.queryKey.includes('alice'));assert.ok(values.live.queryKey.includes('alice'));assert.ok(values.history.queryKey.includes('alice'));assert.ok(values.history.queryKey.includes('borrowed'));
 const {QueryClient,QueryObserver,onlineManager}=require('@tanstack/query-core');onlineManager.setOnline(false);const client=new QueryClient();const observer=new QueryObserver(client,values.saved);const unsub=observer.subscribe(()=>{});
 try{const r=await observer.refetch();assert.equal(r.status,'success');assert.equal(r.data.value.loans.length,1);}finally{unsub();client.clear();onlineManager.setOnline(true);}
}));
// Verify the screen's rendered labels and amounts with deterministic hook/native seams.
overrides['@/features/debt/debt-hooks']={useDebtDashboard:()=>hookState};
overrides[resolve(project,'src/features/debt/debt-hooks.ts')]=overrides['@/features/debt/debt-hooks'];
const screen=load('features/debt/debt-dashboard-screen.tsx');
function render(node){
 if(node===null||node===undefined||typeof node==='boolean')return '';
 if(Array.isArray(node))return node.map(render).join(' ');
 if(typeof node==='string'||typeof node==='number')return String(node);
 if(typeof node.type==='function')return render(node.type(node.props));
 return render(node.props?.children);
}
function uiState(patch={}){return {today:'2026-09-30',data:{capturedAt:'2026-09-30T04:30:00.000Z',value:snapshot()},saved:{isPending:false,isError:false,refetch:async()=>{}},dirty:{data:false},live:{isPending:false,isError:false,isFetching:false,refetch:async()=>{}},history:{data:{pages:[{source:'server',value:{items:[],next:null}}]},isPending:false,isError:false,isFetching:false,refetch:async()=>{}},historyFirst:{data:null},network:{isConnected:true,isInternetReachable:true},refresh:async()=>{},...patch};}
test('dashboard renders debt totals, principal progress, estimated schedule and history',()=>{
 hookState=uiState();const text=render(screen.DebtDashboardScreen());assert.match(text,/Debt dashboard/);assert.match(text,/USD 100\.00/);assert.match(text,/USD 75\.00/);assert.match(text,/25\s*% repaid/);assert.match(text,/Estimated installment/);assert.match(text,/Repayment history/);
});
test('offline dashboard keeps cached amounts visible with an explicit saved-data notice',()=>{
 hookState=uiState({network:{isConnected:false,isInternetReachable:false},live:{isError:true,error:Error('Offline')}});const text=render(screen.DebtDashboardScreen());assert.match(text,/Offline · saved dashboard/);assert.match(text,/USD 75\.00/);assert.match(text,/Last saved/);
});
test('uncached errors and loading do not present a misleading zero debt total',()=>{
 hookState=uiState({data:null,live:{isPending:false,isError:true,error:Error('Apply migration')},network:{isConnected:false}});let text=render(screen.DebtDashboardScreen());assert.match(text,/No saved debt dashboard/);assert.doesNotMatch(text,/Total debt principal/);
 hookState=uiState({data:null,live:{isPending:true,isError:false}});text=render(screen.DebtDashboardScreen());assert.match(text,/Loading debt records/);assert.doesNotMatch(text,/Total debt principal/);
});
test('valid empty state is distinct from error, and history failure is visible independently',()=>{
 hookState=uiState({data:{capturedAt:'2026-09-30T04:30:00.000Z',value:snapshot([])},history:{isPending:false,isError:true,error:Error('History unavailable')}});const text=render(screen.DebtDashboardScreen());assert.match(text,/No borrowed debts recorded/);assert.match(text,/History unavailable/);
});
