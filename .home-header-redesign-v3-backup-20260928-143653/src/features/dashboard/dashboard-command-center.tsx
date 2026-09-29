import Ionicons from '@expo/vector-icons/Ionicons';

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
  return `${value} ${
    value === '1'
      ? singular
      : plural
  }`;
}

function formatAsOf(
  value: string,
): string {
  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return 'Updated recently';
  }

  return `Updated ${parsed.toLocaleString(
    undefined,
    {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    },
  )}`;
}

type ActionTileProps = {
  icon:
    keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  emphasis?: 'primary' | 'secondary';
  onPress: () => void;
};

function ActionTile({
  icon,
  label,
  description,
  emphasis = 'secondary',
  onPress,
}: ActionTileProps) {
  const isPrimary =
    emphasis === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={
        description
      }
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionTile,
        isPrimary
          ? styles.actionTilePrimary
          : styles.actionTileSecondary,
        pressed
          ? styles.actionTilePressed
          : null,
      ]}
    >
      <View
        style={[
          styles.actionIcon,
          isPrimary
            ? styles.actionIconPrimary
            : styles.actionIconSecondary,
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={
            isPrimary
              ? colors.primary
              : colors.textOnPrimary
          }
        />
      </View>

      <View style={styles.actionCopy}>
        <Text
          style={[
            styles.actionLabel,
            isPrimary
              ? styles.actionLabelPrimary
              : styles.actionLabelSecondary,
          ]}
        >
          {label}
        </Text>

        <Text
          style={[
            styles.actionDescription,
            isPrimary
              ? styles.actionDescriptionPrimary
              : styles.actionDescriptionSecondary,
          ]}
        >
          {description}
        </Text>
      </View>
    </Pressable>
  );
}

type SignalCardProps = {
  label: string;
  value: string;
  body: string;
  icon:
    keyof typeof Ionicons.glyphMap;
  tone?: 'default' | 'warning';
  onPress: () => void;
};

