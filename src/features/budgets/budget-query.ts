import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import * as Crypto from 'expo-crypto';

import {
  createBudget,
  getBudgetStatus,
} from './budget-service';

import type {
  BudgetPeriodType,
} from './budget-contract';

export const budgetKeys = {
  all:
    [
      'budgets',
    ] as const,

  status:
    (asOf?: string) =>
      [
        'budgets',
        'status',
        asOf ?? 'current',
      ] as const,
};

export function
useBudgetStatus(
  asOf?: string,
) {
  return useQuery({
    queryKey:
      budgetKeys.status(
        asOf,
      ),

    queryFn:
      () =>
        getBudgetStatus(
          asOf,
        ),

    retry:
      1,

    staleTime:
      30_000,
  });
}

export type CreateBudgetMutationInput = {
  name: string;
  currencyCode: string;

  periodType:
    BudgetPeriodType;

  periodStart: string;
  periodEnd: string;
  limitMinor: string;

  categoryId:
    string | null;
};

export function
useCreateBudget() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationKey: [
      'budgets',
      'create',
    ],

    mutationFn:
      (
        input:
          CreateBudgetMutationInput,
      ) =>
        createBudget({
          budgetId:
            Crypto.randomUUID(),

          ...input,
        }),

    onSuccess:
      async () => {
        await queryClient
          .invalidateQueries({
            queryKey:
              budgetKeys.all,
          });
      },
  });
}