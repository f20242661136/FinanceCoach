import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  AppButton,
} from '@/components/ui/app-button';
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
  useRouter,
} from 'expo-router';

import {
  useLocalFinanceReferenceData,
} from '../../offline/sync/use-local-finance-reference-data';

import {
  formatMinor,
} from '../budgets/budget-money';

import {
  formatBasisPoints,
  monthDisplayLabel,
} from './dashboard-format';

import {
  useFinancialDashboardSummary,
} from './dashboard-query';


function countLabel(
  value: string,
  singular: string,
  plural: string,
): string {
  return `${
    value
  } ${
    value === '1'
      ? singular
      : plural
  }`;
}


export function DashboardCommandCenter() {
  const router =
    useRouter();

  const query =
    useFinancialDashboardSummary();

  const reference =
    useLocalFinanceReferenceData();

  const summary =
    query.data;


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


  if (
    query.isLoading
    && !summary
  ) {
    return (
      <StatePanel
        loading
        description="Building your financial snapshot..."
      />
    );
  }


  if (
    query.error
    && !summary
  ) {
    return (
      <StatePanel
        title="Dashboard snapshot unavailable"
        description="Your saved finance data is still available below."
        icon="cloud-offline-outline"
        tone="danger"
        action={
          <AppButton
            label="Retry"
            variant="secondary"
            fullWidth={false}
            onPress={() => {
              void query.refetch();
            }}
          />
        }
      />
    );
  }


  if (!summary) {
    return null;
  }


  const budgetWarnings =
    BigInt(
      summary.budgets
        .over_budget_count,
    )
    +
    BigInt(
      summary.budgets
        .near_limit_count,
    );


  return (
    <View
      style={
        styles.wrapper
      }
    >
      <View
        style={
          styles.headingRow
        }
      >
        <View>
          <Text
            style={
              styles.eyebrow
            }
          >
            FINANCIAL OVERVIEW
          </Text>

          <Text
            style={
              styles.heading
            }
          >
            {monthDisplayLabel(
              summary.month_start,
            )}
          </Text>
        </View>

        <Text
          style={
            styles.asOf
          }
        >
          As of {summary.as_of}
        </Text>
      </View>


      <View
        style={
          styles.quickActions
        }
      >
        <AppButton
          label="Add transaction"
          icon="add"
          fullWidth={false}
          style={styles.quickAction}
          onPress={() => {
            router.push(
              '/quick-add' as never,
            );
          }}
        />

        <AppButton
          label="Transfer"
          icon="swap-horizontal"
          variant="secondary"
          fullWidth={false}
          style={styles.quickAction}
          onPress={() => {
            router.push(
              '/transfer' as never,
            );
          }}
        />
      </View>

      {summary.cash_flow_by_currency.length === 0 ? (
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
            No income or expenses this month
          </Text>

          <Text
            style={
              styles.emptyBody
            }
          >
            Add your first transaction to start building the monthly picture.
          </Text>
        </View>
      ) : (
        <View
          style={
            styles.currencyList
          }
        >
          {summary.cash_flow_by_currency.map(
            (cashFlow) => {
              const minorUnit =
                minorUnitFor(
                  cashFlow.currency_code,
                );

              return (
                <View
                  key={
                    cashFlow.currency_code
                  }
                  style={
                    styles.cashFlowCard
                  }
                >
                  <View
                    style={
                      styles.cashFlowHeader
                    }
                  >
                    <Text
                      style={
                        styles.currencyCode
                      }
                    >
                      {cashFlow.currency_code}
                    </Text>

                    <Text
                      style={
                        styles.savingsRate
                      }
                    >
                      Savings rate{' '}
                      {formatBasisPoints(
                        cashFlow.savings_rate_basis_points,
                      )}
                    </Text>
                  </View>


                  <View
                    style={
                      styles.metrics
                    }
                  >
                    <View
                      style={
                        styles.metric
                      }
                    >
                      <Text
                        style={
                          styles.metricLabel
                        }
                      >
                        Income
                      </Text>

                      <Text
                        style={
                          styles.metricValue
                        }
                      >
                        {formatMinor(
                          cashFlow.income_minor,
                          minorUnit,
                        )}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.metric
                      }
                    >
                      <Text
                        style={
                          styles.metricLabel
                        }
                      >
                        Expenses
                      </Text>

                      <Text
                        style={
                          styles.metricValue
                        }
                      >
                        {formatMinor(
                          cashFlow.expense_minor,
                          minorUnit,
                        )}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.metric
                      }
                    >
                      <Text
                        style={
                          styles.metricLabel
                        }
                      >
                        Net
                      </Text>

                      <Text
                        style={[
                          styles.metricValue,

                          cashFlow.net_minor
                            .startsWith('-')
                            ? styles.negative
                            : styles.positive,
                        ]}
                      >
                        {formatMinor(
                          cashFlow.net_minor,
                          minorUnit,
                        )}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            },
          )}
        </View>
      )}


      <View
        style={
          styles.balanceCard
        }
      >
        <Text
          style={
            styles.sectionEyebrow
          }
        >
          ACTIVE ACCOUNT BALANCES
        </Text>

        {summary.account_balances_by_currency.length === 0 ? (
          <Text
            style={
              styles.emptyBody
            }
          >
            No active accounts yet.
          </Text>
        ) : (
          summary.account_balances_by_currency.map(
            (balance) => (
              <View
                key={
                  balance.currency_code
                }
                style={
                  styles.balanceRow
                }
              >
                <View>
                  <Text
                    style={
                      styles.balanceCurrency
                    }
                  >
                    {balance.currency_code}
                  </Text>

                  <Text
                    style={
                      styles.balanceMeta
                    }
                  >
                    {countLabel(
                      balance.account_count,
                      'account',
                      'accounts',
                    )}
                  </Text>
                </View>

                <Text
                  style={
                    styles.balanceValue
                  }
                >
                  {formatMinor(
                    balance.total_balance_minor,
                    minorUnitFor(
                      balance.currency_code,
                    ),
                  )}
                </Text>
              </View>
            ),
          )
        )}

        {summary.account_balances_by_currency.length > 1 ? (
          <Text
            style={
              styles.currencyNote
            }
          >
            Currencies are kept separate. No exchange-rate assumptions are applied.
          </Text>
        ) : null}
      </View>


      <View
        style={
          styles.signalGrid
        }
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            router.push(
              '/budgets' as never,
            );
          }}
          style={({ pressed }) => [
            styles.signalCard,
            pressed
              && styles.signalCardPressed,
          ]}
        >
          <Text
            style={
              styles.signalLabel
            }
          >
            Budgets
          </Text>

          <Text
            style={[
              styles.signalNumber,

              budgetWarnings >
                BigInt(0)
                ? styles.warning
                : null,
            ]}
          >
            {budgetWarnings.toString()}
          </Text>

          <Text
            style={
              styles.signalBody
            }
          >
            {budgetWarnings ===
            BigInt(0)
              ? 'No current warnings'
              : 'Near or over limit'}
          </Text>
        </Pressable>


        <Pressable
          accessibilityRole="button"
          onPress={() => {
            router.push(
              '/goals' as never,
            );
          }}
          style={({ pressed }) => [
            styles.signalCard,
            pressed
              && styles.signalCardPressed,
          ]}
        >
          <Text
            style={
              styles.signalLabel
            }
          >
            Goals
          </Text>

          <Text
            style={
              styles.signalNumber
            }
          >
            {summary.goals.active_count}
          </Text>

          <Text
            style={
              styles.signalBody
            }
          >
            Active ·{' '}
            {summary.goals
              .target_reached_count}{' '}
            reached
          </Text>
        </Pressable>
      </View>


      <View
        style={
          styles.activityStrip
        }
      >
        <View>
          <Text
            style={
              styles.activityNumber
            }
          >
            {summary.activity
              .transaction_count_this_month}
          </Text>

          <Text
            style={
              styles.activityLabel
            }
          >
            ledger entries this month
          </Text>
        </View>

        <View
          style={
            styles.activityRight
          }
        >
          <Text
            style={
              styles.activitySmallLabel
            }
          >
            Latest activity
          </Text>

          <Text
            style={
              styles.activityDate
            }
          >
            {summary.activity
              .last_transaction_date
              ?? '—'}
          </Text>
        </View>
      </View>
    </View>
  );
}


