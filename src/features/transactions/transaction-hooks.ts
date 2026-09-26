import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { accountQueryKeys } from '@/features/accounts/account-hooks';

import {
  createTransaction,
  listCategories,
  listRecentActivity,
  type CreateTransactionInput,
  type TransactionKind,
} from './transaction-service';

export const transactionQueryKeys = {
  activityRoot: ['finance', 'activity'] as const,

  activity: (limit: number) =>
    ['finance', 'activity', limit] as const,

  categories: (kind: TransactionKind) =>
    ['finance', 'categories', kind] as const,
};

export function useRecentActivity(
  limit = 30,
) {
  return useQuery({
    queryKey:
      transactionQueryKeys.activity(limit),

    queryFn: () =>
      listRecentActivity(limit),
  });
}

export function useCategories(
  kind: TransactionKind,
) {
  return useQuery({
    queryKey:
      transactionQueryKeys.categories(kind),

    queryFn: () =>
      listCategories(kind),

    staleTime: 5 * 60_000,
  });
}

export function useCreateTransaction() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn: (
      input: CreateTransactionInput,
    ) => createTransaction(input),

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey:
            accountQueryKeys.root,
        }),

        queryClient.invalidateQueries({
          queryKey:
            transactionQueryKeys
              .activityRoot,
        }),
      ]);
    },
  });
}