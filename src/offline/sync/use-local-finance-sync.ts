import {
  useCallback,
  useState,
} from 'react';

import {
  useFocusEffect,
} from 'expo-router';

import {
  useRefreshLocalFinance,
} from './sync-refresh';


function getErrorMessage(
  error: unknown,
): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}


export function
useLocalFinanceSync() {
  const refreshMutation =
    useRefreshLocalFinance();

  const refreshLocalFinance =
    refreshMutation.mutateAsync;

  const [
    refreshError,
    setRefreshError,
  ] =
    useState<string | null>(
      null,
    );


  const refresh =
    useCallback(
      async (): Promise<boolean> => {
        try {
          await refreshLocalFinance();

          setRefreshError(
            null,
          );

          return true;
        } catch (error) {
          setRefreshError(
            getErrorMessage(
              error,
            ),
          );

          return false;
        }
      },
      [
        refreshLocalFinance,
      ],
    );


  useFocusEffect(
    useCallback(() => {
      let active =
        true;

      async function run() {
        try {
          await refreshLocalFinance();

          if (active) {
            setRefreshError(
              null,
            );
          }
        } catch (error) {
          if (active) {
            setRefreshError(
              getErrorMessage(
                error,
              ),
            );
          }
        }
      }

      void run();

      return () => {
        active = false;
      };
    }, [
      refreshLocalFinance,
    ]),
  );


  return {
    refresh,

    isRefreshing:
      refreshMutation.isPending,

    refreshError,

    isShowingSavedData:
      refreshError !== null,
  };
}