import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback } from 'react';
import { useAuth } from '@/features/auth/auth-context';
import { readCorrectionState } from './correction-service';

export function useCorrectionState(id: string) {
  const db = useSQLiteContext();
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const queryClient = useQueryClient();
  const state = useQuery({ queryKey: ['local-finance', 'correction', userId, id], enabled: Boolean(userId && id),
    networkMode: 'always', retry: false, staleTime: Infinity, queryFn: () => readCorrectionState(db,userId,id) });
  const invalidate = useCallback(() => queryClient.invalidateQueries({ queryKey: ['local-finance'] }), [queryClient]);
  return { state, db, userId, invalidate };
}
