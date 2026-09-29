import Ionicons from '@expo/vector-icons/Ionicons';
import {
  useEffect,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { BrandMark } from '@/components/ui/brand-mark';
import { InlineNotice } from '@/components/ui/inline-notice';
import {
  colors,
  layout,
  radii,
  spacing,
  typography,
} from '@/design/tokens';
import { useAuth } from '@/features/auth/auth-context';
import {
  completeOnboarding,
  listActiveCurrencies,
  type CurrencyOption,
} from '@/features/profile/profile-service';
import { copy } from '@/i18n/copy';

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

  const [currencies, setCurrencies] =
    useState<CurrencyOption[]>([]);

  const [
    currencyLoadState,
    setCurrencyLoadState,
  ] = useState<CurrencyLoadState>(
    'loading',
  );

  const [selectedCurrency, setSelectedCurrency] =
    useState<string | null>(
      profile?.base_currency_code ?? null,
    );

  const [submitError, setSubmitError] =
    useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const locale = detectLocale();
  const timezone = detectTimezone();

  useEffect(() => {
    let cancelled = false;

    void listActiveCurrencies()
      .then((data) => {
        if (!cancelled) {
          setCurrencies(data);
          setCurrencyLoadState('ready');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCurrencyLoadState('error');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async () => {
    if (
      !session ||
      !selectedCurrency
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
        error instanceof Error
          ? error.message
          : copy.auth.errors.generic,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const firstName =
    profile?.display_name
      ?.trim()
      .split(/\s+/)[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 32,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.outer}>
        <BrandMark />

        <View style={styles.heading}>
          <Text style={styles.eyebrow}>
            {copy.onboarding.eyebrow}
          </Text>

          <Text style={styles.title}>
            {firstName
              ? `${firstName}, ${copy.onboarding.title.toLowerCase()}`
              : copy.onboarding.title}
          </Text>

          <Text style={styles.subtitle}>
            {copy.onboarding.subtitle}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeading}>
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

          {currencyLoadState ===
          'loading' ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator
                size="small"
                color={colors.primary}
              />
              <Text style={styles.muted}>
                {
                  copy.onboarding
                    .loadingCurrencies
                }
              </Text>
            </View>
          ) : null}

          {currencyLoadState ===
          'error' ? (
            <InlineNotice
              message={
                copy.onboarding.noCurrencies
              }
              tone="error"
            />
          ) : null}

          {currencyLoadState ===
          'ready' ? (
            <View
              style={styles.currencyGrid}
            >
              {currencies.map(
                (currency) => {
                  const selected =
                    selectedCurrency ===
                    currency.code;

                  return (
                    <Pressable
                      key={currency.code}
                      accessibilityRole="radio"
                      accessibilityState={{
                        selected,
                      }}
                      onPress={() =>
                        setSelectedCurrency(
                          currency.code,
                        )
                      }
                      style={({ pressed }) => [
                        styles.currencyOption,
                        selected &&
                          styles.currencySelected,
                        pressed &&
                          styles.currencyPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.currencyCode,
                          selected &&
                            styles.currencySelectedText,
                        ]}
                      >
                        {currency.code}
                      </Text>

                      <Text
                        numberOfLines={1}
                        style={[
                          styles.currencyName,
                          selected &&
                            styles.currencySelectedText,
                        ]}
                      >
                        {currency.name}
                      </Text>

                      <Text
                        style={[
                          styles.currencySymbol,
                          selected &&
                            styles.currencySelectedText,
                        ]}
                      >
                        {currency.symbol}
                      </Text>
                    </Pressable>
                  );
                },
              )}
            </View>
          ) : null}

          <View style={styles.preferenceCard}>
            <View style={styles.preferenceHeader}>
              <Ionicons
                name="globe-outline"
                size={20}
                color={colors.primary}
              />

              <Text
                style={styles.preferenceTitle}
              >
                {
                  copy.onboarding
                    .detectedPreferences
                }
              </Text>
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

              <Text style={styles.preferenceValue}>
                {timezone}
              </Text>
            </View>
          </View>

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
              !selectedCurrency ||
              currencyLoadState !== 'ready'
            }
            onPress={() => {
              void submit();
            }}
          />

          <Text style={styles.privacy}>
            {copy.onboarding.privacy}
          </Text>
        </View>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  outer: {
    flex: 1,
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    padding: spacing.lg,
    gap: spacing.xl,
  },

  heading: {
    gap: spacing.sm,
  },

  eyebrow: {
    color: colors.success,
    fontSize: typography.small,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  title: {
    color: colors.text,
    fontSize: typography.title,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: -0.8,
  },

  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 24,
  },

  card: {
    gap: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },

  sectionHeading: {
    gap: spacing.xs,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: typography.subheading,
    fontWeight: '800',
  },

  sectionBody: {
    color: colors.textSecondary,
    fontSize: typography.small,
    lineHeight: 20,
  },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  muted: {
    color: colors.textSecondary,
    fontSize: typography.small,
  },

  currencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  currencyOption: {
    minWidth: '30%',
    flexGrow: 1,
    flexBasis: 140,
    gap: 2,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },

  currencySelected: {
    borderColor: colors.primary,
    backgroundColor: colors.accent,
  },

  currencyPressed: {
    opacity: 0.78,
  },

  currencyCode: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '800',
  },

  currencyName: {
    color: colors.textSecondary,
    fontSize: typography.caption,
  },

  currencySymbol: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: typography.small,
    fontWeight: '700',
  },

  currencySelectedText: {
    color: colors.primary,
  },

  preferenceCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },

  preferenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },

  preferenceTitle: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: '800',
  },

  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },

  preferenceLabel: {
    color: colors.textSecondary,
    fontSize: typography.small,
  },

  preferenceValue: {
    flex: 1,
    color: colors.text,
    fontSize: typography.small,
    fontWeight: '700',
    textAlign: 'right',
  },

  privacy: {
    color: colors.textTertiary,
    fontSize: typography.caption,
    lineHeight: 18,
    textAlign: 'center',
  },
});