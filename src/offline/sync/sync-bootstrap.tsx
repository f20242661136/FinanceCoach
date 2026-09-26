import {
  useEffect,
} from 'react';

import {
  useSQLiteContext,
} from 'expo-sqlite';

import {
  supabase,
} from '../../lib/supabase';

import {
  getLocalSyncDiagnostics,
} from './sync-repository';

import {
  syncFromServer,
} from './sync-service';


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


  useEffect(() => {
    let cancelled = false;


    async function run() {
      const {
        data: {
          session,
        },
        error,
      } =
        await supabase.auth
          .getSession();


      if (error) {
        console.warn(
          '[sync] Could not read session:',
          error.message,
        );

        return;
      }


      const userId =
        session?.user.id;

      if (
        !userId
        || cancelled
      ) {
        return;
      }


      try {
        const result =
          await syncFromServer(
            db,
            userId,
          );


        if (cancelled) {
          return;
        }


        const diagnostics =
          await getLocalSyncDiagnostics(
            db,
            userId,
          );


        console.log(
          '[sync] bootstrap complete',
          {
            pages:
              result.pages,

            received:
              result.received,

            localCounts:
              diagnostics.counts,

            cursors:
              diagnostics.cursors,
          },
        );
      } catch (syncError) {
        /*
         * Bootstrap sync is intentionally
         * non-fatal.
         *
         * Network loss must not prevent the
         * finance shell from rendering.
         */
        if (!cancelled) {
          console.warn(
            '[sync] bootstrap deferred:',
            errorMessage(
              syncError,
            ),
          );
        }
      }
    }


    void run();


    return () => {
      cancelled = true;
    };
  }, [db]);


  return null;
}