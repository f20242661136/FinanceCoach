import type {
  SQLiteDatabase,
} from 'expo-sqlite';


export type LocalAccountSummary = {
  id: string;
  name: string;
  account_type_code: string;
  balance_class: string;
  currency_code: string;
  currency_minor_unit: number;
  opening_balance_minor: string;
  current_balance_minor: string;
  status: string;
  server_revision: string;
  sync_status: string;
  server_updated_at: string | null;
};


export type LocalActivityItem = {
  id: string;
  account_id: string;
  account_name: string;

  category_id: string | null;
  category_name: string | null;

  type: string;

  amount_minor: string;
  currency_code: string;
  currency_minor_unit: number;

  transaction_date: string;

  merchant: string | null;
  description: string | null;
  notes: string | null;

  destination_account_id: string | null;
  destination_account_name: string | null;

  destination_amount_minor: string | null;
  destination_currency_code: string | null;
  destination_currency_minor_unit: number | null;

  version: number;
  server_revision: string;
  sync_status: string;

  created_at: string;
  updated_at: string;
};


type LastSyncRow = {
  last_sync_at: string | null;
};


export async function
listLocalAccountSummaries(
  db: SQLiteDatabase,
  userId: string,
): Promise<LocalAccountSummary[]> {
  return db.getAllAsync<
    LocalAccountSummary
  >(
    `
      select
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
        server_updated_at

      from local_accounts

      where user_id = ?

      order by
        case
          when status = 'active'
          then 0
          else 1
        end,
        name collate nocase,
        id
    `,
    userId,
  );
}


export async function
listLocalRecentActivity(
  db: SQLiteDatabase,
  userId: string,
  limit = 50,
): Promise<LocalActivityItem[]> {
  const safeLimit =
    Math.max(
      1,
      Math.min(
        Math.trunc(limit),
        100,
      ),
    );

  return db.getAllAsync<
    LocalActivityItem
  >(
    `
      select
        t.id,
        t.account_id,

        source.name
          as account_name,

        t.category_id,

        category.default_name
          as category_name,

        t.type,
        t.amount_minor,
        t.currency_code,
        t.currency_minor_unit,
        t.transaction_date,
        t.merchant,
        t.description,
        t.notes,

        t.destination_account_id,

        destination.name
          as destination_account_name,

        t.destination_amount_minor,
        t.destination_currency_code,
        t.destination_currency_minor_unit,

        t.version,
        t.server_revision,
        t.sync_status,
        t.created_at,
        t.updated_at

      from local_transactions t

      join local_accounts source
        on source.user_id =
          t.user_id

        and source.id =
          t.account_id

      left join local_categories category
        on category.user_id =
          t.user_id

        and category.id =
          t.category_id

      left join local_accounts destination
        on destination.user_id =
          t.user_id

        and destination.id =
          t.destination_account_id

      where
        t.user_id = ?

        and t.deleted_at
          is null

      order by
        t.transaction_date desc,
        t.created_at desc,
        t.id desc

      limit ?
    `,
    userId,
    safeLimit,
  );
}


export async function
getLastLocalSyncAt(
  db: SQLiteDatabase,
  userId: string,
): Promise<string | null> {
  const row =
    await db.getFirstAsync<
      LastSyncRow
    >(
      `
        select
          max(updated_at)
            as last_sync_at

        from sync_cursors

        where user_id = ?
      `,
      userId,
    );

  return row?.last_sync_at
    ?? null;
}