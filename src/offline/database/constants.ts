export const LOCAL_DATABASE_NAME =
  'finance-coach-secure.db';

export const LOCAL_SCHEMA_VERSION = 2;

export const LOCAL_TABLES = [
  'local_accounts',
  'local_transactions',
  'local_categories',
  'sync_queue',
  'sync_cursors',
  'local_meta',
] as const;