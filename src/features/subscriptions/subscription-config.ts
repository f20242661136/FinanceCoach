import {
  Platform,
} from 'react-native';

export const
REVENUECAT_PREMIUM_ENTITLEMENT_ID =
  'premium';

function normalizeKey(
  value:
    string | undefined,
): string | null {
  const trimmed =
    value?.trim()
    ?? '';

  return trimmed
    ? trimmed
    : null;
}

export function
getRevenueCatPublicApiKey():
  string | null {
  if (
    Platform.OS ===
      'android'
  ) {
    const key =
      normalizeKey(
        process.env
          .EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY,
      );

    if (
      key
      &&
      !key.startsWith(
        'goog_',
      )
    ) {
      throw new Error(
        'RevenueCat Android must use a goog_ public SDK key.',
      );
    }

    return key;
  }

  if (
    Platform.OS ===
      'ios'
  ) {
    const key =
      normalizeKey(
        process.env
          .EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
      );

    if (
      key
      &&
      !key.startsWith(
        'appl_',
      )
    ) {
      throw new Error(
        'RevenueCat iOS must use an appl_ public SDK key.',
      );
    }

    return key;
  }

  return null;
}
