import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  useSQLiteContext,
  type SQLiteDatabase,
} from 'expo-sqlite';

import {
  supabase,
} from '../../lib/supabase';

import {
  withEncryptedWriteTransaction,
} from '../database/encrypted-writer';

import {
  localFinanceKeys,
} from './local-finance-query';

import {
  refreshLocalFinance,
} from './sync-refresh';


export type QueueHealth = {
  pending: number;
  processing: number;
  failed: number;
  latestError: string | null;
};


type CountRow = {
  pending: number;
  processing: number;
  failed: number;
};


type ErrorRow = {
  last_error: string | null;
};


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
      error.message,
    );
  }

  if (!session?.user.id) {
    throw new Error(
      'Authentication required.',
    );
  }

  return session.user.id;
}


export async function
getQueueHealth(
  db: SQLiteDatabase,
  userId: string,
): Promise<QueueHealth> {
  const counts =
    await db.getFirstAsync<
      CountRow
    >(
      `
        SELECT
          SUM(
            CASE
              WHEN status = 'pending'
              THEN 1
              ELSE 0
            END
          ) AS pending,

          SUM(
            CASE
              WHEN status = 'processing'
              THEN 1
              ELSE 0
            END
          ) AS processing,

          SUM(
            CASE
              WHEN status = 'failed'
              THEN 1
              ELSE 0
            END
          ) AS failed

        FROM sync_queue

        WHERE user_id = ?
      `,
      userId,
    );


  const latestFailure =
    await db.getFirstAsync<
      ErrorRow
    >(
      `
        SELECT
          last_error

        FROM sync_queue

        WHERE
          user_id = ?
          AND status = 'failed'

        ORDER BY
          updated_at DESC

        LIMIT 1
      `,
      userId,
    );


  return {
    pending:
      counts?.pending ?? 0,

    processing:
      counts?.processing ?? 0,

    failed:
      counts?.failed ?? 0,

    latestError:
      latestFailure
        ?.last_error
        ?? null,
  };
}


async function
resetFailedMutations(
  userId: string,
): Promise<void> {
  await withEncryptedWriteTransaction(
    async (db) => {
      await db.runAsync(
        `
          UPDATE sync_queue

          SET
            status = 'pending',
            next_attempt_at = NULL,
            last_error = NULL,
            updated_at = ?

          WHERE
            user_id = ?
            AND status = 'failed'
        `,
        new Date().toISOString(),
        userId,
      );
    },
  );
}


export function
useQueueHealth() {
  const db =
    useSQLiteContext();

  return useQuery({
    queryKey: [
      'local-finance',
      'queue-health',
    ],

    queryFn:
      async () => {
        const userId =
          await requireUserId();

        return getQueueHealth(
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


export function
useRetryQueuedMutations() {
  const db =
    useSQLiteContext();

  const queryClient =
    useQueryClient();


  return useMutation({
    mutationKey: [
      'local-finance',
      'retry-queue',
    ],

    mutationFn:
      async () => {
        const userId =
          await requireUserId();

        await resetFailedMutations(
          userId,
        );

        return refreshLocalFinance(
          db,
          queryClient,
        );
      },

    onSettled:
      async () => {
        /*
         * Refresh queue UI even when
         * the server is still offline.
         */
        await queryClient
          .invalidateQueries({
            queryKey: [
              'local-finance',
              'queue-health',
            ],
          });

        await queryClient
          .invalidateQueries({
            queryKey:
              localFinanceKeys.all,
          });
      },
  });
}