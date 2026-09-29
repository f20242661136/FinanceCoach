import * as Crypto from 'expo-crypto';
import Ionicons from '@expo/vector-icons/Ionicons';

import {
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

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

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
  AppButton,
} from '@/components/ui/app-button';

import {
  InlineNotice,
} from '@/components/ui/inline-notice';

import {
  colors,
  elevation,
  layout,
  radii,
  spacing,
  typography,
} from '@/design/tokens';

import {
  toUserFacingError,
} from '@/lib/user-facing-error';

import {
  localFinanceKeys,
  useLocalAccountSummaries,
} from '../../offline/sync/local-finance-query';

import {
  refreshLocalFinance,
} from '../../offline/sync/sync-refresh';

import {
  createTransferRpc,
} from '../transactions/transfer-rpc';

function today(): string {
  const date =
    new Date();

  return [
    date.getFullYear(),
    String(
      date.getMonth() + 1,
    ).padStart(
      2,
      '0',
    ),
    String(
      date.getDate(),
    ).padStart(
      2,
      '0',
    ),
  ].join('-');
}

function toMinor(
  value: string,
  minorUnit: number,
): string {
  const cleaned =
    value
      .trim()
      .replace(
        /,/g,
        '',
      );

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
  ] =
    cleaned.split('.');

  if (
    fraction.length
    > minorUnit
  ) {
    throw new Error(
      `This currency supports ${minorUnit} decimal places.`,
    );
  }

  const scale =
    BigInt(10)
    ** BigInt(minorUnit);

  const amount =
    BigInt(whole)
    * scale
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

  if (
    amount
    <= BigInt(0)
  ) {
    throw new Error(
      'Amount must be greater than zero.',
    );
  }

  return amount.toString();
}

