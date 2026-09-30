import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';

import {
  useSQLiteContext,
  type SQLiteDatabase,
} from 'expo-sqlite';

import {
  supabase,
} from '../../lib/supabase';

import {
  localFinanceKeys,
} from './local-finance-query';

import {
  replayQueuedMutations,
} from './mutation-replay';

import {
  refreshFinanceReferenceData,
} from './reference-data';

import {
  syncFromServer,
  type SyncRunResult,
} from './sync-service';


const refreshesInFlight =
  new Map<
    string,
    Promise<SyncRunResult>
  >();


async function requireUserId():
  Promise<string> {
  const {
    data: {
      session,
    },
    error,
  } =
    await supabase.auth
      .getSession();

  if (error) {
    throw new Error(
      `Could not read session: ${error.message}`,
    );
  }

  if (!session?.user.id) {
    throw new Error(
      'Authentication required.',
    );
  }

  return session.user.id;
}


async function performRefresh(
  db: SQLiteDatabase,
  queryClient: QueryClient,
  userId: string,
): Promise<SyncRunResult> {
  try {
  await replayQueuedMutations(
    db,
    userId,
  );

  const result =
    await syncFromServer(
      db,
      userId,
    );

  /*
   * Reference data is small and global.
   * A reference refresh failure must not
   * invalidate an otherwise successful
   * ledger sync.
   */
  try {
    await refreshFinanceReferenceData();
  } catch (error) {
    console.warn(
      '[sync] reference refresh deferred',
      error,
    );
  }

  return result;
  } finally {
  await queryClient
    .invalidateQueries({
      queryKey:
        localFinanceKeys.all,
    });

  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: ['dashboard'],
    }),

    queryClient.invalidateQueries({
      queryKey: ['budgets'],
    }),

    queryClient.invalidateQueries({
      queryKey: ['savings-goals'],
    }),
  ]);
  }

}


export async function
refreshLocalFinance(
  db: SQLiteDatabase,
  queryClient: QueryClient,
): Promise<SyncRunResult> {
  const userId =
    await requireUserId();

  const existing =
    refreshesInFlight.get(
      userId,
    );

  if (existing) {
    return existing;
  }

  const run =
    performRefresh(
      db,
      queryClient,
      userId,
    )
      .finally(() => {
        refreshesInFlight.delete(
          userId,
        );
      });

  refreshesInFlight.set(
    userId,
    run,
  );

  return run;
}


export function
useRefreshLocalFinance() {
  const db =
    useSQLiteContext();

  const queryClient =
    useQueryClient();

  return useMutation({
    mutationKey: [
      'local-finance',
      'refresh',
    ],

    mutationFn: () =>
      refreshLocalFinance(
        db,
        queryClient,
      ),
  });
}
