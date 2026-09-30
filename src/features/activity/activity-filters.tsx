import { Text, TextInput, View } from 'react-native';
import { AppButton } from '@/components/ui/app-button';
import { ChoiceChip } from '@/components/ui/choice-chip';
import { colors } from '@/design/tokens';
import { EMPTY_FILTERS, filterError, kindLabel, shiftDay, syncLabel, type ActivityFilters, type ActivityKind, type ActivityStatus } from './activity-model';
import { activityStyles as styles } from './activity-ui';

export function ActivityFiltersPanel({ value, onChange, onApply, onCancel, today, options, optionsFailed, retryOptions }: {
  value: ActivityFilters; onChange: (value: ActivityFilters) => void; onApply: () => void; onCancel: () => void; today: string;
  options?: { accounts: { id: string; name: string; status: string }[]; currencies: string[] }; optionsFailed: boolean; retryOptions: () => void;
}) {
  const error = filterError(value);
  const patch = (changes: Partial<ActivityFilters>) => onChange({ ...value, ...changes });
  return <View style={styles.card}>
    <Text accessibilityRole="header" style={styles.heading}>Filter activity</Text>
    <Text style={styles.rowTitle}>Transaction type</Text>
    <View style={styles.chips}>{(['all', 'expense', 'income', 'transfer', 'adjustment'] as ActivityKind[]).map(kind =>
      <ChoiceChip key={kind} role="radio" label={kindLabel(kind)} selected={value.kind === kind} onPress={() => patch({ kind })} />)}</View>
    <Text style={styles.rowTitle}>Account</Text>
    <Text style={styles.caption}>Transfers match either account. Archived accounts remain available for history.</Text>
    <View style={styles.chips}>
      <ChoiceChip role="radio" label="All accounts" selected={!value.accountId} onPress={() => patch({ accountId: '' })} />
      {options?.accounts.map(account => <ChoiceChip key={account.id} role="radio" label={`${account.name}${account.status !== 'active' ? ` (${account.status})` : ''}`}
        selected={value.accountId === account.id} onPress={() => patch({ accountId: account.id })} />)}
    </View>
    <Text style={styles.rowTitle}>Currency</Text>
    <Text style={styles.caption}>Transfers match either currency; their two amounts stay separate.</Text>
    <View style={styles.chips}>
      <ChoiceChip role="radio" label="All currencies" selected={!value.currency} onPress={() => patch({ currency: '' })} />
      {options?.currencies.map(currency => <ChoiceChip key={currency} role="radio" label={currency} selected={value.currency === currency} onPress={() => patch({ currency })} />)}
    </View>
    {!options && !optionsFailed && <Text style={styles.body}>Loading account and currency filters…</Text>}
    {optionsFailed && <><Text style={styles.failedText}>Could not load account and currency filters.</Text><AppButton label="Retry filter options" variant="ghost" onPress={retryOptions} /></>}
    <Text style={styles.rowTitle}>Sync status</Text>
    <View style={styles.chips}>{(['all', 'synced', 'pending', 'failed'] as ActivityStatus[]).map(status =>
      <ChoiceChip key={status} role="radio" label={status === 'all' ? 'All statuses' : syncLabel(status)} selected={value.status === status} onPress={() => patch({ status })} />)}</View>
    <Text style={styles.rowTitle}>Date range</Text>
    <View style={styles.chips}>
      <ChoiceChip label="All dates" selected={!value.from && !value.to} onPress={() => patch({ from: '', to: '' })} />
      <ChoiceChip label="Last 7 days" selected={value.from === shiftDay(today, -6) && value.to === today} onPress={() => patch({ from: shiftDay(today, -6), to: today })} />
      <ChoiceChip label="This month" selected={value.from === `${today.slice(0, 7)}-01` && value.to === today} onPress={() => patch({ from: `${today.slice(0, 7)}-01`, to: today })} />
    </View>
    <Text style={styles.caption}>Start date · optional, inclusive</Text>
    <TextInput accessibilityLabel="Start date in YYYY-MM-DD format" value={value.from} onChangeText={from => patch({ from })} maxLength={10}
      autoCorrect={false} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textTertiary} style={styles.input} />
    <Text style={styles.caption}>End date · optional, inclusive</Text>
    <TextInput accessibilityLabel="End date in YYYY-MM-DD format" value={value.to} onChangeText={to => patch({ to })} maxLength={10}
      autoCorrect={false} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textTertiary} style={styles.input} />
    {error && <Text accessibilityRole="alert" style={styles.failedText}>{error}</Text>}
    <AppButton label="Apply filters" disabled={Boolean(error)} onPress={onApply} />
    <AppButton label="Reset filters" variant="secondary" onPress={() => onChange({ ...EMPTY_FILTERS, search: value.search })} />
    <AppButton label="Cancel" variant="ghost" onPress={onCancel} />
  </View>;
}
