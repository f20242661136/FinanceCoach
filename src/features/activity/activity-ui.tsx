import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '@/components/ui/app-button';
import { colors, elevation, typography } from '@/design/tokens';
import { formatMinor } from '@/features/budgets/budget-money';
import { useRetryQueuedMutations } from '@/offline/sync/queue-health';
import { activityTitle, kindLabel, syncLabel, type ActivityItem } from './activity-model';
import { useActivityQueue } from './activity-hooks';

export function activityMoney(amount: string | null, unit: number | null, code: string | null): string {
  if (amount === null || !/^-?\d+$/.test(amount) || unit === null || !Number.isInteger(unit) || unit < 0 || unit > 4 || !code) return 'Amount unavailable';
  return `${code} ${formatMinor(amount, unit)}`;
}

export function SyncBadge({ status }: { status: string }) {
  return <View style={[activityStyles.badge, status === 'failed' ? activityStyles.failedSurface : status === 'pending' ? activityStyles.pendingSurface : null]}>
    <Text style={[activityStyles.caption, status === 'failed' ? activityStyles.failedText : status === 'pending' ? activityStyles.pendingText : null]}>{syncLabel(status)}</Text>
  </View>;
}

export function ActivityRow({ item, onPress }: { item: ActivityItem; onPress: () => void }) {
  const icon = item.type === 'income' ? 'arrow-down-outline' : item.type === 'expense' ? 'arrow-up-outline'
    : item.type === 'transfer' ? 'swap-horizontal-outline' : 'create-outline';
  const amount = activityMoney(item.amount_minor, item.currency_minor_unit, item.currency_code);
  const sign = amount === 'Amount unavailable' || item.amount_minor.startsWith('-') ? '' : item.type === 'income' ? '+' : item.type === 'expense' ? '−' : '';
  const received = activityMoney(item.destination_amount_minor, item.destination_currency_minor_unit, item.destination_currency_code);
  const spokenAmount = item.type === 'transfer' ? `Sent ${amount} from ${item.account_name}, received ${received} in ${item.destination_account_name ?? 'account unavailable'}`
    : `${amount}, ${item.account_name}${item.category_name ? `, ${item.category_name}` : ''}`;
  return <Pressable accessibilityRole="button" accessibilityLabel={`${activityTitle(item)}, ${kindLabel(item.type)}, ${spokenAmount}, ${syncLabel(item.sync_status)}, view details`}
    onPress={onPress} style={({ pressed }) => [activityStyles.row, pressed && activityStyles.pressed]}>
    <View style={activityStyles.icon}><Ionicons name={icon} size={20} color={item.type === 'income' ? colors.success : colors.primary} /></View>
    <View style={activityStyles.flex}>
      <Text numberOfLines={2} style={activityStyles.rowTitle}>{activityTitle(item)}</Text>
      <Text style={activityStyles.caption}>{kindLabel(item.type)} · {item.account_name}
        {item.type === 'transfer' ? ` → ${item.destination_account_name ?? 'Account unavailable'}` : item.category_name ? ` · ${item.category_name}` : ''}</Text>
      <Text style={[activityStyles.amount, item.type === 'income' && activityStyles.positive]}>{item.type === 'transfer' ? 'Sent: ' : sign}{amount}</Text>
      {item.type === 'transfer' && <Text style={activityStyles.body}>Received: {received}</Text>}
      <SyncBadge status={item.sync_status} />
    </View>
    <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
  </Pressable>;
}

export function ActivitySyncNotice() {
  const queue = useActivityQueue();
  const retry = useRetryQueuedMutations();
  const running = useRef(false);
  const [error, setError] = useState(false);
  if (queue.isError) return <View style={activityStyles.notice}><Text style={activityStyles.body}>Sync queue status unavailable.</Text>
    <AppButton label="Retry status check" variant="ghost" onPress={() => { void queue.refetch(); }} /></View>;
  if (!queue.data || (!queue.data.waiting && !queue.data.failed)) return null;
  async function sync() {
    if (running.current) return;
    running.current = true;
    setError(false);
    try { await retry.mutateAsync(); } catch { setError(true); } finally { running.current = false; }
  }
  return <View style={activityStyles.notice}>
    <Text style={activityStyles.rowTitle}>{queue.data.failed ? `${queue.data.failed} change${queue.data.failed === 1 ? '' : 's'} need attention` : `${queue.data.waiting} change${queue.data.waiting === 1 ? '' : 's'} waiting to sync`}</Text>
    <Text style={activityStyles.body}>Changes are saved on this device. Sync controls apply to all queued changes.</Text>
    <AppButton label={queue.data.failed ? 'Retry sync' : 'Sync now'} variant="secondary" loading={retry.isPending} onPress={() => { void sync(); }} />
    {error && <Text accessibilityRole="alert" style={activityStyles.failedText}>Sync did not finish. Check your connection and try again.</Text>}
  </View>;
}

export const activityStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20, paddingBottom: 32 },
  stack: { gap: 16 }, flex: { flex: 1, minWidth: 0, gap: 6 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  title: { fontSize: 26, lineHeight: 34, color: colors.text, fontWeight: typography.weightSemibold },
  heading: { fontSize: 20, lineHeight: 28, color: colors.text, fontWeight: typography.weightSemibold },
  rowTitle: { fontSize: 16, lineHeight: 24, color: colors.text, fontWeight: typography.weightSemibold },
  body: { fontSize: 14, lineHeight: 22, color: colors.textSecondary, flexShrink: 1 },
  caption: { fontSize: 12, lineHeight: 19, color: colors.textSecondary },
  amount: { fontSize: 17, lineHeight: 26, color: colors.text, fontWeight: typography.weightSemibold, fontVariant: ['tabular-nums'] },
  positive: { color: colors.success },
  card: { backgroundColor: colors.surface, borderRadius: 18, padding: 20, gap: 12, ...elevation.card },
  notice: { backgroundColor: colors.surfaceMuted, borderRadius: 18, padding: 16, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 16, padding: 16, minHeight: 100 },
  icon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  actionIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  input: { minHeight: 52, borderRadius: 12, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, padding: 16, fontSize: 16, color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: { alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 8, backgroundColor: colors.surfaceMuted },
  failedSurface: { backgroundColor: colors.dangerSurface }, failedText: { color: colors.danger, fontSize: 14, lineHeight: 22 },
  pendingSurface: { backgroundColor: colors.warningSurface }, pendingText: { color: colors.warning },
  pressed: { opacity: 0.75 },
  textAction: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 4 },
  link: { fontSize: 14, lineHeight: 22, color: colors.primary, fontWeight: typography.weightSemibold },
  sectionHeader: { backgroundColor: colors.background, paddingTop: 20, paddingBottom: 12 },
  separator: { height: 10 },
  footer: { gap: 16, paddingTop: 24 },
});
