import { useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { useAuth } from '@/features/auth/auth-context';
import { AppButton } from '@/components/ui/app-button';
import { AppScreen } from '@/components/ui/app-screen';
import { ChoiceChip } from '@/components/ui/choice-chip';
import { TextField } from '@/components/ui/text-field';
import { activityMoney, activityStyles as styles } from '@/features/activity/activity-ui';
import { changesSchema, correctionImpact, correctionPayloadSchema, decimalToMinor, editableChanges, minorToDecimal, type CorrectionChanges } from './correction-model';
import { useCorrectionState } from './correction-hooks';
import { correctionUnavailable, saveCorrection } from './correction-service';

type State = NonNullable<ReturnType<typeof useCorrectionState>['state']['data']>;
function Editor({ data, id }: { data: State; id: string }) {
  const router = useRouter();
  const { userId, invalidate } = useCorrectionState(id);
  const base = data.base!;
  let initial = editableChanges(base);
  try { if (data.journal?.status === 'rejected') initial = correctionPayloadSchema.parse(JSON.parse(data.journal.payload_json)).changes ?? initial; } catch { /* Use the latest saved entry if the old proposal is unreadable. */ }
  const [draft, setDraft] = useState(initial);
  const [amount, setAmount] = useState(minorToDecimal(initial.amount_minor,base.currency_minor_unit));
  const [review, setReview] = useState<CorrectionChanges | null>(null);
  const [reviewVersion, setReviewVersion] = useState(base.version);
  const [openedVersion] = useState(base.version);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const running = useRef(false);
  const patch = (v: Partial<CorrectionChanges>) => { setDraft(old => ({...old,...v})); setReview(null); };
  const accounts = data.accounts.filter(a=>a.status === 'active' && a.currency_code === base.currency_code);
  const accountName = (id: string | null) => data.accounts.find(a=>a.id===id)?.name ?? 'Account unavailable';
  const categoryName = (id: string | null) => id ? data.categories.find(c=>c.id===id)?.default_name ?? 'Category unavailable' : 'No category';
  function preview() {
    setError('');
    try {
      const value = changesSchema.parse({...draft, amount_minor: decimalToMinor(amount,base.currency_minor_unit),
        merchant: draft.merchant?.trim() || null, description: draft.description?.trim() || null, notes: draft.notes?.trim() || null });
      if (JSON.stringify(value) === JSON.stringify(editableChanges(base))) throw new Error('Change at least one field before saving.');
      setReviewVersion(base.version); setReview(value);
    } catch (e) { setError(e instanceof Error ? e.message : 'Check the edited fields.'); }
  }
  async function save() {
    if (!review || running.current) return;
    if (reviewVersion !== base.version) { setReview(null); setError('The saved entry changed. Review your proposal against the latest version again.'); return; }
    running.current = true; setBusy(true); setError('');
    try {
      await saveCorrection(userId,id,base.version,review,data.journal?.status === 'rejected' ? data.journal.operation_id : undefined);
      await invalidate(); router.back();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save the proposal.'); }
    finally { running.current = false; setBusy(false); }
  }
  return <View style={styles.stack}>
    {data.journal?.status === 'rejected' && <View style={styles.notice}>
      <Text style={styles.heading}>Review the latest entry</Text>
      <Text style={styles.body}>{data.journal.reason}</Text>
      <Text style={styles.body}>The form retains your saved proposal. Compare it with the latest entry below. Saving submits a new request against version {base.version}.</Text>
    </View>}
    {base.version !== openedVersion && <Text accessibilityRole="alert" style={styles.body}>This entry changed while you were editing. Your draft is retained; review it against the latest version before saving.</Text>}
    <View style={styles.card}>
      <Text style={styles.rowTitle}>Latest saved entry · version {base.version}</Text>
      <Text style={styles.body}>{base.type} · {activityMoney(base.amount_minor,base.currency_minor_unit,base.currency_code)} · {base.transaction_date}</Text>
      <Text style={styles.body}>{accountName(base.account_id)}{base.type === 'transfer' ? ` → ${accountName(base.destination_account_id)}` : ` · ${categoryName(base.category_id)}`}</Text>
      <Text selectable style={styles.body}>Merchant: {base.merchant || 'Not provided'}{`\n`}Description: {base.description || 'Not provided'}{`\n`}Notes: {base.notes || 'Not provided'}</Text>
    </View>
    <View style={styles.card}>
      <Text style={styles.caption}>Currency stays {base.currency_code}. Transfers use equal amounts in this currency.</Text>
      {base.type !== 'transfer' && <View style={styles.chips}>{(['income','expense'] as const).map(type=><ChoiceChip key={type} label={type} selected={draft.type===type} onPress={()=>patch({type,category_id:null})} />)}</View>}
      <Text style={styles.rowTitle}>{base.type === 'transfer' ? 'From account' : 'Account'}</Text>
      <View style={styles.chips}>{accounts.map(a=><ChoiceChip key={a.id} label={a.name} selected={draft.account_id===a.id} disabled={busy} onPress={()=>patch({account_id:a.id})} />)}</View>
      {!accounts.length && <Text style={styles.failedText}>No active accounts in this currency. Sync or activate an account before editing.</Text>}
      {base.type === 'transfer' ? <>
        <Text style={styles.rowTitle}>To account</Text>
        <View style={styles.chips}>{accounts.map(a=><ChoiceChip key={a.id} label={a.name} selected={draft.destination_account_id===a.id} disabled={busy || a.id===draft.account_id} onPress={()=>patch({destination_account_id:a.id})} />)}</View>
      </> : <>
        <Text style={styles.rowTitle}>Category</Text>
        <View style={styles.chips}>
          {data.categories.filter(c=>c.kind===draft.type).map(c=><ChoiceChip key={c.id} label={c.default_name} selected={draft.category_id===c.id} onPress={()=>patch({category_id:c.id})} />)}</View>
      </>}
      <TextField label={`Amount (${base.currency_code})`} value={amount} keyboardType="decimal-pad" editable={!busy} onChangeText={v=>{setAmount(v);setReview(null);}} />
      <TextField label="Transaction date (YYYY-MM-DD)" value={draft.transaction_date} editable={!busy} onChangeText={v=>patch({transaction_date:v})} />
      <TextField label="Merchant" value={draft.merchant ?? ''} maxLength={120} editable={!busy} onChangeText={v=>patch({merchant:v})} />
      <TextField label="Description" value={draft.description ?? ''} maxLength={160} editable={!busy} onChangeText={v=>patch({description:v})} />
      <TextField label="Notes" value={draft.notes ?? ''} multiline maxLength={2000} editable={!busy} onChangeText={v=>patch({notes:v})} />
      <AppButton label="Review correction" variant="secondary" disabled={busy} onPress={preview} />
    </View>
    {review && reviewVersion === base.version && <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.heading}>Confirm your correction</Text>
      <Text style={styles.body}>Type: {base.type} → {review.type}{`\n`}Amount: {activityMoney(base.amount_minor,base.currency_minor_unit,base.currency_code)} → {activityMoney(review.amount_minor,base.currency_minor_unit,base.currency_code)}{`\n`}Date: {base.transaction_date} → {review.transaction_date}</Text>
      <Text style={styles.body}>Account: {accountName(base.account_id)} → {accountName(review.account_id)}{base.type === 'transfer' ? `\nDestination: ${accountName(base.destination_account_id)} → ${accountName(review.destination_account_id)}` : `\nCategory: ${categoryName(base.category_id)} → ${categoryName(review.category_id)}`}</Text>
      <Text selectable style={styles.body}>Merchant: {review.merchant || 'Not provided'}{`\n`}Description: {review.description || 'Not provided'}{`\n`}Notes: {review.notes || 'Not provided'}</Text>
      {correctionImpact(base,review).map(impact=><Text key={impact.accountId} style={styles.body}>{accountName(impact.accountId)}: {activityMoney(impact.minor,base.currency_minor_unit,base.currency_code)} balance change</Text>)}
      <Text style={styles.caption}>These changes are relative to the saved entry. Final balances include other accepted activity. Save securely on this device, then sync for server validation.</Text>
      <AppButton label={data.journal ? 'Submit reviewed correction' : 'Save correction proposal'} loading={busy} onPress={()=>{void save();}} />
    </View>}
    {error && <Text accessibilityRole="alert" style={styles.failedText}>{error}</Text>}
  </View>;
}
function EditPage({ id }: { id: string }) {
  const router = useRouter();
  const { state } = useCorrectionState(id);
  const data = state.data;
  const canReviewRejected = data?.journal?.status === 'rejected';
  const unavailable = data ? correctionUnavailable(data.base,data.rule,canReviewRejected ? null : data.journal) : null;
  return <AppScreen keyboardAware>
    <AppButton label="Back to transaction" variant="ghost" onPress={()=>{ if(router.canGoBack()) router.back(); else router.replace('/activity' as never); }} />
    <Text accessibilityRole="header" style={styles.title}>Edit transaction</Text>
    {!id ? <Text style={styles.body}>Open a transaction from Activity.</Text> : state.isPending ? <Text style={styles.body}>Loading saved entry…</Text> : state.isError ? <><Text style={styles.failedText}>Could not load the entry.</Text><AppButton label="Retry" onPress={()=>{void state.refetch();}} /></>
      : unavailable ? <Text style={styles.body}>{unavailable}</Text> : data?.base && <Editor key={`${data.base.id}:${data.journal?.operation_id ?? ''}`} data={data} id={id} />}
  </AppScreen>;
}
export function TransactionEditScreen() {
  const { id } = useLocalSearchParams<{id?:string|string[]}>();
  const {session} = useAuth();
  const validId = typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : '';
  return <EditPage key={`${session?.user.id ?? ''}:${validId}`} id={validId} />;
}
