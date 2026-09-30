import type { SQLiteDatabase } from 'expo-sqlite';
import { addTotal, filterError, type ActivityCursor, type ActivityFilters, type ActivityItem, type ActivityPage, type ActivitySummary, type CurrencyTotal } from './activity-model';
import { ACTIVITY_PAGE_SIZE, activityAccountsQuery, activityCurrenciesQuery, activityDetailQuery, activityPageQuery, activityQueueQuery, activitySummaryQuery } from './activity-sql';

function validate(userId: string, filters?: ActivityFilters) {
  if (!userId) throw new Error('Authentication required.');
  const error = filters && filterError(filters);
  if (error) throw new Error(error);
}

export async function readActivityPage(db: SQLiteDatabase, userId: string, filters: ActivityFilters, cursor: ActivityCursor | null): Promise<ActivityPage> {
  validate(userId, filters);
  const query = activityPageQuery(userId, filters, cursor);
  const rows = await db.getAllAsync<ActivityItem>(query.sql, query.params);
  const items = rows.slice(0, ACTIVITY_PAGE_SIZE);
  const last = items.at(-1);
  return { items, next: rows.length > ACTIVITY_PAGE_SIZE && last ? { date: last.transaction_date, id: last.id } : null };
}

export async function readActivitySummary(db: SQLiteDatabase, userId: string, filters: ActivityFilters, signal?: AbortSignal): Promise<ActivitySummary> {
  validate(userId, filters);
  const query = activitySummaryQuery(userId, filters);
  const totals = new Map<string, CurrencyTotal>();
  let count = 0;
  for await (const row of db.getEachAsync<Pick<ActivityItem, 'type' | 'amount_minor' | 'currency_code' | 'currency_minor_unit'>>(query.sql, query.params)) {
    if (signal?.aborted) throw new Error('Summary canceled.');
    count += 1;
    addTotal(totals, row);
  }
  return { count, currencies: [...totals.values()].sort((a, b) => a.currency.localeCompare(b.currency)) };
}

export async function readActivityDetail(db: SQLiteDatabase, userId: string, id: string): Promise<ActivityItem | null> {
  validate(userId);
  if (!id) return null;
  const query = activityDetailQuery(userId, id);
  return db.getFirstAsync<ActivityItem>(query.sql, query.params);
}

export async function readActivityOptions(db: SQLiteDatabase, userId: string) {
  validate(userId);
  const accounts = activityAccountsQuery(userId), currencies = activityCurrenciesQuery(userId);
  const [accountRows, currencyRows] = await Promise.all([
    db.getAllAsync<{ id: string; name: string; status: string }>(accounts.sql, accounts.params),
    db.getAllAsync<{ code: string }>(currencies.sql, currencies.params),
  ]);
  return { accounts: accountRows, currencies: currencyRows.map(row => row.code) };
}

export async function readActivityQueue(db: SQLiteDatabase, userId: string) {
  validate(userId);
  const query = activityQueueQuery(userId);
  const row = await db.getFirstAsync<{ waiting: number | null; failed: number | null }>(query.sql, query.params);
  return { waiting: row?.waiting ?? 0, failed: row?.failed ?? 0 };
}
