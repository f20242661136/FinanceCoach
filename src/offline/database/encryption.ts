import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const DATABASE_KEY_STORAGE_NAME =
  'finance-coach.database-key.v1';

let databaseKeyPromise:
  Promise<string> | null = null;

function bytesToHex(
  bytes: Uint8Array,
): string {
  return Array.from(bytes)
    .map((value) =>
      value
        .toString(16)
        .padStart(2, '0'),
    )
    .join('');
}

function assertDatabaseKey(
  key: string,
): string {
  if (!/^[0-9a-f]{64}$/i.test(key)) {
    throw new Error(
      'Stored local database key is invalid.',
    );
  }

  return key;
}

async function loadOrCreateDatabaseKey():
  Promise<string> {
  const existing =
    await SecureStore.getItemAsync(
      DATABASE_KEY_STORAGE_NAME,
    );

  if (existing) {
    return assertDatabaseKey(
      existing,
    );
  }

  const randomBytes =
    await Crypto.getRandomBytesAsync(
      32,
    );

  const generated =
    assertDatabaseKey(
      bytesToHex(randomBytes),
    );

  await SecureStore.setItemAsync(
    DATABASE_KEY_STORAGE_NAME,
    generated,
  );

  /*
   * Read it back from durable storage.
   * The DB must always use the exact key
   * SecureStore says is authoritative.
   */
  const persisted =
    await SecureStore.getItemAsync(
      DATABASE_KEY_STORAGE_NAME,
    );

  if (!persisted) {
    throw new Error(
      'Could not persist local database key.',
    );
  }

  return assertDatabaseKey(
    persisted,
  );
}

export function getLocalDatabaseKey():
  Promise<string> {
  if (!databaseKeyPromise) {
    databaseKeyPromise =
      loadOrCreateDatabaseKey()
        .catch((error) => {
          databaseKeyPromise = null;
          throw error;
        });
  }

  return databaseKeyPromise;
}