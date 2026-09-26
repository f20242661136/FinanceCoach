import { Stack } from 'expo-router';

import {
  FinanceProvider,
} from '@/features/finance/finance-provider';

export default function FinanceLayout() {
  return (
    <FinanceProvider>
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
  );
}