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
  useBudgetStatus,
} from './budget-query';

import {
  formatMinor,
  formatUsagePercent,
} from './budget-money';


function monthLabel(
  start: string,
  end: string,
): string {
  return `${start} → ${end}`;
}


function progressWidth(
  basisPoints: string,
): `${number}%` {
  const raw =
    BigInt(
      basisPoints,
    );

  const clamped =
    raw < BigInt(0)
      ? BigInt(0)
      : raw > BigInt(10000)
        ? BigInt(10000)
        : raw;

  const percent =
    Number(
      clamped,
    )
    / 100;

  return `${percent}%`;
}


export function BudgetsScreen() {
  const router =
    useRouter();

  const query =
    useBudgetStatus();

  const budgets =
    query.data ?? [];


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
            PLAN
          </Text>

          <Text
            style={
              styles.title
            }
          >
            Budgets
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            Track spending against limits calculated from your server ledger.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            router.push(
              '/create-budget' as never,
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
              styles.stateTitle
            }
          >
            Loading budgets…
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
            Couldn’t load budgets
          </Text>

          <Text
            style={
              styles.stateBody
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
      && budgets.length === 0 ? (
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
            No active budgets yet
          </Text>

          <Text
            style={
              styles.emptyBody
            }
          >
            Start with one monthly overall budget or a category limit.
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              router.push(
                '/create-budget' as never,
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
              Create budget
            </Text>
          </Pressable>
        </View>
      ) : null}


      <View
        style={
          styles.list
        }
      >
        {budgets.map(
          (budget) => {
            const minorUnit =
              2;

            const over =
              budget.is_over_budget;

            return (
              <View
                key={
                  budget.id
                }
                style={[
                  styles.card,

                  over
                    ? styles.overCard
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
                        styles.cardTitle
                      }
                    >
                      {budget.name}
                    </Text>

                    <Text
                      style={
                        styles.cardMeta
                      }
                    >
                      {budget.category_name
                        ? `${budget.category_name} · `
                        : 'Overall · '}

                      {budget.currency_code}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusPill,

                      over
                        ? styles.statusPillOver
                        : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,

                        over
                          ? styles.statusPillTextOver
                          : null,
                      ]}
                    >
                      {over
                        ? 'Over budget'
                        : `${formatUsagePercent(
                            budget.usage_basis_points,
                          )} used`}
                    </Text>
                  </View>
                </View>


                <View
                  style={
                    styles.progressTrack
                  }
                >
                  <View
                    style={[
                      styles.progressFill,

                      {
                        width:
                          progressWidth(
                            budget.usage_basis_points,
                          ),
                      },

                      over
                        ? styles.progressFillOver
                        : null,
                    ]}
                  />
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
                      Spent
                    </Text>

                    <Text
                      style={
                        styles.moneyValue
                      }
                    >
                      {budget.currency_code}{' '}
                      {formatMinor(
                        budget.spent_minor,
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
                      Limit
                    </Text>

                    <Text
                      style={
                        styles.moneyValue
                      }
                    >
                      {budget.currency_code}{' '}
                      {formatMinor(
                        budget.limit_minor,
                        minorUnit,
                      )}
                    </Text>
                  </View>
                </View>


                <View
                  style={
                    styles.detailRow
                  }
                >
                  <Text
                    style={
                      styles.detailText
                    }
                  >
                    Remaining:{' '}
                    {budget.currency_code}{' '}
                    {formatMinor(
                      budget.remaining_minor,
                      minorUnit,
                    )}
                  </Text>

                  <Text
                    style={
                      styles.detailText
                    }
                  >
                    Projected:{' '}
                    {budget.currency_code}{' '}
                    {formatMinor(
                      budget.projected_spend_minor,
                      minorUnit,
                    )}
                  </Text>
                </View>


                <Text
                  style={
                    styles.period
                  }
                >
                  {monthLabel(
                    budget.period_start,
                    budget.period_end,
                  )}
                </Text>
              </View>
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
      fontWeight: typography.weightBold,
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

    stateTitle: {
      color: colors.text,
      fontSize: typography.body,
      lineHeight:
        typography.lineHeightBody,
      fontWeight: typography.weightBold,
    },

    errorTitle: {
      color: colors.danger,
      fontSize: typography.body,
      lineHeight:
        typography.lineHeightBody,
      fontWeight: typography.weightBold,
    },

    stateBody: {
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
      fontWeight: typography.weightBold,
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
      fontWeight: typography.weightBold,
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
      marginTop: spacing.md,
      minHeight: layout.touchTarget,
      paddingHorizontal: spacing.md,
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

    overCard: {
      borderColor: colors.danger,
      backgroundColor:
        colors.dangerSurface,
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

    cardTitle: {
      color: colors.text,
      fontSize: typography.subheading,
      lineHeight:
        typography.lineHeightSubheading,
      fontWeight: typography.weightBold,
    },

    cardMeta: {
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
        colors.primarySoft,
    },

    statusPillOver: {
      backgroundColor:
        colors.dangerSurface,
    },

    statusPillText: {
      color: colors.primary,
      fontSize: typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight: typography.weightBold,
    },

    statusPillTextOver: {
      color: colors.danger,
    },

    progressTrack: {
      height: 9,
      marginTop: spacing.md,
      overflow: 'hidden',
      borderRadius: radii.pill,
      backgroundColor:
        colors.surfaceStrong,
    },

    progressFill: {
      height: '100%',
      borderRadius: radii.pill,
      backgroundColor: colors.primary,
    },

    progressFillOver: {
      backgroundColor: colors.danger,
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
      fontWeight: typography.weightBold,
    },

    detailRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: spacing.sm,
      marginTop: spacing.md,
    },

    detailText: {
      color: colors.textSecondary,
      fontSize: typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    period: {
      marginTop: spacing.sm,
      color: colors.textTertiary,
      fontSize: typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },
  });
