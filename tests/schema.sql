
CREATE TABLE IF NOT EXISTS local_meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS local_accounts (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL,

  name TEXT NOT NULL,
  account_type_code TEXT NOT NULL,

  balance_class TEXT NOT NULL
    CHECK (
      balance_class IN (
        'asset',
        'liability'
      )
    ),

  currency_code TEXT NOT NULL,
  currency_minor_unit INTEGER NOT NULL
    CHECK (
      currency_minor_unit
      BETWEEN 0 AND 4
    ),

  opening_balance_minor TEXT NOT NULL,
  current_balance_minor TEXT NOT NULL,

  status TEXT NOT NULL
    CHECK (
      status IN (
        'active',
        'inactive',
        'archived'
      )
    ),

  sync_status TEXT NOT NULL
    DEFAULT 'synced'
    CHECK (
      sync_status IN (
        'synced',
        'pending',
        'failed'
      )
    ),

  server_revision TEXT,
  server_updated_at TEXT,

  created_at TEXT,
  updated_at TEXT,

  PRIMARY KEY (
    user_id,
    id
  )
);

CREATE INDEX IF NOT EXISTS
  idx_local_accounts_user_status
ON local_accounts (
  user_id,
  status
);


CREATE TABLE IF NOT EXISTS local_categories (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL,

  kind TEXT NOT NULL
    CHECK (
      kind IN (
        'income',
        'expense'
      )
    ),

  default_name TEXT NOT NULL,
  is_system INTEGER NOT NULL
    CHECK (
      is_system IN (0, 1)
    ),

  sort_order INTEGER,
  deleted_at TEXT,

  server_revision TEXT,
  server_updated_at TEXT,

  PRIMARY KEY (
    user_id,
    id
  )
);

CREATE INDEX IF NOT EXISTS
  idx_local_categories_user_kind
ON local_categories (
  user_id,
  kind
);


CREATE TABLE IF NOT EXISTS local_transactions (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL,

  account_id TEXT NOT NULL,
  category_id TEXT,

  type TEXT NOT NULL
    CHECK (
      type IN (
        'income',
        'expense',
        'transfer',
        'adjustment'
      )
    ),

  amount_minor TEXT NOT NULL,
  currency_code TEXT NOT NULL,

  currency_minor_unit INTEGER NOT NULL
    CHECK (
      currency_minor_unit
      BETWEEN 0 AND 4
    ),

  transaction_date TEXT NOT NULL,

  merchant TEXT,
  description TEXT,
  notes TEXT,

  destination_account_id TEXT,
  destination_amount_minor TEXT,
  destination_currency_code TEXT,
  destination_currency_minor_unit INTEGER,

  version INTEGER,
  server_revision TEXT,

  sync_status TEXT NOT NULL
    DEFAULT 'synced'
    CHECK (
      sync_status IN (
        'synced',
        'pending',
        'failed'
      )
    ),

  deleted_at TEXT,
  created_at TEXT,
  updated_at TEXT,

  PRIMARY KEY (
    user_id,
    id
  )
);

CREATE INDEX IF NOT EXISTS
  idx_local_transactions_user_date
ON local_transactions (
  user_id,
  transaction_date DESC
);

CREATE INDEX IF NOT EXISTS
  idx_local_transactions_user_revision
ON local_transactions (
  user_id,
  server_revision
);


CREATE TABLE IF NOT EXISTS sync_queue (
  operation_id TEXT PRIMARY KEY NOT NULL,

  user_id TEXT NOT NULL,

  entity_type TEXT NOT NULL
    CHECK (
      entity_type IN (
        'account',
        'transaction',
        'transfer'
      )
    ),

  mutation_kind TEXT NOT NULL
    CHECK (
      mutation_kind IN (
        'create',
        'update',
        'delete'
      )
    ),

  entity_id TEXT NOT NULL,

  payload_json TEXT NOT NULL,

  status TEXT NOT NULL
    DEFAULT 'pending'
    CHECK (
      status IN (
        'pending',
        'processing',
        'failed'
      )
    ),

  attempt_count INTEGER NOT NULL
    DEFAULT 0
    CHECK (
      attempt_count >= 0
    ),

  next_attempt_at TEXT,
  last_error TEXT,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS
  idx_sync_queue_user_status_created
ON sync_queue (
  user_id,
  status,
  created_at
);

CREATE INDEX IF NOT EXISTS
  idx_sync_queue_retry
ON sync_queue (
  status,
  next_attempt_at
);


CREATE TABLE IF NOT EXISTS sync_cursors (
  user_id TEXT NOT NULL,
  cursor_name TEXT NOT NULL,
  cursor_value TEXT NOT NULL,

  updated_at TEXT NOT NULL,

  PRIMARY KEY (
    user_id,
    cursor_name
  )
);


PRAGMA user_version = 1;
