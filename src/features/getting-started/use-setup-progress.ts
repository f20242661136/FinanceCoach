import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { useAuth } from '@/features/auth/auth-context';
import { SETUP_PROGRESS_SQL, type SetupFacts } from './setup-progress';

export function useSetupProgress() {
  const db = useSQLiteContext();
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ['local-finance', 'setup-progress', userId],
    enabled: Boolean(userId),
    staleTime: Infinity,
    retry: false,
    queryFn: async (): Promise<SetupFacts> => {
      const row = await db.getFirstAsync<{ has_active_account: number; has_transaction: number }>(SETUP_PROGRESS_SQL, userId!, userId!);
      if (!row) throw new Error('Setup progress is unavailable.');
      return { hasActiveAccount: row.has_active_account === 1, hasTransaction: row.has_transaction === 1 };
    },
  });
}
