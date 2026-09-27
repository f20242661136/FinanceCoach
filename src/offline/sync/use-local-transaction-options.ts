import {
  useQuery,
} from '@tanstack/react-query';

import {
  useSQLiteContext,
} from 'expo-sqlite';

import {
  supabase,
} from '../../lib/supabase';


export type LocalTransactionAccount = {
  id: string;
  name: string;
  currency_code: string;
  currency_minor_unit: number;
};


export type LocalTransactionCategory = {
  id: string;
  kind: string;
  default_name: string;
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


export function
useLocalTransactionOptions(
  type:
    | 'income'
    | 'expense',
) {
  const db =
    useSQLiteContext();

  return useQuery({
    queryKey: [
      'local-finance',
      'transaction-options',
      type,
    ],

    queryFn:
      async () => {
        const userId =
          await requireUserId();

        const accounts =
          await db.getAllAsync<
            LocalTransactionAccount
          >(
            `
              SELECT
                id,
                name,
                currency_code,
                currency_minor_unit

              FROM local_accounts

              WHERE
                user_id = ?
                AND status = 'active'

              ORDER BY
                name COLLATE NOCASE
            `,
            userId,
          );


        const categories =
          await db.getAllAsync<
            LocalTransactionCategory
          >(
            `
              SELECT
                id,
                kind,
                default_name

              FROM local_categories

              WHERE
                user_id = ?
                AND deleted_at IS NULL
                AND (
                  kind = ?
                  OR kind = 'both'
                )

              ORDER BY
                sort_order,
                default_name COLLATE NOCASE
            `,
            userId,
            type,
          );


        return {
          accounts,
          categories,
        };
      },

    staleTime:
      Infinity,

    retry:
      false,
  });
}