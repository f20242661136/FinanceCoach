import type { LocalActivityItem } from '@/offline/sync/local-finance-repository';

export type ActivityItem = LocalActivityItem & { correction_action?: string | null; correction_status?: string | null };
export type ActivityKind = 'all' | 'income' | 'expense' | 'transfer' | 'adjustment';
export type ActivityStatus = 'all' | 'synced' | 'pending' | 'failed';
export type ActivityFilters = { search: string; kind: ActivityKind; accountId: string; currency: string; status: ActivityStatus; from: string; to: string };
export const EMPTY_FILTERS: ActivityFilters = { search: '', kind: 'all', accountId: '', currency: '', status: 'all', from: '', to: '' };
export type ActivityCursor = { date: string; id: string };
export type ActivityPage = { items: ActivityItem[]; next: ActivityCursor | null };
export type CurrencyTotal = { currency: string; minorUnit: number; incomeMinor: string; expenseMinor: string };
export type ActivitySummary = { count: number; currencies: CurrencyTotal[] };

export function validActivityDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function filterError(filters: ActivityFilters): string | null {
  if (filters.from && !validActivityDate(filters.from)) return 'Use a valid start date in YYYY-MM-DD format.';
  if (filters.to && !validActivityDate(filters.to)) return 'Use a valid end date in YYYY-MM-DD format.';
  if (filters.from && filters.to && filters.from > filters.to) return 'The end date must be on or after the start date.';
  return null;
}

export function filterCount(filters: ActivityFilters): number {
  return Number(Boolean(filters.search.trim())) + Number(filters.kind !== 'all') + Number(Boolean(filters.accountId))
    + Number(Boolean(filters.currency)) + Number(filters.status !== 'all') + Number(Boolean(filters.from || filters.to));
}

export function todayInZone(now = new Date(), timeZone?: string | null): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: timeZone || undefined, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
    const part = (type: string) => parts.find(item => item.type === type)!.value;
    return `${part('year')}-${part('month')}-${part('day')}`;
  } catch {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
}

export function shiftDay(date: string, days: number): string {
  if (!validActivityDate(date)) throw new Error('Invalid date.');
  const result = new Date(`${date}T12:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

export function dateHeading(date: string, today: string): string {
  if (date === today) return 'Today';
  if (date === shiftDay(today, -1)) return 'Yesterday';
  if (!validActivityDate(date)) return date || 'Date unavailable';
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function activityTitle(item: Pick<ActivityItem, 'merchant' | 'description' | 'category_name' | 'type'>): string {
  return item.merchant?.trim() || item.description?.trim() || item.category_name?.trim() || kindLabel(item.type);
}

export function kindLabel(kind: string): string {
  return ({ all: 'All types', income: 'Income', expense: 'Expense', transfer: 'Transfer', adjustment: 'Adjustment' } as Record<string, string>)[kind] ?? 'Transaction';
}

export function syncLabel(status: string): string {
  return ({ synced: 'Synced', pending: 'Pending sync', failed: 'Failed' } as Record<string, string>)[status] ?? 'Status unavailable';
}

export function groupActivity(items: ActivityItem[]) {
  const groups = new Map<string, { key: string; date: string; data: ActivityItem[] }>();
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    if (!groups.has(item.transaction_date)) groups.set(item.transaction_date, { key: item.transaction_date, date: item.transaction_date, data: [] });
    groups.get(item.transaction_date)!.data.push(item);
  }
  return [...groups.values()];
}

// Accumulate text minor units with BigInt, never SQLite SUM or floating-point money.
export function addTotal(totals: Map<string, CurrencyTotal>, row: { type: string; amount_minor: string; currency_code: string; currency_minor_unit: number }) {
  if (row.type !== 'income' && row.type !== 'expense') return;
  const unit = row.currency_minor_unit;
  if (!/^-?\d+$/.test(row.amount_minor) || !Number.isInteger(unit) || unit < 0 || unit > 4) throw new Error('Invalid stored money amount.');
  const total = totals.get(row.currency_code) ?? { currency: row.currency_code, minorUnit: unit, incomeMinor: '0', expenseMinor: '0' };
  if (unit > total.minorUnit) {
    const scale = 10n ** BigInt(unit - total.minorUnit);
    total.incomeMinor = (BigInt(total.incomeMinor) * scale).toString();
    total.expenseMinor = (BigInt(total.expenseMinor) * scale).toString();
    total.minorUnit = unit;
  }
  const amount = BigInt(row.amount_minor) * (10n ** BigInt(total.minorUnit - unit));
  const key = row.type === 'income' ? 'incomeMinor' : 'expenseMinor';
  total[key] = (BigInt(total[key]) + amount).toString();
  totals.set(row.currency_code, total);
}
