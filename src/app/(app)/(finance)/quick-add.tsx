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

import {
  router,
  useLocalSearchParams,
} from 'expo-router';

import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  useAccountSummaries,
} from '@/features/accounts/account-hooks';

import {
  useCategories,
  useCreateTransaction,
} from '@/features/transactions/transaction-hooks';

import type {
  TransactionKind,
} from '@/features/transactions/transaction-service';

import {
  MoneyInputError,
  formatMinorUnits,
  parseAmountToMinor,
} from '@/domain/money/money';

import {
  EmptyState,
  ErrorState,
  LoadingState,
  PrimaryButton,
  financeColors,
} from '@/features/finance/finance-ui';

function todayLocal(): string {
  const date = new Date();

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(2, '0');

  const day =
    String(
      date.getDate(),
    ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function validDate(
  value: string,
): boolean {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ) {
    return false;
  }

  const [
    year,
    month,
    day,
  ] = value
    .split('-')
    .map(Number);

  const test =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
      ),
    );

  return (
    test.getUTCFullYear() === year &&
    test.getUTCMonth() ===
      month - 1 &&
    test.getUTCDate() === day
  );
}

function errorMessage(
  error: unknown,
): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }

  return 'Could not save the transaction.';
}

export default function QuickAddScreen() {
  const insets =
    useSafeAreaInsets();

  const params =
    useLocalSearchParams<{
      type?: string;
    }>();

  const [
    kind,
    setKind,
  ] = useState<TransactionKind>(
    params.type === 'income'
      ? 'income'
      : 'expense',
  );

  const [
    selectedAccountId,
    setSelectedAccountId,
  ] = useState<string | null>(
    null,
  );

  const [
    selectedCategoryId,
    setSelectedCategoryId,
  ] = useState<string | null>(
    null,
  );

  const [
    amount,
    setAmount,
  ] = useState('');

  const [
    counterparty,
    setCounterparty,
  ] = useState('');

  const [
    description,
    setDescription,
  ] = useState('');

  const [
    transactionDate,
    setTransactionDate,
  ] = useState(todayLocal());

  const [
    formError,
    setFormError,
  ] = useState<string | null>(
    null,
  );

  const accounts =
    useAccountSummaries();

  const categories =
    useCategories(kind);

  const createTransaction =
    useCreateTransaction();

  const activeAccounts =
    accounts.data?.filter(
      (account) =>
        account.status === 'active',
    ) ?? [];

  const accountId =
    selectedAccountId ??
    activeAccounts[0]?.id ??
    null;

  const account =
    activeAccounts.find(
      (item) =>
        item.id === accountId,
    );

  const categoryId =
    selectedCategoryId ??
    categories.data?.[0]?.id ??
    null;

  const submit = async () => {
    setFormError(null);

    if (
      !account ||
      !accountId
    ) {
      setFormError(
        'Choose an account.',
      );

      return;
    }

    if (!categoryId) {
      setFormError(
        'Choose a category.',
      );

      return;
    }

    if (
      !validDate(
        transactionDate,
      )
    ) {
      setFormError(
        'Use a valid date in YYYY-MM-DD format.',
      );

      return;
    }

    try {
      const amountMinor =
        parseAmountToMinor(
          amount,
          account.currency_minor_unit,
        );

      await createTransaction.mutateAsync({
        accountId,
        categoryId,
        type: kind,
        amountMinor,
        transactionDate,
        merchant:
          counterparty,
        description,
      });

      router.back();
    } catch (error) {
      if (
        error instanceof
        MoneyInputError
      ) {
        setFormError(
          error.message,
        );

        return;
      }

      setFormError(
        errorMessage(error),
      );
    }
  };

  const changeKind = (
    nextKind:
      TransactionKind,
  ) => {
    setKind(nextKind);
    setSelectedCategoryId(
      null,
    );
    setFormError(null);
  };

  if (
    accounts.isLoading ||
    categories.isLoading
  ) {
    return (
      <View
        style={[
          styles.screen,
          {
            paddingTop:
              insets.top,
          },
        ]}
      >
        <LoadingState />
      </View>
    );
  }

  if (accounts.isError) {
    return (
      <View
        style={[
          styles.screen,
          {
            paddingTop:
              insets.top,
          },
        ]}
      >
        <ErrorState
          onRetry={() => {
            void accounts.refetch();
          }}
        />
      </View>
    );
  }

  if (!activeAccounts.length) {
    return (
      <View
        style={[
          styles.screen,
          styles.emptyScreen,
          {
            paddingTop:
              insets.top + 18,

            paddingBottom:
              insets.bottom + 18,
          },
        ]}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() =>
              router.back()
            }
            style={
              styles.closeButton
            }
          >
            <Ionicons
              name="close"
              size={24}
              color={
                financeColors.text
              }
            />
          </Pressable>

          <Text style={styles.title}>
            Add transaction
          </Text>

          <View
            style={styles.headerSpacer}
          />
        </View>

        <EmptyState
          title="Add an account first"
          description="Income and expenses need an account so the ledger knows where the money moved."
          action={
            <PrimaryButton
              title="Add account"
              icon="add"
              onPress={() => {
                router.replace(
                  '/add-account',
                );
              }}
            />
          }
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      <ScrollView
      nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[
          styles.content,
          {
            paddingTop:
              insets.top + 10,

            paddingBottom:
              insets.bottom + 30,
          },
        ]}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() =>
              router.back()
            }
            style={
              styles.closeButton
            }
          >
            <Ionicons
              name="close"
              size={24}
              color={
                financeColors.text
              }
            />
          </Pressable>

          <Text style={styles.title}>
            Quick add
          </Text>

          <View
            style={styles.headerSpacer}
          />
        </View>

        <View
          style={styles.segmented}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityState={{
              selected:
                kind === 'expense',
            }}
            style={[
              styles.segment,
              kind === 'expense' &&
                styles.segmentSelected,
            ]}
            onPress={() =>
              changeKind(
                'expense',
              )
            }
          >
            <Text
              style={[
                styles.segmentText,
                kind === 'expense' &&
                  styles.segmentTextSelected,
              ]}
            >
              Expense
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{
              selected:
                kind === 'income',
            }}
            style={[
              styles.segment,
              kind === 'income' &&
                styles.segmentSelected,
            ]}
            onPress={() =>
              changeKind(
                'income',
              )
            }
          >
            <Text
              style={[
                styles.segmentText,
                kind === 'income' &&
                  styles.segmentTextSelected,
              ]}
            >
              Income
            </Text>
          </Pressable>
        </View>

        <View style={styles.amountBlock}>
          <Text
            style={
              styles.currencyLabel
            }
          >
            {account?.currency_code ??
              ''}
          </Text>

          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor="#A1AAA5"
            keyboardType="decimal-pad"
            autoFocus
            style={styles.amountInput}
          />

          {account ? (
            <Text
              style={
                styles.balanceHint
              }
            >
              {account.name}
              {' Ã‚Â· '}
              {formatMinorUnits(
                account.current_balance_minor,
                account.currency_code,
                account.currency_minor_unit,
              )}
            </Text>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>
            Account
          </Text>

          <ScrollView
      nestedScrollEnabled
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.horizontalOptions
            }
          >
            {activeAccounts.map(
              (item) => {
                const selected =
                  item.id ===
                  accountId;

                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    accessibilityState={{
                      selected,
                    }}
                    onPress={() =>
                      setSelectedAccountId(
                        item.id,
                      )
                    }
                    style={[
                      styles.optionCard,
                      selected &&
                        styles.optionSelected,
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.optionTitle,
                        selected &&
                          styles.optionTextSelected,
                      ]}
                    >
                      {item.name}
                    </Text>

                    <Text
                      style={
                        styles.optionSubtitle
                      }
                    >
                      {
                        item.currency_code
                      }
                    </Text>
                  </Pressable>
                );
              },
            )}
          </ScrollView>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>
            Category
          </Text>

          {categories.isError ? (
            <ErrorState
              onRetry={() => {
                void categories.refetch();
              }}
            />
          ) : (
            <View
              style={styles.chipWrap}
            >
              {categories.data?.map(
                (category) => {
                  const selected =
                    category.id ===
                    categoryId;

                  return (
                    <Pressable
                      key={
                        category.id
                      }
                      accessibilityRole="button"
                      accessibilityState={{
                        selected,
                      }}
                      onPress={() =>
                        setSelectedCategoryId(
                          category.id,
                        )
                      }
                      style={[
                        styles.categoryChip,
                        selected &&
                          styles.optionSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.categoryText,
                          selected &&
                            styles.optionTextSelected,
                        ]}
                      >
                        {
                          category.default_name
                        }
                      </Text>
                    </Pressable>
                  );
                },
              )}
            </View>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>
            {kind === 'expense'
              ? 'Merchant'
              : 'Source'}
          </Text>

          <TextInput
            value={counterparty}
            onChangeText={
              setCounterparty
            }
            placeholder={
              kind === 'expense'
                ? 'Optional merchant'
                : 'Optional income source'
            }
            placeholderTextColor={
              financeColors.textMuted
            }
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>
            Date
          </Text>

          <TextInput
            value={transactionDate}
            onChangeText={
              setTransactionDate
            }
            placeholder="YYYY-MM-DD"
            placeholderTextColor={
              financeColors.textMuted
            }
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>
            Note
          </Text>

          <TextInput
            value={description}
            onChangeText={
              setDescription
            }
            placeholder="Optional note"
            placeholderTextColor={
              financeColors.textMuted
            }
            multiline
            style={[
              styles.input,
              styles.noteInput,
            ]}
          />
        </View>

        {formError ? (
          <View
            style={
              styles.errorBox
            }
          >
            <Ionicons
              name="alert-circle-outline"
              size={18}
              color={
                financeColors.negative
              }
            />

            <Text
              style={
                styles.errorText
              }
            >
              {formError}
            </Text>
          </View>
        ) : null}

        <PrimaryButton
          title={
            kind === 'expense'
              ? 'Save expense'
              : 'Save income'
          }
          icon={
            kind === 'expense'
              ? 'remove-circle-outline'
              : 'add-circle-outline'
          }
          loading={
            createTransaction.isPending
          }
          disabled={
            !accountId ||
            !categoryId
          }
          onPress={() => {
            void submit();
          }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor:
      financeColors.background,
  },

  emptyScreen: {
    paddingHorizontal: 18,
    gap: 24,
  },

  content: {
    paddingHorizontal: 18,
    gap: 22,
  },

  header: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
  },

  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      financeColors.surface,
  },

  headerSpacer: {
    width: 44,
  },

  title: {
    color: financeColors.text,
    fontSize: 18,
    fontWeight: '700',
  },

  segmented: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 16,
    backgroundColor: '#E9EEEB',
  },

  segment: {
    flex: 1,
    minHeight: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  segmentSelected: {
    backgroundColor:
      financeColors.surface,
  },

  segmentText: {
    color:
      financeColors.textMuted,
    fontWeight: '700',
  },

  segmentTextSelected: {
    color:
      financeColors.primary,
  },

  amountBlock: {
    alignItems: 'center',
    paddingVertical: 12,
  },

  currencyLabel: {
    color:
      financeColors.textMuted,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },

  amountInput: {
    minWidth: 220,
    marginTop: 4,
    color: financeColors.text,
    fontSize: 42,
    lineHeight: 52,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -1.2,
  },

  balanceHint: {
    marginTop: 4,
    color:
      financeColors.textMuted,
    fontSize: 12,
  },

  field: {
    gap: 9,
  },

  label: {
    color: financeColors.text,
    fontSize: 14,
    fontWeight: '700',
  },

  horizontalOptions: {
    gap: 9,
    paddingRight: 8,
  },

  optionCard: {
    minWidth: 120,
    maxWidth: 180,
    minHeight: 62,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 15,
    borderWidth: 1,
    borderColor:
      financeColors.border,
    backgroundColor:
      financeColors.surface,
  },

  optionSelected: {
    borderColor:
      financeColors.primary,
    backgroundColor:
      financeColors.surfaceSoft,
  },

  optionTitle: {
    color: financeColors.text,
    fontSize: 14,
    fontWeight: '700',
  },

  optionSubtitle: {
    marginTop: 4,
    color:
      financeColors.textMuted,
    fontSize: 12,
  },

  optionTextSelected: {
    color:
      financeColors.primary,
  },

  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  categoryChip: {
    minHeight: 42,
    paddingHorizontal: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor:
      financeColors.border,
    backgroundColor:
      financeColors.surface,
  },

  categoryText: {
    color:
      financeColors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },

  input: {
    minHeight: 54,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor:
      financeColors.border,
    backgroundColor:
      financeColors.surface,
    color: financeColors.text,
    fontSize: 16,
  },

  noteInput: {
    minHeight: 92,
    paddingTop: 15,
    textAlignVertical: 'top',
  },

  errorBox: {
    flexDirection: 'row',
    gap: 8,
    padding: 13,
    borderRadius: 14,
    backgroundColor: '#F9ECE8',
  },

  errorText: {
    flex: 1,
    color:
      financeColors.negative,
    fontSize: 13,
    lineHeight: 18,
  },
});