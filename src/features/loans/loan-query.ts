import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import * as Crypto from 'expo-crypto';

import {
  addLoanPayment,
  createLoan,
  getLoanPaymentHistory,
  getLoanStatus,
} from './loan-service';

import type {
  LoanDirection,
  LoanPaymentFrequency,
} from './loan-contract';


export const loanKeys = {
  all:
    [
      'loans',
    ] as const,

  status:
    [
      'loans',
      'status',
    ] as const,

  history:
    (
      loanId: string,
    ) =>
      [
        'loans',
        'history',
        loanId,
      ] as const,
};


export function
useLoanStatus() {
  return useQuery({
    queryKey:
      loanKeys.status,

    queryFn:
      getLoanStatus,

    retry:
      1,

    staleTime:
      30_000,
  });
}


export function
useLoanPaymentHistory(
  loanId: string,
) {
  return useQuery({
    queryKey:
      loanKeys.history(
        loanId,
      ),

    queryFn:
      () =>
        getLoanPaymentHistory(
          loanId,
        ),

    enabled:
      Boolean(
        loanId,
      ),

    retry:
      1,

    staleTime:
      30_000,
  });
}


export type CreateLoanMutationInput = {
  direction:
    LoanDirection;

  counterpartyName: string;

  currencyCode: string;

  principalMinor: string;

  startDate: string;

  dueDate:
    string | null;

  interestRateBasisPoints:
    number | null;

  paymentFrequency:
    LoanPaymentFrequency;

  scheduledPaymentMinor:
    string | null;

  notes:
    string | null;
};


export function
useCreateLoan() {
  const queryClient =
    useQueryClient();


  return useMutation({
    mutationKey: [
      'loans',
      'create',
    ],

    mutationFn:
      (
        input:
          CreateLoanMutationInput,
      ) =>
        createLoan({
          loanId:
            Crypto.randomUUID(),

          ...input,
        }),

    onSuccess:
      async () => {
        await queryClient
          .invalidateQueries({
            queryKey:
              loanKeys.all,
          });
      },
  });
}


export type AddLoanPaymentMutationInput = {
  loanId: string;

  amountMinor: string;

  paymentDate: string;

  note:
    string | null;
};


export function
useAddLoanPayment() {
  const queryClient =
    useQueryClient();


  return useMutation({
    mutationKey: [
      'loans',
      'payment',
    ],

    mutationFn:
      (
        input:
          AddLoanPaymentMutationInput,
      ) =>
        addLoanPayment({
          paymentId:
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
                loanKeys.status,
            }),

          queryClient
            .invalidateQueries({
              queryKey:
                loanKeys.history(
                  variables.loanId,
                ),
            }),
        ]);
      },
  });
}