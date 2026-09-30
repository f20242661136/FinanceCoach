import { z } from 'zod';
import { validActivityDate } from '@/features/activity/activity-model';
import { syncAccountSchema, syncTransactionSchema } from '@/offline/sync/sync-schema';

const money = z.string().regex(/^[1-9]\d*$/).max(19).refine(v => BigInt(v) <= 9223372036854775807n, 'Amount is too large.');
export const changesSchema = z.object({
  account_id: z.string().uuid(), category_id: z.string().uuid().nullable(),
  type: z.enum(['income', 'expense', 'transfer']), amount_minor: money,
  transaction_date: z.string().refine(validActivityDate, 'Enter a valid date in YYYY-MM-DD format.'),
  merchant: z.string().max(120).nullable(), description: z.string().max(160).nullable(),
  notes: z.string().max(2000).nullable(), destination_account_id: z.string().uuid().nullable(),
}).strict().superRefine((v, ctx) => {
  if (v.type === 'transfer' ? !v.destination_account_id || v.destination_account_id === v.account_id || v.category_id !== null : v.destination_account_id !== null || v.category_id === null) {
    ctx.addIssue({ code: 'custom', message: 'Choose two different accounts for a transfer; income and expenses require one account and a matching category.' });
  }
});
export type CorrectionChanges = z.infer<typeof changesSchema>;
export const correctionPayloadSchema = z.object({
  operationId: z.string().uuid(), transactionId: z.string().uuid(), expectedVersion: z.number().int().positive(),
  action: z.enum(['update', 'delete']), changes: changesSchema.nullable(),
}).strict().refine(p => p.action === 'update' ? p.changes !== null : p.changes === null, 'Invalid correction action.');
export type CorrectionPayload = z.infer<typeof correctionPayloadSchema>;
export const ruleSchema = z.object({ transaction_id: z.string().uuid(), version: z.number().int().positive(), block_reason: z.string().nullable() });
export type CorrectionRule = z.infer<typeof ruleSchema>;
export const responseSchema = z.object({ status: z.enum(['applied', 'conflict', 'blocked', 'missing']),
  reason: z.string().nullable(), replayed: z.boolean(), snapshot: z.object({
    accounts: z.array(syncAccountSchema), transactions: z.array(syncTransactionSchema),
  }) });
export type CorrectionResponse = z.infer<typeof responseSchema>;
export type CorrectionJournal = {
  user_id: string; transaction_id: string; operation_id: string; expected_version: number;
  action: 'update' | 'delete'; payload_json: string; original_json: string;
  status: 'pending' | 'rejected'; attempted: number; reason: string | null; created_at: string;
};
export type CorrectionBase = {
  id: string; account_id: string; category_id: string | null; type: 'income' | 'expense' | 'transfer' | 'adjustment';
  amount_minor: string; currency_code: string; currency_minor_unit: number; transaction_date: string;
  merchant: string | null; description: string | null; notes: string | null;
  destination_account_id: string | null; destination_amount_minor: string | null;
  version: number; sync_status: string; deleted_at: string | null;
};
export function editableChanges(base: CorrectionBase): CorrectionChanges {
  if (base.type === 'adjustment') throw new Error('Adjustments cannot be corrected here.');
  return { account_id: base.account_id, category_id: base.category_id, type: base.type,
    amount_minor: base.amount_minor, transaction_date: base.transaction_date,
    merchant: base.merchant, description: base.description, notes: base.notes, destination_account_id: base.destination_account_id };
}
export function decimalToMinor(raw: string, unit: number): string {
  if (!Number.isInteger(unit) || unit < 0 || unit > 4 || !/^\d+(?:\.\d+)?$/.test(raw.trim())) throw new Error('Enter a positive amount without currency symbols or separators.');
  const [whole, fraction = ''] = raw.trim().split('.');
  if (fraction.length > unit) throw new Error(`Use at most ${unit} decimal places.`);
  return money.parse((BigInt(whole) * 10n ** BigInt(unit) + BigInt(fraction.padEnd(unit, '0') || '0')).toString());
}
export function minorToDecimal(raw: string, unit: number): string {
  const v = raw.padStart(unit + 1, '0');
  return unit ? `${v.slice(0, -unit)}.${v.slice(-unit)}` : v;
}
export function correctionImpact(base: CorrectionBase, changes: CorrectionChanges | null) {
  const result = new Map<string, bigint>();
  function add(id: string, v: bigint) { result.set(id, (result.get(id) ?? 0n) + v); }
  function effect(v: Pick<CorrectionChanges, 'account_id' | 'type' | 'amount_minor' | 'destination_account_id'>, multiplier: bigint, destinationAmount?: string | null) {
    const amount = BigInt(v.amount_minor) * multiplier;
    add(v.account_id, v.type === 'income' ? amount : -amount);
    if (v.type === 'transfer' && v.destination_account_id) add(v.destination_account_id, BigInt(destinationAmount ?? v.amount_minor) * multiplier);
  }
  if (base.type === 'adjustment') throw new Error('Adjustment impact is unavailable.');
  effect(editableChanges(base), -1n, base.destination_amount_minor);
  if (changes) effect(changes, 1n);
  return [...result].filter(([, value]) => value !== 0n).map(([accountId, value]) => ({ accountId, minor: value.toString() }));
}
