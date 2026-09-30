import { z } from 'zod';
import { loanSummarySchema } from '@/features/loans/loan-contract';
import { validActivityDate, shiftDay } from '@/features/activity/activity-model';
const money=z.string().regex(/^(0|[1-9]\d*)$/);
const date=z.string().refine(validActivityDate,'Invalid date.');
const currency=z.string().regex(/^[A-Z]{3}$/);
const unit=z.number().int().min(0).max(4);
export const debtLoanSchema=loanSummarySchema.extend({currency_minor_unit:unit,start_date:date,due_date:date.nullable(),last_payment_date:date.nullable()});
export type DebtLoan=z.infer<typeof debtLoanSchema>;
export type Direction='borrowed'|'given';
export const debtSnapshotSchema=z.object({as_of:date,generated_at:z.string().datetime({offset:true}),loans:z.array(debtLoanSchema),trends:z.array(z.object({
  direction:z.enum(['borrowed','given']),currency_code:currency,currency_minor_unit:unit,
  month:z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),principal_added_minor:money,paid_minor:money,outstanding_minor:money,
}))}).superRefine((s,ctx)=>{
  const ids=new Set<string>();
  for(const l of s.loans){
    if(!/^[1-9]\d*$/.test(l.principal_minor)||!/^(0|[1-9]\d*)$/.test(l.paid_minor)||!/^(0|[1-9]\d*)$/.test(l.remaining_minor))continue;
    if(ids.has(l.id)||l.status==='archived'||BigInt(l.remaining_minor)!==max(BigInt(l.principal_minor)-BigInt(l.paid_minor),0n))ctx.addIssue({code:'custom',message:'Debt snapshot has inconsistent loan values.'});
    ids.add(l.id);
  }
});
export type DebtSnapshot=z.infer<typeof debtSnapshotSchema>;
export const repaymentPageSchema=z.object({items:z.array(z.object({id:z.string().uuid(),loan_id:z.string().uuid(),
  amount_minor:z.string().regex(/^[1-9]\d*$/),payment_date:date,note:z.string().nullable(),created_at:z.string(),
  counterparty_name:z.string(),currency_code:currency,currency_minor_unit:unit})),next:z.object({date,id:z.string().uuid()}).nullable()});
export type RepaymentPage=z.infer<typeof repaymentPageSchema>;
export type RepaymentCursor=RepaymentPage['next'];
export type DebtStatus='active'|'paid-off'|'overdue'|'defaulted'|'review';
function max(a:bigint,b:bigint){return a>b?a:b;}
export function debtStatus(loan:DebtLoan,today:string):DebtStatus{
  if(BigInt(loan.remaining_minor)===0n)return 'paid-off';
  if(loan.status==='settled')return 'review';
  if(loan.status==='defaulted')return 'defaulted';
  if(loan.due_date && loan.due_date<today)return 'overdue';
  return 'active';
}
export function repaymentPercent(paid:string,principal:string):number{
  const p=BigInt(principal),v=BigInt(paid);if(p<=0n)return 0;
  return Number((v>=p?10000n:v*10000n/p))/100;
}
export function summarizeDebt(loans:DebtLoan[],direction:Direction,today:string){
  const selected=loans.filter(l=>l.direction===direction && l.status!=='archived');
  const currencies=new Map<string,{currency:string;unit:number;principal:bigint;paid:bigint;remaining:bigint;count:number}>();
  for(const l of selected){
    const entry=currencies.get(l.currency_code)??{currency:l.currency_code,unit:l.currency_minor_unit,principal:0n,paid:0n,remaining:0n,count:0};
    if(entry.unit!==l.currency_minor_unit)throw Error('Currency precision changed. Refresh the dashboard.');
    entry.principal+=BigInt(l.principal_minor);entry.paid+=BigInt(l.paid_minor);entry.remaining+=BigInt(l.remaining_minor);entry.count++;
    currencies.set(l.currency_code,entry);
  }
  return {loans:selected,active:selected.filter(l=>BigInt(l.remaining_minor)>0n).length,paidOff:selected.filter(l=>BigInt(l.remaining_minor)===0n).length,
    overdue:selected.filter(l=>BigInt(l.remaining_minor)>0n&&l.due_date!==null&&l.due_date<today&&['active','defaulted'].includes(l.status)).length,defaulted:selected.filter(l=>debtStatus(l,today)==='defaulted').length,
    currencies:[...currencies.values()].sort((a,b)=>a.currency.localeCompare(b.currency)).map(v=>({...v,principal:v.principal.toString(),paid:v.paid.toString(),remaining:v.remaining.toString()}))};
}
// Month recurrence is anchored to the original start day; Feb clamping never drifts March's date.
function monthAfter(start:string,steps:bigint):string|null{
  const [year,month,day]=start.split('-').map(Number);
  const monthIndex=BigInt(year)*12n+BigInt(month-1)+steps;
  if(monthIndex<0n||monthIndex>119987n)return null;
  const y=Number(monthIndex/12n),m=Number(monthIndex%12n)+1;
  const d=new Date(0);d.setUTCFullYear(y,m,0);const end=d.getUTCDate();
  return `${String(y).padStart(4,'0')}-${String(m).padStart(2,'0')}-${String(Math.min(day,end)).padStart(2,'0')}`;
}
export type UpcomingRepayment={loan:DebtLoan;date:string;amount:string;estimated:boolean;label:string};
export function nextRepayment(loan:DebtLoan):UpcomingRepayment|null{
  const remaining=BigInt(loan.remaining_minor);if(remaining<=0n||loan.status==='settled'||loan.status==='archived')return null;
  const scheduled=loan.scheduled_payment_minor && BigInt(loan.scheduled_payment_minor);
  if(scheduled && (loan.payment_frequency==='weekly'||loan.payment_frequency==='monthly')){
    const paid=BigInt(loan.paid_minor),period=paid/scheduled+1n;
    let next:string|null=null;
    if(loan.payment_frequency==='monthly')next=monthAfter(loan.start_date,period);
    else if(period<=521700n){const d=shiftDay(loan.start_date,Number(period*7n));if(validActivityDate(d) && d.length===10)next=d;}
    if(loan.due_date && (!next||loan.due_date<=next))return {loan,date:loan.due_date,amount:remaining.toString(),estimated:false,label:'Final due date'};
    if(next)return {loan,date:next,amount:(remaining<scheduled-paid%scheduled?remaining:scheduled-paid%scheduled).toString(),estimated:true,label:'Estimated installment'};
  }
  return loan.due_date?{loan,date:loan.due_date,amount:remaining.toString(),estimated:false,label:'Final due date'}:null;
}
export function upcomingRepayments(loans:DebtLoan[],direction:Direction){
  return loans.filter(l=>l.direction===direction).map(nextRepayment).filter((v):v is UpcomingRepayment=>v!==null)
    .sort((a,b)=>a.date.localeCompare(b.date)||a.loan.id.localeCompare(b.loan.id));
}
export function trendPercent(value:string,ceiling:string):number{
  const c=BigInt(ceiling);return c===0n?0:Number((BigInt(value)>c?c:BigInt(value))*10000n/c)/100;
}
