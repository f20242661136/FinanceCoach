import Ionicons from '@expo/vector-icons/Ionicons';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  AppButton,
} from '@/components/ui/app-button';

import {
  AppCard,
} from '@/components/ui/app-card';

import {
  AppScreen,
} from '@/components/ui/app-screen';

import {
  AppScreenHeader,
} from '@/components/ui/app-screen-header';

import {
  BrandMark,
} from '@/components/ui/brand-mark';

import {
  ChoiceChip,
} from '@/components/ui/choice-chip';

import {
  InlineNotice,
} from '@/components/ui/inline-notice';

import {
  colors,
  radii,
  spacing,
  typography,
} from '@/design/tokens';

import {
  useAuth,
} from '@/features/auth/auth-context';

import {
  completeOnboarding,
  listActiveCurrencies,
  type CurrencyOption,
} from '@/features/profile/profile-service';

import {
  copy,
} from '@/i18n/copy';

import {
  toUserFacingError,
} from '@/lib/user-facing-error';

type CurrencyLoadState =
  | 'loading'
  | 'ready'
  | 'error';

function detectLocale(): string {
  return (
    Intl.DateTimeFormat()
      .resolvedOptions()
      .locale || 'en'
  );
}

function detectTimezone(): string {
  return (
    Intl.DateTimeFormat()
      .resolvedOptions()
      .timeZone || 'UTC'
  );
}

