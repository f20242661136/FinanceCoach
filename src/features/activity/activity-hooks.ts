import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { useAuth } from '@/features/auth/auth-context';
import { filterError, type ActivityCursor, type ActivityFilters } from './activity-model';
import { readActivityDetail, readActivityOptions, readActivityPage, readActivityQueue, readActivitySummary } from './activity-repository';

const defaults = { staleTime: Infinity, retry: false, networkMode: 'always' as const };

export function useActivityHistory(filters: ActivityFilters) {
  const db = useSQLiteContext();
  const { session } = useAuth();
  const userId = session?.user.id;
  const enabled = Boolean(userId) && !filterError(filters);
  const history = useInfiniteQuery({
    ...defaults,
    queryKey: ['local-finance', 'activity-history', userId, filters],
    enabled,
    initialPageParam: null as ActivityCursor | null,
    queryFn: ({ pageParam }) => readActivityPage(db, userId!, filters, pageParam),
    getNextPageParam: page => page.next,
  });
  const summary = useQuery({
    ...defaults,
    queryKey: ['local-finance', 'activity-summary', userId, filters],
    enabled,
    queryFn: ({ signal }) => readActivitySummary(db, userId!, filters, signal),
  });
  const options = useQuery({
    ...defaults,
    queryKey: ['local-finance', 'activity-options', userId],
    enabled: Boolean(userId),
    queryFn: () => readActivityOptions(db, userId!),
  });
  return { history, summary, options };
}

export function useActivityDetail(id: string) {
  const db = useSQLiteContext();
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    ...defaults,
    queryKey: ['local-finance', 'activity-detail', userId, id],
    enabled: Boolean(userId && id),
    queryFn: () => readActivityDetail(db, userId!, id),
  });
}

export function useActivityQueue() {
  const db = useSQLiteContext();
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    ...defaults,
    queryKey: ['local-finance', 'activity-queue', userId],
    enabled: Boolean(userId),
    queryFn: () => readActivityQueue(db, userId!),
  });
}
