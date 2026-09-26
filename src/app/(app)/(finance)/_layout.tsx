import { SyncBootstrap } from '../../../offline/sync/sync-bootstrap';
import { Stack } from 'expo-router';

import {
  FinanceProvider,
} from '@/features/finance/finance-provider';

import {
  LocalDatabaseProvider,
} from '@/offline/database/provider';

export default function FinanceLayout() {
  return (
    <LocalDatabaseProvider>
      <FinanceProvider>
        <SyncBootstrap />
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen
            name="(tabs)"
          />

          <Stack.Screen
            name="add-account"
            options={{
              presentation: 'modal',
            }}
          />

          <Stack.Screen
            name="quick-add"
            options={{
              presentation: 'modal',
            }}
          />
        </Stack>
      </FinanceProvider>
    </LocalDatabaseProvider>
  );
}