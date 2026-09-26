import {
  useQuery,
} from '@tanstack/react-query';

import {
  useSQLiteContext,
} from 'expo-sqlite';

import {
  supabase,
} from '../../lib/supabase';

import {
  getLastLocalSyncAt,
  listLocalAccountSummaries,
  listLocalRecentActivity,
} from './local-finance-repository';


export const localFinanceKeys = {
  all: [
    'local-finance',
  ] as const,

  accounts: [
    'local-finance',
    'accounts',
  ] as const,

  activity: (
    limit: number,
  ) => [
    'local-finance',
    'activity',
    limit,
  ] as const,

  lastSync: [
    'local-finance',
    'last-sync',
  ] as const,
};


async function
requireCurrentUserId():
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


export function
useLocalAccountSummaries() {
  const db =
    useSQLiteContext();

  return useQuery({
    queryKey:
      localFinanceKeys.accounts,

    queryFn:
      async () => {
        const userId =
          await requireCurrentUserId();

        return listLocalAccountSummaries(
          db,
          userId,
        );
      },

    /*
     * SQLite is our local read model.
     * Server synchronization explicitly
     * invalidates this query.
     */
    staleTime:
      Infinity,

    retry:
      false,
  });
}


export function
useLocalRecentActivity(
  limit = 50,
) {
  const db =
    useSQLiteContext();

  return useQuery({
    queryKey:
      localFinanceKeys.activity(
        limit,
      ),

    queryFn:
      async () => {
        const userId =
          await requireCurrentUserId();

        return listLocalRecentActivity(
          db,
          userId,
          limit,
        );
      },

    staleTime:
      Infinity,

    retry:
      false,
  });
}


export function
useLastLocalSyncAt() {
  const db =
    useSQLiteContext();

  return useQuery({
    queryKey:
      localFinanceKeys.lastSync,

    queryFn:
      async () => {
        const userId =
          await requireCurrentUserId();

        return getLastLocalSyncAt(
          db,
          userId,
        );
      },

    staleTime:
      Infinity,

    retry:
      false,
  });
}