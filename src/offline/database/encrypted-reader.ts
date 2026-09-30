import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { getLocalDatabaseKey } from './encryption';
import { LOCAL_DATABASE_NAME } from './constants';

// A keyed connection gives exports a consistent snapshot independent of concurrent sync writes.
export async function withEncryptedReadTransaction<T>(task:(db:SQLiteDatabase)=>Promise<T>):Promise<T> {
  const key=await getLocalDatabaseKey();if(!/^[a-f0-9]{64}$/i.test(key))throw Error('Invalid SQLCipher key.');
  const db=await openDatabaseAsync(LOCAL_DATABASE_NAME,{useNewConnection:true});
  try {
    await db.execAsync(`PRAGMA key = "x'${key}'";`);
    const cipher=await db.getFirstAsync<{cipher_version:string}>('PRAGMA cipher_version');
    if(!cipher?.cipher_version)throw Error('SQLCipher is unavailable on the export connection.');
    await db.getFirstAsync('SELECT COUNT(*) AS count FROM sqlite_master');
    await db.execAsync('PRAGMA busy_timeout=5000; PRAGMA query_only=ON; BEGIN;');
    const result=await task(db);await db.execAsync('COMMIT;');return result;
  } finally {try{if(await db.isInTransactionAsync())await db.execAsync('ROLLBACK;');}finally{await db.closeAsync();}}
}
