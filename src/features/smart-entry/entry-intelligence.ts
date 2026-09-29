export type EntryKind = 'expense' | 'income';
export type EntryAccount = { id: string; currency_code: string; currency_minor_unit: number };
export type EntryCategory = { id: string };
export type EntryHistory = {
  id: string;
  account_id: string;
  category_id: string | null;
  type: EntryKind;
  amount_minor: string;
  currency_code: string;
  currency_minor_unit: number;
  merchant: string | null;
  created_at: string;
};

export function localToday(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function decimalFromMinor(value: string, minorUnit: number): string {
  if (!/^\d+$/.test(value) || !Number.isInteger(minorUnit) || minorUnit < 0 || minorUnit > 9) {
    throw new Error('Invalid currency amount.');
  }
  const digits = BigInt(value).toString().padStart(minorUnit + 1, '0');
  return minorUnit === 0 ? digits : `${digits.slice(0, -minorUnit)}.${digits.slice(-minorUnit)}`;
}

export function validAmount(value: string, minorUnit: number): boolean {
  const cleaned = value.trim().replace(/,/g, '');
  if (!/^\d+(?:\.\d+)?$/.test(cleaned)) return false;
  const [whole, fraction = ''] = cleaned.split('.');
  if (fraction.length > minorUnit) return false;
  return BigInt(whole + fraction.padEnd(minorUnit, '0')) > 0n;
}

export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function normalizeMerchant(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

// History arrives newest-created first, independent of the transaction's date.
export function entrySuggestions(
  history: EntryHistory[], accounts: EntryAccount[], categories: EntryCategory[],
  kind: EntryKind, merchant: string,
) {
  const available = history.filter(row => row.type === kind && accounts.some(account =>
    account.id === row.account_id && account.currency_code === row.currency_code
    && account.currency_minor_unit === row.currency_minor_unit));
  const needle = normalizeMerchant(merchant);
  const merchantMatch = needle ? available.find(row => normalizeMerchant(row.merchant ?? '') === needle) : undefined;
  const categorySource = merchantMatch ?? available.find(row => categories.some(category => category.id === row.category_id));
  const merchants: string[] = [];
  for (const row of available) {
    const label = row.merchant?.trim();
    if (label && !merchants.some(existing => normalizeMerchant(existing) === normalizeMerchant(label))) merchants.push(label);
    if (merchants.length === 5) break;
  }
  return {
    accountId: available[0]?.account_id ?? accounts[0]?.id ?? '',
    categoryId: categories.some(category => category.id === categorySource?.category_id) ? categorySource?.category_id ?? '' : '',
    categoryReason: merchantMatch ? 'Used for this merchant' : 'Last used',
    merchants,
    repeat: available.find(row => BigInt(row.amount_minor) > 0n && categories.some(category => category.id === row.category_id)) ?? null,
  };
}
