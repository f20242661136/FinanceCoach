import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  colors,
  elevation,
  layout,
  radii,
  spacing,
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
} from '../budgets/budget-money';

import {
  interestBasisPointsToPercent,
  loanDirectionLabel,
} from './loan-format';

import {
  useLoanStatus,
} from './loan-query';


export function LoansScreen() {
  const router =
    useRouter();

  const query =
    useLoanStatus();

  const reference =
    useLocalFinanceReferenceData();

  const loans =
    query.data ?? [];


  function minorUnitFor(
    currencyCode: string,
  ): number {
    return (
      reference.data
        ?.currencies
        .find(
          (currency) =>
            currency.code ===
            currencyCode,
        )
        ?.minorUnit
      ?? 2
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
      refreshControl={
        <RefreshControl
          refreshing={
            query.isRefetching
          }
          onRefresh={() => {
            void query.refetch();
          }}
        />
      }
    >
      <View
        style={
          styles.headerRow
        }
      >
        <View
          style={
            styles.headerCopy
          }
        >
          <Text
            style={
              styles.eyebrow
            }
          >
            LOANS
          </Text>

          <Text
            style={
              styles.title
            }
          >
            Money borrowed and money given
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            Track principal, due dates and every payment with a separate history.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            router.push(
              '/create-loan' as never,
            );
          }}
          style={
            styles.addButton
          }
        >
          <Text
            style={
              styles.addButtonText
            }
          >
            + Add
          </Text>
        </Pressable>
      </View>


      {query.isLoading ? (
        <View
          style={
            styles.stateCard
          }
        >
          <Text
            style={
              styles.stateText
            }
          >
            Loading loans…
          </Text>
        </View>
      ) : null}


      {query.error ? (
        <View
          style={[
            styles.stateCard,
            styles.errorCard,
          ]}
        >
          <Text
            style={
              styles.errorTitle
            }
          >
            Couldn’t load loans
          </Text>

          <Text
            style={
              styles.stateText
            }
          >
            {query.error instanceof Error
              ? query.error.message
              : 'Please try again.'}
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void query.refetch();
            }}
            style={
              styles.retryButton
            }
          >
            <Text
              style={
                styles.retryButtonText
              }
            >
              Retry
            </Text>
          </Pressable>
        </View>
      ) : null}


      {!query.isLoading
      && !query.error
      && loans.length === 0 ? (
        <View
          style={
            styles.emptyCard
          }
        >
          <Text
            style={
              styles.emptyTitle
            }
          >
            No loans yet
          </Text>

          <Text
            style={
              styles.emptyBody
            }
          >
            Add money you borrowed or money you gave to someone so repayment stays clear.
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              router.push(
                '/create-loan' as never,
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
              Add loan
            </Text>
          </Pressable>
        </View>
      ) : null}


      <View
        style={
          styles.list
        }
      >
        {loans.map(
          (loan) => {
            const minorUnit =
              minorUnitFor(
                loan.currency_code,
              );

            return (
              <Pressable
                key={
                  loan.id
                }
                accessibilityRole="button"
                onPress={() => {
                  router.push({
                    pathname:
                      '/loan-detail' as never,

                    params: {
                      loanId:
                        loan.id,
                    },
                  });
                }}
                style={({ pressed }) => [
                  styles.card,

                  loan.is_overdue
                    ? styles.overdueCard
                    : null,

                  loan.status ===
                    'settled'
                    ? styles.settledCard
                    : null,

                  pressed
                    ? styles.pressed
                    : null,
                ]}
              >
                <View
                  style={
                    styles.cardHeader
                  }
                >
                  <View
                    style={
                      styles.cardHeaderCopy
                    }
                  >
                    <Text
                      style={
                        styles.counterparty
                      }
                    >
                      {loan.counterparty_name}
                    </Text>

                    <Text
                      style={
                        styles.direction
                      }
                    >
                      {loanDirectionLabel(
                        loan.direction,
                      )}
                      {' · '}
                      {loan.currency_code}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusPill,

                      loan.is_overdue
                        ? styles.overduePill
                        : null,

                      loan.status ===
                        'settled'
                        ? styles.settledPill
                        : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,

                        loan.is_overdue
                          ? styles.overdueText
                          : null,

                        loan.status ===
                          'settled'
                          ? styles.settledText
                          : null,
                      ]}
                    >
                      {loan.status ===
                        'settled'
                        ? 'Settled'
                        : loan.is_overdue
                          ? 'Overdue'
                          : 'Active'}
                    </Text>
                  </View>
                </View>


                <View
                  style={
                    styles.moneyRow
                  }
                >
                  <View>
                    <Text
                      style={
                        styles.moneyLabel
                      }
                    >
                      Remaining
                    </Text>

                    <Text
                      style={
                        styles.moneyValue
                      }
                    >
                      {loan.currency_code}{' '}
                      {formatMinor(
                        loan.remaining_minor,
                        minorUnit,
                      )}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.moneyRight
                    }
                  >
                    <Text
                      style={
                        styles.moneyLabel
                      }
                    >
                      Principal
                    </Text>

                    <Text
                      style={
                        styles.moneyValue
                      }
                    >
                      {loan.currency_code}{' '}
                      {formatMinor(
                        loan.principal_minor,
                        minorUnit,
                      )}
                    </Text>
                  </View>
                </View>


                <View
                  style={
                    styles.metaRow
                  }
                >
                  <Text
                    style={
                      styles.metaText
                    }
                  >
                    {interestBasisPointsToPercent(
                      loan.interest_rate_basis_points,
                    )}
                  </Text>

                  <Text
                    style={
                      styles.metaText
                    }
                  >
                    {loan.due_date
                      ? `Due ${loan.due_date}`
                      : 'No due date'}
                  </Text>
                </View>
              </Pressable>
            );
          },
        )}
      </View>
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
      flexGrow: 1,
      width: '100%',
      maxWidth: layout.contentMaxWidth,
      alignSelf: 'center',
      paddingHorizontal:
        layout.screenHorizontalPadding,
      paddingTop: spacing.lg,
      paddingBottom: 120,
    },

    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      marginBottom: spacing.lg,
    },

    headerCopy: {
      flex: 1,
      minWidth: 0,
    },

    eyebrow: {
      color: colors.primary,
      fontSize: typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight:
        typography.weightBold,
      letterSpacing: 1.2,
    },

    title: {
      marginTop: spacing.sm,
      color: colors.text,
      fontSize: typography.title,
      lineHeight:
        typography.lineHeightTitle,
      fontWeight:
        typography.weightExtraBold,
      letterSpacing: -0.6,
    },

    subtitle: {
      marginTop: spacing.sm,
      color: colors.textSecondary,
      fontSize: typography.small,
      lineHeight:
        typography.lineHeightSmall,
    },

    addButton: {
      minHeight: layout.touchTarget,
      paddingHorizontal: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.md,
      backgroundColor: colors.primary,
    },

    addButtonText: {
      color: colors.textOnPrimary,
      fontSize: typography.small,
      fontWeight:
        typography.weightBold,
    },

    stateCard: {
      padding: spacing.lg,
      borderRadius: radii.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...elevation.card,
    },

    errorCard: {
      backgroundColor:
        colors.dangerSurface,
      borderColor: colors.danger,
    },

    errorTitle: {
      color: colors.danger,
      fontSize: typography.body,
      lineHeight:
        typography.lineHeightBody,
      fontWeight:
        typography.weightBold,
    },

    stateText: {
      marginTop: spacing.xs,
      color: colors.textSecondary,
      fontSize: typography.small,
      lineHeight:
        typography.lineHeightSmall,
    },

    retryButton: {
      alignSelf: 'flex-start',
      marginTop: spacing.md,
      minHeight: layout.touchTarget,
      paddingHorizontal: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.md,
      backgroundColor: colors.primary,
    },

    retryButtonText: {
      color: colors.textOnPrimary,
      fontSize: typography.small,
      fontWeight:
        typography.weightBold,
    },

    emptyCard: {
      padding: spacing.lg,
      borderRadius: radii.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...elevation.card,
    },

    emptyTitle: {
      color: colors.text,
      fontSize: typography.subheading,
      lineHeight:
        typography.lineHeightSubheading,
      fontWeight:
        typography.weightBold,
    },

    emptyBody: {
      marginTop: spacing.xs,
      color: colors.textSecondary,
      fontSize: typography.small,
      lineHeight:
        typography.lineHeightSmall,
    },

    primaryButton: {
      alignSelf: 'flex-start',
      minHeight: layout.touchTarget,
      marginTop: spacing.md,
      paddingHorizontal: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.md,
      backgroundColor: colors.primary,
    },

    primaryButtonText: {
      color: colors.textOnPrimary,
      fontSize: typography.small,
      fontWeight:
        typography.weightBold,
    },

    list: {
      gap: spacing.md,
    },

    card: {
      padding: spacing.md,
      borderRadius: radii.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...elevation.card,
    },

    overdueCard: {
      backgroundColor:
        colors.warningSurface,
      borderColor: colors.warning,
    },

    settledCard: {
      backgroundColor:
        colors.successSurface,
      borderColor:
        colors.accentStrong,
    },

    pressed: {
      opacity: 0.82,
      transform: [
        {
          scale: 0.995,
        },
      ],
    },

    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
    },

    cardHeaderCopy: {
      flex: 1,
      minWidth: 0,
    },

    counterparty: {
      color: colors.text,
      fontSize: typography.subheading,
      lineHeight:
        typography.lineHeightSubheading,
      fontWeight:
        typography.weightBold,
    },

    direction: {
      marginTop: spacing.xxs,
      color: colors.textSecondary,
      fontSize: typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    statusPill: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radii.pill,
      backgroundColor:
        colors.neutralSurface,
    },

    overduePill: {
      backgroundColor:
        colors.warningSurface,
    },

    settledPill: {
      backgroundColor:
        colors.successSurface,
    },

    statusText: {
      color: colors.neutral,
      fontSize: typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight:
        typography.weightBold,
    },

    overdueText: {
      color: colors.warning,
    },

    settledText: {
      color: colors.success,
    },

    moneyRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.md,
      marginTop: spacing.md,
    },

    moneyRight: {
      alignItems: 'flex-end',
    },

    moneyLabel: {
      color: colors.textTertiary,
      fontSize: typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight:
        typography.weightSemibold,
    },

    moneyValue: {
      marginTop: spacing.xxs,
      color: colors.text,
      fontSize: typography.body,
      lineHeight:
        typography.lineHeightBody,
      fontWeight:
        typography.weightBold,
    },

    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.md,
    },

    metaText: {
      color: colors.textTertiary,
      fontSize: typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },
  });
