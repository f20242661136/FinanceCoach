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

import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  useAccountSetupOptions,
  useCreateAccount,
} from '@/features/accounts/account-hooks';

import {
  MoneyInputError,
  parseOpeningAmountToMinor,
} from '@/domain/money/money';

import {
  ErrorState,
  LoadingState,
  PrimaryButton,
  financeColors,
} from '@/features/finance/finance-ui';

function prettifyCode(
  value: string,
): string {
  return value
    .split('_')
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1),
    )
    .join(' ');
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

  return 'Could not create the account.';
}

export default function AddAccountScreen() {
  const insets =
    useSafeAreaInsets();

  const setup =
    useAccountSetupOptions();

  const createAccount =
    useCreateAccount();

  const [
    name,
    setName,
  ] = useState('');

  const [
    openingBalance,
    setOpeningBalance,
  ] = useState('');

  const [
    selectedType,
    setSelectedType,
  ] = useState<string | null>(
    null,
  );

  const [
    selectedCurrency,
    setSelectedCurrency,
  ] = useState<string | null>(
    null,
  );

  const [
    formError,
    setFormError,
  ] = useState<string | null>(
    null,
  );

  const accountTypes =
    setup.data?.accountTypes ?? [];

  const currencies =
    setup.data?.currencies ?? [];

  const accountTypeCode =
    selectedType ??
    accountTypes[0]?.code ??
    null;

  const preferredBaseCurrency =
    setup.data?.baseCurrencyCode;

  const baseCurrencyExists =
    preferredBaseCurrency
      ? currencies.some(
          (currency) =>
            currency.code ===
            preferredBaseCurrency,
        )
      : false;

  const currencyCode =
    selectedCurrency ??
    (
      baseCurrencyExists
        ? preferredBaseCurrency
        : currencies[0]?.code
    ) ??
    null;

  const currency =
    currencies.find(
      (item) =>
        item.code === currencyCode,
    );

  const submit = async () => {
    setFormError(null);

    const cleanName =
      name.trim();

    if (
      cleanName.length < 1 ||
      cleanName.length > 80
    ) {
      setFormError(
        'Account name must contain 1 to 80 characters.',
      );

      return;
    }

    if (
      !accountTypeCode ||
      !currencyCode ||
      !currency
    ) {
      setFormError(
        'Choose an account type and currency.',
      );

      return;
    }

    try {
      const openingBalanceMinor =
        parseOpeningAmountToMinor(
          openingBalance,
          currency.minor_unit,
        );

      await createAccount.mutateAsync({
        name: cleanName,
        accountTypeCode,
        currencyCode,
        openingBalanceMinor,
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

  if (setup.isLoading) {
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

  if (setup.isError) {
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
            void setup.refetch();
          }}
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
            hitSlop={8}
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
            Add account
          </Text>

          <View
            style={styles.headerSpacer}
          />
        </View>

        <View style={styles.intro}>
          <Text
            style={
              styles.introTitle
            }
          >
            Where does this money live?
          </Text>

          <Text
            style={
              styles.introText
            }
          >
            Add the real account or
            wallet. Balances will be
            calculated from its ledger.
          </Text>
        </View>

        <View style={styles.field}>
          <Text
            style={styles.label}
          >
            Account name
          </Text>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Main Bank"
            placeholderTextColor={
              financeColors.textMuted
            }
            autoCapitalize="words"
            maxLength={80}
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text
            style={styles.label}
          >
            Account type
          </Text>

          <View
            style={styles.chipWrap}
          >
            {accountTypes.map(
              (accountType) => {
                const selected =
                  accountType.code ===
                  accountTypeCode;

                return (
                  <Pressable
                    key={
                      accountType.code
                    }
                    accessibilityRole="button"
                    accessibilityState={{
                      selected,
                    }}
                    onPress={() =>
                      setSelectedType(
                        accountType.code,
                      )
                    }
                    style={[
                      styles.chip,
                      selected &&
                        styles.chipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selected &&
                          styles.chipTextSelected,
                      ]}
                    >
                      {prettifyCode(
                        accountType.code,
                      )}
                    </Text>
                  </Pressable>
                );
              },
            )}
          </View>
        </View>

        <View style={styles.field}>
          <Text
            style={styles.label}
          >
            Currency
          </Text>

          <ScrollView
      nestedScrollEnabled
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.currencyRow
            }
          >
            {currencies.map(
              (item) => {
                const selected =
                  item.code ===
                  currencyCode;

                return (
                  <Pressable
                    key={item.code}
                    accessibilityRole="button"
                    accessibilityState={{
                      selected,
                    }}
                    onPress={() =>
                      setSelectedCurrency(
                        item.code,
                      )
                    }
                    style={[
                      styles.currencyChip,
                      selected &&
                        styles.chipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.currencyCode,
                        selected &&
                          styles.chipTextSelected,
                      ]}
                    >
                      {item.code}
                    </Text>

                    <Text
                      numberOfLines={1}
                      style={[
                        styles.currencyName,
                        selected &&
                          styles.currencyNameSelected,
                      ]}
                    >
                      {item.name}
                    </Text>
                  </Pressable>
                );
              },
            )}
          </ScrollView>
        </View>

        <View style={styles.field}>
          <Text
            style={styles.label}
          >
            Opening balance
          </Text>

          <TextInput
            value={openingBalance}
            onChangeText={
              setOpeningBalance
            }
            placeholder={
              currency
                ? `0${
                    currency.minor_unit >
                    0
                      ? `.${'0'.repeat(
                          currency.minor_unit,
                        )}`
                      : ''
                  }`
                : '0'
            }
            placeholderTextColor={
              financeColors.textMuted
            }
            keyboardType="decimal-pad"
            style={styles.input}
          />

          <Text style={styles.help}>
            Enter what this account
            holds now. For a credit card
            or other liability, enter the
            amount owed as a positive
            number; the ledger stores the
            liability correctly.
          </Text>
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
          title="Create account"
          icon="wallet-outline"
          loading={
            createAccount.isPending
          }
          disabled={
            !accountTypeCode ||
            !currencyCode
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

  intro: {
    gap: 7,
  },

  introTitle: {
    color: financeColors.text,
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  introText: {
    color:
      financeColors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },

  field: {
    gap: 9,
  },

  label: {
    color: financeColors.text,
    fontSize: 14,
    fontWeight: '700',
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

  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  chip: {
    minHeight: 43,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor:
      financeColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      financeColors.surface,
  },

  chipSelected: {
    borderColor:
      financeColors.primary,
    backgroundColor:
      financeColors.surfaceSoft,
  },

  chipText: {
    color:
      financeColors.textMuted,
    fontWeight: '600',
  },

  chipTextSelected: {
    color:
      financeColors.primary,
    fontWeight: '700',
  },

  currencyRow: {
    gap: 9,
    paddingRight: 8,
  },

  currencyChip: {
    minWidth: 105,
    maxWidth: 145,
    minHeight: 64,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 15,
    borderColor:
      financeColors.border,
    backgroundColor:
      financeColors.surface,
  },

  currencyCode: {
    color: financeColors.text,
    fontWeight: '800',
  },

  currencyName: {
    color:
      financeColors.textMuted,
    marginTop: 4,
    fontSize: 12,
  },

  currencyNameSelected: {
    color:
      financeColors.primary,
  },

  help: {
    color:
      financeColors.textMuted,
    fontSize: 12,
    lineHeight: 18,
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