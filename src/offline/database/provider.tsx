import type {
  PropsWithChildren,
} from 'react';

import {
  SQLiteProvider,
} from 'expo-sqlite';

import {
  LOCAL_DATABASE_NAME,
} from './constants';

import {
  migrateLocalDatabase,
} from './migrate';

export function LocalDatabaseProvider({
  children,
}: PropsWithChildren) {
  return (
    <SQLiteProvider
      databaseName={
        LOCAL_DATABASE_NAME
      }
      onInit={
        migrateLocalDatabase
      }
    >
      {children}
    </SQLiteProvider>
  );
}