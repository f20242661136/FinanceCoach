import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { useAuth } from '@/features/auth/auth-context';
import type { EntryHistory } from './entry-intelligence';

export function useEntryHistory() {
  const db = useSQLiteContext();
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ['local-finance', 'entry-history', userId],
    enabled: Boolean(userId),
    staleTime: Infinity,
    retry: false,
    queryFn: () => db.getAllAsync<EntryHistory>(`
      SELECT id, account_id, category_id, type, amount_minor,
        currency_code, currency_minor_unit, merchant, created_at
      FROM local_transactions
      WHERE user_id = ? AND deleted_at IS NULL AND type IN ('expense', 'income')
      ORDER BY created_at DESC, id DESC
      LIMIT 100
    `, userId!),
  });
}
