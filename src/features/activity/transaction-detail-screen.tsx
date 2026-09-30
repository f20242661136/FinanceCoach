import { CorrectionPanel } from '@/features/corrections/correction-panel';
import { useAuth } from '@/features/auth/auth-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { AppButton } from '@/components/ui/app-button';
import { AppScreen } from '@/components/ui/app-screen';
import { useActivityDetail } from './activity-hooks';
import { activityTitle, kindLabel } from './activity-model';
import { ActivitySyncNotice, SyncBadge, activityMoney, activityStyles as styles } from './activity-ui';

function Detail({ label, value }: { label: string; value: string | null }) {
  return <View style={styles.stack}><Text style={styles.caption}>{label}</Text><Text selectable style={styles.rowTitle}>{value?.trim() || 'Not provided'}</Text></View>;
}

export function TransactionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const validId = typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : '';
  const { session } = useAuth();
  const detail = useActivityDetail(validId);
  const item = detail.data;
  function back() { if (router.canGoBack()) router.back(); else router.replace('/activity' as never); }
  return <AppScreen>
    <AppButton label="Back to activity" variant="ghost" icon="arrow-back" onPress={back} />
    <Text accessibilityRole="header" style={styles.title}>Transaction details</Text>
    {!validId ? <View style={styles.card}><Text style={styles.heading}>Invalid transaction link</Text><Text style={styles.body}>Open a saved transaction from Activity to view its details.</Text></View>
      : detail.isPending ? <Text accessibilityLiveRegion="polite" style={styles.body}>Loading this saved transaction…</Text>
        : detail.isError ? <View style={styles.card}><Text style={styles.heading}>Could not load this transaction</Text>
          <AppButton label="Retry details" variant="secondary" onPress={() => { void detail.refetch(); }} /></View>
          : !item ? <View style={styles.card}><Text style={styles.heading}>Transaction unavailable</Text><Text style={styles.body}>It may have been deleted or may not be saved for your current account.</Text></View>
            : <>
              <View style={styles.card}>
                <Text style={styles.caption}>{kindLabel(item.type)} · {item.transaction_date}</Text>
                <Text style={styles.heading}>{activityTitle(item)}</Text>
                {item.type === 'transfer' && <Text style={styles.caption}>Amount sent</Text>}
                <Text selectable style={styles.title}>{activityMoney(item.amount_minor, item.currency_minor_unit, item.currency_code)}</Text>
                <SyncBadge status={item.sync_status} />
                <Text style={styles.body}>{item.sync_status === 'synced' ? 'This entry has synchronized with your account.' : item.sync_status === 'failed'
                  ? 'Saved on this device. This change needs attention before it can sync.' : item.sync_status === 'pending'
                    ? 'Saved on this device and waiting to synchronize.' : 'The current sync status is unavailable.'}</Text>
              </View>
              <View style={styles.card}>
                <Detail label={item.type === 'transfer' ? 'From account' : 'Account'} value={item.account_name} />
                {item.type === 'transfer' && <>
                  <Detail label="To account" value={item.destination_account_name ?? 'Account unavailable'} />
                  <Detail label="Amount received" value={activityMoney(item.destination_amount_minor, item.destination_currency_minor_unit, item.destination_currency_code)} />
                  <Text style={styles.caption}>Both amounts are shown as saved. No exchange rate is assumed.</Text>
                </>}
                <Detail label="Category" value={item.category_name} />
                <Detail label="Transaction date" value={item.transaction_date} />
                <Detail label="Merchant" value={item.merchant} />
                <Detail label="Description" value={item.description} />
                <Detail label="Notes" value={item.notes} />
              </View>
              <ActivitySyncNotice />
              <Text style={styles.caption}>Details reflect the entry saved on this device.</Text>
            </>}
    {validId && <CorrectionPanel key={`${session?.user.id ?? ''}:${validId}`} id={validId} />}
  </AppScreen>;
}