export default function SetupScreen() {
  const {
    session,
    profile,
    refreshProfile,
  } = useAuth();

  const [
    currencies,
    setCurrencies,
  ] = useState<CurrencyOption[]>([]);

  const [
    currencyLoadState,
    setCurrencyLoadState,
  ] = useState<CurrencyLoadState>(
    'loading',
  );

  const [
    selectedCurrency,
    setSelectedCurrency,
  ] = useState<string | null>(
    profile?.base_currency_code
      ?? null,
  );

  const [
    submitError,
    setSubmitError,
  ] = useState<string | null>(
    null,
  );

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const locale =
    detectLocale();

  const timezone =
    detectTimezone();

  const firstName =
    profile?.display_name
      ?.trim()
      .split(/\s+/)[0];

  const selectedCurrencyOption =
    useMemo(
      () =>
        currencies.find(
          item =>
            item.code
            === selectedCurrency,
        )
        ?? null,
      [
        currencies,
        selectedCurrency,
      ],
    );

  const loadCurrencies =
    useCallback(async () => {
      setCurrencyLoadState(
        'loading',
      );

      try {
        const data =
          await listActiveCurrencies();

        setCurrencies(data);
        setCurrencyLoadState(
          'ready',
        );

        setSelectedCurrency(
          current => {
            if (
              current
              && data.some(
                item =>
                  item.code === current,
              )
            ) {
              return current;
            }

            const profileCurrency =
              profile
                ?.base_currency_code;

            if (
              profileCurrency
              && data.some(
                item =>
                  item.code
                  === profileCurrency,
              )
            ) {
              return profileCurrency;
            }

            return null;
          },
        );
      } catch {
        setCurrencyLoadState(
          'error',
        );
      }
    }, [
      profile
        ?.base_currency_code,
    ]);

  useEffect(() => {
    const timer =
      setTimeout(() => {
        void loadCurrencies();
      }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [loadCurrencies]);

  const submit =
    async () => {
      if (
        !session
        || !selectedCurrency
      ) {
        return;
      }

      setIsSubmitting(true);
      setSubmitError(null);

      try {
        await completeOnboarding(
          session.user.id,
          {
            baseCurrencyCode:
              selectedCurrency,
            locale,
            timezone,
          },
        );

        await refreshProfile();
      } catch (error) {
        setSubmitError(
          toUserFacingError(
            error,
            'onboarding',
          ),
        );
      } finally {
        setIsSubmitting(false);
      }
    };

  return (
    <AppScreen
      keyboardAware
      header={<BrandMark />}
    >
      <AppScreenHeader
        eyebrow="Step 1 of 1"
        title={
          firstName
            ? `${firstName}, ${copy.onboarding.title.toLowerCase()}`
            : copy.onboarding.title
        }
        subtitle={
          copy.onboarding.subtitle
        }
      />

      <AppCard style={styles.card}>
        <View style={styles.sectionTitleRow}>
          <View style={styles.sectionIcon}>
            <Ionicons
              name="cash-outline"
              size={20}
              color={
                colors.primary
              }
            />
          </View>

          <View style={styles.sectionCopy}>
            <Text style={styles.sectionTitle}>
              {
                copy.onboarding
                  .currencyTitle
              }
            </Text>

            <Text style={styles.sectionBody}>
              {
                copy.onboarding
                  .currencyBody
              }
            </Text>
          </View>
        </View>

        {currencyLoadState
        === 'loading' ? (
          <View style={styles.loadingCard}>
            <Text style={styles.loadingTitle}>
              {
                copy.onboarding
                  .loadingCurrencies
              }
            </Text>

            <Text style={styles.loadingBody}>
              This should only take a moment.
            </Text>
          </View>
        ) : null}

        {currencyLoadState
        === 'error' ? (
          <View style={styles.stack}>
            <InlineNotice
              message={
                copy.onboarding
                  .noCurrencies
              }
              tone="error"
            />

            <AppButton
              label="Try again"
              variant="secondary"
              icon="refresh-outline"
              onPress={() => {
                void loadCurrencies();
              }}
            />
          </View>
        ) : null}

        {currencyLoadState
        === 'ready' ? (
          <>
            <View style={styles.currencyGrid}>
              {currencies.map(
                currency => (
                  <ChoiceChip
                    key={
                      currency.code
                    }
                    role="radio"
                    label={
                      `${currency.code} ${currency.symbol}`
                    }
                    accessibilityLabel={
                      `${currency.name}, ${currency.code}, ${currency.symbol}`
                    }
                    selected={
                      selectedCurrency
                      === currency.code
                    }
                    onPress={() => {
                      setSelectedCurrency(
                        currency.code,
                      );
                    }}
                  />
                ),
              )}
            </View>

            {selectedCurrencyOption ? (
              <View style={styles.selectionSummary}>
                <Text style={styles.selectionLabel}>
                  Selected currency
                </Text>

                <Text style={styles.selectionValue}>
                  {
                    selectedCurrencyOption
                      .name
                  }
                  {' - '}
                  {
                    selectedCurrencyOption
                      .code
                  }
                </Text>
              </View>
            ) : (
              <InlineNotice
                message="Choose the currency you use most often. You can still track accounts in other supported currencies."
                tone="info"
              />
            )}
          </>
        ) : null}
      </AppCard>

      <AppCard
        tone="muted"
        style={styles.card}
      >
        <View style={styles.preferenceHeader}>
          <Ionicons
            name="globe-outline"
            size={20}
            color={
              colors.primary
            }
          />

          <View style={styles.sectionCopy}>
            <Text style={styles.preferenceTitle}>
              {
                copy.onboarding
                  .detectedPreferences
              }
            </Text>

            <Text style={styles.sectionBody}>
              Finance Coach uses these values for dates, reminders, and formatting.
            </Text>
          </View>
        </View>

        <View style={styles.preferenceRow}>
          <Text style={styles.preferenceLabel}>
            {copy.onboarding.locale}
          </Text>

          <Text style={styles.preferenceValue}>
            {locale}
          </Text>
        </View>

        <View style={styles.preferenceRow}>
          <Text style={styles.preferenceLabel}>
            {copy.onboarding.timezone}
          </Text>

          <Text
            numberOfLines={2}
            style={styles.preferenceValue}
          >
            {timezone}
          </Text>
        </View>
      </AppCard>

      {submitError ? (
        <InlineNotice
          message={submitError}
          tone="error"
        />
      ) : null}

      <AppButton
        label={copy.onboarding.continue}
        loading={isSubmitting}
        disabled={
          !selectedCurrency
          || currencyLoadState
            !== 'ready'
        }
        onPress={() => {
          void submit();
        }}
      />

      <Text style={styles.privacy}>
        {copy.onboarding.privacy}
      </Text>
    </AppScreen>
  );
}

const styles =
  StyleSheet.create({
    card: {
      gap:
        spacing.lg,
    },

    stack: {
      gap:
        spacing.md,
    },

    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap:
        spacing.md,
    },

    sectionIcon: {
      width: 40,
      height: 40,
      borderRadius:
        radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        colors.primarySoft,
    },

    sectionCopy: {
      flex: 1,
      minWidth: 0,
      gap:
        spacing.xs,
    },

    sectionTitle: {
      color:
        colors.text,
      fontSize:
        typography.subheading,
      lineHeight:
        typography.lineHeightSubheading,
      fontWeight:
        typography.weightExtraBold,
    },

    sectionBody: {
      color:
        colors.textSecondary,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
    },

    loadingCard: {
      gap:
        spacing.xs,
      padding:
        spacing.md,
      borderRadius:
        radii.md,
      backgroundColor:
        colors.surfaceMuted,
    },

    loadingTitle: {
      color:
        colors.text,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightBold,
    },

    loadingBody: {
      color:
        colors.textSecondary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    currencyGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap:
        spacing.sm,
    },

    selectionSummary: {
      gap:
        spacing.xs,
      padding:
        spacing.md,
      borderRadius:
        radii.md,
      borderWidth: 1,
      borderColor:
        colors.accentStrong,
      backgroundColor:
        colors.primarySoft,
    },

    selectionLabel: {
      color:
        colors.textSecondary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    selectionValue: {
      color:
        colors.primary,
      fontSize:
        typography.body,
      lineHeight:
        typography.lineHeightBody,
      fontWeight:
        typography.weightBold,
    },

    preferenceHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap:
        spacing.sm,
    },

    preferenceTitle: {
      color:
        colors.text,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightBold,
    },

    preferenceRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent:
        'space-between',
      gap:
        spacing.md,
    },

    preferenceLabel: {
      color:
        colors.textSecondary,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
    },

    preferenceValue: {
      flex: 1,
      color:
        colors.text,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightBold,
      textAlign: 'right',
    },

    privacy: {
      color:
        colors.textTertiary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      textAlign: 'center',
    },
  });