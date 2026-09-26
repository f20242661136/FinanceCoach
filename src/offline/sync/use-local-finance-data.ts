import {
  useLastLocalSyncAt,
  useLocalAccountSummaries,
  useLocalRecentActivity,
} from './local-finance-query';

import {
  useLocalFinanceSync,
} from './use-local-finance-sync';


export function useLocalFinanceData(
  activityLimit = 50,
) {
  const accountsQuery =
    useLocalAccountSummaries();

  const activityQuery =
    useLocalRecentActivity(
      activityLimit,
    );

  const lastSyncQuery =
    useLastLocalSyncAt();

  const sync =
    useLocalFinanceSync();


  const isInitialLoading =
    (
      accountsQuery.isPending
      && !accountsQuery.data
    )
    ||
    (
      activityQuery.isPending
      && !activityQuery.data
    );


  const localError =
    accountsQuery.error
    ?? activityQuery.error
    ?? lastSyncQuery.error
    ?? null;


  return {
    accounts:
      accountsQuery.data ?? [],

    activity:
      activityQuery.data ?? [],

    lastSyncAt:
      lastSyncQuery.data ?? null,

    isInitialLoading,

    isRefreshing:
      sync.isRefreshing,

    isShowingSavedData:
      sync.isShowingSavedData,

    refreshError:
      sync.refreshError,

    localError,

    refresh:
      sync.refresh,
  };
}