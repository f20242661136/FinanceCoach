import {
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import {
  useSQLiteContext,
} from 'expo-sqlite';

import {
  localFinanceKeys,
} from './local-finance-query';

import {
  createOfflineAccount,
} from './offline-account-service';


export function
useCreateOfflineAccount() {
  const db =
    useSQLiteContext();

  const queryClient =
    useQueryClient();


  return useMutation({
    mutationKey: [
      'local-finance',
      'create-account',
    ],

    mutationFn:
      (
        input: Parameters<
          typeof createOfflineAccount
        >[1],
      ) =>
        createOfflineAccount(
          db,
          input,
        ),

    onSuccess:
      async () => {
        await queryClient
          .invalidateQueries({
            queryKey:
              localFinanceKeys.all,
          });
      },
  });
}