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
  colors,
  elevation,
  layout,
  radii,
  typography,
} from '@/design/tokens';

import {
  useRouter,
} from 'expo-router';

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
                  (item) =>
                    item.code ===
                    profile.currency_code,
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
        error instanceof Error
          ? error.message
          : 'Could not calculate the allocation.',
      );
    }
  }


  if (
    profileQuery.isLoading
  ) {
    return (
      <View
        style={
          styles.centered
        }
      >
        <Text
          style={
            styles.muted
          }
        >
          Loading Six Jars…
        </Text>
      </View>
    );
  }


  return (
    <ScrollView
      style={
        styles.screen
      }
      contentContainerStyle={
        styles.content
      }
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <Text
        style={
          styles.eyebrow
        }
      >
        SIX JARS
      </Text>

      <Text
        style={
          styles.title
        }
      >
        Give every income amount a job.
      </Text>

      <Text
        style={
          styles.subtitle
        }
      >
        Six Jars is a planning tool. Suggested allocations never move money or change account balances.
      </Text>


      {!profile ? (
        <View
          style={
            styles.setupCard
          }
        >
          <Text
            style={
              styles.setupTitle
            }
          >
            Set up your allocation rules
          </Text>

          <Text
            style={
              styles.setupBody
            }
          >
            Start with the classic six-jar split, then adjust percentages to fit your own plan.
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              router.push(
                '/six-jars-setup' as never,
              );
            }}
            style={
              styles.primaryButton
            }
          >
            <Text
              style={
                styles.primaryButtonText
              }
            >
              Set up Six Jars
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View
            style={
              styles.profileHeader
            }
          >
            <View
              style={
                styles.profileHeaderCopy
              }
            >
              <Text
                style={
                  styles.profileName
                }
              >
                {profile.name}
              </Text>

              <Text
                style={
                  styles.profileMeta
                }
              >
                {profile.currency_code}
                {' · '}
                {profile.jars.length}
                {' '}
                jars
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                router.push(
                  '/six-jars-setup' as never,
                );
              }}
              style={
                styles.editButton
              }
            >
              <Text
                style={
                  styles.editButtonText
                }
              >
                Edit
              </Text>
            </Pressable>
          </View>


          <View
            style={
              styles.jarGrid
            }
          >
            {profile.jars.map(
              (jar) => (
                <View
                  key={
                    jar.id
                  }
                  style={
                    styles.jarCard
                  }
                >
                  <Text
                    numberOfLines={1}
                    style={
                      styles.jarName
                    }
                  >
                    {jar.name}
                  </Text>

                  <Text
                    style={
                      styles.jarPercent
                    }
                  >
                    {basisPointsToPercentText(
                      jar.percentage_basis_points,
                    )}
                  </Text>
                </View>
              ),
            )}
          </View>


          <View
            style={
              styles.calculatorCard
            }
          >
            <Text
              style={
                styles.sectionEyebrow
              }
            >
              ALLOCATION CALCULATOR
            </Text>

            <Text
              style={
                styles.sectionTitle
              }
            >
              Enter an income amount
            </Text>

            <View
              style={
                styles.amountRow
              }
            >
              <Text
                style={
                  styles.currencyPrefix
                }
              >
                {profile.currency_code}
              </Text>

              <TextInput
                value={
                  incomeText
                }
                onChangeText={
                  setIncomeText
                }
                keyboardType="decimal-pad"
                placeholder="0.00"
                style={
                  styles.amountInput
                }
              />
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={
                calculator.isPending
                || !incomeText.trim()
              }
              onPress={() => {
                void calculate();
              }}
              style={[
                styles.primaryButton,

                (
                  calculator.isPending
                  || !incomeText.trim()
                )
                  ? styles.disabled
                  : null,
              ]}
            >
              <Text
                style={
                  styles.primaryButtonText
                }
              >
                {calculator.isPending
                  ? 'Calculating…'
                  : 'Calculate allocation'}
              </Text>
            </Pressable>
          </View>


          {errorMessage ? (
            <View
              style={
                styles.errorCard
              }
            >
              <Text
                style={
                  styles.errorText
                }
              >
                {errorMessage}
              </Text>
            </View>
          ) : null}


          {calculator.data ? (
            <View
              style={
                styles.resultsCard
              }
            >
              <Text
                style={
                  styles.sectionEyebrow
                }
              >
                SUGGESTED PLAN
              </Text>

              <Text
                style={
                  styles.resultsTitle
                }
              >
                {calculator.data.currency_code}{' '}
                {formatMinor(
                  calculator.data.income_minor,
                  currency?.minorUnit
                    ?? 2,
                )}
              </Text>

              <View
                style={
                  styles.resultList
                }
              >
                {calculator.data.jars.map(
                  (jar) => (
                    <View
                      key={
                        jar.id
                      }
                      style={
                        styles.resultRow
                      }
                    >
                      <View
                        style={
                          styles.resultCopy
                        }
                      >
                        <Text
                          style={
                            styles.resultName
                          }
                        >
                          {jar.name}
                        </Text>

                        <Text
                          style={
                            styles.resultPercent
                          }
                        >
                          {basisPointsToPercentText(
                            jar.percentage_basis_points,
                          )}
                        </Text>
                      </View>

                      <Text
                        style={
                          styles.resultAmount
                        }
                      >
                        {calculator.data.currency_code}{' '}
                        {formatMinor(
                          jar.suggested_amount_minor,
                          currency?.minorUnit
                            ?? 2,
                        )}
                      </Text>
                    </View>
                  ),
                )}
              </View>

              <View
                style={
                  styles.planningNote
                }
              >
                <Text
                  style={
                    styles.planningTitle
                  }
                >
                  Planning only
                </Text>

                <Text
                  style={
                    styles.planningText
                  }
                >
                  These numbers are suggestions. No transaction, transfer, or account-balance change has been created.
                </Text>
              </View>
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
      backgroundColor: colors.background,
    },

    content: {
      width: '100%',
      maxWidth: layout.contentMaxWidth,
      alignSelf: 'center',
      paddingHorizontal: layout.screenHorizontalPadding,
      paddingTop: 22,
      paddingBottom: 120,
    },

    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      backgroundColor: colors.background,
    },

    muted: {
      color: colors.textSecondary,
      fontSize: typography.small,
    },

    eyebrow: {
      color: colors.primary,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
      letterSpacing: 1.4,
    },

    title: {
      marginTop: 8,
      color: colors.text,
      fontSize: typography.title,
      lineHeight: 35,
      fontWeight: typography.weightBold,
    },

    subtitle: {
      marginTop: 8,
      marginBottom: 20,
      color: colors.textSecondary,
      fontSize: typography.small,
      lineHeight: 21,
    },

    setupCard: {
      padding: 20,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      ...elevation.card
    },

    setupTitle: {
      color: colors.text,
      fontSize: typography.subheading,
      fontWeight: typography.weightBold,
    },

    setupBody: {
      marginTop: 7,
      color: colors.textSecondary,
      fontSize: typography.small,
      lineHeight: 20,
    },

    primaryButton: {
      minHeight: 50,
      marginTop: 18,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.md,
      backgroundColor: colors.primary,
    },

    primaryButtonText: {
      color: colors.textOnPrimary,
      fontSize: typography.small,
      fontWeight: typography.weightBold,
    },

    disabled: {
      opacity: 0.45,
    },

    profileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginBottom: 13,
    },

    profileHeaderCopy: {
      flex: 1,
    },

    profileName: {
      color: colors.text,
      fontSize: typography.subheading,
      fontWeight: typography.weightBold,
    },

    profileMeta: {
      marginTop: 3,
      color: colors.textSecondary,
      fontSize: typography.caption,
    },

    editButton: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      backgroundColor: colors.surface,
    },

    editButtonText: {
      color: colors.primary,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
    },

    jarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 9,
    },

    jarCard: {
      width: '48%',
      minHeight: 86,
      padding: 13,
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...elevation.card
    },

    jarName: {
      color: colors.textSecondary,
      fontSize: typography.caption,
      fontWeight: typography.weightSemibold,
    },

    jarPercent: {
      marginTop: 7,
      color: colors.primary,
      fontSize: typography.heading,
      fontWeight: typography.weightBold,
    },

    calculatorCard: {
      marginTop: 18,
      padding: 18,
      borderRadius: radii.lg,
      backgroundColor: colors.text,
      ...elevation.card
    },

    sectionEyebrow: {
      color: colors.accentStrong,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
      letterSpacing: 1.1,
    },

    sectionTitle: {
      marginTop: 5,
      color: colors.textOnPrimary,
      fontSize: typography.subheading,
      fontWeight: typography.weightBold,
    },

    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 60,
      marginTop: 15,
      paddingHorizontal: 14,
      borderRadius: radii.md,
      backgroundColor: colors.surface,
    },

    currencyPrefix: {
      marginRight: 9,
      color: colors.textSecondary,
      fontSize: typography.small,
      fontWeight: typography.weightBold,
    },

    amountInput: {
      flex: 1,
      color: colors.text,
      fontSize: typography.heading,
      fontWeight: typography.weightBold,
    },

    errorCard: {
      marginTop: 14,
      padding: 13,
      borderRadius: radii.md,
      backgroundColor: colors.dangerSurface,
    },

    errorText: {
      color: colors.danger,
      fontSize: typography.small,
      lineHeight: 18,
    },

    resultsCard: {
      marginTop: 16,
      padding: 18,
      borderRadius: radii.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...elevation.card
    },

    resultsTitle: {
      marginTop: 5,
      color: colors.text,
      fontSize: typography.heading,
      fontWeight: typography.weightBold,
    },

    resultList: {
      marginTop: 14,
    },

    resultRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 11,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },

    resultCopy: {
      flex: 1,
    },

    resultName: {
      color: colors.text,
      fontSize: typography.small,
      fontWeight: typography.weightBold,
    },

    resultPercent: {
      marginTop: 2,
      color: colors.textTertiary,
      fontSize: typography.caption,
    },

    resultAmount: {
      color: colors.primary,
      fontSize: typography.small,
      fontWeight: typography.weightBold,
    },

    planningNote: {
      marginTop: 15,
      padding: 13,
      borderRadius: radii.md,
      backgroundColor: colors.surfaceMuted,
    },

    planningTitle: {
      color: colors.primary,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
    },

    planningText: {
      marginTop: 3,
      color: colors.textSecondary,
      fontSize: typography.caption,
      lineHeight: 17,
    },
  });