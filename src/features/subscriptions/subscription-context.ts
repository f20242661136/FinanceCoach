import {
  createContext,
  useContext,
} from 'react';

import type {
  CustomerInfo,
} from 'react-native-purchases';

export type SubscriptionRuntimeStatus =
  | 'idle'
  | 'disabled'
  | 'initializing'
  | 'ready'
  | 'error';

export type SubscriptionContextValue = {
  status:
    SubscriptionRuntimeStatus;

  customerInfo:
    CustomerInfo | null;

  hasPremiumEntitlement:
    boolean;

  error:
    string | null;

  refreshSubscription:
    () => Promise<void>;
};

export const
SubscriptionContext =
  createContext<
    SubscriptionContextValue
    | undefined
  >(
    undefined,
  );

export function
useSubscription():
  SubscriptionContextValue {
  const context =
    useContext(
      SubscriptionContext,
    );

  if (!context) {
    throw new Error(
      'useSubscription must be used inside SubscriptionProvider.',
    );
  }

  return context;
}