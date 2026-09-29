import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { AppButton } from '@/components/ui/app-button';
import { colors, elevation, typography } from '@/design/tokens';
import { useAuth } from '@/features/auth/auth-context';
import { useBudgetStatus } from '@/features/budgets/budget-query';
import { formatMinor, formatUsagePercent } from '@/features/budgets/budget-money';
import { useSavingsGoalStatus } from '@/features/goals/savings-goal-query';
import { useLoanStatus } from '@/features/loans/loan-query';
import { useRoscaGroups } from '@/features/rosca/rosca-query';
import { useSixJarProfile } from '@/features/six-jars/six-jar-query';
import { useGamificationSummary } from '@/features/gamification/gamification-query';
import { useLocalFinanceReferenceData } from '@/offline/sync/use-local-finance-reference-data';
import { localToday } from '@/features/smart-entry/entry-intelligence';
import { buildPlanOverview, progressPercent, type PlanAction } from './plan-intelligence';

const planningKeys = ['budgets', 'savings-goals', 'loans', 'rosca', 'six-jars', 'gamification'];

function ToolRow({ title, body, icon, onPress }: {
  title: string; body: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`${title}. ${body}`} onPress={onPress}
    style={({ pressed }) => [styles.toolRow, pressed && styles.pressed]}>
    <View style={styles.icon}><Ionicons name={icon} size={22} color={colors.primary} /></View>
    <View style={styles.flex}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.body}>{body}</Text></View>
    <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
  </Pressable>;
}

function ActionCard({ item, highlight = false, formatted, onPress }: {
  item: PlanAction; highlight?: boolean; formatted?: string; onPress: () => void;
}) {
  return <View style={[styles.card, highlight && styles.highlight]}>
    <Text style={styles.rowTitle}>{item.title}</Text>
    <Text style={styles.body}>{item.detail}</Text>
    {formatted && <Text style={styles.money}>{formatted} {item.amountLabel}</Text>}
    {highlight ? <AppButton label={item.actionLabel} onPress={onPress} />
      : <Pressable accessibilityRole="button" accessibilityLabel={`${item.actionLabel}: ${item.title}`} onPress={onPress}
        style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}><Text style={styles.link}>{item.actionLabel}</Text><Ionicons name="arrow-forward" size={18} color={colors.primary} /></Pressable>}
  </View>;
}

