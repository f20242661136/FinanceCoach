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
  syncFromServer,
  type SyncRunResult,
} from './sync-service';


async function
requireUserId():
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

  const userId =
    session?.user.id;

  if (!userId) {
    throw new Error(
      'Authentication required.',
    );
  }

  return userId;
}


export async function
refreshLocalFinance(
  db: SQLiteDatabase,
  queryClient: QueryClient,
): Promise<SyncRunResult> {
  const userId =
    await requireUserId();

  const result =
    await syncFromServer(
      db,
      userId,
    );

  /*
   * SQLite has committed before this
   * runs, so active screens re-read the
   * newly hydrated local state.
   */
  await queryClient.invalidateQueries({
    queryKey:
      localFinanceKeys.all,
  });

  return result;
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