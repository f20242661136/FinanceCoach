import Ionicons from '@expo/vector-icons/Ionicons';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  useRouter,
} from 'expo-router';

import {
  AppButton,
} from '@/components/ui/app-button';

import {
  InlineNotice,
} from '@/components/ui/inline-notice';

import {
  StatePanel,
} from '@/components/ui/state-panel';

import {
  colors,
  elevation,
  layout,
  radii,
  spacing,
  typography,
} from '@/design/tokens';

import {
  toUserFacingError,
} from '@/lib/user-facing-error';

import {
  useLocalFinanceReferenceData,
} from '../../offline/sync/use-local-finance-reference-data';

import {
  formatMinor,
  parseDecimalToMinor,
} from '../budgets/budget-money';

import {
  basisPointsToPercentText,
} from './six-jar-format';

import {
  useCalculateSixJarAllocation,
  useSixJarProfile,
} from './six-jar-query';

function sixJarErrorMessage(
  error: unknown,
): string {
  if (
    error instanceof Error
    && (
      error.message
        === 'Set up your Six-Jar profile first.'
      || error.message
        === 'Currency details are unavailable.'
    )
  ) {
    return error.message;
  }

  return toUserFacingError(
    error,
    'generic',
  );
}

export function SixJarScreen() {
  const router =
    useRouter();

  const reference =
    useLocalFinanceReferenceData();

  const profileQuery =
    useSixJarProfile();

  const calculator =
    useCalculateSixJarAllocation();

  const profile =
    profileQuery.data
    ?? null;

  const [
    incomeText,
    setIncomeText,
  ] =
    useState('');

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState<string | null>(
      null,
    );

  const currency =
    useMemo(
      () =>
        profile
          ? (
              reference.data
                ?.currencies
                .find(
                  item =>
                    item.code
                    === profile.currency_code,
                )
              ?? null
            )
          : null,
      [
        profile,
        reference.data,
      ],
    );

  useEffect(() => {
    // Calculator input changes intentionally clear stale validation feedback.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setErrorMessage(
      null,
    );

    calculator.reset();
  // The mutation object identity is intentionally excluded; this effect follows calculator inputs.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    profile?.id,
  ]);

  async function calculate() {
    setErrorMessage(
      null,
    );

    try {
      if (!profile) {
        throw new Error(
          'Set up your Six-Jar profile first.',
        );
      }

      if (!currency) {
        throw new Error(
          'Currency details are unavailable.',
        );
      }

      const incomeMinor =
        parseDecimalToMinor(
          incomeText,
          currency.minorUnit,
        );

      await calculator
        .mutateAsync(
          incomeMinor,
        );
    } catch (error) {
      setErrorMessage(
        sixJarErrorMessage(
          error,
        ),
      );
    }
  }

  if (
    profileQuery.isLoading
  ) {
    return (
      <View style={styles.centered}>
        <StatePanel
          loading
          title="Loading Six Jars"
          description="Preparing your allocation plan."
        />
      </View>
    );
  }

  if (
    profileQuery.error
  ) {
    return (
      <View style={styles.centered}>
        <StatePanel
          title="Six Jars unavailable"
          description={
            toUserFacingError(
              profileQuery.error,
              'generic',
            )
          }
          icon="alert-circle-outline"
          tone="danger"
          action={
            <AppButton
              label="Try again"
              variant="secondary"
              fullWidth={false}
              onPress={() => {
                void profileQuery.refetch();
              }}
            />
          }
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={
        styles.content
      }
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>
          SIX JARS
        </Text>

        <Text
          accessibilityRole="header"
          style={styles.title}
        >
          Give every income amount a job.
        </Text>

        <Text style={styles.subtitle}>
          Use your preferred percentage split to plan an income amount. Nothing moves between accounts unless you create a real transaction or transfer.
        </Text>
      </View>

      {!profile ? (
        <View style={styles.setupCard}>
          <View style={styles.setupIcon}>
            <Ionicons
              name="grid-outline"
              size={28}
              color={
                colors.primary
              }
            />
          </View>

          <Text style={styles.setupTitle}>
            Set up your allocation rules
          </Text>

          <Text style={styles.setupBody}>
            Start with the classic six-jar approach, then adjust each percentage to fit your own priorities.
          </Text>

          <AppButton
            label="Set up Six Jars"
            icon="options-outline"
            onPress={() => {
              router.push(
                '/six-jars-setup' as never,
              );
            }}
          />
        </View>
      ) : (
        <>
          <View style={styles.profileCard}>
            <View style={styles.profileHeader}>
              <View style={styles.profileIdentity}>
                <View style={styles.profileIcon}>
                  <Ionicons
                    name="grid-outline"
                    size={21}
                    color={
                      colors.primary
                    }
                  />
                </View>

                <View style={styles.profileHeaderCopy}>
                  <Text
                    numberOfLines={1}
                    style={styles.profileName}
                  >
                    {profile.name}
                  </Text>

                  <Text style={styles.profileMeta}>
                    {profile.currency_code}
                    {'  |  '}
                    {profile.jars.length}
                    {' jars'}
                  </Text>
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Edit Six Jars plan"
                onPress={() => {
                  router.push(
                    '/six-jars-setup' as never,
                  );
                }}
                style={({ pressed }) => [
                  styles.editButton,
                  pressed
                    ? styles.editButtonPressed
                    : null,
                ]}
              >
                <Ionicons
                  name="create-outline"
                  size={17}
                  color={
                    colors.primary
                  }
                />

                <Text style={styles.editButtonText}>
                  Edit
                </Text>
              </Pressable>
            </View>

            <View style={styles.jarGrid}>
              {profile.jars.map(
                jar => (
                  <View
                    key={jar.id}
                    style={styles.jarCard}
                  >
                    <Text
                      numberOfLines={1}
                      style={styles.jarName}
                    >
                      {jar.name}
                    </Text>

                    <Text style={styles.jarPercent}>
                      {basisPointsToPercentText(
                        jar.percentage_basis_points,
                      )}
                    </Text>
                  </View>
                ),
              )}
            </View>
          </View>

          <View style={styles.calculatorCard}>
            <View style={styles.calculatorHeading}>
              <View style={styles.calculatorIcon}>
                <Ionicons
                  name="calculator-outline"
                  size={20}
                  color={
                    colors.textOnPrimary
                  }
                />
              </View>

              <View style={styles.calculatorHeadingCopy}>
                <Text style={styles.sectionEyebrow}>
                  ALLOCATION CALCULATOR
                </Text>

                <Text style={styles.sectionTitle}>
                  Split an income amount
                </Text>
              </View>
            </View>

            <View style={styles.amountRow}>
              <Text style={styles.currencyPrefix}>
                {profile.currency_code}
              </Text>

              <TextInput
                accessibilityLabel="Income amount to allocate"
                value={
                  incomeText
                }
                onChangeText={
                  setIncomeText
                }
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={
                  colors.textTertiary
                }
                selectionColor={
                  colors.focus
                }
                style={styles.amountInput}
              />
            </View>

            <AppButton
              label={
                calculator.isPending
                  ? 'Calculating...'
                  : 'Calculate allocation'
              }
              icon="calculator-outline"
              loading={
                calculator.isPending
              }
              disabled={
                calculator.isPending
                || !incomeText.trim()
              }
              onPress={() => {
                void calculate();
              }}
            />
          </View>

          {errorMessage ? (
            <InlineNotice
              tone="error"
              message={
                errorMessage
              }
            />
          ) : null}

          {calculator.data ? (
            <View style={styles.resultsCard}>
              <View style={styles.resultsHeader}>
                <View>
                  <Text style={styles.resultsEyebrow}>
                    SUGGESTED PLAN
                  </Text>

                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                    style={styles.resultsTitle}
                  >
                    {calculator.data.currency_code}{' '}
                    {formatMinor(
                      calculator.data.income_minor,
                      currency?.minorUnit
                        ?? 2,
                    )}
                  </Text>
                </View>

                <View style={styles.planBadge}>
                  <Text style={styles.planBadgeText}>
                    Planning only
                  </Text>
                </View>
              </View>

              <View style={styles.resultList}>
                {calculator.data.jars.map(
                  (
                    jar,
                    index,
                  ) => (
                    <View
                      key={jar.id}
                    >
                      {index > 0 ? (
                        <View style={styles.divider} />
                      ) : null}

                      <View style={styles.resultRow}>
                        <View style={styles.resultCopy}>
                          <Text style={styles.resultName}>
                            {jar.name}
                          </Text>

                          <Text style={styles.resultPercent}>
                            {basisPointsToPercentText(
                              jar.percentage_basis_points,
                            )}
                          </Text>
                        </View>

                        <Text
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.72}
                          style={styles.resultAmount}
                        >
                          {calculator.data.currency_code}{' '}
                          {formatMinor(
                            jar.suggested_amount_minor,
                            currency?.minorUnit
                              ?? 2,
                          )}
                        </Text>
                      </View>
                    </View>
                  ),
                )}
              </View>

              <InlineNotice
                tone="info"
                message="These are planning suggestions only. No transaction, transfer, or account-balance change is created."
              />
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor:
        colors.background,
    },

    centered: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal:
        layout.screenHorizontalPadding,
      backgroundColor:
        colors.background,
    },

    content: {
      flexGrow: 1,
      width: '100%',
      maxWidth:
        layout.contentMaxWidth,
      alignSelf: 'center',
      gap:
        spacing.lg,
      paddingHorizontal:
        layout.screenHorizontalPadding,
      paddingTop:
        spacing.lg,
      paddingBottom:
        spacing.xl,
    },

    header: {
      gap:
        spacing.xs,
    },

    eyebrow: {
      color:
        colors.primary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight:
        typography.weightExtraBold,
      letterSpacing: 1.1,
    },

    title: {
      color:
        colors.text,
      fontSize:
        typography.title,
      lineHeight:
        typography.lineHeightTitle,
      fontWeight:
        typography.weightExtraBold,
      letterSpacing: -0.6,
    },

    subtitle: {
      maxWidth: 460,
      color:
        colors.textSecondary,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
    },

    setupCard: {
      alignItems: 'center',
      gap:
        spacing.sm,
      padding:
        spacing.xl,
      borderRadius:
        radii.xl,
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        colors.surface,
      ...elevation.card,
    },

    setupIcon: {
      width: 56,
      height: 56,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius:
        radii.lg,
      backgroundColor:
        colors.primarySoft,
      marginBottom:
        spacing.xs,
    },

    setupTitle: {
      color:
        colors.text,
      fontSize:
        typography.subheading,
      lineHeight:
        typography.lineHeightSubheading,
      fontWeight:
        typography.weightBold,
      textAlign: 'center',
    },

    setupBody: {
      maxWidth: 390,
      color:
        colors.textSecondary,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      textAlign: 'center',
    },

    profileCard: {
      gap:
        spacing.lg,
      padding:
        spacing.md,
      borderRadius:
        radii.lg,
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        colors.surface,
      ...elevation.card,
    },

    profileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      gap:
        spacing.sm,
    },

    profileIdentity: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap:
        spacing.sm,
    },

    profileIcon: {
      width: 42,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius:
        radii.md,
      backgroundColor:
        colors.primarySoft,
    },

    profileHeaderCopy: {
      flex: 1,
      minWidth: 0,
    },

    profileName: {
      color:
        colors.text,
      fontSize:
        typography.body,
      lineHeight:
        typography.lineHeightBody,
      fontWeight:
        typography.weightBold,
    },

    profileMeta: {
      marginTop:
        spacing.xxs,
      color:
        colors.textSecondary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    editButton: {
      minHeight:
        layout.touchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      gap:
        spacing.xs,
      paddingHorizontal:
        spacing.sm,
      borderRadius:
        radii.md,
      borderWidth: 1,
      borderColor:
        colors.borderStrong,
      backgroundColor:
        colors.surface,
    },

    editButtonPressed: {
      backgroundColor:
        colors.surfaceMuted,
    },

    editButtonText: {
      color:
        colors.primary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight:
        typography.weightBold,
    },

    jarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap:
        spacing.sm,
    },

    jarCard: {
      width: '48%',
      minHeight: 94,
      justifyContent:
        'space-between',
      padding:
        spacing.md,
      borderRadius:
        radii.md,
      backgroundColor:
        colors.surfaceMuted,
    },

    jarName: {
      color:
        colors.textSecondary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight:
        typography.weightSemibold,
    },

    jarPercent: {
      marginTop:
        spacing.sm,
      color:
        colors.primary,
      fontSize:
        typography.heading,
      lineHeight:
        typography.lineHeightHeading,
      fontWeight:
        typography.weightExtraBold,
    },

    calculatorCard: {
      gap:
        spacing.md,
      padding:
        spacing.lg,
      borderRadius:
        radii.xl,
      backgroundColor:
        colors.primary,
      ...elevation.floating,
    },

    calculatorHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      gap:
        spacing.sm,
    },

    calculatorIcon: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius:
        radii.md,
      backgroundColor:
        colors.focus,
    },

    calculatorHeadingCopy: {
      flex: 1,
      minWidth: 0,
    },

    sectionEyebrow: {
      color:
        colors.accentStrong,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight:
        typography.weightBold,
      letterSpacing: 1,
    },

    sectionTitle: {
      marginTop:
        spacing.xxs,
      color:
        colors.textOnPrimary,
      fontSize:
        typography.subheading,
      lineHeight:
        typography.lineHeightSubheading,
      fontWeight:
        typography.weightBold,
    },

    amountRow: {
      minHeight: 74,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal:
        spacing.md,
      borderRadius:
        radii.lg,
      backgroundColor:
        colors.surface,
    },

    currencyPrefix: {
      minWidth: 46,
      marginRight:
        spacing.sm,
      color:
        colors.textSecondary,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightBold,
    },

    amountInput: {
      flex: 1,
      minHeight: 66,
      color:
        colors.text,
      fontSize:
        typography.heading,
      lineHeight:
        typography.lineHeightHeading,
      fontWeight:
        typography.weightExtraBold,
    },

    resultsCard: {
      gap:
        spacing.md,
      padding:
        spacing.md,
      borderRadius:
        radii.lg,
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        colors.surface,
      ...elevation.card,
    },

    resultsHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent:
        'space-between',
      gap:
        spacing.sm,
    },

    resultsEyebrow: {
      color:
        colors.primary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight:
        typography.weightBold,
      letterSpacing: 1,
    },

    resultsTitle: {
      marginTop:
        spacing.xs,
      color:
        colors.text,
      fontSize:
        typography.heading,
      lineHeight:
        typography.lineHeightHeading,
      fontWeight:
        typography.weightExtraBold,
      letterSpacing: -0.4,
    },

    planBadge: {
      paddingHorizontal:
        spacing.sm,
      paddingVertical:
        spacing.xs,
      borderRadius:
        radii.pill,
      backgroundColor:
        colors.infoSurface,
    },

    planBadgeText: {
      color:
        colors.info,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight:
        typography.weightBold,
    },

    resultList: {
      borderRadius:
        radii.md,
      overflow: 'hidden',
    },

    resultRow: {
      minHeight: 64,
      flexDirection: 'row',
      alignItems: 'center',
      gap:
        spacing.sm,
      paddingVertical:
        spacing.sm,
    },

    divider: {
      height:
        StyleSheet.hairlineWidth,
      backgroundColor:
        colors.border,
    },

    resultCopy: {
      flex: 1,
      minWidth: 0,
    },

    resultName: {
      color:
        colors.text,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightBold,
    },

    resultPercent: {
      marginTop:
        spacing.xxs,
      color:
        colors.textTertiary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    resultAmount: {
      maxWidth: '48%',
      color:
        colors.primary,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightExtraBold,
      textAlign: 'right',
    },
  });