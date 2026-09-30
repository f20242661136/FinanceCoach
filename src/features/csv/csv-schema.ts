export const CSV_SCHEMA = `
CREATE TABLE IF NOT EXISTS local_csv_batches (
  user_id TEXT NOT NULL, id TEXT NOT NULL, name TEXT NOT NULL, created_at TEXT NOT NULL,
  PRIMARY KEY(user_id,id)
);
CREATE TABLE IF NOT EXISTS local_csv_rows (
  user_id TEXT NOT NULL, batch_id TEXT NOT NULL, row_number INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('ready','invalid','duplicate','pending','imported')),
  reason TEXT NOT NULL DEFAULT '', payload_json TEXT, import_key TEXT, transaction_id TEXT, operation_id TEXT,
  PRIMARY KEY(user_id,batch_id,row_number),
  FOREIGN KEY(user_id,batch_id) REFERENCES local_csv_batches(user_id,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_csv_rows_operation ON local_csv_rows(user_id,operation_id);
CREATE TABLE IF NOT EXISTS local_csv_keys (
  user_id TEXT NOT NULL, import_key TEXT NOT NULL, transaction_id TEXT NOT NULL, content_json TEXT NOT NULL,
  PRIMARY KEY(user_id,import_key)
);
CREATE INDEX IF NOT EXISTS idx_local_csv_matching ON local_transactions(user_id,account_id,transaction_date,amount_minor);
PRAGMA user_version = 4;
`;
