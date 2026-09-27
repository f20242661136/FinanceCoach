import {
  useCallback,
  useEffect,
  useRef,
} from 'react';

import {
  AppState,
} from 'react-native';

import {
  useQueryClient,
} from '@tanstack/react-query';

import {
  useSQLiteContext,
} from 'expo-sqlite';

import {
  refreshLocalFinance,
} from './sync-refresh';


const MIN_RESUME_INTERVAL_MS =
  3000;


function errorMessage(
  error: unknown,
): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}


export function SyncBootstrap() {
  const db =
    useSQLiteContext();

  const queryClient =
    useQueryClient();

  const mountedRef =
    useRef(true);

  const lastRunAtRef =
    useRef(0);


  const run =
    useCallback(
      async () => {
        const now =
          Date.now();

        if (
          now
          - lastRunAtRef.current
          < MIN_RESUME_INTERVAL_MS
        ) {
          return;
        }

        lastRunAtRef.current =
          now;

        try {
          const result =
            await refreshLocalFinance(
              db,
              queryClient,
            );

          if (
            mountedRef.current
          ) {
            console.log(
              '[sync] refresh complete',
              {
                pages:
                  result.pages,

                received:
                  result.received,
              },
            );
          }
        } catch (error) {
          if (
            mountedRef.current
          ) {
            console.warn(
              '[sync] refresh deferred:',
              errorMessage(
                error,
              ),
            );
          }
        }
      },
      [
        db,
        queryClient,
      ],
    );


  useEffect(() => {
    mountedRef.current =
      true;

    void run();

    const subscription =
      AppState.addEventListener(
        'change',
        (state) => {
          if (
            state === 'active'
          ) {
            void run();
          }
        },
      );

    return () => {
      mountedRef.current =
        false;

      subscription.remove();
    };
  }, [
    run,
  ]);


  return null;
}