import {
  useQuery,
} from '@tanstack/react-query';

import {
  useSQLiteContext,
} from 'expo-sqlite';

import {
  readFinanceReferenceData,
} from './reference-data';


export function
useLocalFinanceReferenceData() {
  const db =
    useSQLiteContext();

  return useQuery({
    queryKey: [
      'local-finance',
      'reference-data',
    ],

    queryFn:
      () =>
        readFinanceReferenceData(
          db,
        ),

    staleTime:
      Infinity,

    retry:
      false,
  });
}