const styles =
  StyleSheet.create({
    wrapper: {
      gap: spacing.md,
      marginBottom: spacing.lg,
    },

    headingRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: spacing.md,
    },

    eyebrow: {
      color: colors.primary,
      fontSize: typography.caption,
      lineHeight: typography.lineHeightCaption,
      fontWeight: typography.weightExtraBold,
      letterSpacing: 1.1,
    },

    heading: {
      marginTop: spacing.xxs,
      color: colors.text,
      fontSize: typography.heading,
      lineHeight: typography.lineHeightHeading,
      fontWeight: typography.weightExtraBold,
      letterSpacing: -0.4,
    },

    asOf: {
      color: colors.textTertiary,
      fontSize: typography.caption,
      lineHeight: typography.lineHeightCaption,
      textAlign: 'right',
    },

    quickActions: {
      flexDirection: 'row',
      gap: spacing.sm,
    },

    quickAction: {
      flex: 1,
      minHeight: layout.touchTarget + 2,
    },

    currencyList: {
      gap: spacing.sm,
    },

    cashFlowCard: {
      padding: spacing.lg,
      borderRadius: radii.xl,
      backgroundColor: colors.primary,
      ...elevation.floating,
    },

    cashFlowHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },

    currencyCode: {
      color: colors.textOnPrimary,
      fontSize: typography.small,
      lineHeight: typography.lineHeightSmall,
      fontWeight: typography.weightExtraBold,
      letterSpacing: 0.8,
    },

    savingsRate: {
      color: colors.accentStrong,
      fontSize: typography.caption,
      lineHeight: typography.lineHeightCaption,
      fontWeight: typography.weightSemibold,
      textAlign: 'right',
    },

    metrics: {
      flexDirection: 'row',
      marginTop: spacing.lg,
      gap: spacing.md,
    },

    metric: {
      flex: 1,
      minWidth: 0,
    },

    metricLabel: {
      color: colors.accentStrong,
      fontSize: typography.caption,
      lineHeight: typography.lineHeightCaption,
      fontWeight: typography.weightSemibold,
    },

    metricValue: {
      marginTop: spacing.xxs,
      color: colors.textOnPrimary,
      fontSize: typography.body,
      lineHeight: typography.lineHeightBody,
      fontWeight: typography.weightBold,
    },

    positive: {
      color: colors.accentStrong,
    },

    negative: {
      color: colors.dangerSurface,
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
      fontSize: typography.body,
      lineHeight: typography.lineHeightBody,
      fontWeight: typography.weightBold,
    },

    emptyBody: {
      marginTop: spacing.xs,
      color: colors.textSecondary,
      fontSize: typography.small,
      lineHeight: typography.lineHeightSmall,
    },

    balanceCard: {
      padding: spacing.lg,
      borderRadius: radii.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...elevation.card,
    },

    sectionEyebrow: {
      marginBottom: spacing.sm,
      color: colors.textTertiary,
      fontSize: typography.caption,
      lineHeight: typography.lineHeightCaption,
      fontWeight: typography.weightExtraBold,
      letterSpacing: 0.9,
    },

    balanceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      paddingVertical: spacing.sm,
    },

    balanceCurrency: {
      color: colors.text,
      fontSize: typography.small,
      lineHeight: typography.lineHeightSmall,
      fontWeight: typography.weightBold,
    },

    balanceMeta: {
      marginTop: spacing.xxs,
      color: colors.textTertiary,
      fontSize: typography.caption,
      lineHeight: typography.lineHeightCaption,
    },

    balanceValue: {
      color: colors.text,
      fontSize: typography.subheading,
      lineHeight: typography.lineHeightSubheading,
      fontWeight: typography.weightExtraBold,
      textAlign: 'right',
    },

    currencyNote: {
      marginTop: spacing.sm,
      color: colors.textTertiary,
      fontSize: typography.caption,
      lineHeight: typography.lineHeightCaption,
    },

    signalGrid: {
      flexDirection: 'row',
      gap: spacing.sm,
    },

    signalCard: {
      flex: 1,
      minHeight: 126,
      padding: spacing.md,
      borderRadius: radii.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...elevation.card,
    },

    signalCardPressed: {
      backgroundColor: colors.surfaceMuted,
      borderColor: colors.borderStrong,
    },

    signalLabel: {
      color: colors.textSecondary,
      fontSize: typography.caption,
      lineHeight: typography.lineHeightCaption,
      fontWeight: typography.weightBold,
    },

    signalNumber: {
      marginTop: spacing.sm,
      color: colors.primary,
      fontSize: 28,
      lineHeight: 34,
      fontWeight: typography.weightExtraBold,
      letterSpacing: -0.5,
    },

    warning: {
      color: colors.warning,
    },

    signalBody: {
      marginTop: spacing.xxs,
      color: colors.textTertiary,
      fontSize: typography.caption,
      lineHeight: typography.lineHeightCaption,
    },

    activityStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radii.lg,
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.accentStrong,
    },

    activityNumber: {
      color: colors.primary,
      fontSize: typography.heading,
      lineHeight: typography.lineHeightHeading,
      fontWeight: typography.weightExtraBold,
    },

    activityLabel: {
      marginTop: spacing.xxs,
      color: colors.textSecondary,
      fontSize: typography.caption,
      lineHeight: typography.lineHeightCaption,
    },

    activityRight: {
      alignItems: 'flex-end',
    },

    activitySmallLabel: {
      color: colors.textTertiary,
      fontSize: typography.caption,
      lineHeight: typography.lineHeightCaption,
    },

    activityDate: {
      marginTop: spacing.xxs,
      color: colors.text,
      fontSize: typography.small,
      lineHeight: typography.lineHeightSmall,
      fontWeight: typography.weightBold,
    },
  });
