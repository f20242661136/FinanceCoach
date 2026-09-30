import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { withEncryptedWriteTransaction } from '@/offline/database/encrypted-writer';
import { applySyncDelta } from '@/offline/sync/sync-repository';
import type { SyncQueueRow } from '@/offline/database/sync-queue';
import { changesSchema, correctionPayloadSchema, responseSchema, ruleSchema, type CorrectionBase, type CorrectionChanges, type CorrectionJournal, type CorrectionRule } from './correction-model';

type Rpc = (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }>;
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc;
export async function assertCorrectionUser(userId: string) {
  const { data, error } = await supabase.auth.getSession();
  if (error || !userId || data.session?.user.id !== userId) throw new Error('Your account changed. Reopen this entry.');
}
export async function readCorrectionState(db: SQLiteDatabase, userId: string, id: string) {
  const base = await db.getFirstAsync<CorrectionBase>('SELECT * FROM local_transactions WHERE user_id = ? AND id = ?', userId, id);
  const journal = await db.getFirstAsync<CorrectionJournal>('SELECT * FROM local_transaction_corrections WHERE user_id = ? AND transaction_id = ?', userId, id);
  const rule = await db.getFirstAsync<CorrectionRule>('SELECT transaction_id, version, block_reason FROM local_transaction_correction_rules WHERE user_id = ? AND transaction_id = ?', userId, id);
  const accounts = await db.getAllAsync<{ id: string; name: string; currency_code: string; status: string }>('SELECT id, name, currency_code, status FROM local_accounts WHERE user_id = ? ORDER BY name', userId);
  const categories = await db.getAllAsync<{ id: string; kind: string; default_name: string }>('SELECT id, kind, default_name FROM local_categories WHERE user_id = ? AND deleted_at IS NULL ORDER BY sort_order, default_name', userId);
  return { base, journal, rule, accounts, categories };
}
export async function refreshCorrectionRule(userId: string, id: string) {
  await assertCorrectionUser(userId);
  const { data, error } = await rpc('get_transaction_correction_rules', { p_transaction_ids: [id] });
  if (error) throw new Error(error.message);
  const rules = z.array(ruleSchema).parse(data);
  if (!rules.some(r => r.transaction_id === id)) throw new Error('This entry is unavailable on the server. Sync Activity first.');
  await assertCorrectionUser(userId);
  await withEncryptedWriteTransaction(async db => {
    for (const r of rules) await db.runAsync(`INSERT INTO local_transaction_correction_rules(user_id,transaction_id,version,block_reason,cached_at)
      VALUES(?,?,?,?,?) ON CONFLICT(user_id,transaction_id) DO UPDATE SET version=excluded.version,
      block_reason=excluded.block_reason,cached_at=excluded.cached_at WHERE excluded.version >= local_transaction_correction_rules.version`,
    userId, r.transaction_id, r.version, r.block_reason, new Date().toISOString());
  });
}
export function correctionUnavailable(base: CorrectionBase | null, rule: CorrectionRule | null, journal: CorrectionJournal | null): string | null {
  if (journal) return 'Resolve the saved correction before making another change.';
  if (!base || base.deleted_at) return 'This entry is unavailable.';
  if (base.sync_status !== 'synced') return 'Sync this new entry before correcting it.';
  if (base.type === 'adjustment') return 'Correct adjustments through their original feature.';
  if (!rule || rule.version !== base.version) return 'Connect to check correction access for this version, then sync if the server version changed.';
  return rule.block_reason;
}
export async function saveCorrection(userId: string, id: string, expectedVersion: number, changes: CorrectionChanges | null, reviewedOperationId?: string) {
  await assertCorrectionUser(userId);
  const operationId = Crypto.randomUUID();
  const payload = correctionPayloadSchema.parse({ operationId, transactionId: id, expectedVersion, action: changes ? 'update' : 'delete', changes });
  const now = new Date().toISOString();
  await withEncryptedWriteTransaction(async db => {
    const { base, journal, rule } = await readCorrectionState(db, userId, id);
    const reviewed = journal?.status === 'rejected' && journal.operation_id === reviewedOperationId;
    const unavailable = correctionUnavailable(base, rule, reviewed ? null : journal);
    if (unavailable) throw new Error(unavailable);
    if (!base || base.version !== expectedVersion) throw new Error('This entry changed. Reopen and review its latest version.');
    if (reviewed && journal) {
      await db.runAsync('DELETE FROM sync_queue WHERE user_id=? AND operation_id=?',userId,journal.operation_id);
      await db.runAsync('DELETE FROM local_transaction_corrections WHERE user_id=? AND operation_id=?',userId,journal.operation_id);
    }
    const queued = await db.getFirstAsync('SELECT operation_id FROM sync_queue WHERE user_id = ? AND entity_id = ? AND entity_type IN (\'transaction\',\'transfer\')', userId, id);
    if (queued) throw new Error('Sync the existing operation before correcting this entry.');
    if (changes) {
      changesSchema.parse(changes);
      if ((base.type === 'transfer') !== (changes.type === 'transfer')) throw new Error('Transfers cannot change into income or expenses.');
      for (const accountId of [changes.account_id, changes.destination_account_id].filter(Boolean)) {
        const a = await db.getFirstAsync<{ status: string; currency_code: string }>('SELECT status, currency_code FROM local_accounts WHERE user_id = ? AND id = ?', userId, accountId!);
        if (!a || a.status !== 'active' || a.currency_code !== base.currency_code) throw new Error('Choose active accounts in the original currency.');
      }
      if (changes.category_id) {
        const c = await db.getFirstAsync<{ kind: string }>('SELECT kind FROM local_categories WHERE user_id = ? AND id = ? AND deleted_at IS NULL', userId, changes.category_id);
        if (!c || c.kind !== changes.type) throw new Error('Choose a category matching the transaction type.');
      }
    }
    await db.runAsync(`INSERT INTO local_transaction_corrections(user_id,transaction_id,operation_id,expected_version,action,payload_json,original_json,status,attempted,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,'pending',0,?,?)`, userId, id, operationId, expectedVersion, payload.action, JSON.stringify(payload), JSON.stringify(base), now, now);
    await db.runAsync(`INSERT INTO sync_queue(operation_id,user_id,entity_type,mutation_kind,entity_id,payload_json,status,attempt_count,created_at,updated_at)
      VALUES(?,?,?,?,?,?,'pending',0,?,?)`, operationId, userId, base.type === 'transfer' ? 'transfer' : 'transaction', payload.action, id, JSON.stringify(payload), now, now);
  });
  return operationId;
}
export async function discardCorrection(userId: string, id: string) {
  await assertCorrectionUser(userId);
  await withEncryptedWriteTransaction(async db => {
    const row = await db.getFirstAsync<CorrectionJournal>('SELECT * FROM local_transaction_corrections WHERE user_id = ? AND transaction_id = ?', userId, id);
    if (!row) return;
    const queue = await db.getFirstAsync<{ status: string }>('SELECT status FROM sync_queue WHERE user_id = ? AND operation_id = ?', userId, row.operation_id);
    if (row.status !== 'rejected' && (row.attempted || queue?.status !== 'pending')) throw new Error('This correction may have reached the server. Sync to confirm its result before discarding.');
    await db.runAsync('DELETE FROM sync_queue WHERE user_id = ? AND operation_id = ?', userId, row.operation_id);
    await db.runAsync('DELETE FROM local_transaction_corrections WHERE user_id = ? AND transaction_id = ?', userId, id);
  });
}
export async function rejectCorrection(userId: string, operationId: string, reason: string) {
  await withEncryptedWriteTransaction(async db => {
    await db.runAsync(`UPDATE local_transaction_corrections SET status='rejected',reason=?,updated_at=? WHERE user_id=? AND operation_id=?`, reason.slice(0,1000),new Date().toISOString(),userId,operationId);
  });
}
export async function replayCorrection(row: SyncQueueRow) {
  const payload = correctionPayloadSchema.parse(JSON.parse(row.payload_json));
  if (payload.operationId !== row.operation_id || payload.transactionId !== row.entity_id || payload.action !== row.mutation_kind) throw new SyntaxError('Correction queue identity does not match its payload.');
  await assertCorrectionUser(row.user_id);
  const { data, error } = await rpc('correct_financial_transaction', {
    p_operation_id: payload.operationId, p_transaction_id: payload.transactionId,
    p_expected_version: payload.expectedVersion, p_action: payload.action, p_changes: payload.changes ?? {},
  });
  if (error) {
    // A completed PostgreSQL validation exception rolled back the operation; transport failures stay ambiguous.
    if (error.code?.startsWith('22') || error.code?.startsWith('23') || error.code === '42501' || error.code === 'P0001') await rejectCorrection(row.user_id, row.operation_id, error.message);
    return { code: error.code, message: error.message };
  }
  // A malformed acknowledgment may follow a committed write. Never mark it safe to discard.
  const response = responseSchema.parse(data);
  if (response.snapshot.transactions.some(t => t.id !== row.entity_id)) throw new Error('Unexpected transaction in correction response.');
  if (response.status === 'applied' && (response.snapshot.transactions.length !== 1 || response.snapshot.transactions[0].version <= payload.expectedVersion)) throw new Error('The correction acknowledgment does not confirm a new server version. Sync again to reconcile.');
  await assertCorrectionUser(row.user_id);
  await applySyncDelta(row.user_id, { ...response.snapshot, categories: [], next: { accounts: '0', categories: '0', transactions: '0' },
    has_more: { accounts: false, categories: false, transactions: false } }, async db => {
    if (response.status === 'applied') {
      await db.runAsync('DELETE FROM sync_queue WHERE user_id=? AND operation_id=?',row.user_id,row.operation_id);
      await db.runAsync('DELETE FROM local_transaction_corrections WHERE user_id=? AND operation_id=?',row.user_id,row.operation_id);
    } else {
      await db.runAsync(`UPDATE local_transaction_corrections SET status='rejected',reason=?,updated_at=? WHERE user_id=? AND operation_id=?`,response.reason ?? 'Review this correction.',new Date().toISOString(),row.user_id,row.operation_id);
    }
  }, true);
  return response.status === 'applied' ? {} : { code: 'CORRECTION_REJECTED', message: response.reason ?? 'Review this correction before saving again.' };
}
