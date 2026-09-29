import * as Crypto from 'expo-crypto';

import {
  useMemo,
  useState,
} from 'react';

import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  colors,
  layout,
} from '@/design/tokens';

import {
  useRouter,
} from 'expo-router';

import {
  useQueryClient,
} from '@tanstack/react-query';

import {
  useSQLiteContext,
} from 'expo-sqlite';

import {
  useLocalAccountSummaries,
  localFinanceKeys,
} from '../../offline/sync/local-finance-query';

import {
  refreshLocalFinance,
} from '../../offline/sync/sync-refresh';

import {
  createTransferRpc,
} from '../transactions/transfer-rpc';


function today(): string {
  const date = new Date();

  return [
    date.getFullYear(),
    String(
      date.getMonth() + 1,
    ).padStart(2, '0'),
    String(
      date.getDate(),
    ).padStart(2, '0'),
  ].join('-');
}


function toMinor(
  value: string,
  minorUnit: number,
): string {
  const cleaned =
    value.trim().replace(/,/g, '');

  if (
    !/^\d+(?:\.\d+)?$/.test(
      cleaned,
    )
  ) {
    throw new Error(
      'Enter a valid amount.',
    );
  }

  const [
    whole,
    fraction = '',
  ] = cleaned.split('.');

  if (
    fraction.length > minorUnit
  ) {
    throw new Error(
      `This currency supports ${minorUnit} decimal places.`,
    );
  }

  const scale =
    BigInt(10) ** BigInt(minorUnit);

  const amount =
    BigInt(whole) * scale
    +
    (
      minorUnit
        ? BigInt(
            fraction.padEnd(
              minorUnit,
              '0',
            ),
          )
        : BigInt(0)
    );

  if (amount <= 0n) {
    throw new Error(
      'Amount must be greater than zero.',
    );
  }

  return amount.toString();
}


