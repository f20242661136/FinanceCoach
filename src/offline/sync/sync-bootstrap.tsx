import {
  useEffect,
} from 'react';

import {
  useQueryClient,
} from '@tanstack/react-query';

import {
  useSQLiteContext,
} from 'expo-sqlite';

import {
  refreshLocalFinance,
} from './sync-refresh';


function errorMessage(
  error: unknown,
): string {
  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return String(error);
}


export function SyncBootstrap() {
  const db =
    useSQLiteContext();

  const queryClient =
    useQueryClient();


  useEffect(() => {
    let cancelled = false;


    async function run() {
      try {
        const result =
          await refreshLocalFinance(
            db,
            queryClient,
          );

        if (cancelled) {
          return;
        }

        console.log(
          '[sync] bootstrap complete',
          {
            pages:
              result.pages,

            received:
              result.received,
          },
        );
      } catch (error) {
        /*
         * Local reads remain usable.
         * Failed network refresh must
         * never block the finance UI.
         */
        if (!cancelled) {
          console.warn(
            '[sync] bootstrap deferred:',
            errorMessage(
              error,
            ),
          );
        }
      }
    }


    void run();


    return () => {
      cancelled = true;
    };
  }, [
    db,
    queryClient,
  ]);


  return null;
}