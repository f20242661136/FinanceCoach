import type { ActivityCursor, ActivityFilters } from './activity-model';

// A queue failure is authoritative even while the ledger row remains pending.
const STATUS = `CASE
  WHEN EXISTS (SELECT 1 FROM sync_queue q WHERE q.user_id = t.user_id AND q.entity_id = t.id
    AND q.entity_type IN ('transaction', 'transfer') AND q.status = 'failed') THEN 'failed'
  WHEN EXISTS (SELECT 1 FROM sync_queue q WHERE q.user_id = t.user_id AND q.entity_id = t.id
    AND q.entity_type IN ('transaction', 'transfer') AND q.status IN ('pending', 'processing')) THEN 'pending'
  ELSE t.sync_status END`;

const JOINS = `FROM local_transactions t
  LEFT JOIN local_accounts source ON source.user_id = t.user_id AND source.id = t.account_id
  LEFT JOIN local_accounts destination ON destination.user_id = t.user_id AND destination.id = t.destination_account_id
  LEFT JOIN local_categories category ON category.user_id = t.user_id AND category.id = t.category_id`;

const COLUMNS = `t.id, t.account_id, COALESCE(source.name, 'Account unavailable') AS account_name,
  t.category_id, category.default_name AS category_name, t.type, t.amount_minor, t.currency_code,
  t.currency_minor_unit, t.transaction_date, t.merchant, t.description, t.notes,
  t.destination_account_id, destination.name AS destination_account_name,
  t.destination_amount_minor, t.destination_currency_code, t.destination_currency_minor_unit,
  (SELECT c.action FROM local_transaction_corrections c WHERE c.user_id=t.user_id AND c.transaction_id=t.id) AS correction_action,
  (SELECT c.status FROM local_transaction_corrections c WHERE c.user_id=t.user_id AND c.transaction_id=t.id) AS correction_status,
  t.version, t.server_revision, ${STATUS} AS sync_status, t.created_at, t.updated_at`;

function where(userId: string, filters: ActivityFilters) {
  const parts = ['t.user_id = ?', 't.deleted_at IS NULL'];
  const params: (string | number)[] = [userId];
  if (filters.search.trim()) {
    const fields = ['t.merchant', 't.description', 't.notes', 'source.name', 'destination.name', 'category.default_name'];
    parts.push(`(${fields.map(field => `instr(lower(COALESCE(${field}, '')), lower(?)) > 0`).join(' OR ')})`);
    params.push(...fields.map(() => filters.search.trim()));
  }
  if (filters.kind !== 'all') { parts.push('t.type = ?'); params.push(filters.kind); }
  if (filters.accountId) { parts.push('(t.account_id = ? OR (t.type = \'transfer\' AND t.destination_account_id = ?))'); params.push(filters.accountId, filters.accountId); }
  if (filters.currency) { parts.push('(t.currency_code = ? OR (t.type = \'transfer\' AND t.destination_currency_code = ?))'); params.push(filters.currency, filters.currency); }
  if (filters.status !== 'all') { parts.push(`(${STATUS}) = ?`); params.push(filters.status); }
  if (filters.from) { parts.push('t.transaction_date >= ?'); params.push(filters.from); }
  if (filters.to) { parts.push('t.transaction_date <= ?'); params.push(filters.to); }
  return { sql: parts.join(' AND '), params };
}

export const ACTIVITY_PAGE_SIZE = 40;

export function activityPageQuery(userId: string, filters: ActivityFilters, cursor: ActivityCursor | null = null) {
  const clause = where(userId, filters);
  if (cursor) {
    clause.sql += ' AND (t.transaction_date < ? OR (t.transaction_date = ? AND t.id < ?))';
    clause.params.push(cursor.date, cursor.date, cursor.id);
  }
  clause.params.push(ACTIVITY_PAGE_SIZE + 1);
  return { sql: `SELECT ${COLUMNS} ${JOINS} WHERE ${clause.sql} ORDER BY t.transaction_date DESC, t.id DESC LIMIT ?`, params: clause.params };
}

export function activitySummaryQuery(userId: string, filters: ActivityFilters) {
  const clause = where(userId, filters);
  return { sql: `SELECT t.type, t.amount_minor, t.currency_code, t.currency_minor_unit ${JOINS} WHERE ${clause.sql}`, params: clause.params };
}

export function activityDetailQuery(userId: string, id: string) {
  return { sql: `SELECT ${COLUMNS} ${JOINS} WHERE t.user_id = ? AND t.id = ? AND t.deleted_at IS NULL LIMIT 1`, params: [userId, id] };
}

export function activityAccountsQuery(userId: string) {
  return { sql: `SELECT id, name, status FROM local_accounts WHERE user_id = ? ORDER BY name COLLATE NOCASE, id`, params: [userId] };
}

export function activityCurrenciesQuery(userId: string) {
  return { sql: `SELECT currency_code AS code FROM local_transactions WHERE user_id = ? AND deleted_at IS NULL
    UNION SELECT destination_currency_code AS code FROM local_transactions WHERE user_id = ? AND deleted_at IS NULL
      AND type = 'transfer' AND destination_currency_code IS NOT NULL ORDER BY code`, params: [userId, userId] };
}

export function activityQueueQuery(userId: string) {
  return { sql: `SELECT SUM(CASE WHEN status IN ('pending', 'processing') THEN 1 ELSE 0 END) AS waiting,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed FROM sync_queue WHERE user_id = ?`, params: [userId] };
}