function SignalCard({
  label,
  value,
  body,
  icon,
  tone = 'default',
  onPress,
}: SignalCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}. ${body}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.signalCard,
        pressed
          ? styles.signalCardPressed
          : null,
      ]}
    >
      <View style={styles.signalTop}>
        <View
          style={[
            styles.signalIcon,
            tone === 'warning'
              ? styles.signalIconWarning
              : null,
          ]}
        >
          <Ionicons
            name={icon}
            size={19}
            color={
              tone === 'warning'
                ? colors.warning
                : colors.primary
            }
          />
        </View>

        <Ionicons
          name="chevron-forward-outline"
          size={18}
          color={
            colors.textTertiary
          }
        />
      </View>

      <Text style={styles.signalLabel}>
        {label}
      </Text>

      <Text
        style={[
          styles.signalValue,
          tone === 'warning'
            ? styles.signalValueWarning
            : null,
        ]}
      >
        {value}
      </Text>

      <Text style={styles.signalBody}>
        {body}
      </Text>
    </Pressable>
  );
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
          currency =>
            currency.code
            === currencyCode,
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
        title="Preparing your overview"
        description="Finance Coach is bringing together your latest balances and activity."
      />
    );
  }

  if (
    query.error
    && !summary
  ) {
    return (
      <StatePanel
        title="Overview unavailable"
        description="Your saved finance data is still available below. Try the overview again when your connection is ready."
        icon="cloud-offline-outline"
        tone="danger"
        action={
          <AppButton
            label="Try again"
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

  const hasCashFlow =
    summary.cash_flow_by_currency
      .length > 0;

  const hasBalances =
    summary.account_balances_by_currency
      .length > 0;

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>
            YOUR OVERVIEW
          </Text>

          <Text
            accessibilityRole="header"
            style={styles.heading}
          >
            {monthDisplayLabel(
              summary.month_start,
            )}
          </Text>

          <Text style={styles.headerBody}>
            A simple view of what came in, what went out, and what needs attention.
          </Text>
        </View>

        <Text style={styles.asOf}>
          {formatAsOf(
            summary.as_of,
          )}
        </Text>
      </View>

      <View style={styles.actions}>
        <ActionTile
          icon="add"
          label="Add transaction"
          description="Income or expense"
          emphasis="primary"
          onPress={() => {
            router.push(
              '/quick-add' as never,
            );
          }}
        />

        <View style={styles.secondaryActions}>
          <ActionTile
            icon="wallet-outline"
            label="Add account"
            description="Cash, bank, wallet"
            onPress={() => {
              router.push(
                '/add-account' as never,
              );
            }}
          />

          <ActionTile
            icon="swap-horizontal"
            label="Transfer"
            description="Move money"
            onPress={() => {
              router.push(
                '/transfer' as never,
              );
            }}
          />
        </View>
      </View>

      {!hasCashFlow ? (
        <View style={styles.getStartedCard}>
          <View style={styles.getStartedIcon}>
            <Ionicons
              name="sparkles-outline"
              size={22}
              color={
                colors.primary
              }
            />
          </View>

          <View style={styles.getStartedCopy}>
            <Text style={styles.getStartedTitle}>
              Start with one real transaction
            </Text>

            <Text style={styles.getStartedBody}>
              Your monthly picture will appear here after you record income or spending.
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.cashFlowList}>
          {summary.cash_flow_by_currency
            .map(
              cashFlow => {
                const minorUnit =
                  minorUnitFor(
                    cashFlow.currency_code,
                  );

                const isNegative =
                  cashFlow.net_minor
                    .startsWith('-');

                return (
                  <View
                    key={
                      cashFlow.currency_code
                    }
                    style={
                      styles.cashFlowCard
                    }
                  >
                    <View style={styles.cashFlowTop}>
                      <View>
                        <Text style={styles.currencyCode}>
                          {
                            cashFlow.currency_code
                          }
                        </Text>

                        <Text style={styles.cashFlowCaption}>
                          This month
                        </Text>
                      </View>

                      <View style={styles.savingsBadge}>
                        <Text style={styles.savingsBadgeText}>
                          Savings{' '}
                          {formatBasisPoints(
                            cashFlow.savings_rate_basis_points,
                          )}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.netBlock}>
                      <Text style={styles.netLabel}>
                        Net cash flow
                      </Text>

                      <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.72}
                        style={[
                          styles.netValue,
                          isNegative
                            ? styles.netValueNegative
                            : null,
                        ]}
                      >
                        {formatMinor(
                          cashFlow.net_minor,
                          minorUnit,
                        )}
                      </Text>
                    </View>

                    <View style={styles.metrics}>
                      <View style={styles.metric}>
                        <Text style={styles.metricLabel}>
                          Income
                        </Text>

                        <Text
                          numberOfLines={1}
                          style={styles.metricValue}
                        >
                          {formatMinor(
                            cashFlow.income_minor,
                            minorUnit,
                          )}
                        </Text>
                      </View>

                      <View style={styles.metricDivider} />

                      <View style={styles.metric}>
                        <Text style={styles.metricLabel}>
                          Expenses
                        </Text>

                        <Text
                          numberOfLines={1}
                          style={styles.metricValue}
                        >
                          {formatMinor(
                            cashFlow.expense_minor,
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

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Accounts
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open accounts"
          hitSlop={8}
          onPress={() => {
            router.push(
              '/accounts' as never,
            );
          }}
        >
          <Text style={styles.sectionAction}>
            View all
          </Text>
        </Pressable>
      </View>

      <View style={styles.balanceCard}>
        {!hasBalances ? (
          <View style={styles.balanceEmpty}>
            <Text style={styles.balanceEmptyTitle}>
              No active accounts yet
            </Text>

            <Text style={styles.balanceEmptyBody}>
              Add your first account to start tracking balances.
            </Text>
          </View>
        ) : (
          summary.account_balances_by_currency
            .map(
              (
                balance,
                index,
              ) => (
                <View
                  key={
                    balance.currency_code
                  }
                >
                  {index > 0 ? (
                    <View style={styles.divider} />
                  ) : null}

                  <View style={styles.balanceRow}>
                    <View style={styles.balanceCopy}>
                      <Text style={styles.balanceCurrency}>
                        {
                          balance.currency_code
                        }
                      </Text>

                      <Text style={styles.balanceMeta}>
                        {countLabel(
                          balance.account_count,
                          'account',
                          'accounts',
                        )}
                      </Text>
                    </View>

                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.75}
                      style={styles.balanceValue}
                    >
                      {formatMinor(
                        balance.total_balance_minor,
                        minorUnitFor(
                          balance.currency_code,
                        ),
                      )}
                    </Text>
                  </View>
                </View>
              ),
            )
        )}

        {summary.account_balances_by_currency
          .length > 1 ? (
          <View style={styles.currencyNote}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={
                colors.textTertiary
              }
            />

            <Text style={styles.currencyNoteText}>
              Currencies stay separate. Finance Coach does not assume exchange rates.
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Keep an eye on
        </Text>
      </View>

      <View style={styles.signalGrid}>
        <SignalCard
          label="Budgets"
          value={
            budgetWarnings.toString()
          }
          body={
            budgetWarnings
            === BigInt(0)
              ? 'No current warnings'
              : 'Near or over limit'
          }
          icon="pie-chart-outline"
          tone={
            budgetWarnings
            > BigInt(0)
              ? 'warning'
              : 'default'
          }
          onPress={() => {
            router.push(
              '/budgets' as never,
            );
          }}
        />

        <SignalCard
          label="Goals"
          value={
            summary.goals
              .active_count
          }
          body={
            `${summary.goals.target_reached_count} reached`
          }
          icon="flag-outline"
          onPress={() => {
            router.push(
              '/goals' as never,
            );
          }}
        />
      </View>

      <View style={styles.activityStrip}>
        <View style={styles.activityIcon}>
          <Ionicons
            name="receipt-outline"
            size={20}
            color={
              colors.primary
            }
          />
        </View>

        <View style={styles.activityCopy}>
          <Text style={styles.activityTitle}>
            {summary.activity
              .transaction_count_this_month}{' '}
            entries this month
          </Text>

          <Text style={styles.activityBody}>
            {summary.activity
              .last_transaction_date
              ? `Latest activity ${summary.activity.last_transaction_date}`
              : 'Your recent activity will appear as you add transactions.'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles =
  StyleSheet.create({
    wrapper: {
      gap:
        spacing.lg,
      marginBottom:
        spacing.lg,
    },

    header: {
      gap:
        spacing.sm,
    },

    headerCopy: {
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

    heading: {
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

    headerBody: {
      color:
        colors.textSecondary,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
    },

    asOf: {
      color:
        colors.textTertiary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    actions: {
      gap:
        spacing.sm,
    },

    secondaryActions: {
      flexDirection: 'row',
      gap:
        spacing.sm,
    },

    actionTile: {
      minHeight:
        layout.touchTarget + 18,
      flexDirection: 'row',
      alignItems: 'center',
      gap:
        spacing.md,
      paddingHorizontal:
        spacing.md,
      paddingVertical:
        spacing.sm,
      borderRadius:
        radii.lg,
      borderWidth: 1,
    },

    actionTilePrimary: {
      backgroundColor:
        colors.primary,
      borderColor:
        colors.primary,
      ...elevation.card,
    },

    actionTileSecondary: {
      flex: 1,
      backgroundColor:
        colors.surface,
      borderColor:
        colors.border,
    },

    actionTilePressed: {
      opacity: 0.86,
      transform: [
        {
          scale: 0.995,
        },
      ],
    },

    actionIcon: {
      width: 40,
      height: 40,
      borderRadius:
        radii.md,
      alignItems: 'center',
      justifyContent: 'center',
    },

    actionIconPrimary: {
      backgroundColor:
        colors.white,
    },

    actionIconSecondary: {
      backgroundColor:
        colors.primary,
    },

    actionCopy: {
      flex: 1,
      minWidth: 0,
    },

    actionLabel: {
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightBold,
    },

    actionLabelPrimary: {
      color:
        colors.textOnPrimary,
    },

    actionLabelSecondary: {
      color:
        colors.text,
    },

    actionDescription: {
      marginTop:
        spacing.xxs,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    actionDescriptionPrimary: {
      color:
        colors.accentStrong,
    },

    actionDescriptionSecondary: {
      color:
        colors.textTertiary,
    },

    getStartedCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap:
        spacing.md,
      padding:
        spacing.lg,
      borderRadius:
        radii.lg,
      backgroundColor:
        colors.primarySoft,
      borderWidth: 1,
      borderColor:
        colors.accentStrong,
    },

    getStartedIcon: {
      width: 42,
      height: 42,
      borderRadius:
        radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        colors.white,
    },

    getStartedCopy: {
      flex: 1,
      gap:
        spacing.xs,
    },

    getStartedTitle: {
      color:
        colors.text,
      fontSize:
        typography.body,
      lineHeight:
        typography.lineHeightBody,
      fontWeight:
        typography.weightBold,
    },

    getStartedBody: {
      color:
        colors.textSecondary,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
    },

    cashFlowList: {
      gap:
        spacing.sm,
    },

    cashFlowCard: {
      padding:
        spacing.lg,
      borderRadius:
        radii.xl,
      backgroundColor:
        colors.primary,
      ...elevation.floating,
    },

    cashFlowTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent:
        'space-between',
      gap:
        spacing.md,
    },

    currencyCode: {
      color:
        colors.textOnPrimary,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightExtraBold,
      letterSpacing: 0.8,
    },

    cashFlowCaption: {
      marginTop:
        spacing.xxs,
      color:
        colors.accentStrong,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    savingsBadge: {
      paddingHorizontal:
        spacing.sm,
      paddingVertical:
        spacing.xs,
      borderRadius:
        radii.pill,
      backgroundColor:
        colors.focus,
    },

    savingsBadgeText: {
      color:
        colors.textOnPrimary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight:
        typography.weightSemibold,
    },

    netBlock: {
      marginTop:
        spacing.lg,
    },

    netLabel: {
      color:
        colors.accentStrong,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    netValue: {
      marginTop:
        spacing.xs,
      color:
        colors.textOnPrimary,
      fontSize:
        typography.title,
      lineHeight:
        typography.lineHeightTitle,
      fontWeight:
        typography.weightExtraBold,
      letterSpacing: -0.8,
    },

    netValueNegative: {
      color:
        colors.dangerSurface,
    },

    metrics: {
      flexDirection: 'row',
      marginTop:
        spacing.lg,
      paddingTop:
        spacing.md,
      borderTopWidth: 1,
      borderTopColor:
        colors.focus,
    },

    metric: {
      flex: 1,
      minWidth: 0,
    },

    metricDivider: {
      width: 1,
      marginHorizontal:
        spacing.md,
      backgroundColor:
        colors.focus,
    },

    metricLabel: {
      color:
        colors.accentStrong,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    metricValue: {
      marginTop:
        spacing.xxs,
      color:
        colors.textOnPrimary,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightBold,
    },

    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      gap:
        spacing.md,
    },

    sectionTitle: {
      color:
        colors.text,
      fontSize:
        typography.subheading,
      lineHeight:
        typography.lineHeightSubheading,
      fontWeight:
        typography.weightBold,
    },

    sectionAction: {
      color:
        colors.primary,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightBold,
    },

    balanceCard: {
      paddingHorizontal:
        spacing.md,
      borderRadius:
        radii.lg,
      backgroundColor:
        colors.surface,
      borderWidth: 1,
      borderColor:
        colors.border,
      ...elevation.card,
    },

    balanceRow: {
      minHeight: 70,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      gap:
        spacing.md,
      paddingVertical:
        spacing.sm,
    },

    balanceCopy: {
      minWidth: 72,
    },

    balanceCurrency: {
      color:
        colors.text,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightBold,
    },

    balanceMeta: {
      marginTop:
        spacing.xxs,
      color:
        colors.textTertiary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    balanceValue: {
      flex: 1,
      color:
        colors.text,
      fontSize:
        typography.subheading,
      lineHeight:
        typography.lineHeightSubheading,
      fontWeight:
        typography.weightExtraBold,
      textAlign: 'right',
    },

    divider: {
      height:
        StyleSheet.hairlineWidth,
      backgroundColor:
        colors.border,
    },

    balanceEmpty: {
      gap:
        spacing.xs,
      paddingVertical:
        spacing.lg,
    },

    balanceEmptyTitle: {
      color:
        colors.text,
      fontSize:
        typography.body,
      lineHeight:
        typography.lineHeightBody,
      fontWeight:
        typography.weightBold,
    },

    balanceEmptyBody: {
      color:
        colors.textSecondary,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
    },

    currencyNote: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap:
        spacing.xs,
      paddingVertical:
        spacing.md,
      borderTopWidth:
        StyleSheet.hairlineWidth,
      borderTopColor:
        colors.border,
    },

    currencyNoteText: {
      flex: 1,
      color:
        colors.textTertiary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    signalGrid: {
      flexDirection: 'row',
      gap:
        spacing.sm,
    },

    signalCard: {
      flex: 1,
      minHeight: 146,
      padding:
        spacing.md,
      borderRadius:
        radii.lg,
      backgroundColor:
        colors.surface,
      borderWidth: 1,
      borderColor:
        colors.border,
      ...elevation.card,
    },

    signalCardPressed: {
      backgroundColor:
        colors.surfaceMuted,
      borderColor:
        colors.borderStrong,
    },

    signalTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      gap:
        spacing.sm,
    },

    signalIcon: {
      width: 36,
      height: 36,
      borderRadius:
        radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        colors.primarySoft,
    },

    signalIconWarning: {
      backgroundColor:
        colors.warningSurface,
    },

    signalLabel: {
      marginTop:
        spacing.sm,
      color:
        colors.textSecondary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight:
        typography.weightBold,
    },

    signalValue: {
      marginTop:
        spacing.xxs,
      color:
        colors.primary,
      fontSize: 28,
      lineHeight: 34,
      fontWeight:
        typography.weightExtraBold,
      letterSpacing: -0.5,
    },

    signalValueWarning: {
      color:
        colors.warning,
    },

    signalBody: {
      marginTop:
        spacing.xxs,
      color:
        colors.textTertiary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    activityStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap:
        spacing.sm,
      padding:
        spacing.md,
      borderRadius:
        radii.lg,
      backgroundColor:
        colors.surfaceMuted,
    },

    activityIcon: {
      width: 40,
      height: 40,
      borderRadius:
        radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        colors.white,
    },

    activityCopy: {
      flex: 1,
      minWidth: 0,
    },

    activityTitle: {
      color:
        colors.text,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightBold,
    },

    activityBody: {
      marginTop:
        spacing.xxs,
      color:
        colors.textSecondary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },
  });