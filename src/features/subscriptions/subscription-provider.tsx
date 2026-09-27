import {
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type {
  CustomerInfo,
} from 'react-native-purchases';

import {
  useAuth,
} from '@/features/auth/auth-context';

import {
  SubscriptionContext,
  type SubscriptionRuntimeStatus,
} from './subscription-context';

import {
  REVENUECAT_PREMIUM_ENTITLEMENT_ID,
  getRevenueCatPublicApiKey,
} from './subscription-config';

import {
  ensureRevenueCatUser,
  revenueCatErrorMessage,
  subscribeToRevenueCatCustomerInfo,
} from './revenuecat-client';

type RuntimeSnapshot = {
  userId: string;

  status:
    | 'ready'
    | 'error';

  customerInfo:
    CustomerInfo | null;

  error:
    string | null;
};

type RevenueCatConfiguration = {
  apiKey:
    string | null;

  error:
    string | null;
};

function premiumFrom(
  customerInfo:
    CustomerInfo | null,
): boolean {
  return Boolean(
    customerInfo
      ?.entitlements
      .active[
        REVENUECAT_PREMIUM_ENTITLEMENT_ID
      ],
  );
}

function revenueCatConfiguration():
  RevenueCatConfiguration {
  try {
    return {
      apiKey:
        getRevenueCatPublicApiKey(),

      error:
        null,
    };
  } catch (
    configurationError
  ) {
    return {
      apiKey:
        null,

      error:
        revenueCatErrorMessage(
          configurationError,
        ),
    };
  }
}

export function
SubscriptionProvider({
  children,
}: PropsWithChildren) {
  const {
    session,
  } =
    useAuth();

  const userId =
    session?.user.id
    ?? null;

  const configuration =
    useMemo(
      revenueCatConfiguration,
      [],
    );

  const [
    snapshot,
    setSnapshot,
  ] =
    useState<
      RuntimeSnapshot | null
    >(
      null,
    );

  useEffect(() => {
    let cancelled =
      false;

    let removeListener:
      (() => void)
      | null =
        null;

    if (
      !userId
      ||
      !configuration.apiKey
    ) {
      return;
    }

    void ensureRevenueCatUser(
      userId,
    )
      .then(
        (
          nextCustomerInfo,
        ) => {
          if (
            cancelled
          ) {
            return;
          }

          setSnapshot({
            userId,

            status:
              'ready',

            customerInfo:
              nextCustomerInfo,

            error:
              null,
          });

          removeListener =
            subscribeToRevenueCatCustomerInfo(
              (
                updatedCustomerInfo,
              ) => {
                if (
                  cancelled
                ) {
                  return;
                }

                setSnapshot({
                  userId,

                  status:
                    'ready',

                  customerInfo:
                    updatedCustomerInfo,

                  error:
                    null,
                });
              },
            );
        },
      )
      .catch(
        (
          initializationError,
        ) => {
          if (
            cancelled
          ) {
            return;
          }

          setSnapshot({
            userId,

            status:
              'error',

            customerInfo:
              null,

            error:
              revenueCatErrorMessage(
                initializationError,
              ),
          });
        },
      );

    return () => {
      cancelled =
        true;

      removeListener?.();
    };
  }, [
    configuration.apiKey,
    userId,
  ]);

  const refreshSubscription =
    useCallback(
      async () => {
        if (
          !userId
          ||
          !configuration.apiKey
        ) {
          return;
        }

        try {
          const nextCustomerInfo =
            await ensureRevenueCatUser(
              userId,
            );

          setSnapshot({
            userId,

            status:
              'ready',

            customerInfo:
              nextCustomerInfo,

            error:
              null,
          });
        } catch (
          refreshError
        ) {
          setSnapshot({
            userId,

            status:
              'error',

            customerInfo:
              null,

            error:
              revenueCatErrorMessage(
                refreshError,
              ),
          });
        }
      },
      [
        configuration.apiKey,
        userId,
      ],
    );

  let status:
    SubscriptionRuntimeStatus =
      'idle';

  let customerInfo:
    CustomerInfo | null =
      null;

  let error:
    string | null =
      null;

  if (userId) {
    if (
      configuration.error
    ) {
      status =
        'error';

      error =
        configuration.error;
    } else if (
      !configuration.apiKey
    ) {
      status =
        'disabled';
    } else if (
      snapshot?.userId ===
        userId
    ) {
      status =
        snapshot.status;

      customerInfo =
        snapshot.customerInfo;

      error =
        snapshot.error;
    } else {
      status =
        'initializing';
    }
  }

  const value =
    useMemo(
      () => ({
        status,

        customerInfo,

        hasPremiumEntitlement:
          premiumFrom(
            customerInfo,
          ),

        error,

        refreshSubscription,
      }),
      [
        status,
        customerInfo,
        error,
        refreshSubscription,
      ],
    );

  return (
    <SubscriptionContext.Provider
      value={
        value
      }
    >
      {children}
    </SubscriptionContext.Provider>
  );
}