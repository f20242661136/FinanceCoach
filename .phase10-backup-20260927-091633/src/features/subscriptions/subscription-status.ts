import type {
  CustomerInfo,
} from 'react-native-purchases';

import {
  REVENUECAT_PREMIUM_ENTITLEMENT_ID,
} from './subscription-config';


export type PremiumLifecycleStatus =
  | 'free'
  | 'trial'
  | 'active'
  | 'cancelling'
  | 'billing_issue'
  | 'expired';

export type PremiumSubscriptionStatus = {
  lifecycle:
    PremiumLifecycleStatus;

  hasPremium:
    boolean;

  productIdentifier:
    string | null;

  periodType:
    string | null;

  expirationDate:
    string | null;

  willRenew:
    boolean | null;

  unsubscribeDetectedAt:
    string | null;

  billingIssueDetectedAt:
    string | null;

  store:
    string | null;

  isSandbox:
    boolean | null;
};


export function
premiumSubscriptionStatusFrom(
  customerInfo:
    CustomerInfo | null,
): PremiumSubscriptionStatus {
  const entitlement =
    customerInfo
      ?.entitlements
      .all[
        REVENUECAT_PREMIUM_ENTITLEMENT_ID
      ]
    ?? null;

  const hasPremium =
    Boolean(
      customerInfo
        ?.entitlements
        .active[
          REVENUECAT_PREMIUM_ENTITLEMENT_ID
        ],
    );

  if (!entitlement) {
    return {
      lifecycle:
        'free',

      hasPremium:
        false,

      productIdentifier:
        null,

      periodType:
        null,

      expirationDate:
        null,

      willRenew:
        null,

      unsubscribeDetectedAt:
        null,

      billingIssueDetectedAt:
        null,

      store:
        null,

      isSandbox:
        null,
    };
  }

  const periodType =
    entitlement.periodType
      ?? null;

  const billingIssueDetectedAt =
    entitlement.billingIssueDetectedAt
      ?? null;

  const unsubscribeDetectedAt =
    entitlement.unsubscribeDetectedAt
      ?? null;

  let lifecycle:
    PremiumLifecycleStatus;

  if (!hasPremium) {
    lifecycle =
      'expired';
  } else if (
    billingIssueDetectedAt
  ) {
    lifecycle =
      'billing_issue';
  } else if (
    periodType === 'TRIAL'
  ) {
    lifecycle =
      'trial';
  } else if (
    unsubscribeDetectedAt
    || entitlement.willRenew ===
      false
  ) {
    lifecycle =
      'cancelling';
  } else {
    lifecycle =
      'active';
  }

  return {
    lifecycle,

    hasPremium,

    productIdentifier:
      entitlement.productIdentifier
      ?? null,

    periodType,

    expirationDate:
      entitlement.expirationDate
      ?? null,

    willRenew:
      entitlement.willRenew
      ?? null,

    unsubscribeDetectedAt,

    billingIssueDetectedAt,

    store:
      entitlement.store
      ?? null,

    isSandbox:
      entitlement.isSandbox
      ?? null,
  };
}
