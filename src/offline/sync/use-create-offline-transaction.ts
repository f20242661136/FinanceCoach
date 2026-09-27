import {
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import {
  useSQLiteContext,
} from 'expo-sqlite';

import {
  createOfflineTransaction,
} from './offline-transaction-service';

import {
  localFinanceKeys,
} from './local-finance-query';


export function
useCreateOfflineTransaction() {
  const db =
    useSQLiteContext();

  const queryClient =
    useQueryClient();


  return useMutation({
    mutationKey: [
      'local-finance',
      'create-transaction',
    ],

    mutationFn:
      (
        input: Parameters<
          typeof createOfflineTransaction
        >[1],
      ) =>
        createOfflineTransaction(
          db,
          input,
        ),

    onSuccess:
      async () => {
        /*
         * Immediately re-read SQLite.
         * No network is required for this.
         */
        await queryClient
          .invalidateQueries({
            queryKey:
              localFinanceKeys.all,
          });
      },
  });
}