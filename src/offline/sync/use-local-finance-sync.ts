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
          await refreshMutation
            .mutateAsync();

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
        refreshMutation
          .mutateAsync,
      ],
    );


  useFocusEffect(
    useCallback(() => {
      let active =
        true;

      async function run() {
        try {
          await refreshMutation
            .mutateAsync();

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
      refreshMutation
        .mutateAsync,
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