import Ionicons from '@expo/vector-icons/Ionicons';
import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { AppButton } from '@/components/ui/app-button';
import { InlineNotice } from '@/components/ui/inline-notice';
import {
  colors,
  elevation,
  layout,
  radii,
  spacing,
  typography,
} from '@/design/tokens';
import { toUserFacingError } from '@/lib/user-facing-error';
import { useCreateOfflineTransaction } from '../../offline/sync/use-create-offline-transaction';
import { useLocalTransactionOptions } from '../../offline/sync/use-local-transaction-options';

type TransactionType = 'expense' | 'income';

function localToday(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function OfflineQuickAddScreen() {
  const router = useRouter();
  const [type, setType] = useState<TransactionType>('expense');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionDate, setTransactionDate] = useState(localToday());
  const [merchant, setMerchant] = useState('');
  const [notes, setNotes] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const options = useLocalTransactionOptions(type);
  const createMutation = useCreateOfflineTransaction();

  const accounts = useMemo(
    () => options.data?.accounts ?? [],
    [options.data?.accounts],
  );
  const categories = useMemo(
    () => options.data?.categories ?? [],
    [options.data?.categories],
  );

  useEffect(() => {
    if (
      accounts.length > 0
      && !accounts.some(account => account.id === accountId)
    ) {
      // Preserve the existing safe default: seed the form with an active account.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAccountId(accounts[0].id);
    }
  }, [accountId, accounts]);

  const selectedAccount = useMemo(
    () => accounts.find(account => account.id === accountId) ?? null,
    [accountId, accounts],
  );

  const canSave = Boolean(
    accountId
    && amount.trim()
    && transactionDate.trim(),
  ) && !createMutation.isPending;

  async function save() {
    setErrorMessage(null);

    try {
      await createMutation.mutateAsync({
        accountId,
        categoryId: categoryId || null,
        type,
        amount,
        transactionDate,
        merchant,
        notes,
      });

      router.back();
    } catch (error) {
      setErrorMessage(
        toUserFacingError(error, 'transaction'),
      );
    }
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View style={styles.screen}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <View style={styles.headerRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close transaction form"
                  hitSlop={8}
                  onPress={() => router.back()}
                  style={({ pressed }) => [
                    styles.iconButton,
                    pressed ? styles.iconButtonPressed : null,
                  ]}
                >
                  <Ionicons name="close" size={22} color={colors.text} />
                </Pressable>

                <Text accessibilityRole="header" style={styles.title}>
                  Add transaction
                </Text>

                <View style={styles.iconButtonPlaceholder} />
              </View>

              <Text style={styles.subtitle}>
                Capture the essentials now. Extra details stay out of the way until you need them.
              </Text>
            </View>

            <View style={styles.segment}>
              {(['expense', 'income'] as const).map(value => {
                const selected = value === type;
                return (
                  <Pressable
                    key={value}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      setType(value);
                      setCategoryId('');
                    }}
                    style={({ pressed }) => [
                      styles.segmentButton,
                      selected ? styles.segmentButtonSelected : null,
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        selected ? styles.segmentTextSelected : null,
                      ]}
                    >
                      {value === 'expense' ? 'Expense' : 'Income'}
                    </Text>
                  </Pressable>
                );
              })}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Transfer between accounts"
                onPress={() => router.replace('/transfer' as never)}
                style={({ pressed }) => [
                  styles.segmentButton,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text style={styles.segmentText}>Transfer</Text>
              </Pressable>
            </View>

            <View style={styles.amountCard}>
              <Text style={styles.amountLabel}>Amount</Text>
              <View style={styles.amountRow}>
                <Text style={styles.currencyCode}>
                  {selectedAccount?.currency_code ?? '---'}
                </Text>
                <TextInput
                  accessibilityLabel="Amount"
                  autoFocus
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor={colors.textTertiary}
                  selectionColor={colors.focus}
                  keyboardType="decimal-pad"
                  style={styles.amountInput}
                />
              </View>
            </View>

            {options.error ? (
              <InlineNotice
                tone="error"
                message={toUserFacingError(options.error, 'transaction')}
              />
            ) : null}

            {accounts.length === 0 && !options.isLoading ? (
              <View style={styles.emptyAccountCard}>
                <View style={styles.smallIcon}>
                  <Ionicons
                    name="wallet-outline"
                    size={21}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.emptyAccountCopy}>
                  <Text style={styles.emptyAccountTitle}>Add an account first</Text>
                  <Text style={styles.emptyAccountBody}>
                    Transactions need an account so balances stay correct.
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Add account"
                  onPress={() => router.push('/add-account' as never)}
                  style={({ pressed }) => pressed ? styles.pressed : null}
                >
                  <Text style={styles.textAction}>Add</Text>
                </Pressable>
              </View>
            ) : null}

            {accounts.length > 0 ? (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Account</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipRow}
                >
                  {accounts.map(account => {
                    const selected = account.id === accountId;
                    return (
                      <Pressable
                        key={account.id}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => setAccountId(account.id)}
                        style={({ pressed }) => [
                          styles.chip,
                          selected ? styles.chipSelected : null,
                          pressed ? styles.pressed : null,
                        ]}
                      >
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.chipText,
                            selected ? styles.chipTextSelected : null,
                          ]}
                        >
                          {account.name} · {account.currency_code}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            {categories.length > 0 ? (
              <View style={styles.fieldGroup}>
                <View style={styles.fieldHeadingRow}>
                  <Text style={styles.fieldLabel}>Category</Text>
                  {categoryId ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Clear category"
                      hitSlop={8}
                      onPress={() => setCategoryId('')}
                    >
                      <Text style={styles.clearAction}>Clear</Text>
                    </Pressable>
                  ) : null}
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipRow}
                >
                  {categories.map(category => {
                    const selected = category.id === categoryId;
                    return (
                      <Pressable
                        key={category.id}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => setCategoryId(category.id)}
                        style={({ pressed }) => [
                          styles.chip,
                          selected ? styles.chipSelected : null,
                          pressed ? styles.pressed : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            selected ? styles.chipTextSelected : null,
                          ]}
                        >
                          {category.default_name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                {type === 'expense' ? 'Merchant' : 'Source'}
              </Text>
              <TextInput
                accessibilityLabel={
                  type === 'expense' ? 'Merchant' : 'Income source'
                }
                value={merchant}
                onChangeText={setMerchant}
                placeholder={
                  type === 'expense'
                    ? 'Where did you spend?'
                    : 'Where did it come from?'
                }
                placeholderTextColor={colors.textTertiary}
                selectionColor={colors.focus}
                style={styles.input}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: showMore }}
              onPress={() => setShowMore(value => !value)}
              style={({ pressed }) => [
                styles.moreButton,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={styles.moreButtonText}>
                {showMore ? 'Hide details' : 'More details'}
              </Text>
              <Ionicons
                name={showMore ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.primary}
              />
            </Pressable>

            {showMore ? (
              <View style={styles.detailsCard}>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Date</Text>
                  <TextInput
                    accessibilityLabel="Transaction date"
                    value={transactionDate}
                    onChangeText={setTransactionDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="none"
                    selectionColor={colors.focus}
                    style={styles.input}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Note</Text>
                  <TextInput
                    accessibilityLabel="Transaction note"
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Optional"
                    placeholderTextColor={colors.textTertiary}
                    selectionColor={colors.focus}
                    multiline
                    style={[styles.input, styles.notes]}
                  />
                </View>
              </View>
            ) : null}

            {errorMessage ? (
              <InlineNotice tone="error" message={errorMessage} />
            ) : null}

            <View style={styles.syncNote}>
              <Ionicons
                name="cloud-done-outline"
                size={17}
                color={colors.textTertiary}
              />
              <Text style={styles.syncNoteText}>
                Saves securely on this device first and syncs when available.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.actionFooter}>
            <AppButton
              label={
                createMutation.isPending
                  ? 'Saving...'
                  : type === 'expense'
                    ? 'Add expense'
                    : 'Add income'
              }
              loading={createMutation.isPending}
              disabled={!canSave}
              icon="checkmark"
              onPress={() => void save()}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: layout.screenHorizontalPadding,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },

  header: {
    gap: spacing.sm,
  },

  headerRow: {
    minHeight: layout.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },

  iconButton: {
    width: layout.touchTarget,
    height: layout.touchTarget,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconButtonPlaceholder: {
    width: layout.touchTarget,
    height: layout.touchTarget,
  },

  iconButtonPressed: {
    backgroundColor: colors.surfaceMuted,
  },

  title: {
    flex: 1,
    color: colors.text,
    fontSize: typography.heading,
    lineHeight: typography.lineHeightHeading,
    fontWeight: typography.weightBold,
    textAlign: 'center',
    letterSpacing: -0.4,
  },

  subtitle: {
    alignSelf: 'center',
    maxWidth: 440,
    color: colors.textSecondary,
    fontSize: typography.small,
    lineHeight: typography.lineHeightSmall,
    textAlign: 'center',
  },

  segment: {
    flexDirection: 'row',
    padding: spacing.xxs,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },

  segmentButton: {
    flex: 1,
    minHeight: layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
  },

  segmentButtonSelected: {
    backgroundColor: colors.surface,
    ...elevation.card,
  },

  segmentText: {
    color: colors.textSecondary,
    fontSize: typography.small,
    lineHeight: typography.lineHeightSmall,
    fontWeight: typography.weightSemibold,
  },

  segmentTextSelected: {
    color: colors.primary,
  },

  amountCard: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
  },

  amountLabel: {
    color: colors.textSecondary,
    fontSize: typography.small,
    lineHeight: typography.lineHeightSmall,
    fontWeight: typography.weightMedium,
  },

  amountRow: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: spacing.sm,
  },

  currencyCode: {
    color: colors.textSecondary,
    fontSize: typography.subheading,
    fontWeight: typography.weightSemibold,
  },

  amountInput: {
    minWidth: 130,
    maxWidth: '75%',
    padding: 0,
    color: colors.text,
    fontSize: 42,
    lineHeight: 50,
    fontWeight: typography.weightBold,
    letterSpacing: -1.2,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },

  fieldGroup: {
    gap: spacing.xs,
  },

  fieldHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  fieldLabel: {
    color: colors.text,
    fontSize: typography.small,
    lineHeight: typography.lineHeightSmall,
    fontWeight: typography.weightSemibold,
  },

  chipRow: {
    gap: spacing.xs,
    paddingRight: layout.screenHorizontalPadding,
  },

  chip: {
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
  },

  chipSelected: {
    backgroundColor: colors.primarySoft,
  },

  chipText: {
    color: colors.textSecondary,
    fontSize: typography.small,
    fontWeight: typography.weightMedium,
  },

  chipTextSelected: {
    color: colors.primary,
    fontWeight: typography.weightSemibold,
  },

  clearAction: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weightSemibold,
  },

  input: {
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: typography.body,
    lineHeight: typography.lineHeightBody,
  },

  notes: {
    minHeight: 96,
    textAlignVertical: 'top',
  },

  moreButton: {
    minHeight: layout.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },

  moreButtonText: {
    color: colors.primary,
    fontSize: typography.small,
    fontWeight: typography.weightSemibold,
  },

  detailsCard: {
    gap: spacing.md,
    padding: layout.cardPadding,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceMuted,
  },

  emptyAccountCard: {
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: layout.cardPadding,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    ...elevation.card,
  },

  smallIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },

  emptyAccountCopy: {
    flex: 1,
    gap: 2,
  },

  emptyAccountTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weightSemibold,
  },

  emptyAccountBody: {
    color: colors.textSecondary,
    fontSize: typography.small,
    lineHeight: typography.lineHeightSmall,
  },

  textAction: {
    color: colors.primary,
    fontSize: typography.small,
    fontWeight: typography.weightSemibold,
  },

  syncNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },

  syncNoteText: {
    flex: 1,
    color: colors.textTertiary,
    fontSize: typography.caption,
    lineHeight: typography.lineHeightCaption,
  },

  actionFooter: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: layout.screenHorizontalPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },

  pressed: {
    opacity: 0.72,
  },
});
