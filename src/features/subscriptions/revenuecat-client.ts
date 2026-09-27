import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
} from 'react-native-purchases';

import {
  getRevenueCatPublicApiKey,
} from './subscription-config';

let configured =
  false;

let configuredUserId:
  string | null =
    null;

function errorMessage(
  error: unknown,
): string {
  return error instanceof Error
    ? error.message
    : 'RevenueCat initialization failed.';
}

export function
isRevenueCatConfigured():
  boolean {
  return configured;
}

export async function
ensureRevenueCatUser(
  userId: string,
): Promise<
  CustomerInfo | null
> {
  const apiKey =
    getRevenueCatPublicApiKey();

  if (!apiKey) {
    return null;
  }

  if (!configured) {
    if (__DEV__) {
      Purchases.setLogLevel(
        LOG_LEVEL.DEBUG,
      );
    }

    Purchases.configure({
      apiKey,
      appUserID:
        userId,
    });

    configured =
      true;

    configuredUserId =
      userId;

    return Purchases
      .getCustomerInfo();
  }

  if (
    configuredUserId !==
      userId
  ) {
    const result =
      await Purchases
        .logIn(
          userId,
        );

    configuredUserId =
      userId;

    return result
      .customerInfo;
  }

  return Purchases
    .getCustomerInfo();
}

export function
subscribeToRevenueCatCustomerInfo(
  listener:
    (
      customerInfo:
        CustomerInfo,
    ) => void,
): () => void {
  if (!configured) {
    return () => {};
  }

  Purchases
    .addCustomerInfoUpdateListener(
      listener,
    );

  return () => {
    Purchases
      .removeCustomerInfoUpdateListener(
        listener,
      );
  };
}

export function
revenueCatErrorMessage(
  error: unknown,
): string {
  return errorMessage(
    error,
  );
}
