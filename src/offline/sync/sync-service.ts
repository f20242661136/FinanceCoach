import type {
  SQLiteDatabase,
} from 'expo-sqlite';

import {
  supabase,
} from '../../lib/supabase';

import {
  syncDeltaSchema,
} from './sync-schema';

import {
  applySyncDelta,
  getLocalSyncCursors,
} from './sync-repository';


const PAGE_SIZE = 250;

const MAX_PAGES_PER_RUN = 1000;


export type SyncRunResult = {
  pages: number;

  received: {
    accounts: number;
    categories: number;
    transactions: number;
  };
};


const syncsInFlight =
  new Map<
    string,
    Promise<SyncRunResult>
  >();


function hasAnyMore(
  value: {
    accounts: boolean;
    categories: boolean;
    transactions: boolean;
  },
): boolean {
  return (
    value.accounts
    || value.categories
    || value.transactions
  );
}


async function performSync(
  db: SQLiteDatabase,
  userId: string,
): Promise<SyncRunResult> {
  let cursors =
    await getLocalSyncCursors(
      db,
      userId,
    );

  const result: SyncRunResult = {
    pages: 0,

    received: {
      accounts: 0,
      categories: 0,
      transactions: 0,
    },
  };


  for (
    let page = 0;
    page < MAX_PAGES_PER_RUN;
    page += 1
  ) {
    const {
      data,
      error,
    } =
      await supabase.rpc(
        'get_sync_delta',
        {
          p_account_after:
            cursors.accounts,

          p_category_after:
            cursors.categories,

          p_transaction_after:
            cursors.transactions,

          p_limit:
            PAGE_SIZE,
        },
      );

    if (error) {
      throw new Error(
        `Sync request failed: ${error.message}`,
      );
    }


    const parsed =
      syncDeltaSchema.safeParse(
        data,
      );

    if (!parsed.success) {
      console.error(
        '[sync] Invalid server payload',
        parsed.error.issues,
      );

      throw new Error(
        'The server returned an invalid sync payload.',
      );
    }


    const delta =
      parsed.data;


    if (
      delta.has_more.accounts
      && delta.next.accounts
        === cursors.accounts
    ) {
      throw new Error(
        'Account sync cursor did not advance.',
      );
    }

    if (
      delta.has_more.categories
      && delta.next.categories
        === cursors.categories
    ) {
      throw new Error(
        'Category sync cursor did not advance.',
      );
    }

    if (
      delta.has_more.transactions
      && delta.next.transactions
        === cursors.transactions
    ) {
      throw new Error(
        'Transaction sync cursor did not advance.',
      );
    }


    await applySyncDelta(
      db,
      userId,
      delta,
    );


    result.pages += 1;

    result.received.accounts +=
      delta.accounts.length;

    result.received.categories +=
      delta.categories.length;

    result.received.transactions +=
      delta.transactions.length;


    cursors =
      delta.next;


    if (
      !hasAnyMore(
        delta.has_more,
      )
    ) {
      return result;
    }
  }


  throw new Error(
    'Sync exceeded the maximum page limit.',
  );
}


export function syncFromServer(
  db: SQLiteDatabase,
  userId: string,
): Promise<SyncRunResult> {
  const existing =
    syncsInFlight.get(
      userId,
    );

  if (existing) {
    return existing;
  }


  const run =
    performSync(
      db,
      userId,
    )
      .finally(() => {
        syncsInFlight.delete(
          userId,
        );
      });


  syncsInFlight.set(
    userId,
    run,
  );

  return run;
}