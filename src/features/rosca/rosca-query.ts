import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import * as Crypto from 'expo-crypto';

import {
  createRoscaGroup,
  getRoscaGroupDetail,
  getRoscaGroups,
  joinRoscaGroup,
  markRoscaContributionPaid,
  markRoscaPayoutPaid,
} from './rosca-service';

import type {
  RoscaFrequency,
} from './rosca-contract';


export const roscaKeys = {
  all:
    [
      'rosca',
    ] as const,

  groups:
    [
      'rosca',
      'groups',
    ] as const,

  detail:
    (
      groupId: string,
    ) =>
      [
        'rosca',
        'detail',
        groupId,
      ] as const,
};


export function
useRoscaGroups() {
  return useQuery({
    queryKey:
      roscaKeys.groups,

    queryFn:
      getRoscaGroups,

    retry:
      1,

    staleTime:
      30_000,
  });
}


export function
useRoscaGroupDetail(
  groupId: string,
) {
  return useQuery({
    queryKey:
      roscaKeys.detail(
        groupId,
      ),

    queryFn:
      () =>
        getRoscaGroupDetail(
          groupId,
        ),

    enabled:
      Boolean(
        groupId,
      ),

    retry:
      1,

    staleTime:
      30_000,
  });
}


export type CreateRoscaGroupMutationInput = {
  name: string;
  currencyCode: string;
  contributionAmountMinor: string;
  contributionFrequency: RoscaFrequency;
  cycleCount: number;
  startDate: string;
  creatorDisplayName: string;
};


export function
useCreateRoscaGroup() {
  const queryClient =
    useQueryClient();


  return useMutation({
    mutationKey: [
      'rosca',
      'create',
    ],

    mutationFn:
      (
        input:
          CreateRoscaGroupMutationInput,
      ) =>
        createRoscaGroup({
          groupId:
            Crypto.randomUUID(),

          memberId:
            Crypto.randomUUID(),

          ...input,
        }),

    onSuccess:
      async () => {
        await queryClient
          .invalidateQueries({
            queryKey:
              roscaKeys.all,
          });
      },
  });
}


export type JoinRoscaGroupMutationInput = {
  joinCode: string;
  displayName: string;
};


export function
useJoinRoscaGroup() {
  const queryClient =
    useQueryClient();


  return useMutation({
    mutationKey: [
      'rosca',
      'join',
    ],

    mutationFn:
      (
        input:
          JoinRoscaGroupMutationInput,
      ) =>
        joinRoscaGroup({
          memberId:
            Crypto.randomUUID(),

          ...input,
        }),

    onSuccess:
      async () => {
        await queryClient
          .invalidateQueries({
            queryKey:
              roscaKeys.all,
          });
      },
  });
}


export function
useMarkRoscaContributionPaid(
  groupId: string,
) {
  const queryClient =
    useQueryClient();


  return useMutation({
    mutationKey: [
      'rosca',
      'contribution-paid',
      groupId,
    ],

    mutationFn:
      markRoscaContributionPaid,

    onSuccess:
      async () => {
        await Promise.all([
          queryClient
            .invalidateQueries({
              queryKey:
                roscaKeys.groups,
            }),

          queryClient
            .invalidateQueries({
              queryKey:
                roscaKeys.detail(
                  groupId,
                ),
            }),
        ]);
      },
  });
}


export function
useMarkRoscaPayoutPaid(
  groupId: string,
) {
  const queryClient =
    useQueryClient();


  return useMutation({
    mutationKey: [
      'rosca',
      'payout-paid',
      groupId,
    ],

    mutationFn:
      markRoscaPayoutPaid,

    onSuccess:
      async () => {
        await Promise.all([
          queryClient
            .invalidateQueries({
              queryKey:
                roscaKeys.groups,
            }),

          queryClient
            .invalidateQueries({
              queryKey:
                roscaKeys.detail(
                  groupId,
                ),
            }),
        ]);
      },
  });
}