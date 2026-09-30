export type SetupFacts = { hasActiveAccount: boolean; hasTransaction: boolean };
export type SetupStep = 'account' | 'transaction' | 'complete';

export function setupStep(facts: SetupFacts): SetupStep {
  if (!facts.hasActiveAccount) return 'account';
  return facts.hasTransaction ? 'complete' : 'transaction';
}

export function preferredCurrency<T extends { code: string }>(currencies: T[], preferred?: string | null): string {
  return currencies.find(item => item.code === preferred)?.code ?? currencies[0]?.code ?? '';
}

export function filterCurrencies<T extends { code: string; name: string; symbol: string }>(currencies: T[], search: string): T[] {
  const term = search.trim().toLowerCase();
  return currencies.filter(item => `${item.code} ${item.name} ${item.symbol}`.toLowerCase().includes(term));
}

// Pending local writes count too. Transfers and opening-balance adjustments do not.
export const SETUP_PROGRESS_SQL = `
  SELECT EXISTS (
    SELECT 1 FROM local_accounts WHERE user_id = ? AND status = 'active'
  ) AS has_active_account,
  EXISTS (
    SELECT 1 FROM local_transactions
    WHERE user_id = ? AND deleted_at IS NULL AND type IN ('expense', 'income')
  ) AS has_transaction
`;
