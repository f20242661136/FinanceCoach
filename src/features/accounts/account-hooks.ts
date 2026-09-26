import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  createAccount,
  listAccountSetupOptions,
  listAccountSummaries,
  type CreateAccountInput,
} from './account-service';

export const accountQueryKeys = {
  root: ['finance', 'accounts'] as const,
  list: ['finance', 'accounts', 'list'] as const,
  setup: ['finance', 'accounts', 'setup'] as const,
};

export function useAccountSummaries() {
  return useQuery({
    queryKey: accountQueryKeys.list,
    queryFn: listAccountSummaries,
  });
}

export function useAccountSetupOptions() {
  return useQuery({
    queryKey: accountQueryKeys.setup,
    queryFn: listAccountSetupOptions,
    staleTime: 10 * 60_000,
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateAccountInput) =>
      createAccount(input),

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: accountQueryKeys.root,
        }),

        queryClient.invalidateQueries({
          queryKey: ['finance', 'activity'],
        }),
      ]);
    },
  });
}