function transferErrorMessage(
  error: unknown,
): string {
  if (
    error instanceof Error
    && (
      error.message
        === 'Choose the account to transfer from.'
      || error.message
        === 'Choose the destination account.'
      || error.message
        === 'Choose two different accounts.'
      || error.message
        === 'Enter a valid amount.'
      || error.message
        === 'Amount must be greater than zero.'
      || /^This currency supports \d+ decimal places\.$/
        .test(
          error.message,
        )
    )
  ) {
    return error.message;
  }

  return toUserFacingError(
    error,
    'transaction',
  );
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

  const accounts =
    useMemo(
      () =>
        accountsQuery.data
        ?? [],
      [
        accountsQuery.data,
      ],
    );

  const [
    fromAccountId,
    setFromAccountId,
  ] =
    useState('');

  const [
    toAccountId,
    setToAccountId,
  ] =
    useState('');

  const [
    amount,
    setAmount,
  ] =
    useState('');

  const [
    transactionDate,
    setTransactionDate,
  ] =
    useState(
      today(),
    );

  const [
    note,
    setNote,
  ] =
    useState('');

  const [
    saving,
    setSaving,
  ] =
    useState(false);

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
          account =>
            account.id
            === fromAccountId,
        )
        ?? null,
      [
        accounts,
        fromAccountId,
      ],
    );

  const destinations =
    useMemo(
      () =>
        accounts.filter(
          account =>
            account.id
              !== fromAccountId
            &&
            (
              !fromAccount
              ||
              account.currency_code
                === fromAccount.currency_code
            ),
        ),
      [
        accounts,
        fromAccount,
        fromAccountId,
      ],
    );

  const toAccount =
    useMemo(
      () =>
        destinations.find(
          account =>
            account.id
            === toAccountId,
        )
        ?? null,
      [
        destinations,
        toAccountId,
      ],
    );

  const canSave =
    !saving
    && Boolean(
      fromAccountId
      && toAccountId
      && amount.trim(),
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
        fromAccountId
        === toAccountId
      ) {
        throw new Error(
          'Choose two different accounts.',
        );
      }

      setSaving(true);

      const amountMinor =
        toMinor(
          amount,
          fromAccount
            .currency_minor_unit,
        );

      await createTransferRpc({
        transactionId:
          Crypto.randomUUID(),

        operationId:
          Crypto.randomUUID(),

        fromAccountId,
        toAccountId,

        sourceAmountMinor:
          amountMinor,

        destinationAmountMinor:
          amountMinor,

        transactionDate,

        note:
          note.trim()
          || null,
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
        transferErrorMessage(
          value,
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView
      edges={[
        'bottom',
      ]}
      style={styles.safeArea}
    >
      <KeyboardAvoidingView
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : 'height'
        }
        style={styles.flex}
      >
        <View style={styles.screen}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={
              styles.content
            }
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close transfer"
                hitSlop={8}
                onPress={() => {
                  router.back();
                }}
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed
                    ? styles.closeButtonPressed
                    : null,
                ]}
              >
                <Ionicons
                  name="close"
                  size={22}
                  color={
                    colors.text
                  }
                />
              </Pressable>

              <View style={styles.headerCopy}>
                <Text style={styles.eyebrow}>
                  TRANSFER
                </Text>

                <Text
                  accessibilityRole="header"
                  style={styles.title}
                >
                  Move money
                </Text>

                <Text style={styles.subtitle}>
                  Transfer value between accounts without counting it as new income or spending.
                </Text>
              </View>
            </View>

            {accounts.length < 2 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <Ionicons
                    name="swap-horizontal-outline"
                    size={24}
                    color={
                      colors.primary
                    }
                  />
                </View>

                <Text style={styles.emptyTitle}>
                  Two accounts are needed
                </Text>

                <Text style={styles.emptyBody}>
                  Add another account before creating a transfer.
                </Text>

                <AppButton
                  label="Add account"
                  variant="secondary"
                  icon="add-outline"
                  onPress={() => {
                    router.push(
                      '/add-account' as never,
                    );
                  }}
                />
              </View>
            ) : (
              <>
                <View style={styles.section}>
                  <View style={styles.sectionHeading}>
                    <Text style={styles.sectionTitle}>
                      From account
                    </Text>

                    <Text style={styles.sectionBody}>
                      Choose where the money is leaving.
                    </Text>
                  </View>

                  <View style={styles.chips}>
                    {accounts.map(
                      account => {
                        const selected =
                          fromAccountId
                          === account.id;

                        return (
                          <Pressable
                            key={
                              account.id
                            }
                            accessibilityRole="button"
                            accessibilityState={{
                              selected,
                            }}
                            onPress={() => {
                              setFromAccountId(
                                account.id,
                              );

                              setToAccountId('');
                            }}
                            style={({ pressed }) => [
                              styles.accountChip,
                              selected
                                ? styles.accountChipSelected
                                : null,
                              pressed
                                ? styles.chipPressed
                                : null,
                            ]}
                          >
                            <Text
                              numberOfLines={1}
                              style={[
                                styles.accountChipName,
                                selected
                                  ? styles.accountChipNameSelected
                                  : null,
                              ]}
                            >
                              {account.name}
                            </Text>

                            <Text
                              style={[
                                styles.accountChipMeta,
                                selected
                                  ? styles.accountChipMetaSelected
                                  : null,
                              ]}
                            >
                              {account.currency_code}
                            </Text>
                          </Pressable>
                        );
                      },
                    )}
                  </View>
                </View>

                <View style={styles.transferDirection}>
                  <View style={styles.directionLine} />

                  <View style={styles.directionIcon}>
                    <Ionicons
                      name="arrow-down-outline"
                      size={18}
                      color={
                        colors.primary
                      }
                    />
                  </View>

                  <View style={styles.directionLine} />
                </View>

                <View style={styles.section}>
                  <View style={styles.sectionHeading}>
                    <Text style={styles.sectionTitle}>
                      To account
                    </Text>

                    <Text style={styles.sectionBody}>
                      Only accounts in the same currency are shown.
                    </Text>
                  </View>

                  {fromAccount
                  && destinations.length === 0 ? (
                    <InlineNotice
                      tone="info"
                      message={`No other ${fromAccount.currency_code} account is available. Cross-currency transfers are intentionally kept separate.`}
                    />
                  ) : (
                    <View style={styles.chips}>
                      {destinations.map(
                        account => {
                          const selected =
                            toAccountId
                            === account.id;

                          return (
                            <Pressable
                              key={
                                account.id
                              }
                              accessibilityRole="button"
                              accessibilityState={{
                                selected,
                              }}
                              onPress={() => {
                                setToAccountId(
                                  account.id,
                                );
                              }}
                              style={({ pressed }) => [
                                styles.accountChip,
                                selected
                                  ? styles.accountChipSelected
                                  : null,
                                pressed
                                  ? styles.chipPressed
                                  : null,
                              ]}
                            >
                              <Text
                                numberOfLines={1}
                                style={[
                                  styles.accountChipName,
                                  selected
                                    ? styles.accountChipNameSelected
                                    : null,
                                ]}
                              >
                                {account.name}
                              </Text>

                              <Text
                                style={[
                                  styles.accountChipMeta,
                                  selected
                                    ? styles.accountChipMetaSelected
                                    : null,
                                ]}
                              >
                                {account.currency_code}
                              </Text>
                            </Pressable>
                          );
                        },
                      )}
                    </View>
                  )}
                </View>

                <View style={styles.amountSection}>
                  <Text style={styles.amountLabel}>
                    Amount to move
                  </Text>

                  <View style={styles.amountWrap}>
                    <Text style={styles.currency}>
                      {fromAccount
                        ?.currency_code
                        ?? '---'}
                    </Text>

                    <TextInput
                      accessibilityLabel="Transfer amount"
                      value={amount}
                      onChangeText={
                        setAmount
                      }
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor={
                        colors.textTertiary
                      }
                      selectionColor={
                        colors.focus
                      }
                      style={styles.amountInput}
                    />
                  </View>

                  {fromAccount
                  && toAccount ? (
                    <Text style={styles.routeSummary}>
                      {fromAccount.name}
                      {'  ->  '}
                      {toAccount.name}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.section}>
                  <View style={styles.field}>
                    <Text style={styles.label}>
                      Date
                      <Text style={styles.required}>
                        {' *'}
                      </Text>
                    </Text>

                    <TextInput
                      accessibilityLabel="Transfer date"
                      value={
                        transactionDate
                      }
                      onChangeText={
                        setTransactionDate
                      }
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={
                        colors.textTertiary
                      }
                      style={styles.input}
                    />
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.label}>
                      Note
                    </Text>

                    <TextInput
                      accessibilityLabel="Transfer note"
                      value={note}
                      onChangeText={
                        setNote
                      }
                      placeholder="Optional"
                      placeholderTextColor={
                        colors.textTertiary
                      }
                      style={styles.input}
                    />
                  </View>
                </View>
              </>
            )}

            {error ? (
              <InlineNotice
                tone="error"
                message={error}
              />
            ) : null}

            <View style={styles.infoCard}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={
                  colors.primary
                }
              />

              <Text style={styles.infoText}>
                Transfers preserve ledger correctness: money moves between accounts and does not become income or expense.
              </Text>
            </View>
          </ScrollView>

          {accounts.length >= 2 ? (
            <View style={styles.actionFooter}>
              <AppButton
                label={
                  saving
                    ? 'Transferring...'
                    : 'Transfer money'
                }
                icon="swap-horizontal-outline"
                loading={saving}
                disabled={
                  !canSave
                }
                onPress={() => {
                  void save();
                }}
              />
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    flex: {
      flex: 1,
    },

    safeArea: {
      flex: 1,
      backgroundColor:
        colors.background,
    },

    screen: {
      flex: 1,
      backgroundColor:
        colors.background,
    },

    content: {
      flexGrow: 1,
      width: '100%',
      maxWidth:
        layout.contentMaxWidth,
      alignSelf: 'center',
      paddingHorizontal:
        layout.screenHorizontalPadding,
      paddingTop:
        spacing.md,
      paddingBottom:
        spacing.xl,
      gap:
        spacing.lg,
    },

    header: {
      gap:
        spacing.md,
    },

    closeButton: {
      width:
        layout.touchTarget,
      height:
        layout.touchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'flex-start',
      marginLeft:
        -spacing.sm,
      borderRadius:
        radii.pill,
    },

    closeButtonPressed: {
      backgroundColor:
        colors.surfaceMuted,
    },

    headerCopy: {
      gap:
        spacing.xs,
    },

    eyebrow: {
      color:
        colors.primary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight:
        typography.weightExtraBold,
      letterSpacing: 1.1,
    },

    title: {
      color:
        colors.text,
      fontSize:
        typography.heading,
      lineHeight:
        typography.lineHeightHeading,
      fontWeight:
        typography.weightExtraBold,
      letterSpacing: -0.4,
    },

    subtitle: {
      maxWidth: 440,
      color:
        colors.textSecondary,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
    },

    section: {
      gap:
        spacing.md,
      padding:
        spacing.md,
      borderRadius:
        radii.lg,
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        colors.surface,
      ...elevation.card,
    },

    sectionHeading: {
      gap:
        spacing.xxs,
    },

    sectionTitle: {
      color:
        colors.text,
      fontSize:
        typography.body,
      lineHeight:
        typography.lineHeightBody,
      fontWeight:
        typography.weightBold,
    },

    sectionBody: {
      color:
        colors.textSecondary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap:
        spacing.sm,
    },

    accountChip: {
      minWidth: '46%',
      flexGrow: 1,
      gap:
        spacing.xxs,
      padding:
        spacing.md,
      borderRadius:
        radii.lg,
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        colors.background,
    },

    accountChipSelected: {
      borderColor:
        colors.primary,
      backgroundColor:
        colors.primarySoft,
    },

    chipPressed: {
      opacity: 0.82,
    },

    accountChipName: {
      color:
        colors.text,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightBold,
    },

    accountChipNameSelected: {
      color:
        colors.primary,
    },

    accountChipMeta: {
      color:
        colors.textTertiary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    accountChipMetaSelected: {
      color:
        colors.primary,
    },

    transferDirection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap:
        spacing.sm,
      paddingHorizontal:
        spacing.lg,
    },

    directionLine: {
      flex: 1,
      height:
        StyleSheet.hairlineWidth,
      backgroundColor:
        colors.borderStrong,
    },

    directionIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        colors.primarySoft,
    },

    amountSection: {
      gap:
        spacing.xs,
    },

    amountLabel: {
      color:
        colors.textSecondary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight:
        typography.weightBold,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },

    amountWrap: {
      minHeight: 90,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal:
        spacing.lg,
      borderRadius:
        radii.xl,
      backgroundColor:
        colors.primary,
      ...elevation.floating,
    },

    currency: {
      minWidth: 46,
      color:
        colors.accentStrong,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightBold,
      marginRight:
        spacing.sm,
    },

    amountInput: {
      flex: 1,
      minHeight: 78,
      color:
        colors.textOnPrimary,
      fontSize:
        typography.title,
      lineHeight:
        typography.lineHeightTitle,
      fontWeight:
        typography.weightExtraBold,
      letterSpacing: -0.7,
    },

    routeSummary: {
      color:
        colors.textSecondary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      textAlign: 'center',
    },

    field: {
      gap:
        spacing.xs,
    },

    label: {
      color:
        colors.text,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightBold,
    },

    required: {
      color:
        colors.danger,
    },

    input: {
      minHeight: 54,
      paddingHorizontal:
        spacing.md,
      borderRadius:
        radii.md,
      borderWidth: 1,
      borderColor:
        colors.borderStrong,
      backgroundColor:
        colors.background,
      color:
        colors.text,
      fontSize:
        typography.body,
    },

    emptyCard: {
      alignItems: 'center',
      gap:
        spacing.sm,
      padding:
        spacing.xl,
      borderRadius:
        radii.xl,
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        colors.surface,
      ...elevation.card,
    },

    emptyIcon: {
      width: 54,
      height: 54,
      borderRadius:
        radii.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        colors.primarySoft,
    },

    emptyTitle: {
      color:
        colors.text,
      fontSize:
        typography.subheading,
      lineHeight:
        typography.lineHeightSubheading,
      fontWeight:
        typography.weightBold,
      textAlign: 'center',
    },

    emptyBody: {
      color:
        colors.textSecondary,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      textAlign: 'center',
    },

    infoCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap:
        spacing.sm,
      padding:
        spacing.md,
      borderRadius:
        radii.lg,
      backgroundColor:
        colors.primarySoft,
    },

    infoText: {
      flex: 1,
      color:
        colors.textSecondary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    actionFooter: {
      width: '100%',
      maxWidth:
        layout.contentMaxWidth,
      alignSelf: 'center',
      paddingHorizontal:
        layout.screenHorizontalPadding,
      paddingTop:
        spacing.sm,
      paddingBottom:
        spacing.sm,
      borderTopWidth:
        StyleSheet.hairlineWidth,
      borderTopColor:
        colors.border,
      backgroundColor:
        colors.surface,
    },
  });