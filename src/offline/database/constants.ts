export const LOCAL_DATABASE_NAME =
  'finance-coach-secure.db';

export const LOCAL_SCHEMA_VERSION = 4;

export const LOCAL_TABLES = [
  'local_accounts',
  'local_transactions',
  'local_categories',
  'sync_queue',
  'sync_cursors',
  'local_meta',
  'local_transaction_corrections',
  'local_transaction_correction_rules',
  'local_csv_batches',
  'local_csv_rows',
  'local_csv_keys',
] as const;
