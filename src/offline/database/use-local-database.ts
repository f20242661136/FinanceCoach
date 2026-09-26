import {
  useSQLiteContext,
} from 'expo-sqlite';

export function useLocalDatabase() {
  return useSQLiteContext();
}