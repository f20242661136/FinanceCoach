import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, SectionList, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { AppButton } from '@/components/ui/app-button';
import { colors } from '@/design/tokens';
import { useAuth } from '@/features/auth/auth-context';
import { useLocalFinanceSync } from '@/offline/sync/use-local-finance-sync';
import { EMPTY_FILTERS, dateHeading, filterCount, groupActivity, kindLabel, syncLabel, todayInZone, type ActivityFilters, type ActivityItem } from './activity-model';
import { useActivityHistory } from './activity-hooks';
import { ActivityFiltersPanel } from './activity-filters';
import { ActivityRow, ActivitySyncNotice, activityMoney, activityStyles as styles } from './activity-ui';

export function ActivityScreen() {
  const { session } = useAuth();
  return <ActivityHistory key={session?.user.id} />;
}

function ActivityHistory() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const sync = useLocalFinanceSync();
  const [filters, setFilters] = useState<ActivityFilters>(EMPTY_FILTERS);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<ActivityFilters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [today, setToday] = useState(() => todayInZone(new Date(), profile?.timezone));
  const [pulling, setPulling] = useState(false);
  const loadingMore = useRef(false);
  const list = useRef<SectionList<ActivityItem>>(null);
  const { history, summary, options } = useActivityHistory(filters);
  const sections = useMemo(() => groupActivity(history.data?.pages.flatMap(page => page.items) ?? []), [history.data]);
  const loaded = sections.reduce((count, section) => count + section.data.length, 0);
  const count = filterCount(filters);
  const activeLabels = [
    filters.kind !== 'all' ? kindLabel(filters.kind) : '',
    filters.accountId ? options.data?.accounts.find(account => account.id === filters.accountId)?.name ?? 'Selected account' : '',
    filters.currency,
    filters.status !== 'all' ? syncLabel(filters.status) : '',
    filters.from || filters.to ? `${filters.from || 'Any start'} → ${filters.to || 'Any end'}` : '',
  ].filter(Boolean);

  useEffect(() => {
    const timer = setTimeout(() => setFilters(current => ({ ...current, search: search.trim() })), 250);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    // A failed network refresh can still change durable queue states.
    if (sync.refreshError) void queryClient.invalidateQueries({ queryKey: ['local-finance'] });
  }, [sync.refreshError, queryClient]);
  useFocusEffect(useCallback(() => {
    const tick = () => setToday(todayInZone(new Date(), profile?.timezone));
    tick();
    const timer = setInterval(tick, 60_000);
    return () => clearInterval(timer);
  }, [profile?.timezone]));

  function clear() {
    setSearch(''); setFilters(EMPTY_FILTERS); setDraft(EMPTY_FILTERS); setShowFilters(false);
    list.current?.getScrollResponder()?.scrollTo({ y: 0, animated: false });
  }
  async function refresh() {
    if (pulling) return;
    setPulling(true);
    setToday(todayInZone(new Date(), profile?.timezone));
    try {
      // Re-read SQLite even when network sync cannot finish.
      await sync.refresh();
      await queryClient.invalidateQueries({ queryKey: ['local-finance'] });
    } finally { setPulling(false); }
  }
  async function more() {
    if (loadingMore.current || history.isFetching || !history.hasNextPage) return;
    loadingMore.current = true;
    try { await history.fetchNextPage({ cancelRefetch: false }); } finally { loadingMore.current = false; }
  }
  const goToDetails = (item: ActivityItem) => router.push({ pathname: '/transaction-detail', params: { id: item.id } } as never);

  const header = <View style={styles.stack}>
    <View style={styles.top}>
      <View style={styles.flex}><Text accessibilityRole="header" style={styles.title}>Activity</Text>
        <Text style={styles.body}>Your money history, one entry at a time.</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Add transaction" onPress={() => router.push('/quick-add' as never)} style={styles.actionIcon}>
        <Ionicons name="add" size={24} color={colors.primary} />
      </Pressable>
    </View>
    <TextInput accessibilityLabel="Search saved transactions" value={search} onChangeText={setSearch} maxLength={240} autoCorrect={false}
      autoCapitalize="none" placeholder="Search merchant, account, category, or notes" placeholderTextColor={colors.textTertiary} style={styles.input} />
    <View style={styles.chips}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: showFilters }} onPress={() => {
        if (!showFilters) setDraft(filters); setShowFilters(value => !value);
      }} style={styles.textAction}><Text style={styles.link}>{showFilters ? 'Hide filters' : `Filters${count ? ` (${count})` : ''}`}</Text></Pressable>
      {(count > 0 || search.trim()) && <Pressable accessibilityRole="button" onPress={clear} style={styles.textAction}><Text style={styles.link}>Clear all</Text></Pressable>}
    </View>
    {activeLabels.length > 0 && <Text style={styles.body}>Applied: {activeLabels.join(' · ')}</Text>}
    {showFilters && <ActivityFiltersPanel value={draft} onChange={setDraft} onApply={() => {
      setFilters({ ...draft, search: search.trim() }); setShowFilters(false);
      list.current?.getScrollResponder()?.scrollTo({ y: 0, animated: false });
    }} onCancel={() => setShowFilters(false)} today={today} options={options.data} optionsFailed={options.isError}
      retryOptions={() => { void options.refetch(); }} />}
    {sync.isShowingSavedData && <View style={styles.notice}><Text style={styles.rowTitle}>Showing saved history</Text>
      <Text style={styles.body}>Sync did not finish. Local transactions remain available. Pull down to retry.</Text></View>}
    <ActivitySyncNotice />
    <View style={styles.card}>
      <Text style={styles.rowTitle}>Matching local history</Text>
      {summary.isPending ? <Text accessibilityLiveRegion="polite" style={styles.body}>Checking all matching entries…</Text>
        : summary.isError ? <><Text style={styles.body}>Matching totals are unavailable.</Text><AppButton label="Retry totals" variant="ghost" onPress={() => { void summary.refetch(); }} /></>
          : <>
            <Text accessibilityLiveRegion="polite" style={styles.body}>{summary.data?.count ?? 0} matching entr{summary.data?.count === 1 ? 'y' : 'ies'} · {loaded} loaded</Text>
            {summary.data?.currencies.map(total => <View key={total.currency} style={styles.stack}>
              <Text style={styles.rowTitle}>{total.currency}</Text>
              <Text style={styles.body}>Income: {activityMoney(total.incomeMinor, total.minorUnit, total.currency)}</Text>
              <Text style={styles.body}>Expenses: {activityMoney(total.expenseMinor, total.minorUnit, total.currency)}</Text>
            </View>)}
            {summary.data?.count && !summary.data.currencies.length ? <Text style={styles.body}>These results contain no income or expense totals.</Text> : null}
            {summary.data?.count ? <Text style={styles.caption}>Income and expense totals cover all matching saved entries. Transfers and adjustments are excluded from these totals. Currencies stay separate.</Text> : null}
          </>}
    </View>
    {history.isError && loaded > 0 && !history.isFetchNextPageError && <View style={styles.notice}>
      <Text style={styles.body}>History refresh failed. Showing previously loaded entries.</Text>
      <AppButton label="Retry history" variant="ghost" onPress={() => { void history.refetch(); }} />
    </View>}
  </View>;

  const empty = <View style={[styles.card, { marginTop: 20 }]}>
    <Text accessibilityRole="header" style={styles.heading}>{history.isPending ? 'Loading saved history…' : history.isError ? 'Could not load history' : count ? 'No matching transactions' : 'No transactions yet'}</Text>
    <Text style={styles.body}>{history.isPending ? 'Reading transactions saved on this device.' : history.isError ? 'Try reading your saved history again.'
      : count ? 'Change your search or filters to see more entries.' : 'Add an expense or income to begin your money history.'}</Text>
    {history.isError ? <AppButton label="Retry history" onPress={() => { void history.refetch(); }} /> : !history.isPending &&
      <AppButton label={count ? 'Clear search and filters' : 'Add transaction'} onPress={count ? clear : () => router.push('/quick-add' as never)} />}
  </View>;

  return <SectionList ref={list} sections={sections} keyExtractor={item => item.id} style={styles.screen} contentContainerStyle={styles.content}
    stickySectionHeadersEnabled automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}
    refreshControl={<RefreshControl refreshing={pulling || sync.isRefreshing} onRefresh={() => { void refresh(); }} />}
    ListHeaderComponent={header} ListEmptyComponent={empty} ItemSeparatorComponent={() => <View style={styles.separator} />}
    renderSectionHeader={({ section }) => <View style={styles.sectionHeader}><Text accessibilityRole="header" style={styles.rowTitle}>{dateHeading(section.date, today)}</Text></View>}
    renderItem={({ item }) => <ActivityRow item={item} onPress={() => goToDetails(item)} />}
    ListFooterComponent={loaded > 0 ? <View style={styles.footer}>
      {history.isFetchNextPageError && <Text accessibilityRole="alert" style={styles.failedText}>Could not load older entries. Your loaded history is still available.</Text>}
      {history.hasNextPage ? <AppButton label={history.isFetchNextPageError ? 'Retry older entries' : 'Load older entries'} variant="secondary"
        loading={history.isFetchingNextPage} disabled={history.isFetching} onPress={() => { void more(); }} />
        : <Text style={styles.caption}>You’ve reached the end of these results.</Text>}
    </View> : null} />;
}
