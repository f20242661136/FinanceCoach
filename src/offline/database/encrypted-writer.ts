import {
  openDatabaseAsync,
  type SQLiteDatabase,
} from 'expo-sqlite';

import {
  LOCAL_DATABASE_NAME,
} from './constants';

import {
  getLocalDatabaseKey,
} from './encryption';


type WriteTask =
  (
    db: SQLiteDatabase,
  ) => Promise<void>;


function assertKey(
  key: string,
): string {
  if (
    !/^[0-9a-f]{64}$/i.test(
      key,
    )
  ) {
    throw new Error(
      'Invalid SQLCipher database key.',
    );
  }

  return key;
}


export async function
withEncryptedWriteTransaction(
  task: WriteTask,
): Promise<void> {
  const key =
    assertKey(
      await getLocalDatabaseKey(),
    );

  /*
   * Important:
   * useNewConnection gives the writer its
   * own connection, which we explicitly key
   * before touching encrypted pages.
   */
  const db =
    await openDatabaseAsync(
      LOCAL_DATABASE_NAME,
      {
        useNewConnection:
          true,
      },
    );

  try {
    await db.execAsync(
      `PRAGMA key = "x'${key}'";`,
    );


    const cipher =
      await db.getFirstAsync<{
        cipher_version: string;
      }>(
        'PRAGMA cipher_version',
      );

    if (
      !cipher?.cipher_version
    ) {
      throw new Error(
        'SQLCipher is unavailable on the writer connection.',
      );
    }


    /*
     * Force key validation before any write.
     */
    await db.getFirstAsync(
      `
        SELECT COUNT(*) AS count
        FROM sqlite_master
      `,
    );


    /*
     * These pragmas are connection-specific,
     * so they belong on the writer connection.
     */
    await db.execAsync(`
      PRAGMA foreign_keys = ON;
      PRAGMA busy_timeout = 5000;
    `);


    /*
     * Dedicated connection means nothing
     * unrelated can accidentally join this
     * transaction.
     */
    await db.execAsync(
      'BEGIN IMMEDIATE;',
    );

    try {
      await task(
        db,
      );

      await db.execAsync(
        'COMMIT;',
      );
    } catch (error) {
      if (
        await db.isInTransactionAsync()
      ) {
        await db.execAsync(
          'ROLLBACK;',
        );
      }

      throw error;
    }
  } finally {
    /*
     * Defensive rollback if anything threw
     * after BEGIN but before normal cleanup.
     */
    try {
      if (
        await db.isInTransactionAsync()
      ) {
        await db.execAsync(
          'ROLLBACK;',
        );
      }
    } finally {
      await db.closeAsync();
    }
  }
}