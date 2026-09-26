export const LOCAL_DATABASE_NAME =
  'finance-coach.db';

export const LOCAL_SCHEMA_VERSION = 1;

export const LOCAL_TABLES = [
  'local_accounts',
  'local_transactions',
  'local_categories',
  'sync_queue',
  'sync_cursors',
  'local_meta',
] as const;