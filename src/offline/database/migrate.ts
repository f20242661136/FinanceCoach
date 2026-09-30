import type {
  SQLiteDatabase,
} from 'expo-sqlite';
import { CSV_SCHEMA } from '@/features/csv/csv-schema';
import {
  LOCAL_TABLES,
  LOCAL_SCHEMA_VERSION,
} from './constants';
import {
  getLocalDatabaseKey,
} from './encryption';
const SCHEMA_V1 = `
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
`;
const SCHEMA_V2 = `
  create table if not exists sync_cursors (
    user_id text not null,
    cursor_name text not null,
    cursor_value text not null,
    updated_at text not null,

    primary key (
      user_id,
      cursor_name
    )
  );

  create index if not exists
    sync_cursors_user_id_idx
  on sync_cursors (
    user_id
  );

  create table if not exists sync_queue (
    operation_id text primary key,
    user_id text not null,
    entity_type text not null,
    mutation_kind text not null,
    entity_id text not null,
    payload_json text not null,
    status text not null,
    attempt_count integer not null default 0,
    next_attempt_at text,
    last_error text,
    created_at text not null,
    updated_at text not null
  );

  create index if not exists
    sync_queue_user_status_idx
  on sync_queue (
    user_id,
    status,
    created_at
  );
`;
const SCHEMA_V3 = `
CREATE TABLE IF NOT EXISTS local_transaction_corrections (
 user_id TEXT NOT NULL, transaction_id TEXT NOT NULL, operation_id TEXT NOT NULL UNIQUE,
 expected_version INTEGER NOT NULL, action TEXT NOT NULL CHECK(action IN ('update','delete')),
 payload_json TEXT NOT NULL, original_json TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('pending','rejected')) DEFAULT 'pending',
 attempted INTEGER NOT NULL DEFAULT 0 CHECK(attempted IN (0,1)), reason TEXT,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 PRIMARY KEY(user_id,transaction_id)
);
CREATE TABLE IF NOT EXISTS local_transaction_correction_rules (
 user_id TEXT NOT NULL, transaction_id TEXT NOT NULL, version INTEGER NOT NULL,
 block_reason TEXT, cached_at TEXT NOT NULL, PRIMARY KEY(user_id,transaction_id)
);
PRAGMA user_version = 3;
`;

async function assertSchema(
  db: SQLiteDatabase,
): Promise<void> {
  for (const table of LOCAL_TABLES) {
    const row =
      await db.getFirstAsync<{
        name: string;
      }>(
        `
          SELECT name
          FROM sqlite_master
          WHERE
            type = ?
            AND name = ?
          LIMIT 1
        `,
        'table',
        table,
      );

    if (!row) {
      throw new Error(
        `Local database migration failed: missing ${table}`,
      );
    }
  }
}
export async function migrateLocalDatabase(
  db: SQLiteDatabase,
): Promise<void> {
  const databaseKey =
    await getLocalDatabaseKey();

  if (
    !/^[0-9a-f]{64}$/i.test(
      databaseKey,
    )
  ) {
    throw new Error(
      '[local-db:key] Invalid encryption key.',
    );
  }


  /*
   * SQLCipher keying must happen before
   * any access to the encrypted database.
   */
  try {
    await db.execAsync(
      `PRAGMA key = "x'${databaseKey}'";`,
    );
  } catch (error) {
    throw new Error(
      `[local-db:key] ${
        error instanceof Error
          ? error.message
          : String(error)
      }`,
    );
  }


  try {
    const cipher =
      await db.getFirstAsync<{
        cipher_version: string;
      }>(
        'PRAGMA cipher_version',
      );

    if (!cipher?.cipher_version) {
      throw new Error(
        'SQLCipher native support is unavailable.',
      );
    }

    console.log(
      '[local-db] SQLCipher',
      cipher.cipher_version,
    );
  } catch (error) {
    throw new Error(
      `[local-db:cipher-version] ${
        error instanceof Error
          ? error.message
          : String(error)
      }`,
    );
  }


  /*
   * Force a real database read after
   * applying the key.
   */
  try {
    await db.getFirstAsync(
      `
        SELECT COUNT(*) AS count
        FROM sqlite_master
      `,
    );
  } catch (error) {
    throw new Error(
      `[local-db:key-validation] ${
        error instanceof Error
          ? error.message
          : String(error)
      }`,
    );
  }


  try {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      PRAGMA busy_timeout = 5000;
    `);
  } catch (error) {
    throw new Error(
      `[local-db:pragmas] ${
        error instanceof Error
          ? error.message
          : String(error)
      }`,
    );
  }


  const versionRow =
    await db.getFirstAsync<{
      user_version: number;
    }>(
      'PRAGMA user_version',
    );

  let currentVersion =
    versionRow?.user_version ?? 0;

  if (
    !Number.isInteger(
      currentVersion,
    )
    || currentVersion < 0
  ) {
    throw new Error(
      'Local database has an invalid schema version.',
    );
  }


  if (
    currentVersion >
    LOCAL_SCHEMA_VERSION
  ) {
    throw new Error(
      `Local database schema version ${currentVersion} is newer than supported version ${LOCAL_SCHEMA_VERSION}.`,
    );
  }


  /*
   * Fresh database:
   * build the complete v1 foundation.
   */
  if (currentVersion < 1) {
    console.log(
      '[local-db] applying schema v1',
    );

    await db.withTransactionAsync(
      async () => {
        await db.execAsync(
          SCHEMA_V1,
        );
      },
    );

    currentVersion = 1;
  }


  /*
   * Upgrade existing v1 databases.
   *
   * SCHEMA_V2 uses CREATE TABLE IF NOT EXISTS,
   * so it also safely repairs the sync tables
   * from early Gate 5 development databases.
   */
  if (currentVersion < 2) {
    console.log(
      '[local-db] applying schema v2',
    );

    await db.withTransactionAsync(
      async () => {
        await db.execAsync(
          SCHEMA_V2,
        );

        await db.execAsync(
          'PRAGMA user_version = 2;',
        );
      },
    );

    currentVersion = 2;
  }


  if (currentVersion < 3) {
    await db.withTransactionAsync(async () => { await db.execAsync(SCHEMA_V3); });
    currentVersion = 3;
  }

  if (currentVersion < 4) {
    await db.withTransactionAsync(async () => { await db.execAsync(CSV_SCHEMA); });
    currentVersion = 4;
  }

  if (
    currentVersion !==
    LOCAL_SCHEMA_VERSION
  ) {
    throw new Error(
      `Local database migration stopped at version ${currentVersion}; expected ${LOCAL_SCHEMA_VERSION}.`,
    );
  }


  /*
   * Never consider migration successful
   * unless every required table exists.
   */
  await assertSchema(
    db,
  );


  /*
   * If Android terminated the process while
   * a queued mutation was marked processing,
   * make it eligible for a future retry.
   */
  await db.runAsync(
    `
      UPDATE sync_queue

      SET
        status = 'pending',
        next_attempt_at = NULL,
        updated_at = ?

      WHERE
        status = 'processing'
    `,
    new Date().toISOString(),
  );


  console.log(
    '[local-db] schema ready',
    currentVersion,
  );
}
