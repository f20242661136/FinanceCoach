import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '@/components/ui/app-button';
import { ChoiceChip } from '@/components/ui/choice-chip';
import { TextField } from '@/components/ui/text-field';
import { colors, elevation, typography } from '@/design/tokens';
import { useAuth } from '@/features/auth/auth-context';
import { formatMinor } from '@/features/budgets/budget-money';
import { debtStatus, repaymentPercent, summarizeDebt, trendPercent, upcomingRepayments, type DebtLoan, type DebtSnapshot, type DebtStatus, type Direction } from './debt-model';
import { useDebtDashboard } from './debt-hooks';

const statusLabels:Record<DebtStatus,string>={active:'Active', 'paid-off':'Paid off',overdue:'Overdue',defaulted:'Defaulted',review:'Needs review'};
const money=(amount:string,currency:string,unit:number)=>`${currency} ${formatMinor(amount,unit)}`;
function Progress({percent,label}:{percent:number;label:string}){
  return <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{min:0,max:100,now:percent,text:`${percent}% repaid`}} style={styles.track}>
    <View style={[styles.fill,{width:`${percent}%`}]} />
  </View>;
}
function LoanRow({loan,today,onPress}:{loan:DebtLoan;today:string;onPress:()=>void}){
  const status=debtStatus(loan,today),percent=repaymentPercent(loan.paid_minor,loan.principal_minor);
  return <Pressable accessibilityRole="button" accessibilityLabel={`${loan.counterparty_name}, ${statusLabels[status]}, ${money(loan.remaining_minor,loan.currency_code,loan.currency_minor_unit)} remaining. View loan.`}
    onPress={onPress} style={({pressed})=>[styles.card,pressed&&styles.pressed]}>
    <View style={styles.row}><Text style={styles.heading}>{loan.counterparty_name}</Text>
      <Text style={[styles.badge,status==='paid-off'?styles.success:status==='active'?styles.primary:styles.warning]}>{statusLabels[status]}</Text></View>
    <Text style={styles.amount}>{money(loan.remaining_minor,loan.currency_code,loan.currency_minor_unit)} remaining</Text>
    <Progress percent={percent} label={`Repayment progress for ${loan.counterparty_name}`} />
    <Text style={styles.body}>{percent}% repaid · {money(loan.paid_minor,loan.currency_code,loan.currency_minor_unit)} paid of {money(loan.principal_minor,loan.currency_code,loan.currency_minor_unit)}</Text>
    <Text style={styles.caption}>{loan.due_date?`Final due date · ${loan.due_date}`:'No final due date'} · {loan.payment_count} repayment{loan.payment_count==='1'?'':'s'}</Text>
    {status==='review'&&<Text style={styles.warning}>This loan is marked settled but still has recorded principal remaining. Review its records.</Text>}
  </Pressable>;
}
function Trends({snapshot,direction,currency}:{snapshot:DebtSnapshot;direction:Direction;currency:string|null}){
  const codes=[...new Set(snapshot.trends.filter(t=>t.direction===direction).map(t=>t.currency_code))].sort();
  const [chosen,setChosen]=useState('');const selected=currency??(codes.includes(chosen)?chosen:codes[0]);
  const rows=snapshot.trends.filter(t=>t.direction===direction&&t.currency_code===selected).sort((a,b)=>a.month.localeCompare(b.month));
  const ceiling=rows.reduce((max,r)=>[r.outstanding_minor,r.paid_minor].reduce((v,x)=>BigInt(x)>v?BigInt(x):v,max),0n).toString();
  return <View style={styles.card}>
    <Text accessibilityRole="header" style={styles.sectionTitle}>Debt trends</Text>
    <Text style={styles.caption}>Six months through {snapshot.as_of}. Principal outstanding and repayments by date, for the current loan set. Archived loans are excluded.</Text>
    {!currency&&codes.length>1&&<View style={styles.chips}>{codes.map(code=><ChoiceChip key={code} label={code} selected={code===selected} onPress={()=>setChosen(code)} />)}</View>}
    {!rows.length?<Text style={styles.body}>No trend data for this selection.</Text>:<>
      <Text style={styles.body}>Blue: outstanding principal · Green: repayments</Text>
      {rows.map(row=><View key={row.month} style={styles.trendRow}>
        <Text style={styles.heading}>{row.month}</Text>
        <Text style={styles.body}>Outstanding: {money(row.outstanding_minor,row.currency_code,row.currency_minor_unit)}</Text>
        <View accessible={false} style={styles.thinTrack}><View style={[styles.thinFill,{width:`${trendPercent(row.outstanding_minor,ceiling)}%`}]} /></View>
        <Text style={styles.body}>Repaid: {money(row.paid_minor,row.currency_code,row.currency_minor_unit)}</Text>
        <View accessible={false} style={styles.thinTrack}><View style={[styles.thinFill,styles.greenFill,{width:`${trendPercent(row.paid_minor,ceiling)}%`}]} /></View>
        <Text style={styles.caption}>Principal added: {money(row.principal_added_minor,row.currency_code,row.currency_minor_unit)}</Text>
      </View>)}
    </>}
  </View>;
}
function Dashboard(){
  const router=useRouter();const [direction,setDirection]=useState<Direction>('borrowed');
  const [currency,setCurrency]=useState<string|null>(null),[filter,setFilter]=useState('all'),[search,setSearch]=useState('');
  const [visible,setVisible]=useState(20),[upcomingVisible,setUpcomingVisible]=useState(6),[refreshing,setRefreshing]=useState(false);
  const q=useDebtDashboard(direction);const snapshot=q.data?.value;
  const offline=q.network.isConnected===false||q.network.isInternetReachable===false;
  const savedSnapshot=Boolean(snapshot)&&(q.live.isError||q.live.isPending||offline||snapshot?.as_of!==q.today||q.dirty.data===true);
  const availableCurrencies=[...new Set(snapshot?.loans.filter(l=>l.direction===direction).map(l=>l.currency_code))].sort();
  const selectedCurrency=currency&&availableCurrencies.includes(currency)?currency:null;
  const overview=summarizeDebt(snapshot?.loans.filter(l=>!selectedCurrency||l.currency_code===selectedCurrency)??[],direction,q.today);
  const loans=overview.loans.filter(l=>{
    const status=debtStatus(l,q.today);return (filter==='all'||(filter==='active'&&status!=='paid-off')||(filter==='paid-off'&&status==='paid-off')||(filter==='attention'&&['overdue','defaulted','review'].includes(status)))
      &&(!search.trim()||`${l.counterparty_name} ${l.notes??''}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  }).sort((a,b)=>{const rank=(l:DebtLoan)=>({review:0,defaulted:1,overdue:2,active:3,'paid-off':4})[debtStatus(l,q.today)];return rank(a)-rank(b)||(a.due_date??'9999-12-31').localeCompare(b.due_date??'9999-12-31')||a.id.localeCompare(b.id);});
  const upcoming=upcomingRepayments(overview.loans,direction);
  const undated=overview.loans.filter(l=>BigInt(l.remaining_minor)>0n&&!upcoming.some(item=>item.loan.id===l.id)).length;
  const historyPages=q.history.data?.pages??(q.historyFirst.data?[{...q.historyFirst.data,source:'saved' as const}]:[]);
  const seen=new Set<string>();const payments=historyPages.flatMap(p=>p.value.items).filter(p=>{if(seen.has(p.id))return false;seen.add(p.id);return true;});
  const historySaved=offline||historyPages.some(p=>p.source==='saved');
  const goLoan=(id:string)=>router.push({pathname:'/loan-detail' as never,params:{loanId:id}});
  async function refresh(){setRefreshing(true);try{await q.refresh();}finally{setRefreshing(false);}}
  function selectDirection(value:Direction){setDirection(value);setCurrency(null);setFilter('all');setSearch('');setVisible(20);setUpcomingVisible(6);}
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{void refresh();}} />}>
    <View style={styles.section}>
      <AppButton label="Back to Plan" variant="ghost" onPress={()=>{if(router.canGoBack())router.back();else router.replace('/plan' as never);}} />
      <Text accessibilityRole="header" style={styles.title}>Debt dashboard</Text>
      <Text style={styles.body}>See what remains, what you’ve repaid, and which records need attention.</Text>
      <View style={styles.chips}><ChoiceChip label="Money I owe" selected={direction==='borrowed'} onPress={()=>selectDirection('borrowed')} /><ChoiceChip label="Money lent" selected={direction==='given'} onPress={()=>selectDirection('given')} /></View>
      <AppButton label={direction==='borrowed'?'Add debt':'Add loan'} icon="add-outline" onPress={()=>router.push('/create-loan' as never)} />
    </View>
    {snapshot&&<View style={styles.notice}>
      <Text accessibilityLiveRegion="polite" style={styles.heading}>{savedSnapshot?(offline?'Offline · saved dashboard':'Saved dashboard'):q.live.isFetching?'Refreshing debt records…':'Debt records refreshed'}</Text>
      <Text style={styles.caption}>Last saved: {q.data!.capturedAt.replace('T',' ').replace(/\.\d+Z$/,' UTC')}.</Text>
      {q.dirty.data&&<Text style={styles.body}>A loan or repayment changed after a saved snapshot. Refresh to update these figures.</Text>}
      {q.live.isError&&<Text style={styles.body}>{q.live.error instanceof Error?q.live.error.message:'Could not refresh. Saved data is shown.'}</Text>}
      <AppButton label="Refresh dashboard" variant="secondary" loading={refreshing||q.live.isFetching} onPress={()=>{void refresh();}} />
    </View>}
    {!snapshot&&!q.saved.isError&&!q.live.isError&&(q.saved.isPending||q.live.isPending)?<View style={styles.card}><Text accessibilityLiveRegion="polite" style={styles.heading}>Loading debt records…</Text></View>:null}
    {!snapshot&&(q.saved.isError||q.live.isError)&&<View style={styles.card}><Text style={styles.heading}>{offline?'No saved debt dashboard':'Debt dashboard unavailable'}</Text>
      <Text accessibilityRole="alert" style={styles.body}>{q.live.error instanceof Error?q.live.error.message:'Could not read saved data. Retry loading the dashboard.'}</Text>
      <AppButton label="Retry loading" variant="secondary" onPress={()=>{void q.saved.refetch().then(()=>q.live.refetch());}} />
    </View>}
    {snapshot&&<>
      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>{direction==='borrowed'?'Debt overview':'Loans given overview'}</Text>
        <Text style={styles.caption}>Totals include recorded repayments. Principal only; interest rates are informational. Amounts in different currencies are kept separate.</Text>
        {availableCurrencies.length>1&&<View style={styles.chips}><ChoiceChip label="All currencies" selected={!selectedCurrency} onPress={()=>{setCurrency(null);setVisible(20);}} />{availableCurrencies.map(code=><ChoiceChip key={code} label={code} selected={code===selectedCurrency} onPress={()=>{setCurrency(code);setVisible(20);}} />)}</View>}
        <View style={styles.stats}><View style={styles.stat}><Text style={styles.statValue}>{overview.active}</Text><Text style={styles.body}>Outstanding</Text></View><View style={styles.stat}><Text style={styles.statValue}>{overview.paidOff}</Text><Text style={styles.body}>Paid off</Text></View>
          <View style={styles.stat}><Text style={[styles.statValue,styles.warning]}>{overview.overdue}</Text><Text style={styles.body}>Overdue</Text></View><View style={styles.stat}><Text style={[styles.statValue,styles.warning]}>{overview.defaulted}</Text><Text style={styles.body}>Defaulted</Text></View></View>
        {overview.currencies.map(total=><View key={total.currency} style={styles.card}>
          <Text style={styles.heading}>{total.currency} · {total.count} {direction==='borrowed'?'debt':'loan'}{total.count===1?'':'s'}</Text>
          <Text style={styles.caption}>{direction==='borrowed'?'Total debt principal':'Total principal lent'}</Text><Text selectable style={styles.amount}>{money(total.principal,total.currency,total.unit)}</Text>
          <Text style={styles.caption}>Remaining</Text><Text selectable style={[styles.amount,styles.primary]}>{money(total.remaining,total.currency,total.unit)}</Text>
          <Text style={styles.body}>{money(total.paid,total.currency,total.unit)} {direction==='borrowed'?'paid':'received'} · {repaymentPercent(total.paid,total.principal)}% repaid</Text>
          <Progress percent={repaymentPercent(total.paid,total.principal)} label={`${total.currency} principal repayment progress`} />
        </View>)}
        {!overview.loans.length&&<View style={styles.card}><Text style={styles.heading}>{direction==='borrowed'?'No borrowed debts recorded':'No loans given recorded'}</Text><Text style={styles.body}>Add a loan to track its remaining principal and repayments here.</Text></View>}
      </View>
      {overview.loans.length>0&&<>
        <View style={styles.section}><Text accessibilityRole="header" style={styles.sectionTitle}>{direction==='borrowed'?'Your debts':'Loans you gave'}</Text>
          <TextField label="Search counterparties and notes" value={search} onChangeText={v=>{setSearch(v);setVisible(20);}} />
          <View style={styles.chips}>{[['all','All'],['active','Outstanding'],['paid-off','Paid off'],['attention','Need attention']].map(([value,label])=><ChoiceChip key={value} label={label} selected={filter===value} onPress={()=>{setFilter(value);setVisible(20);}} />)}</View>
          {!loans.length&&<Text style={styles.body}>No records match this list filter. Your overview totals remain visible above.</Text>}
          {loans.slice(0,visible).map(loan=><LoanRow key={loan.id} loan={loan} today={q.today} onPress={()=>goLoan(loan.id)} />)}
          {loans.length>visible&&<AppButton label={`Show more debts (${visible} of ${loans.length})`} variant="secondary" onPress={()=>setVisible(v=>v+20)} />}
        </View>
        <View style={styles.section}><Text accessibilityRole="header" style={styles.sectionTitle}>{direction==='borrowed'?'Upcoming repayments':'Expected repayments'}</Text>
          <Text style={styles.caption}>Installment estimates use the loan start date, payment frequency, scheduled amount, and recorded principal paid. Confirm dates with your actual repayment agreement.</Text>
          {upcoming.slice(0,upcomingVisible).map(item=><Pressable key={item.loan.id} accessibilityRole="button" onPress={()=>goLoan(item.loan.id)} style={styles.card}>
            <Text style={styles.heading}>{item.loan.counterparty_name}</Text><Text style={styles.amount}>{money(item.amount,item.loan.currency_code,item.loan.currency_minor_unit)}</Text>
            <Text style={item.date<q.today?styles.warning:styles.body}>{item.date} · {item.label}{item.date<q.today?(item.estimated?' · estimated date passed':' · past final due date'):item.date===q.today?' · today':''}</Text>
          </Pressable>)}
          {upcoming.length>upcomingVisible&&<AppButton label="Show more repayment dates" variant="secondary" onPress={()=>setUpcomingVisible(v=>v+6)} />}
          {!upcoming.length&&<Text style={styles.body}>{overview.active?'No repayment date is available for these records.':'All recorded principal has been repaid.'}</Text>}
          {undated>0&&<Text style={styles.body}>{undated} outstanding record{undated===1?' has':'s have'} no usable repayment schedule. Open the loan to review its details.</Text>}
        </View>
        <Trends snapshot={snapshot} direction={direction} currency={selectedCurrency} />
      </>}
      <View style={styles.section}><Text accessibilityRole="header" style={styles.sectionTitle}>Repayment history</Text>
        <Text style={styles.caption}>{direction==='borrowed'?'Payments on money borrowed':'Payments received on loans given'} · all currencies. History is ordered by the recorded repayment date. Future-dated records are shown here and enter trends on their recorded date.</Text>
        {historySaved&&payments.length>0&&<Text style={styles.body}>Saved repayment pages are shown. Some records may have changed since they were saved.</Text>}
        {q.history.isPending&&!payments.length&&<Text accessibilityLiveRegion="polite" style={styles.body}>Loading repayment history…</Text>}
        {q.history.isError&&<View style={styles.notice}><Text accessibilityRole="alert" style={styles.body}>{q.history.error instanceof Error?q.history.error.message:'Repayment history could not refresh.'}</Text><AppButton label="Retry history" variant="secondary" loading={q.history.isFetching} onPress={()=>{void q.history.refetch();}} /></View>}
        {!q.history.isPending&&!q.history.isError&&!payments.length&&<Text style={styles.body}>No repayments recorded yet.</Text>}
        {payments.map(payment=><Pressable key={payment.id} accessibilityRole="button" accessibilityLabel={`Repayment ${direction==='borrowed'?'to':'from'} ${payment.counterparty_name}, ${money(payment.amount_minor,payment.currency_code,payment.currency_minor_unit)}, ${payment.payment_date}. View loan.`} onPress={()=>goLoan(payment.loan_id)} style={styles.card}>
          <Text style={styles.heading}>{payment.counterparty_name}</Text><Text style={styles.amount}>{money(payment.amount_minor,payment.currency_code,payment.currency_minor_unit)}</Text><Text style={styles.body}>{payment.payment_date}{payment.payment_date>q.today?' · future-dated record':''}</Text>{payment.note&&<Text style={styles.caption}>{payment.note}</Text>}
        </Pressable>)}
        {q.history.hasNextPage&&<AppButton label={q.history.isFetchNextPageError?'Retry older repayments':'Load older repayments'} variant="secondary" loading={q.history.isFetchingNextPage} disabled={q.history.isFetching&&!q.history.isFetchingNextPage} onPress={()=>{void q.history.fetchNextPage();}} />}
        <AppButton label="Open all loans" variant="ghost" onPress={()=>router.push('/loans' as never)} />
      </View>
    </>}
  </ScrollView>;
}
export function DebtDashboardScreen(){const {session}=useAuth();return <Dashboard key={session?.user.id??'signed-out'} />;}
const styles=StyleSheet.create({
  screen:{flex:1,backgroundColor:colors.background},content:{width:'100%',maxWidth:840,alignSelf:'center',padding:20,paddingBottom:40,gap:24},section:{gap:14},
  title:{fontSize:28,lineHeight:36,color:colors.text,fontWeight:typography.weightSemibold},sectionTitle:{fontSize:21,lineHeight:29,color:colors.text,fontWeight:typography.weightSemibold},
  heading:{fontSize:16,lineHeight:24,color:colors.text,fontWeight:typography.weightSemibold,flexShrink:1},body:{fontSize:14,lineHeight:22,color:colors.textSecondary},caption:{fontSize:12,lineHeight:19,color:colors.textSecondary},
  amount:{fontSize:21,lineHeight:30,color:colors.text,fontWeight:typography.weightSemibold,fontVariant:['tabular-nums']},card:{backgroundColor:colors.surface,borderRadius:18,padding:20,gap:10,...elevation.card},notice:{backgroundColor:colors.surfaceMuted,borderRadius:18,padding:18,gap:12},
  chips:{flexDirection:'row',flexWrap:'wrap',gap:8},row:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',alignItems:'center',gap:10},stats:{flexDirection:'row',flexWrap:'wrap',gap:18},stat:{minWidth:100,flex:1,gap:2},statValue:{fontSize:28,lineHeight:36,color:colors.primary,fontWeight:typography.weightSemibold},
  primary:{color:colors.primary},success:{color:colors.success},warning:{color:colors.warning,fontSize:14,lineHeight:22},badge:{paddingHorizontal:10,paddingVertical:4,borderRadius:10,backgroundColor:colors.surfaceMuted,fontSize:13},
  track:{height:10,backgroundColor:colors.surfaceStrong,borderRadius:999,overflow:'hidden'},fill:{height:10,backgroundColor:colors.primary,borderRadius:999},thinTrack:{height:6,backgroundColor:colors.surfaceStrong,borderRadius:999,overflow:'hidden'},thinFill:{height:6,backgroundColor:colors.primary},greenFill:{backgroundColor:colors.success},trendRow:{gap:6,paddingVertical:10},pressed:{opacity:0.75},
});
