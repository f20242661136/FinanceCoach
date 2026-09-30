import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { AppButton } from '@/components/ui/app-button';
import { activityMoney, activityStyles as styles, ActivitySyncNotice } from '@/features/activity/activity-ui';
import { correctionImpact, correctionPayloadSchema, type CorrectionChanges } from './correction-model';
import { useCorrectionState } from './correction-hooks';
import { correctionUnavailable, discardCorrection, refreshCorrectionRule, saveCorrection } from './correction-service';

export function CorrectionPanel({ id }: { id: string }) {
  const router = useRouter();
  const { state, userId, invalidate } = useCorrectionState(id);
  const data = state.data;
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [confirm, setConfirm] = useState(false);
  const checked = useRef('');
  const running = useRef(false);
  async function run(task: () => Promise<unknown>) {
    if (running.current) return;
    running.current = true; setBusy(true); setError('');
    try { await task(); await invalidate(); } catch (e) { setError(e instanceof Error ? e.message : 'Could not save this change.'); }
    finally { running.current = false; setBusy(false); }
  }
  useEffect(() => {
    const base = data?.base;
    if (!base || !userId || base.type === 'adjustment' || base.sync_status !== 'synced' || base.deleted_at || (data.rule?.version === base.version)) return;
    const key = `${userId}:${id}:${base.version}`;
    if (checked.current === key) return;
    checked.current = key;
    // Failure leaves the cached ledger usable and exposes a manual online check.
    let active = true;
    void refreshCorrectionRule(userId,id).then(() => invalidate()).catch(() => { if (active) setError('Correction access could not be checked. Connect and retry, or use an existing cached check.'); });
    return () => { active = false; };
  }, [data?.base, data?.rule, id, userId, invalidate]);
  if (state.isPending) return <Text style={styles.body}>Loading correction options…</Text>;
  if (state.isError || !data) return <View style={styles.card}><Text style={styles.body}>Correction options unavailable.</Text><AppButton label="Retry correction options" onPress={() => { void state.refetch(); }} /></View>;
  const { base, rule, journal } = data;
  const unavailable = correctionUnavailable(base,rule,journal);
  let proposed: CorrectionChanges | null = null;
  try { proposed = journal ? correctionPayloadSchema.parse(JSON.parse(journal.payload_json)).changes : null; } catch { /* Preserve the journal and show its safe recovery actions. */ }
  const impacts = base && base.type !== 'adjustment' ? correctionImpact(base,null) : [];
  return <View style={styles.card}>
    <Text accessibilityRole="header" style={styles.heading}>Correct this entry</Text>
    {journal ? <>
      <Text accessibilityLiveRegion="polite" style={styles.rowTitle}>{journal.status === 'rejected' ? 'Correction needs review' : journal.action === 'delete' ? 'Deletion saved, awaiting sync' : 'Edit saved, awaiting sync'}</Text>
      <Text style={styles.body}>{journal.reason ?? 'Your saved proposal will be checked against the latest server version. Balances and summaries update when it is accepted.'}</Text>
      {proposed && <><Text selectable style={styles.body}>Proposed: {proposed.type} · {activityMoney(proposed.amount_minor,base?.currency_minor_unit ?? null,base?.currency_code ?? null)} · {proposed.transaction_date}</Text>
        <Text style={styles.caption}>{proposed.description ?? proposed.merchant ?? 'No description'}</Text></>}
      {journal.status === 'rejected' && journal.action === 'delete' && base && !base.deleted_at && <AppButton label="Discard proposal to review a new deletion" loading={busy} onPress={() => { void run(async () => { await discardCorrection(userId,id); setConfirm(true); }); }} />}
      {journal.status === 'rejected' && journal.action === 'update' && base && !base.deleted_at && <AppButton label="Review latest entry and saved proposal" loading={busy} onPress={() => router.push({ pathname: '/transaction-edit' as never, params: { id } })} />}
      {(journal.status === 'rejected' || journal.attempted === 0) && <AppButton label={journal.status === 'rejected' ? 'Discard rejected proposal' : 'Cancel unsent correction'} variant="secondary" loading={busy} onPress={() => { void run(() => discardCorrection(userId,id)); }} />}
      {journal.attempted !== 0 && journal.status !== 'rejected' && <Text style={styles.caption}>This request may have reached the server. Sync to confirm its outcome before making another correction.</Text>}
      <ActivitySyncNotice />
    </> : unavailable ? <>
      <Text style={styles.body}>{unavailable}</Text>
      {base && base.type !== 'adjustment' && base.sync_status === 'synced' && !base.deleted_at && <AppButton label="Check correction access online" variant="secondary" loading={busy} onPress={() => { void run(() => refreshCorrectionRule(userId,id)); }} />}
    </> : <>
      <Text style={styles.body}>Review an edit or request deletion. Offline proposals are saved securely and checked when you sync. The original currency is preserved.</Text>
      <AppButton label="Edit transaction" icon="create-outline" onPress={() => router.push({ pathname: '/transaction-edit' as never, params: { id } })} />
      {confirm ? <>
        <Text accessibilityRole="alert" style={styles.rowTitle}>Confirm deletion</Text>
        <Text style={styles.body}>This removes the entry from financial totals after the server accepts it.{base?.type === 'transfer' ? ' Both transfer account balances will be corrected together.' : ''}</Text>
        {impacts.map(impact => <Text key={impact.accountId} style={styles.body}>{data.accounts.find(a=>a.id===impact.accountId)?.name ?? 'Account'}: {activityMoney(impact.minor,base!.currency_minor_unit,base!.currency_code)} balance change</Text>)}
        <AppButton label="Save deletion request" variant="danger" loading={busy} onPress={() => { void run(async () => { await saveCorrection(userId,id,base!.version,null); setConfirm(false); }); }} />
        <AppButton label="Keep transaction" variant="ghost" disabled={busy} onPress={() => setConfirm(false)} />
      </> : <AppButton label="Delete transaction…" variant="danger" onPress={() => setConfirm(true)} />}
    </>}
    {error && <Text accessibilityRole="alert" style={styles.failedText}>{error}</Text>}
  </View>;
}
