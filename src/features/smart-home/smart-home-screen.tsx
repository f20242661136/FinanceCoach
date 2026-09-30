import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { AppButton } from '@/components/ui/app-button';
import { colors, elevation, typography } from '@/design/tokens';
import { useAuth } from '@/features/auth/auth-context';
import { GettingStartedCard } from '@/features/getting-started/getting-started-card';
import { useFinancialDashboardSummary } from '@/features/dashboard/dashboard-query';
import { useBudgetStatus } from '@/features/budgets/budget-query';
import { formatMinor, formatUsagePercent } from '@/features/budgets/budget-money';
import { SyncQueueBanner } from '@/features/finance/sync-queue-banner';
import { useLocalFinanceData } from '@/offline/sync/use-local-finance-data';
import { useLocalFinanceReferenceData } from '@/offline/sync/use-local-finance-reference-data';
import { localToday } from '@/features/smart-entry/entry-intelligence';
import { attentionBudgets, homeInsight } from './home-intelligence';

function Section({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  return <View style={styles.sectionHeading}>
    <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
    {action && <Pressable accessibilityRole="button" onPress={onPress} style={styles.textAction}>
      <Text style={styles.link}>{action}</Text>
    </Pressable>}
  </View>;
}

export function SmartHomeScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const today = localToday();
  const finance = useLocalFinanceData(5);
  const dashboard = useFinancialDashboardSummary(today);
  const budgets = useBudgetStatus(today);
  const reference = useLocalFinanceReferenceData();
  const [chosenCurrency, setChosenCurrency] = useState('');
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const refetchDashboard = dashboard.refetch;
  const refetchBudgets = budgets.refetch;
  useFocusEffect(useCallback(() => {
    void refetchDashboard();
    void refetchBudgets();
  }, [refetchDashboard, refetchBudgets]));

  const summary = dashboard.data?.as_of === today ? dashboard.data : undefined;
  const currencyCodes = [...new Set([
    ...(summary?.cash_flow_by_currency.map(row => row.currency_code) ?? []),
    ...finance.accounts.filter(account => account.status === 'active').map(account => account.currency_code),
  ])];
  const currency = currencyCodes.includes(chosenCurrency) ? chosenCurrency
    : currencyCodes.includes(profile?.base_currency_code ?? '') ? profile!.base_currency_code! : currencyCodes[0] ?? '';
  const minorUnit = (code: string) => reference.data?.currencies.find(item => item.code === code)?.minorUnit
    ?? finance.accounts.find(account => account.currency_code === code)?.currency_minor_unit;
  const money = (value: string, code: string) => {
    const unit = minorUnit(code);
    return unit === undefined ? '—' : formatMinor(value, unit);
  };
  const flow = summary?.cash_flow_by_currency.find(row => row.currency_code === currency);
  const alerts = attentionBudgets(budgets.data ?? [], today);
  const insight = summary ? homeInsight(summary, currency) : null;
  const hasLocalChanges = finance.activity.some(item => item.sync_status !== 'synced')
    || finance.accounts.some(account => account.sync_status !== 'synced');
  const go = (path: string) => router.push(path as never);
  const ask = (prompt: string) => router.push({ pathname: '/coach-context', params: { prompt } } as never);

  async function refresh() {
    setPullRefreshing(true);
    try {
      await finance.refresh();
      await Promise.allSettled([dashboard.refetch(), budgets.refetch(), reference.refetch()]);
    } finally { setPullRefreshing(false); }
  }

  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}
    refreshControl={<RefreshControl refreshing={pullRefreshing || finance.isRefreshing} onRefresh={() => { void refresh(); }} />}
    showsVerticalScrollIndicator={false}>
    <View style={styles.top}>
      <View style={styles.flex}>
        <Text style={styles.muted}>Finance Coach</Text>
        <Text accessibilityRole="header" style={styles.title}>Your money, in focus</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Profile and settings" onPress={() => go('/settings')} style={styles.avatar}>
        <Ionicons name="person-outline" size={22} color={colors.primary} />
      </Pressable>
    </View>
    {finance.isShowingSavedData && <Text accessibilityLiveRegion="polite" style={styles.muted}>Showing saved data · pull down to retry sync</Text>}
    <SyncQueueBanner />
    <GettingStartedCard />
    {finance.localError && <View style={styles.card}>
      <Text style={styles.rowTitle}>Could not load saved accounts or activity</Text>
      <AppButton label="Try again" variant="ghost" onPress={() => { void refresh(); }} />
    </View>}

    <View style={styles.hero}>
      <View style={styles.sectionHeading}>
        <Text style={styles.heroLabel}>{new Date(`${today}T12:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</Text>
        <Ionicons name="wallet-outline" size={22} color={colors.primary} />
      </View>
      {currencyCodes.length > 1 && <View style={styles.chips}>{currencyCodes.map(code =>
        <Pressable key={code} accessibilityRole="button" accessibilityLabel={`Show ${code} monthly cash flow`}
          accessibilityState={{ selected: currency === code }} onPress={() => setChosenCurrency(code)}
          style={[styles.chip, currency === code && styles.selectedChip]}>
          <Text style={styles.link}>{code}</Text>
        </Pressable>)}</View>}
      {dashboard.isPending && !summary ? <View accessibilityLabel="Loading monthly cash flow" style={styles.skeleton} />
        : flow ? <>
          <Text style={styles.muted}>{currency} · Net this month</Text>
          <Text style={[styles.heroMoney, BigInt(flow.net_minor) < 0n && styles.warning]}>{money(flow.net_minor, currency)}</Text>
          <View style={styles.metrics}>
            <View style={styles.flex}><Text style={styles.muted}>Income</Text><Text style={styles.metric}>{money(flow.income_minor, currency)}</Text></View>
            <View style={styles.flex}><Text style={styles.muted}>Spent</Text><Text style={styles.metric}>{money(flow.expense_minor, currency)}</Text></View>
          </View>
        </> : <>
          <Text style={styles.rowTitle}>{summary ? 'Your monthly picture starts here' : 'Monthly picture unavailable'}</Text>
          <Text style={styles.muted}>{summary ? 'Add income or an expense to build your monthly picture.' : 'Accounts and activity below are available from this device.'}</Text>
          <AppButton label={summary ? 'Add transaction' : 'Retry monthly picture'} variant="secondary"
            onPress={() => { if (summary) go('/quick-add'); else void dashboard.refetch(); }} />
        </>}
      {flow && minorUnit(currency) === undefined && <Text style={styles.muted}>Currency details are loading. Amounts will appear when precision is available.</Text>}
      {summary && <Text style={styles.caption}>Monthly totals and budget status use the last server refresh{hasLocalChanges ? ' · local changes awaiting sync' : ''}.</Text>}
      {dashboard.isError && summary && <Text style={styles.warning}>Refresh failed · showing the saved monthly picture</Text>}
    </View>

    <View style={styles.section}>
      <Section title="Needs attention" action="Budgets" onPress={() => go('/budgets')} />
      {budgets.isPending && !budgets.data ? <View accessibilityLabel="Loading budget status" style={styles.skeleton} />
        : alerts.length ? alerts.slice(0, 3).map(budget => <View key={budget.id} style={styles.card}>
          <View style={styles.sectionHeading}><Text style={styles.rowTitle}>{budget.name}</Text>
            <Text style={styles.warning}>{budget.is_over_budget ? 'Over limit' : `${formatUsagePercent(budget.usage_basis_points)} used`}</Text></View>
          <Text style={styles.amount}>{budget.currency_code} {money((BigInt(budget.remaining_minor) < 0n ? -BigInt(budget.remaining_minor) : BigInt(budget.remaining_minor)).toString(), budget.currency_code)} {budget.is_over_budget ? 'over' : 'left'}</Text>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Number(BigInt(budget.usage_basis_points) > 10000n ? 10000n : BigInt(budget.usage_basis_points)) / 100}%` }]} /></View>
          <View style={styles.metrics}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Review ${budget.name} budget`} onPress={() => go('/budgets')} style={styles.textAction}><Text style={styles.link}>Review budget</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`Ask Coach about ${budget.name}`} style={styles.textAction}
              onPress={() => ask(`Review my ${budget.name} budget in ${budget.currency_code}. The last synced status shows ${formatUsagePercent(budget.usage_basis_points)} used. What can I adjust for the rest of this budget period?`)}><Text style={styles.link}>Ask Coach</Text></Pressable>
          </View>
        </View>) : budgets.data && !budgets.isError ? <View style={styles.quietCard}>
          <Ionicons name="checkmark-circle-outline" size={22} color={colors.success} />
          <Text style={styles.muted}>{budgets.data.length ? 'No budgets at or above 80% in the last synced status.' : 'Set a budget to get useful spending alerts.'}</Text>
        </View> : <View style={styles.quietCard}><Text style={styles.muted}>Budget status unavailable.</Text>
          <Pressable accessibilityRole="button" onPress={() => { void budgets.refetch(); }} style={styles.textAction}><Text style={styles.link}>Retry</Text></Pressable></View>}
      {budgets.isError && alerts.length > 0 && <Text style={styles.caption}>Showing saved budget alerts · refresh failed</Text>}
      {alerts.length > 3 && <Text style={styles.muted}>{alerts.length - 3} more in Budgets</Text>}
    </View>

    <View style={styles.section}>
      <Section title="Accounts" action="See all" onPress={() => go('/accounts')} />
      <View style={styles.card}>
        {finance.isInitialLoading ? <View accessibilityLabel="Loading accounts" style={styles.skeleton} />
          : finance.accounts.filter(account => account.status === 'active').length ? finance.accounts.filter(account => account.status === 'active').slice(0, 3).map(account =>
            <Pressable key={account.id} accessibilityRole="button" onPress={() => go('/accounts')} style={styles.row}>
              <Text style={[styles.rowTitle, styles.flex]}>{account.name}</Text>
              <Text style={styles.amount}>{account.currency_code} {formatMinor(account.current_balance_minor, account.currency_minor_unit)}</Text>
            </Pressable>) : <><Text style={styles.muted}>Add your first account to start tracking money.</Text><AppButton label="Add account" variant="secondary" onPress={() => go('/add-account')} /></>}
      </View>
    </View>

    <View style={styles.section}>
      <Section title="Recent activity" action="See all" onPress={() => go('/activity')} />
      {finance.isInitialLoading ? <View accessibilityLabel="Loading activity" style={styles.skeleton} />
        : finance.activity.length ? <View style={styles.card}>{finance.activity.map(item =>
          <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`View activity for ${item.merchant ?? item.category_name ?? item.type}`}
            onPress={() => go('/activity')} style={styles.row}>
            <View style={styles.flex}><Text style={styles.rowTitle}>{item.merchant ?? item.category_name ?? (item.type === 'transfer' ? 'Transfer' : 'Transaction')}</Text>
              <Text style={styles.caption}>{item.account_name} · {item.transaction_date}{item.sync_status !== 'synced' ? ' · awaiting sync' : ''}</Text></View>
            <Text style={[styles.amount, item.type === 'income' && styles.positive]}>{item.type === 'expense' ? '−' : item.type === 'income' ? '+' : ''}{item.currency_code} {formatMinor(item.amount_minor, item.currency_minor_unit)}</Text>
          </Pressable>)}</View> : <View style={styles.card}><Text style={styles.rowTitle}>No transactions yet</Text>
            <Text style={styles.muted}>Add an expense or income to see your money history.</Text>
            <AppButton label="Add transaction" onPress={() => go('/quick-add')} /></View>}
    </View>

    {insight && <View style={styles.coachCard}>
      <View style={styles.row}><Ionicons name="sparkles-outline" size={20} color={colors.primary} /><Text style={styles.rowTitle}>Coach perspective</Text></View>
      <Text style={styles.sectionTitle}>{insight.title}</Text><Text style={styles.muted}>{insight.body}</Text>
      <Text style={styles.caption}>Based on your last synced summary. Review the suggested question before sending.</Text>
      <AppButton label="Ask about this" variant="secondary" onPress={() => ask(insight.prompt)} />
    </View>}
    <AppButton label="Add transaction" icon="add" onPress={() => go('/quick-add')} />
  </ScrollView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { width: '100%', maxWidth: 920, alignSelf: 'center', padding: 20, paddingBottom: 40, gap: 24 },
  flex: { flex: 1 }, top: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  title: { fontSize: 26, lineHeight: 34, fontWeight: typography.weightSemibold, color: colors.text },
  avatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.surfaceMuted, justifyContent: 'center', alignItems: 'center' },
  section: { gap: 12 }, sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  sectionTitle: { fontSize: 20, lineHeight: 28, fontWeight: typography.weightSemibold, color: colors.text },
  rowTitle: { fontSize: 16, lineHeight: 24, fontWeight: typography.weightSemibold, color: colors.text, flexShrink: 1 },
  hero: { backgroundColor: colors.primarySoft, borderRadius: 18, padding: 24, gap: 16 },
  heroLabel: { fontSize: 14, lineHeight: 22, color: colors.primary, fontWeight: typography.weightMedium },
  heroMoney: { fontSize: 32, lineHeight: 42, fontWeight: typography.weightBold, color: colors.primary, fontVariant: ['tabular-nums'] },
  metric: { fontSize: 18, lineHeight: 26, fontWeight: typography.weightSemibold, color: colors.text, fontVariant: ['tabular-nums'] },
  muted: { fontSize: 14, lineHeight: 22, color: colors.textSecondary, flexShrink: 1 },
  caption: { fontSize: 12, lineHeight: 19, color: colors.textSecondary },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 24, justifyContent: 'space-between' },
  card: { backgroundColor: colors.surface, borderRadius: 18, padding: 20, gap: 12, ...elevation.card },
  quietCard: { backgroundColor: colors.surfaceMuted, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 4 },
  amount: { fontSize: 15, lineHeight: 23, color: colors.text, fontWeight: typography.weightSemibold, fontVariant: ['tabular-nums'], flexShrink: 1 },
  textAction: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 4 },
  link: { fontSize: 14, lineHeight: 22, color: colors.primary, fontWeight: typography.weightSemibold },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, minHeight: 48, justifyContent: 'center', borderRadius: 999, backgroundColor: colors.surface },
  selectedChip: { backgroundColor: colors.accentStrong },
  warning: { color: colors.warning, fontSize: 14, lineHeight: 22, fontWeight: typography.weightMedium },
  positive: { color: colors.success },
  progressTrack: { height: 6, backgroundColor: colors.surfaceStrong, borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: colors.warning, borderRadius: 999 },
  skeleton: { height: 92, backgroundColor: colors.surfaceStrong, borderRadius: 12 },
  coachCard: { backgroundColor: colors.surface, borderRadius: 18, padding: 24, gap: 12, ...elevation.card },
});