export function PlanScreen() {
  const router = useRouter();
  const client = useQueryClient();
  const { profile } = useAuth();
  const [today, setToday] = useState(localToday);
  const [refreshing, setRefreshing] = useState(false);
  const [showAllAttention, setShowAllAttention] = useState(false);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const budgets = useBudgetStatus(today);
  const goals = useSavingsGoalStatus();
  const loans = useLoanStatus();
  const groups = useRoscaGroups();
  const jars = useSixJarProfile();
  const habits = useGamificationSummary(profile?.timezone ?? 'UTC');
  const reference = useLocalFinanceReferenceData();
  const queries = [budgets, goals, loans, groups, jars, habits];
  const pending = queries.some(query => query.isPending);
  const failed = queries.some(query => query.isError);
  const overview = buildPlanOverview({ today, budgets: budgets.data, goals: goals.data, loans: loans.data, groups: groups.data });
  const allEmpty = queries.every(query => query.isSuccess) && overview.activeBudgetCount === 0 && overview.activeGoalCount === 0
    && overview.activeLoanCount === 0 && (groups.data?.length ?? 0) === 0 && jars.data === null
    && (habits.data?.my_challenges.length ?? 0) === 0;
  const activeChallenges = habits.data?.my_challenges.filter(challenge => challenge.status === 'active'
    && challenge.period_start <= today && challenge.period_end >= today);
  const activeGoals = [...overview.activeGoals].sort((a, b) => (a.target_date ?? '9999-12-31').localeCompare(b.target_date ?? '9999-12-31') || a.name.localeCompare(b.name));
  const chosenStep = overview.attention[0] ?? overview.upcoming[0];
  const upcomingItems = overview.upcoming.filter(item => item.id !== chosenStep?.id);
  const firstReached = overview.reachedGoals[0];

  useFocusEffect(useCallback(() => {
    setToday(localToday());
    for (const key of planningKeys) {
      void client.refetchQueries({ queryKey: [key], type: 'active', stale: true });
    }
  }, [client]));

  async function refresh() {
    setRefreshing(true);
    setToday(localToday());
    try {
      await Promise.allSettled(planningKeys.map(key => client.refetchQueries({ queryKey: [key], type: 'active' })));
      await reference.refetch();
    } finally { setRefreshing(false); }
  }

  const go = (route: string, params?: Record<string, string>) => router.push({ pathname: route, params } as never);
  const money = (amount: string, currency: string) => {
    const unit = reference.data?.currencies.find(item => item.code === currency)?.minorUnit;
    return unit === undefined ? undefined : `${currency} ${formatMinor(amount, unit)}`;
  };
  const toolStatus = (query: { isPending: boolean; isError: boolean; data?: unknown }, text: string) =>
    query.isPending ? 'Loading status…' : query.data === undefined ? 'Status unavailable · open to retry'
      : query.isError ? `Saved status · ${text}` : text;
  const plural = (count: number, name: string) => `${count} ${name}${count === 1 ? '' : 's'}`;

  const formatAction = (item: PlanAction) => item.currency && item.amountMinor !== undefined ? money(item.amountMinor, item.currency) : undefined;

  return <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { void refresh(); }} />}>
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.title}>Plan</Text>
      <Text style={styles.body}>A clear next step for your money.</Text>
    </View>

    <View style={styles.summary}>
      <Text style={styles.summaryTitle}>Your planning picture</Text>
      <View style={styles.metrics}>
        <View style={styles.metric}><Text style={styles.metricNumber}>{overview.steadyBudgetCount ?? '—'}</Text><Text style={styles.body}>Budgets below 80%</Text></View>
        <View style={styles.metric}><Text style={[styles.metricNumber, overview.attention.length > 0 && styles.warning]}>
          {overview.sourcesComplete ? overview.attention.length : overview.attention.length > 0 ? `${overview.attention.length}+` : '—'}</Text><Text style={styles.body}>Need review</Text></View>
        <View style={styles.metric}><Text style={styles.metricNumber}>{overview.activeGoalCount ?? '—'}</Text><Text style={styles.body}>Active goals</Text></View>
      </View>
      <Text style={styles.caption}>Status from the last server refresh. Review covers budget warnings, goal deadlines, loans and open ROSCA cycles.</Text>
      {!overview.sourcesComplete && <Text accessibilityLiveRegion="polite" style={styles.caption}>{pending ? 'More planning details are loading.' : 'Some statuses are unavailable; known items are shown.'}</Text>}
    </View>

    {failed && <View style={styles.notice}><Text accessibilityLiveRegion="polite" style={styles.body}>Some planning details could not refresh. Available saved statuses remain visible.</Text>
      <AppButton label="Retry refresh" variant="ghost" loading={refreshing} onPress={() => { void refresh(); }} /></View>}

    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>Your next step</Text>
      {chosenStep ? <ActionCard item={chosenStep} highlight formatted={formatAction(chosenStep)} onPress={() => go(chosenStep.route, chosenStep.params)} />
        : allEmpty ? <View style={styles.card}><Text style={styles.rowTitle}>Start with one spending limit</Text><Text style={styles.body}>Create a budget for a category you want to manage this month.</Text>
          <AppButton label="Create a budget" onPress={() => go('/create-budget')} /></View>
          : firstReached ? <View style={styles.card}><Text style={styles.rowTitle}>{firstReached.name} reached its target</Text><Text style={styles.body}>Review the goal and choose your next saving priority.</Text>
            <AppButton label="Review goal" onPress={() => go('/goal-detail', { goalId: firstReached.id })} /></View>
            : overview.sourcesComplete ? <View style={styles.card}><Text style={styles.rowTitle}>Choose your next saving priority</Text><Text style={styles.body}>Review your goals or start a new one. No budget warnings or overdue items appear in the saved status.</Text>
              <AppButton label={overview.activeGoalCount ? 'Review goals' : 'Create a goal'} variant="secondary" onPress={() => go(overview.activeGoalCount ? '/goals' : '/create-goal')} /></View>
              : <View style={styles.notice}><Text style={styles.body}>{pending ? 'Checking your next step…' : 'Open a planning tool below while status is unavailable.'}</Text></View>}
    </View>

    {overview.attention.length > 1 && <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>Also needs review</Text>
      {(showAllAttention ? overview.attention.slice(1) : overview.attention.slice(1, 3)).map(item => <ActionCard key={item.id} item={item} formatted={formatAction(item)} onPress={() => go(item.route, item.params)} />)}
      {overview.attention.length > 3 && <Pressable accessibilityRole="button" accessibilityState={{ expanded: showAllAttention }}
        onPress={() => setShowAllAttention(!showAllAttention)} style={styles.linkButton}><Text style={styles.link}>{showAllAttention ? 'Show fewer' : `Show ${overview.attention.length - 3} more`}</Text></Pressable>}
    </View>}

    {upcomingItems.length > 0 && <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>Coming up · next 7 days</Text>
      {(showAllUpcoming ? upcomingItems : upcomingItems.slice(0, 3)).map(item => <ActionCard key={item.id} item={item} formatted={formatAction(item)} onPress={() => go(item.route, item.params)} />)}
      {upcomingItems.length > 3 && <Pressable accessibilityRole="button" accessibilityState={{ expanded: showAllUpcoming }}
        onPress={() => setShowAllUpcoming(!showAllUpcoming)} style={styles.linkButton}><Text style={styles.link}>{showAllUpcoming ? 'Show fewer' : 'Show all upcoming'}</Text></Pressable>}
    </View>}

    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>Spending</Text>
      <View style={styles.toolGroup}>
        <ToolRow title="Budgets" icon="pie-chart-outline" body={toolStatus(budgets, overview.activeBudgetCount ? `${plural(overview.activeBudgetCount, 'active budget')} · ${overview.steadyBudgetCount ?? 0} below 80%` : 'Set limits for the spending that matters')} onPress={() => go('/budgets')} />
        <ToolRow title="Six Jars" icon="grid-outline" body={toolStatus(jars, jars.data ? `${jars.data.name} · ${jars.data.currency_code}` : 'Give each part of your income a purpose')} onPress={() => go('/six-jars')} />
      </View>
    </View>

    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>Saving</Text>
      <View style={styles.toolGroup}><ToolRow title="Goals" icon="flag-outline" body={toolStatus(goals, overview.activeGoalCount ? `${plural(overview.activeGoalCount, 'active goal')}${overview.reachedGoals.length ? ` · ${overview.reachedGoals.length} reached the target` : ''}` : 'Save toward something that matters to you')} onPress={() => go('/goals')} /></View>
      {activeGoals.slice(0, 2).map(goal => <Pressable key={goal.id} accessibilityRole="button" accessibilityLabel={`Review ${goal.name} goal`}
        onPress={() => go('/goal-detail', { goalId: goal.id })} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        <View style={styles.heading}><Text style={styles.rowTitle}>{goal.name}</Text><Text style={styles.link}>{formatUsagePercent(goal.progress_basis_points)}</Text></View>
        {money(goal.remaining_minor, goal.currency_code) && <Text style={styles.money}>{money(goal.remaining_minor, goal.currency_code)} to target</Text>}
        <View style={styles.track}><View style={[styles.fill, { width: `${progressPercent(goal.progress_basis_points)}%` }]} /></View>
        {goal.target_date && <Text style={styles.caption}>Target date · {goal.target_date}</Text>}
      </Pressable>)}
    </View>

    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>Debt & shared money</Text>
      <View style={styles.toolGroup}>
        <ToolRow title="Loans" icon="cash-outline" body={toolStatus(loans, overview.activeLoanCount ? `${plural(overview.activeLoanCount, 'outstanding loan')} · borrowed and lent` : 'Keep track of money borrowed or lent')} onPress={() => go('/loans')} />
        <ToolRow title="ROSCA" icon="people-outline" body={toolStatus(groups, groups.data?.length ? `${plural(overview.activeGroupCount ?? 0, 'active group')} · ${groups.data.filter(group => group.status === 'forming').length} forming` : 'Manage saving together with your group')} onPress={() => go('/rosca')} />
      </View>
    </View>

    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>Habits</Text>
      <View style={styles.toolGroup}><ToolRow title="Challenges" icon="trophy-outline" body={toolStatus(habits, activeChallenges?.length ? `${plural(activeChallenges.length, 'active challenge')} · build a steady money habit` : 'Start a small habit and keep it going')} onPress={() => go('/gamification')} /></View>
    </View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { width: '100%', maxWidth: 920, alignSelf: 'center', padding: 20, paddingBottom: 40, gap: 28 },
  flex: { flex: 1 }, section: { gap: 12 },
  title: { fontSize: 28, lineHeight: 36, color: colors.text, fontWeight: typography.weightSemibold },
  sectionTitle: { fontSize: 20, lineHeight: 28, color: colors.text, fontWeight: typography.weightSemibold },
  summaryTitle: { fontSize: 17, lineHeight: 25, color: colors.primary, fontWeight: typography.weightSemibold },
  summary: { backgroundColor: colors.primarySoft, padding: 24, borderRadius: 18, gap: 20 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 }, metric: { flex: 1, minWidth: 100, gap: 4 },
  metricNumber: { fontSize: 28, lineHeight: 36, color: colors.primary, fontWeight: typography.weightSemibold, fontVariant: ['tabular-nums'] },
  warning: { color: colors.warning },
  card: { backgroundColor: colors.surface, padding: 20, borderRadius: 18, gap: 12, ...elevation.card },
  highlight: { padding: 24 }, notice: { backgroundColor: colors.surfaceMuted, padding: 20, borderRadius: 18, gap: 12 },
  rowTitle: { fontSize: 16, lineHeight: 24, fontWeight: typography.weightSemibold, color: colors.text, flexShrink: 1 },
  body: { fontSize: 14, lineHeight: 22, color: colors.textSecondary },
  caption: { fontSize: 12, lineHeight: 19, color: colors.textSecondary },
  money: { fontSize: 18, lineHeight: 26, fontWeight: typography.weightSemibold, color: colors.text, fontVariant: ['tabular-nums'] },
  toolGroup: { backgroundColor: colors.surface, borderRadius: 18, padding: 8, gap: 4, ...elevation.card },
  toolRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 80, padding: 12, borderRadius: 12 },
  icon: { backgroundColor: colors.surfaceMuted, width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.72 }, link: { fontSize: 14, lineHeight: 22, color: colors.primary, fontWeight: typography.weightSemibold },
  linkButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'space-between' },
  heading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  track: { height: 6, backgroundColor: colors.surfaceStrong, borderRadius: 999, overflow: 'hidden' },
  fill: { height: 6, backgroundColor: colors.primary, borderRadius: 999 },
});