export function TransferScreen() {
  const router =
    useRouter();

  const db =
    useSQLiteContext();

  const queryClient =
    useQueryClient();

  const accountsQuery =
    useLocalAccountSummaries();

  const accounts = useMemo(
    () => accountsQuery.data ?? [],
    [accountsQuery.data],
  );

  const [
    fromAccountId,
    setFromAccountId,
  ] = useState('');

  const [
    toAccountId,
    setToAccountId,
  ] = useState('');

  const [
    amount,
    setAmount,
  ] = useState('');

  const [
    transactionDate,
    setTransactionDate,
  ] = useState(today());

  const [
    note,
    setNote,
  ] = useState('');

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );


  const fromAccount =
    useMemo(
      () =>
        accounts.find(
          (account) =>
            account.id ===
            fromAccountId,
        ) ?? null,
      [
        accounts,
        fromAccountId,
      ],
    );


  const destinations =
    useMemo(
      () =>
        accounts.filter(
          (account) =>
            account.id !==
              fromAccountId
            &&
            (
              !fromAccount
              ||
              account.currency_code ===
                fromAccount.currency_code
            ),
        ),
      [
        accounts,
        fromAccount,
        fromAccountId,
      ],
    );


  async function save() {
    setError(null);

    try {
      if (!fromAccount) {
        throw new Error(
          'Choose the account to transfer from.',
        );
      }

      if (!toAccountId) {
        throw new Error(
          'Choose the destination account.',
        );
      }

      if (
        fromAccountId ===
        toAccountId
      ) {
        throw new Error(
          'Choose two different accounts.',
        );
      }

      setSaving(true);

      await createTransferRpc({
        transactionId:
          Crypto.randomUUID(),

        operationId:
          Crypto.randomUUID(),


        fromAccountId,

        toAccountId,

        sourceAmountMinor:
          toMinor(
            amount,
            fromAccount.currency_minor_unit,
          ),

        destinationAmountMinor:
          toMinor(
            amount,
            fromAccount.currency_minor_unit,
          ),

        transactionDate,

        note:
          note.trim() || null,
      });

      await refreshLocalFinance(
        db,
        queryClient,
      );

      await queryClient
        .invalidateQueries({
          queryKey:
            localFinanceKeys.all,
        });

      router.back();
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Transfer could not be created.',
      );
    } finally {
      setSaving(false);
    }
  }


  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={
        styles.content
      }
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <Text style={styles.eyebrow}>
        TRANSFER
      </Text>

      <Text style={styles.title}>
        Move money
      </Text>

      <Text style={styles.subtitle}>
        Transfers move value between your accounts and are never counted as income or expense.
      </Text>


      <Text style={styles.label}>
        From
      </Text>

      <View style={styles.chips}>
        {accounts.map(
          (account) => (
            <Pressable
              key={account.id}
              onPress={() => {
                setFromAccountId(
                  account.id,
                );

                setToAccountId('');
              }}
              style={[
                styles.chip,

                fromAccountId ===
                  account.id
                  ? styles.chipSelected
                  : null,
              ]}
            >
              <Text
                style={
                  styles.chipText
                }
              >
                {account.name}
                {' · '}
                {account.currency_code}
              </Text>
            </Pressable>
          ),
        )}
      </View>


      <Text style={styles.label}>
        To
      </Text>

      <View style={styles.chips}>
        {destinations.map(
          (account) => (
            <Pressable
              key={account.id}
              onPress={() => {
                setToAccountId(
                  account.id,
                );
              }}
              style={[
                styles.chip,

                toAccountId ===
                  account.id
                  ? styles.chipSelected
                  : null,
              ]}
            >
              <Text
                style={
                  styles.chipText
                }
              >
                {account.name}
              </Text>
            </Pressable>
          ),
        )}
      </View>


      {fromAccount &&
      destinations.length === 0 ? (
        <View style={styles.notice}>
          <Text
            style={
              styles.noticeText
            }
          >
            No other {
              fromAccount.currency_code
            } account is available. Cross-currency transfers will be added separately.
          </Text>
        </View>
      ) : null}


      <Text style={styles.label}>
        Amount
      </Text>

      <TextInput
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder={
          fromAccount
            ? `${fromAccount.currency_code} 0.00`
            : '0.00'
        }
        style={styles.input}
      />


      <Text style={styles.label}>
        Date
      </Text>

      <TextInput
        value={transactionDate}
        onChangeText={
          setTransactionDate
        }
        placeholder="YYYY-MM-DD"
        style={styles.input}
      />


      <Text style={styles.label}>
        Note
      </Text>

      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Optional"
        style={styles.input}
      />


      {error ? (
        <View
          style={
            styles.error
          }
        >
          <Text
            style={
              styles.errorText
            }
          >
            {error}
          </Text>
        </View>
      ) : null}


      <Pressable
        disabled={
          saving
          || !fromAccountId
          || !toAccountId
          || !amount.trim()
        }
        onPress={() => {
          void save();
        }}
        style={[
          styles.save,

          (
            saving
            || !fromAccountId
            || !toAccountId
            || !amount.trim()
          )
            ? styles.disabled
            : null,
        ]}
      >
        <Text
          style={
            styles.saveText
          }
        >
          {saving
            ? 'Transferring…'
            : 'Transfer'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}


const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },

    content: {
      width: '100%',
      maxWidth: layout.contentMaxWidth,
      alignSelf: 'center',
      flexGrow: 1,
      padding: 20,
      paddingBottom: 120,
    },

    eyebrow: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1.4,
    },

    title: {
      marginTop: 8,
      color: colors.text,
      fontSize: 29,
      lineHeight: 35,
      fontWeight: '700',
    },

    subtitle: {
      marginTop: 8,
      marginBottom: 18,
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 21,
    },

    label: {
      marginTop: 18,
      marginBottom: 8,
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },

    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },

    chip: {
      paddingHorizontal: 13,
      paddingVertical: 10,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },

    chipSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },

    chipText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
    },

    input: {
      minHeight: 52,
      paddingHorizontal: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      color: colors.text,
      fontSize: 15,
    },

    notice: {
      marginTop: 12,
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.surfaceMuted,
    },

    noticeText: {
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 18,
    },

    error: {
      marginTop: 18,
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.dangerSurface,
    },

    errorText: {
      color: colors.danger,
      fontSize: 13,
      lineHeight: 18,
    },

    save: {
      minHeight: 54,
      marginTop: 26,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },

    disabled: {
      opacity: 0.45,
    },

    saveText: {
      color: colors.textOnPrimary,
      fontSize: 15,
      fontWeight: '700',
    },
  });