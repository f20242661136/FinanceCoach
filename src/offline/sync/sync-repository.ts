import type {
  SQLiteDatabase,
} from 'expo-sqlite';

import {
  withEncryptedWriteTransaction,
} from '../database/encrypted-writer';



import type {
  SyncCursors,
  SyncDelta,
} from './sync-schema';

const INITIAL_CURSOR = '0';

const REVISION_PATTERN =
  /^(0|[1-9]\d*)$/;


type CursorRow = {
  cursor_value: string;
};


function assertCursor(
  value: string,
): string {
  if (
    !REVISION_PATTERN.test(
      value,
    )
  ) {
    throw new Error(
      'Local sync cursor is invalid.',
    );
  }

  return value;
}


async function readCursor(
  db: SQLiteDatabase,
  userId: string,
  cursorName: string,
): Promise<string> {
  const row =
    await db.getFirstAsync<
      CursorRow
    >(
      `
        select cursor_value
        from sync_cursors
        where
          user_id = ?
          and cursor_name = ?
        limit 1
      `,
      userId,
      cursorName,
    );

  if (!row) {
    return INITIAL_CURSOR;
  }

  return assertCursor(
    row.cursor_value,
  );
}


export async function
getLocalSyncCursors(
  db: SQLiteDatabase,
  userId: string,
): Promise<SyncCursors> {
  const [
    accounts,
    categories,
    transactions,
  ] =
    await Promise.all([
      readCursor(
        db,
        userId,
        'accounts',
      ),

      readCursor(
        db,
        userId,
        'categories',
      ),

      readCursor(
        db,
        userId,
        'transactions',
      ),
    ]);

  return {
    accounts,
    categories,
    transactions,
  };
}


