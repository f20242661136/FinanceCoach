import Purchases, {
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
} from 'react-native-purchases';


export async function
getCurrentRevenueCatOffering():
  Promise<PurchasesOffering | null> {
  const offerings =
    await Purchases.getOfferings();

  return offerings.current
    ?? null;
}


export async function
purchaseRevenueCatPackage(
  selectedPackage:
    PurchasesPackage,
): Promise<CustomerInfo> {
  const result =
    await Purchases.purchasePackage(
      selectedPackage,
    );

  return result.customerInfo;
}


export async function
restoreRevenueCatPurchases():
  Promise<CustomerInfo> {
  return Purchases
    .restorePurchases();
}


export function
wasRevenueCatPurchaseCancelled(
  error: unknown,
): boolean {
  if (
    !error
    || typeof error !== 'object'
    || !('userCancelled' in error)
  ) {
    return false;
  }

  return (
    error as {
      userCancelled?: unknown;
    }
  ).userCancelled === true;
}


export function
revenueCatOperationErrorMessage(
  error: unknown,
): string {
  if (
    error
    && typeof error === 'object'
    && 'message' in error
    && typeof (
      error as {
        message?: unknown;
      }
    ).message === 'string'
  ) {
    return (
      error as {
        message: string;
      }
    ).message;
  }

  return 'The subscription request could not be completed.';
}
