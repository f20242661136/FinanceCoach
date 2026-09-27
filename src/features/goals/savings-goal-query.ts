import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import * as Crypto from 'expo-crypto';

import {
  addSavingsContribution,
  createSavingsGoal,
  getSavingsContributionHistory,
  getSavingsGoalStatus,
} from './savings-goal-service';

import type {
  SavingsGoalType,
} from './savings-goal-contract';


export const savingsGoalKeys = {
  all:
    [
      'savings-goals',
    ] as const,

  status:
    [
      'savings-goals',
      'status',
    ] as const,

  history:
    (
      goalId: string,
    ) =>
      [
        'savings-goals',
        'history',
        goalId,
      ] as const,
};


export function
useSavingsGoalStatus() {
  return useQuery({
    queryKey:
      savingsGoalKeys.status,

    queryFn:
      getSavingsGoalStatus,

    retry:
      1,

    staleTime:
      30_000,
  });
}


export function
useSavingsContributionHistory(
  goalId: string,
) {
  return useQuery({
    queryKey:
      savingsGoalKeys
        .history(
          goalId,
        ),

    queryFn:
      () =>
        getSavingsContributionHistory(
          goalId,
        ),

    enabled:
      Boolean(
        goalId,
      ),

    retry:
      1,

    staleTime:
      30_000,
  });
}


export type CreateSavingsGoalMutationInput = {
  name: string;

  goalType:
    SavingsGoalType;

  currencyCode: string;

  targetAmountMinor: string;

  targetDate:
    string | null;

  notes:
    string | null;
};


export function
useCreateSavingsGoal() {
  const queryClient =
    useQueryClient();


  return useMutation({
    mutationKey: [
      'savings-goals',
      'create',
    ],

    mutationFn:
      (
        input:
          CreateSavingsGoalMutationInput,
      ) =>
        createSavingsGoal({
          goalId:
            Crypto.randomUUID(),

          ...input,
        }),

    onSuccess:
      async () => {
        await queryClient
          .invalidateQueries({
            queryKey:
              savingsGoalKeys.all,
          });
      },
  });
}


export type AddSavingsContributionMutationInput = {
  goalId: string;

  amountMinor: string;

  contributionDate: string;

  note:
    string | null;
};


export function
useAddSavingsContribution() {
  const queryClient =
    useQueryClient();


  return useMutation({
    mutationKey: [
      'savings-goals',
      'contribute',
    ],

    mutationFn:
      (
        input:
          AddSavingsContributionMutationInput,
      ) =>
        addSavingsContribution({
          contributionId:
            Crypto.randomUUID(),

          ...input,
        }),

    onSuccess:
      async (
        _result,
        variables,
      ) => {
        await Promise.all([
          queryClient
            .invalidateQueries({
              queryKey:
                savingsGoalKeys.status,
            }),

          queryClient
            .invalidateQueries({
              queryKey:
                savingsGoalKeys
                  .history(
                    variables.goalId,
                  ),
            }),
        ]);
      },
  });
}