export async function
applySyncDelta(
  userId: string,
  delta: SyncDelta,
  completion?: (db: SQLiteDatabase) => Promise<void>,
  preserveCursors = false,
): Promise<void> {
  const now =
    new Date().toISOString();

  await withEncryptedWriteTransaction(
    async (tx) => {
      for (
        const account
        of delta.accounts
      ) {
        await tx.runAsync(
          `
            insert into local_accounts (
              user_id,
              id,
              name,
              account_type_code,
              balance_class,
              currency_code,
              currency_minor_unit,
              opening_balance_minor,
              current_balance_minor,
              status,
              sync_status,
              server_revision,
              server_updated_at,
              created_at,
              updated_at
            )
            values (
              ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, 'synced',
              ?, ?, ?, ?
            )

            on conflict (
              user_id,
              id
            )
            do update set
              name =
                excluded.name,

              account_type_code =
                excluded.account_type_code,

              balance_class =
                excluded.balance_class,

              currency_code =
                excluded.currency_code,

              currency_minor_unit =
                excluded.currency_minor_unit,

              opening_balance_minor =
                excluded.opening_balance_minor,

              current_balance_minor =
                excluded.current_balance_minor,

              status =
                excluded.status,

              sync_status =
                'synced',

              server_revision =
                excluded.server_revision,

              server_updated_at =
                excluded.server_updated_at,

              created_at =
                excluded.created_at,

              updated_at =
                excluded.updated_at
            WHERE CAST(excluded.server_revision AS INTEGER) >= CAST(local_accounts.server_revision AS INTEGER)
          `,
          userId,
          account.id,
          account.name,
          account.account_type_code,
          account.balance_class,
          account.currency_code,
          account.currency_minor_unit,
          account.opening_balance_minor,
          account.current_balance_minor,
          account.status,
          account.server_revision,
          account.updated_at,
          account.created_at,
          account.updated_at,
        );
      }


      for (
        const category
        of delta.categories
      ) {
        await tx.runAsync(
          `
            insert into local_categories (
              user_id,
              id,
              kind,
              default_name,
              is_system,
              sort_order,
              deleted_at,
              server_revision,
              server_updated_at
            )
            values (
              ?, ?, ?, ?, ?, ?, ?, ?, ?
            )

            on conflict (
              user_id,
              id
            )
            do update set
              kind =
                excluded.kind,

              default_name =
                excluded.default_name,

              is_system =
                excluded.is_system,

              sort_order =
                excluded.sort_order,

              deleted_at =
                excluded.deleted_at,

              server_revision =
                excluded.server_revision,

              server_updated_at =
                excluded.server_updated_at
          `,
          userId,
          category.id,
          category.kind,
          category.default_name,
          category.is_system
            ? 1
            : 0,
          category.sort_order,
          category.deleted_at,
          category.server_revision,
          category.updated_at,
        );
      }


      for (
        const transaction
        of delta.transactions
      ) {
        await tx.runAsync(
          `
            insert into local_transactions (
              user_id,
              id,
              account_id,
              category_id,
              type,
              amount_minor,
              currency_code,
              currency_minor_unit,
              transaction_date,
              merchant,
              description,
              notes,
              destination_account_id,
              destination_amount_minor,
              destination_currency_code,
              destination_currency_minor_unit,
              version,
              server_revision,
              sync_status,
              deleted_at,
              created_at,
              updated_at
            )
            values (
              ?, ?, ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?, ?, ?, ?,
              'synced', ?, ?, ?
            )

            on conflict (
              user_id,
              id
            )
            do update set
              account_id =
                excluded.account_id,

              category_id =
                excluded.category_id,

              type =
                excluded.type,

              amount_minor =
                excluded.amount_minor,

              currency_code =
                excluded.currency_code,

              currency_minor_unit =
                excluded.currency_minor_unit,

              transaction_date =
                excluded.transaction_date,

              merchant =
                excluded.merchant,

              description =
                excluded.description,

              notes =
                excluded.notes,

              destination_account_id =
                excluded.destination_account_id,

              destination_amount_minor =
                excluded.destination_amount_minor,

              destination_currency_code =
                excluded.destination_currency_code,

              destination_currency_minor_unit =
                excluded.destination_currency_minor_unit,

              version =
                excluded.version,

              server_revision =
                excluded.server_revision,

              sync_status =
                'synced',

              deleted_at =
                excluded.deleted_at,

              created_at =
                excluded.created_at,

              updated_at =
                excluded.updated_at
            WHERE CAST(excluded.server_revision AS INTEGER) >= CAST(local_transactions.server_revision AS INTEGER)
          `,
          userId,
          transaction.id,
          transaction.account_id,
          transaction.category_id,
          transaction.type,
          transaction.amount_minor,
          transaction.currency_code,
          transaction.currency_minor_unit,
          transaction.transaction_date,
          transaction.merchant,
          transaction.description,
          transaction.notes,
          transaction.destination_account_id,
          transaction.destination_amount_minor,
          transaction.destination_currency_code,
          transaction.destination_currency_minor_unit,
          transaction.version,
          transaction.server_revision,
          transaction.deleted_at,
          transaction.created_at,
          transaction.updated_at,
        );
      }


      for (
        const [
          cursorName,
          cursorValue,
        ]
        of Object.entries(
          preserveCursors ? {} : delta.next,
        )
      ) {
        await tx.runAsync(
          `
            insert into sync_cursors (
              user_id,
              cursor_name,
              cursor_value,
              updated_at
            )
            values (?, ?, ?, ?)

            on conflict (
              user_id,
              cursor_name
            )
            do update set
              cursor_value =
                excluded.cursor_value,

              updated_at =
                excluded.updated_at
          `,
          userId,
          cursorName,
          cursorValue,
          now,
        );
      }
      if (completion) await completion(tx);
    },
  );
}


type CountRow = {
  count: number;
};


async function countUserRows(
  db: SQLiteDatabase,
  table: string,
  userId: string,
): Promise<number> {
  /*
   * Table names come exclusively from
   * hardcoded calls below, never user input.
   */
  const row =
    await db.getFirstAsync<
      CountRow
    >(
      `
        select count(*) as count
        from ${table}
        where user_id = ?
      `,
      userId,
    );

  return row?.count ?? 0;
}


export async function
getLocalSyncDiagnostics(
  db: SQLiteDatabase,
  userId: string,
) {
  const [
    cursors,
    accounts,
    categories,
    transactions,
  ] =
    await Promise.all([
      getLocalSyncCursors(
        db,
        userId,
      ),

      countUserRows(
        db,
        'local_accounts',
        userId,
      ),

      countUserRows(
        db,
        'local_categories',
        userId,
      ),

      countUserRows(
        db,
        'local_transactions',
        userId,
      ),
    ]);

  return {
    cursors,

    counts: {
      accounts,
      categories,
      transactions,
    },
  };
}
