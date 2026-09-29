import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { StatePanel } from '@/components/ui/state-panel';
import {
  colors,
  elevation,
  layout,
  radii,
  spacing,
  typography,
} from '@/design/tokens';
import { useLocalFinanceReferenceData } from '@/offline/sync/use-local-finance-reference-data';
import { formatMinor } from '../budgets/budget-money';
import {
  formatBasisPoints,
  monthDisplayLabel,
} from './dashboard-format';
import { useFinancialDashboardSummary } from './dashboard-query';

function countLabel(
  value: string,
  singular: string,
  plural: string,
): string {
  return `${value} ${value === '1' ? singular : plural}`;
}

function formatAsOf(value: string): string {
  const parsed = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${action} ${title}`}
          hitSlop={8}
          onPress={onAction}
          style={({ pressed }) => pressed ? styles.pressed : null}
        >
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function DashboardCommandCenter() {
  const router = useRouter();
  const query = useFinancialDashboardSummary();
  const reference = useLocalFinanceReferenceData();
  const summary = query.data;

  function minorUnitFor(currencyCode: string): number {
    return reference.data?.currencies.find(
      currency => currency.code === currencyCode,
    )?.minorUnit ?? 2;
  }

  if (query.isLoading && !summary) {
    return (
      <StatePanel
        loading
        title="Preparing your overview"
        description="Bringing together your latest balances and activity."
      />
    );
  }

  if (query.error && !summary) {
    return (
      <StatePanel
        title="Overview unavailable"
        description="Your saved finance data is still available. Try the overview again when your connection is ready."
        icon="cloud-offline-outline"
        tone="danger"
        action={
          <AppButton
            label="Try again"
            variant="secondary"
            fullWidth={false}
            onPress={() => void query.refetch()}
          />
        }
      />
    );
  }

  if (!summary) {
    return null;
  }

  const budgetWarnings =
    BigInt(summary.budgets.over_budget_count)
    + BigInt(summary.budgets.near_limit_count);
  const hasCashFlow = summary.cash_flow_by_currency.length > 0;
  const hasBalances = summary.account_balances_by_currency.length > 0;

  return (
    <View style={styles.wrapper}>
      <View style={styles.overviewHeading}>
        <View>
          <Text style={styles.monthLabel}>
            {monthDisplayLabel(summary.month_start)}
          </Text>
          <Text style={styles.asOf}>Updated {formatAsOf(summary.as_of)}</Text>
        </View>
      </View>

      {!hasCashFlow ? (
        <View style={styles.emptyHeroCard}>
          <View style={styles.emptyHeroIcon}>
            <Ionicons
              name="sparkles-outline"
              size={22}
              color={colors.primary}
            />
          </View>
          <View style={styles.emptyHeroCopy}>
            <Text style={styles.emptyHeroTitle}>Start with one real transaction</Text>
            <Text style={styles.emptyHeroBody}>
              Your monthly picture will appear after you record income or spending.
            </Text>
          </View>
          <AppButton
            label="Add transaction"
            icon="add"
            fullWidth={false}
            onPress={() => router.push('/quick-add' as never)}
          />
        </View>
      ) : (
        <View style={styles.cashFlowList}>
          {summary.cash_flow_by_currency.map(cashFlow => {
            const minorUnit = minorUnitFor(cashFlow.currency_code);
            const isNegative = cashFlow.net_minor.startsWith('-');

            return (
              <View
                key={cashFlow.currency_code}
                style={styles.cashFlowCard}
              >
                <View style={styles.cashFlowTop}>
                  <View>
                    <Text style={styles.currencyCode}>{cashFlow.currency_code}</Text>
                    <Text style={styles.cashFlowCaption}>Net this month</Text>
                  </View>

                  <View style={styles.savingsPill}>
                    <Text style={styles.savingsPillText}>
                      Saved {formatBasisPoints(cashFlow.savings_rate_basis_points)}
                    </Text>
                  </View>
                </View>

                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                  style={[
                    styles.netValue,
                    isNegative ? styles.netValueNegative : null,
                  ]}
                >
                  {formatMinor(cashFlow.net_minor, minorUnit)}
                </Text>

                <View style={styles.metricsRow}>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Income</Text>
                    <Text style={styles.metricValue}>
                      {formatMinor(cashFlow.income_minor, minorUnit)}
                    </Text>
                  </View>

                  <View style={styles.metricDivider} />

                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Spent</Text>
                    <Text style={styles.metricValue}>
                      {formatMinor(cashFlow.expense_minor, minorUnit)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {budgetWarnings > BigInt(0) ? (
        <View style={styles.attentionSection}>
          <SectionHeader title="Needs your attention" />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${budgetWarnings.toString()} budget warnings. Review budgets.`}
            onPress={() => router.push('/budgets' as never)}
            style={({ pressed }) => [
              styles.attentionCard,
              pressed ? styles.pressed : null,
            ]}
          >
            <View style={styles.attentionIcon}>
              <Ionicons
                name="alert-circle-outline"
                size={21}
                color={colors.warning}
              />
            </View>
            <View style={styles.attentionCopy}>
              <Text style={styles.attentionTitle}>Budget attention</Text>
              <Text style={styles.attentionBody}>
                {budgetWarnings.toString()} {budgetWarnings === BigInt(1) ? 'budget is' : 'budgets are'} near or over the limit.
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textTertiary}
            />
          </Pressable>
        </View>
      ) : null}

      <View style={styles.accountsSection}>
        <SectionHeader
          title="Accounts"
          action="See all"
          onAction={() => router.push('/accounts' as never)}
        />

        <View style={styles.balanceCard}>
          {!hasBalances ? (
            <View style={styles.balanceEmpty}>
              <Text style={styles.balanceEmptyTitle}>No active accounts yet</Text>
              <Text style={styles.balanceEmptyBody}>
                Add your first account to start tracking balances.
              </Text>
              <AppButton
                label="Add account"
                variant="secondary"
                fullWidth={false}
                onPress={() => router.push('/add-account' as never)}
              />
            </View>
          ) : (
            summary.account_balances_by_currency.map((balance, index) => (
              <View key={balance.currency_code}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <View style={styles.balanceRow}>
                  <View style={styles.balanceCopy}>
                    <Text style={styles.balanceCurrency}>{balance.currency_code}</Text>
                    <Text style={styles.balanceMeta}>
                      {countLabel(balance.account_count, 'account', 'accounts')}
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
                      minorUnitFor(balance.currency_code),
                    )}
                  </Text>
                </View>
              </View>
            ))
          )}

          {summary.account_balances_by_currency.length > 1 ? (
            <View style={styles.currencyNote}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={colors.textTertiary}
              />
              <Text style={styles.currencyNoteText}>
                Currencies stay separate. Finance Coach does not assume exchange rates.
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open Finance Coach"
        onPress={() => router.push('/coach' as never)}
        style={({ pressed }) => [
          styles.coachCard,
          pressed ? styles.pressed : null,
        ]}
      >
        <View style={styles.coachIcon}>
          <Ionicons
            name="sparkles-outline"
            size={21}
            color={colors.primary}
          />
        </View>
        <View style={styles.coachCopy}>
          <Text style={styles.coachEyebrow}>COACH</Text>
          <Text style={styles.coachTitle}>Want help making sense of this month?</Text>
          <Text style={styles.coachBody}>
            Ask about spending, budgets, goals, or what changed.
          </Text>
        </View>
        <Ionicons
          name="arrow-forward"
          size={19}
          color={colors.primary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xl,
    marginBottom: spacing.lg,
  },

  overviewHeading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },

  monthLabel: {
    color: colors.text,
    fontSize: typography.subheading,
    lineHeight: typography.lineHeightSubheading,
    fontWeight: typography.weightSemibold,
  },

  asOf: {
    marginTop: 2,
    color: colors.textTertiary,
    fontSize: typography.caption,
    lineHeight: typography.lineHeightCaption,
  },

  cashFlowList: {
    gap: spacing.md,
  },

  cashFlowCard: {
    padding: layout.cardPadding,
    gap: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: colors.primary,
    ...elevation.card,
  },

  cashFlowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },

  currencyCode: {
    color: 'rgba(255,255,255,0.74)',
    fontSize: typography.small,
    lineHeight: typography.lineHeightSmall,
    fontWeight: typography.weightSemibold,
    letterSpacing: 0.7,
  },

  cashFlowCaption: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.72)',
    fontSize: typography.caption,
    lineHeight: typography.lineHeightCaption,
  },

  savingsPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  savingsPillText: {
    color: colors.textOnPrimary,
    fontSize: typography.caption,
    fontWeight: typography.weightSemibold,
  },

  netValue: {
    color: colors.textOnPrimary,
    fontSize: typography.display,
    lineHeight: typography.lineHeightDisplay,
    fontWeight: typography.weightBold,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },

  netValueNegative: {
    color: '#FFD9D5',
  },

  metricsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.18)',
  },

  metric: {
    flex: 1,
    gap: 3,
  },

  metricDivider: {
    width: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },

  metricLabel: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: typography.caption,
  },

  metricValue: {
    color: colors.textOnPrimary,
    fontSize: typography.body,
    lineHeight: typography.lineHeightBody,
    fontWeight: typography.weightSemibold,
    fontVariant: ['tabular-nums'],
  },

  emptyHeroCard: {
    padding: layout.cardPadding,
    gap: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    ...elevation.card,
  },

  emptyHeroIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },

  emptyHeroCopy: {
    gap: spacing.xs,
  },

  emptyHeroTitle: {
    color: colors.text,
    fontSize: typography.subheading,
    lineHeight: typography.lineHeightSubheading,
    fontWeight: typography.weightSemibold,
  },

  emptyHeroBody: {
    color: colors.textSecondary,
    fontSize: typography.small,
    lineHeight: typography.lineHeightSmall,
  },

  attentionSection: {
    gap: spacing.sm,
  },

  sectionHeader: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: typography.subheading,
    lineHeight: typography.lineHeightSubheading,
    fontWeight: typography.weightSemibold,
  },

  sectionAction: {
    color: colors.primary,
    fontSize: typography.small,
    lineHeight: typography.lineHeightSmall,
    fontWeight: typography.weightSemibold,
  },

  attentionCard: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: layout.cardPadding,
    borderRadius: radii.lg,
    backgroundColor: colors.warningSurface,
  },

  attentionIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },

  attentionCopy: {
    flex: 1,
    gap: 2,
  },

  attentionTitle: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: typography.lineHeightBody,
    fontWeight: typography.weightSemibold,
  },

  attentionBody: {
    color: colors.warning,
    fontSize: typography.small,
    lineHeight: typography.lineHeightSmall,
  },

  accountsSection: {
    gap: spacing.sm,
  },

  balanceCard: {
    overflow: 'hidden',
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    ...elevation.card,
  },

  balanceRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: layout.cardPadding,
    paddingVertical: spacing.md,
  },

  balanceCopy: {
    flex: 1,
  },

  balanceCurrency: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: typography.lineHeightBody,
    fontWeight: typography.weightSemibold,
  },

  balanceMeta: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    lineHeight: typography.lineHeightCaption,
  },

  balanceValue: {
    maxWidth: '55%',
    color: colors.text,
    fontSize: typography.subheading,
    lineHeight: typography.lineHeightSubheading,
    fontWeight: typography.weightSemibold,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: layout.cardPadding,
    backgroundColor: colors.border,
  },

  balanceEmpty: {
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: layout.cardPadding,
  },

  balanceEmptyTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weightSemibold,
  },

  balanceEmptyBody: {
    color: colors.textSecondary,
    fontSize: typography.small,
    lineHeight: typography.lineHeightSmall,
  },

  currencyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: layout.cardPadding,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceMuted,
  },

  currencyNoteText: {
    flex: 1,
    color: colors.textTertiary,
    fontSize: typography.caption,
    lineHeight: typography.lineHeightCaption,
  },

  coachCard: {
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: layout.cardPadding,
    borderRadius: radii.lg,
    backgroundColor: colors.primarySoft,
  },

  coachIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },

  coachCopy: {
    flex: 1,
    gap: 2,
  },

  coachEyebrow: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weightSemibold,
    letterSpacing: 0.7,
  },

  coachTitle: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: typography.lineHeightBody,
    fontWeight: typography.weightSemibold,
  },

  coachBody: {
    color: colors.textSecondary,
    fontSize: typography.small,
    lineHeight: typography.lineHeightSmall,
  },

  pressed: {
    opacity: 0.72,
  },
});
