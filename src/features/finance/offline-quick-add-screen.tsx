import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AppButton } from '@/components/ui/app-button';
import { colors, elevation, typography } from '@/design/tokens';
import { useAuth } from '@/features/auth/auth-context';
import { toUserFacingError } from '@/lib/user-facing-error';
import { useCreateOfflineTransaction } from '@/offline/sync/use-create-offline-transaction';
import { useLocalTransactionOptions } from '@/offline/sync/use-local-transaction-options';
import { useEntryHistory } from '@/features/smart-entry/use-entry-history';
import { decimalFromMinor, entrySuggestions, localToday, validAmount, validDate, type EntryKind } from '@/features/smart-entry/entry-intelligence';

export function OfflineQuickAddScreen() {
  const { session } = useAuth();
  const [kind, setKind] = useState<EntryKind>('expense');
  return <EntryForm key={session?.user.id} kind={kind} onKindChange={setKind} />;
}

function EntryForm({ kind, onKindChange }: { kind: EntryKind; onKindChange: (kind: EntryKind) => void }) {
  const router = useRouter();
  const options = useLocalTransactionOptions(kind);
  const history = useEntryHistory();
  const create = useCreateOfflineTransaction();
  const saving = useRef(false);
  const [accountChoice, setAccountChoice] = useState<string | null>(null);
  const [categoryChoice, setCategoryChoice] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState(localToday());
  const [notes, setNotes] = useState('');
  const [details, setDetails] = useState(false);
  const [allCategories, setAllCategories] = useState(false);
  const [repeatLoaded, setRepeatLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const accounts = options.data?.accounts ?? [];
  const categories = options.data?.categories ?? [];
  const suggestions = entrySuggestions(history.data ?? [], accounts, categories, kind, merchant);
  const accountId = accountChoice === null ? suggestions.accountId : accountChoice;
  const categoryId = categoryChoice === null ? suggestions.categoryId : categoryChoice;
  const account = accounts.find(item => item.id === accountId);
  const category = categories.find(item => item.id === categoryId);
  const orderedCategories = [...categories].sort((a, b) => Number(b.id === categoryId) - Number(a.id === categoryId));
  const visibleCategories = allCategories ? orderedCategories : orderedCategories.slice(0, 6);
  const busy = create.isPending;
  const canSave = Boolean(account && category && validAmount(amount, account.currency_minor_unit) && validDate(date)) && !busy && !saved;

  function close() {
    if (saving.current) return;
    if (router.canGoBack()) router.back(); else router.replace('/home' as never);
  }

  function repeat() {
    const row = suggestions.repeat;
    if (!row || busy) return;
    setAccountChoice(row.account_id);
    setCategoryChoice(row.category_id);
    setAmount(decimalFromMinor(row.amount_minor, row.currency_minor_unit));
    setMerchant(row.merchant ?? '');
    setDate(localToday());
    setNotes('');
    setRepeatLoaded(true);
    setError(null);
  }

  async function save() {
    if (saving.current || !canSave || !account || !category) return;
    saving.current = true;
    setError(null);
    try {
      await create.mutateAsync({ accountId: account.id, categoryId: category.id, type: kind,
        amount, transactionDate: date, merchant: merchant.trim(), notes: notes.trim() });
      setSaved(true);
    } catch (cause) {
      setError(toUserFacingError(cause, 'transaction'));
    } finally { saving.current = false; }
  }

  function another() {
    setAmount(''); setMerchant(''); setNotes(''); setDate(localToday());
    setAccountChoice(null); setCategoryChoice(null); setRepeatLoaded(false); setSaved(false);
    setError(null); setDetails(false); create.reset();
  }

  if (saved) return <SafeAreaView edges={['bottom']} style={styles.safe}>
    <View style={styles.success}>
      <View style={styles.successIcon}><Ionicons name="checkmark" size={32} color={colors.success} /></View>
      <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={styles.title}>{kind === 'expense' ? 'Expense added' : 'Income added'}</Text>
      <Text style={styles.successAmount}>{account?.currency_code} {amount}</Text>
      <Text style={styles.muted}>Saved securely on this device. It will sync when connected.</Text>
      <AppButton label="Done" onPress={close} />
      <AppButton label="Add another" variant="secondary" onPress={another} />
    </View>
  </SafeAreaView>;

  return <SafeAreaView edges={['bottom']} style={styles.safe}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
      <View style={styles.frame}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text accessibilityRole="header" style={[styles.title, styles.flex]}>Add transaction</Text>
            <Pressable disabled={busy} accessibilityRole="button" accessibilityLabel="Close transaction form" onPress={close} style={styles.iconButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <View style={styles.segment}>
            {(['expense', 'income'] as const).map(value => <Pressable key={value} disabled={busy} accessibilityRole="button"
              accessibilityState={{ selected: value === kind, disabled: busy }} onPress={() => { if (value !== kind) { setCategoryChoice(null); setRepeatLoaded(false); onKindChange(value); } }}
              style={[styles.segmentButton, value === kind && styles.segmentSelected]}>
              <Text style={styles.link}>{value === 'expense' ? 'Expense' : 'Income'}</Text>
            </Pressable>)}
            <Pressable disabled={busy} accessibilityRole="button" onPress={() => router.push('/transfer' as never)} style={styles.segmentButton}>
              <Text style={styles.link}>Transfer</Text>
            </Pressable>
          </View>

          <View style={styles.amountCard}>
            <Text style={styles.muted}>{account?.currency_code ?? 'Select an account'} · Amount</Text>
            <TextInput editable={!busy} accessibilityLabel="Transaction amount" value={amount} onChangeText={setAmount}
              placeholder="0" placeholderTextColor={colors.textTertiary} keyboardType="decimal-pad" maxLength={32} style={styles.amountInput} />
            {suggestions.repeat && <Pressable disabled={busy} accessibilityRole="button" accessibilityLabel={`Repeat last ${kind} and review before saving`}
              onPress={repeat} style={styles.textAction}><Text style={styles.link}>↻ Repeat last {kind}</Text></Pressable>}
            {repeatLoaded && <Text accessibilityLiveRegion="polite" style={styles.muted}>Details filled for today. Review them, then save.</Text>}
          </View>

          {options.isPending && <Text accessibilityLiveRegion="polite" style={styles.muted}>Loading saved accounts and categories…</Text>}
          {options.isError && <View style={styles.notice}><Text style={styles.error}>Could not load transaction options.</Text>
            <AppButton label="Retry" variant="ghost" onPress={() => { void options.refetch(); }} /></View>}
          {!options.isPending && !options.isError && !accounts.length && <View style={styles.notice}>
            <Text style={styles.sectionTitle}>Add an account first</Text><Text style={styles.muted}>An account gives this transaction its currency and balance.</Text>
            <AppButton label="Add account" variant="secondary" onPress={() => router.push('/add-account' as never)} />
          </View>}
          {accounts.length > 0 && <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            <View style={styles.chips}>{accounts.map(item => <Pressable key={item.id} disabled={busy} accessibilityRole="button"
              accessibilityState={{ selected: item.id === accountId, disabled: busy }} onPress={() => setAccountChoice(item.id)}
              style={[styles.chip, item.id === accountId && styles.selectedChip]}>
              <Text style={[styles.chipText, item.id === accountId && styles.link]}>{item.name} · {item.currency_code}</Text>
            </Pressable>)}</View>
            {accountChoice === null && history.data?.length && account ? <Text style={styles.caption}>Last used account when available</Text> : null}
          </View>}

          {categories.length > 0 && <View style={styles.section}>
            <View style={styles.header}><Text style={[styles.sectionTitle, styles.flex]}>Category</Text>
              {categoryChoice === null && category && <Text style={styles.caption}>{suggestions.categoryReason}</Text>}</View>
            <View style={styles.chips}>{visibleCategories.map(item => <Pressable key={item.id} disabled={busy} accessibilityRole="button"
              accessibilityState={{ selected: item.id === categoryId, disabled: busy }} onPress={() => setCategoryChoice(item.id)}
              style={[styles.chip, item.id === categoryId && styles.selectedChip]}>
              <Text style={[styles.chipText, item.id === categoryId && styles.link]}>{item.default_name}</Text>
            </Pressable>)}</View>
            {categories.length > 6 && <Pressable disabled={busy} accessibilityRole="button" accessibilityState={{ expanded: allCategories }}
              onPress={() => setAllCategories(!allCategories)} style={styles.textAction}><Text style={styles.link}>{allCategories ? 'Show fewer' : 'All categories'}</Text></Pressable>}
          </View>}
          {!options.isPending && !options.isError && !categories.length && accounts.length > 0 && <Text style={styles.error}>No categories are available. Sync your data from Home, then try again.</Text>}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{kind === 'expense' ? 'Merchant' : 'Source'} <Text style={styles.caption}>optional</Text></Text>
            <TextInput editable={!busy} accessibilityLabel={kind === 'expense' ? 'Merchant, optional' : 'Income source, optional'} value={merchant}
              onChangeText={setMerchant} maxLength={160} placeholder={kind === 'expense' ? 'Who did you pay?' : 'Where did it come from?'}
              placeholderTextColor={colors.textTertiary} style={styles.input} />
            <View style={styles.chips}>{suggestions.merchants.map(label => <Pressable key={label} disabled={busy} accessibilityRole="button"
              accessibilityLabel={`Use recent merchant ${label}`} onPress={() => setMerchant(label)} style={styles.chip}>
              <Text style={styles.chipText}>{label}</Text>
            </Pressable>)}</View>
          </View>

          <Pressable disabled={busy} accessibilityRole="button" accessibilityState={{ expanded: details }} onPress={() => setDetails(!details)} style={styles.detailToggle}>
            <Text style={styles.link}>{details ? 'Fewer details' : 'More details'}</Text>
            <Ionicons name={details ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary} />
          </Pressable>
          {details && <View style={styles.section}>
            <Text style={styles.sectionTitle}>Date</Text><TextInput editable={!busy} accessibilityLabel="Date in YYYY-MM-DD format" value={date}
              onChangeText={setDate} placeholder="YYYY-MM-DD" maxLength={10} autoCapitalize="none" style={styles.input} />
            {!validDate(date) && <Text style={styles.error}>Use a valid date in YYYY-MM-DD format.</Text>}
            <Text style={styles.sectionTitle}>Note <Text style={styles.caption}>optional</Text></Text>
            <TextInput editable={!busy} accessibilityLabel="Note, optional" value={notes} onChangeText={setNotes} maxLength={2000}
              multiline placeholder="Anything to remember?" placeholderTextColor={colors.textTertiary} style={[styles.input, styles.note]} />
          </View>}
          {amount.trim() && account && !validAmount(amount, account.currency_minor_unit)
            ? <Text style={styles.error}>Enter an amount above zero with at most {account.currency_minor_unit} decimal places.</Text> : null}
          {error && <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.error}>{error}</Text>}
          {history.isError && <Text style={styles.caption}>Recent suggestions are unavailable. You can still enter a transaction.</Text>}
        </ScrollView>
        <View style={styles.footer}>
          <Text style={styles.caption}>{account && category ? `${account.name} · ${category.default_name} · ${date}` : 'Choose an account and category to continue'}</Text>
          <AppButton label={kind === 'expense' ? 'Add expense' : 'Add income'} loading={busy} disabled={!canSave} onPress={() => { void save(); }} />
          <Text style={styles.caption}>Saved on this device first · syncs when connected</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, flex: { flex: 1 },
  frame: { flex: 1, width: '100%', maxWidth: 620, alignSelf: 'center' },
  content: { padding: 20, paddingBottom: 24, gap: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 26, lineHeight: 34, color: colors.text, fontWeight: typography.weightSemibold },
  sectionTitle: { fontSize: 16, lineHeight: 24, color: colors.text, fontWeight: typography.weightSemibold },
  iconButton: { height: 48, width: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 12, backgroundColor: colors.surfaceMuted },
  segment: { flexDirection: 'row', backgroundColor: colors.surfaceMuted, borderRadius: 12, padding: 4, gap: 4 },
  segmentButton: { flex: 1, minHeight: 48, padding: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  segmentSelected: { backgroundColor: colors.surface, ...elevation.card },
  amountCard: { backgroundColor: colors.surface, padding: 24, borderRadius: 18, gap: 8, ...elevation.card },
  amountInput: { fontSize: 36, lineHeight: 48, color: colors.primary, fontWeight: typography.weightSemibold, minHeight: 64, fontVariant: ['tabular-nums'] },
  section: { gap: 12 }, muted: { fontSize: 14, lineHeight: 22, color: colors.textSecondary },
  caption: { fontSize: 12, lineHeight: 19, color: colors.textSecondary, flexShrink: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 48, justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.surfaceMuted },
  selectedChip: { backgroundColor: colors.primarySoft }, chipText: { fontSize: 14, lineHeight: 22, color: colors.textSecondary },
  link: { fontSize: 14, lineHeight: 22, color: colors.primary, fontWeight: typography.weightSemibold },
  textAction: { minHeight: 48, justifyContent: 'center' },
  input: { minHeight: 52, borderRadius: 12, padding: 16, backgroundColor: colors.surface, fontSize: 16, color: colors.text },
  note: { minHeight: 96, textAlignVertical: 'top' },
  detailToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 },
  notice: { backgroundColor: colors.surfaceMuted, padding: 20, borderRadius: 18, gap: 12 },
  error: { fontSize: 14, lineHeight: 22, color: colors.danger },
  footer: { backgroundColor: colors.surface, padding: 20, gap: 10 },
  success: { width: '100%', maxWidth: 540, alignSelf: 'center', flex: 1, justifyContent: 'center', padding: 32, gap: 20 },
  successIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.successSurface, justifyContent: 'center', alignItems: 'center' },
  successAmount: { fontSize: 28, lineHeight: 36, color: colors.primary, fontWeight: typography.weightSemibold, fontVariant: ['tabular-nums'] },
});
