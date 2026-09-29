import {
  useEffect,
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
  useRouter,
} from 'expo-router';

import {
  useCreateOfflineTransaction,
} from '../../offline/sync/use-create-offline-transaction';

import {
  useLocalTransactionOptions,
} from '../../offline/sync/use-local-transaction-options';

import {
  AppButton,
} from '@/components/ui/app-button';
import {
  AppCard,
} from '@/components/ui/app-card';
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
import { toUserFacingError } from '@/lib/user-facing-error';



type TransactionType =
  | 'expense'
  | 'income';


function localToday(): string {
  const date =
    new Date();

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(
      2,
      '0',
    );

  const day =
    String(
      date.getDate(),
    ).padStart(
      2,
      '0',
    );

  return `${year}-${month}-${day}`;
}


export function OfflineQuickAddScreen() {
  const router =
    useRouter();

  const [
    type,
    setType,
  ] =
    useState<TransactionType>(
      'expense',
    );

  const [
    accountId,
    setAccountId,
  ] =
    useState('');

  const [
    categoryId,
    setCategoryId,
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
      localToday(),
    );

  const [
    merchant,
    setMerchant,
  ] =
    useState('');

  const [
    notes,
    setNotes,
  ] =
    useState('');

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState<string | null>(
      null,
    );


  const options =
    useLocalTransactionOptions(
      type,
    );

  const createMutation =
    useCreateOfflineTransaction();


  const accounts = useMemo(
    () => options.data
      ?.accounts ?? [],
    [options.data
      ?.accounts],
  );

  const categories = useMemo(
    () => options.data
      ?.categories ?? [],
    [options.data
      ?.categories],
  );


  useEffect(() => {
    if (
      accounts.length > 0
      && !accounts.some(
        (account) =>
          account.id ===
          accountId,
      )
    ) {
      // Encrypted local account data intentionally seeds the editable form once available.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAccountId(
        accounts[0].id,
      );
    }
  }, [
    accountId,
    accounts,
  ]);


  useEffect(() => {
    if (
      categories.length > 0
      && !categories.some(
        (category) =>
          category.id ===
          categoryId,
      )
    ) {
      // Encrypted local category data intentionally seeds the editable form once available.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCategoryId(
        categories[0].id,
      );
    }
  }, [
    categories,
    categoryId,
  ]);


  const selectedAccount =
    useMemo(
      () =>
        accounts.find(
          (account) =>
            account.id ===
            accountId,
        )
        ?? null,
      [
        accountId,
        accounts,
      ],
    );


  async function save() {
    setErrorMessage(
      null,
    );

    try {
      await createMutation
        .mutateAsync({
          accountId,

          categoryId:
            categoryId
              || null,

          type,

          amount,

          transactionDate,

          merchant,

          notes,
        });

      router.back();
    } catch (error) {
      setErrorMessage(
        toUserFacingError(
          error,
          'transaction',
        ),
      );
    }
  }


  const canSave =
    Boolean(
      accountId
      && amount.trim()
      && transactionDate.trim(),
    )
    && !createMutation.isPending;


  return (
    <ScrollView
      style={
        styles.screen
      }
      contentContainerStyle={
        styles.content
      }
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      nestedScrollEnabled
    >
      <Text
        style={
          styles.eyebrow
        }
      >
        QUICK ADD
      </Text>

      <Text
        style={
          styles.title
        }
      >
        Add a transaction
      </Text>

      <Text
        style={
          styles.subtitle
        }
      >
        Saved securely on this device first, then synced to your ledger when connected.
      </Text>


      <View
        style={
          styles.segment
        }
      >
        {(
          [
            'expense',
            'income',
          ] as const
        ).map(
          (value) => {
            const selected =
              value === type;

            return (
              <Pressable
                key={
                  value
                }
                accessibilityRole="button"
                accessibilityState={{
                  selected,
                }}
                onPress={() => {
                  setType(
                    value,
                  );

                  setCategoryId(
                    '',
                  );
                }}
                style={[
                  styles.segmentButton,

                  selected
                    ? styles.segmentButtonSelected
                    : null,
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,

                    selected
                      ? styles.segmentTextSelected
                      : null,
                  ]}
                >
                  {value === 'expense'
                    ? 'Expense'
                    : 'Income'}
                </Text>
              </Pressable>
            );
          },
        )}
      </View>


      <Text
        style={
          styles.label
        }
      >
        Amount
      </Text>

      <View
        style={
          styles.amountWrap
        }
      >
        <Text
          style={
            styles.currency
          }
        >
          {selectedAccount
            ?.currency_code
            ?? 'â€”'}
        </Text>

        <TextInput
          accessibilityLabel="Amount"
          value={
            amount
          }
          onChangeText={
            setAmount
          }
          placeholder="0.00"
          placeholderTextColor={
            colors.textTertiary
          }
          selectionColor={
            colors.focus
          }
          keyboardType="decimal-pad"
          style={
            styles.amountInput
          }
        />
      </View>


      <Text
        style={
          styles.label
        }
      >
        Account
      </Text>

      <View
        style={
          styles.chips
        }
      >
        {accounts.map(
          (account) => {
            const selected =
              account.id ===
              accountId;

            return (
              <Pressable
                key={
                  account.id
                }
                onPress={() => {
                  setAccountId(
                    account.id,
                  );
                }}
                style={[
                  styles.chip,

                  selected
                    ? styles.chipSelected
                    : null,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,

                    selected
                      ? styles.chipTextSelected
                      : null,
                  ]}
                >
                  {account.name}
                  {' Â· '}
                  {account.currency_code}
                </Text>
              </Pressable>
            );
          },
        )}
      </View>


      <Text
        style={
          styles.label
        }
      >
        Category
      </Text>

      <View
        style={
          styles.chips
        }
      >
        {categories.map(
          (category) => {
            const selected =
              category.id ===
              categoryId;

            return (
              <Pressable
                key={
                  category.id
                }
                onPress={() => {
                  setCategoryId(
                    category.id,
                  );
                }}
                style={[
                  styles.chip,

                  selected
                    ? styles.chipSelected
                    : null,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,

                    selected
                      ? styles.chipTextSelected
                      : null,
                  ]}
                >
                  {category.default_name}
                </Text>
              </Pressable>
            );
          },
        )}
      </View>


      <Text
        style={
          styles.label
        }
      >
        Date
      </Text>

      <TextInput
        value={
          transactionDate
        }
        onChangeText={
          setTransactionDate
        }
        placeholder="YYYY-MM-DD"
        autoCapitalize="none"
        style={
          styles.input
        }
      />


      <Text
        style={
          styles.label
        }
      >
        Merchant / source
      </Text>

      <TextInput
        value={
          merchant
        }
        onChangeText={
          setMerchant
        }
        placeholder={
          type === 'expense'
            ? 'Where did you spend?'
            : 'Where did it come from?'
        }
        style={
          styles.input
        }
      />


      <Text
        style={
          styles.label
        }
      >
        Note
      </Text>

      <TextInput
        value={
          notes
        }
        onChangeText={
          setNotes
        }
        placeholder="Optional"
        multiline
        style={[
          styles.input,
          styles.notes,
        ]}
      />


      {errorMessage ? (
        <InlineNotice
          tone="error"
          message={errorMessage}
        />
      ) : null}


      <AppCard
        tone="muted"
        style={
          styles.offlineNote
        }
      >
        <Text
          style={
            styles.offlineNoteTitle
          }
        >
          Offline-ready
        </Text>

        <Text
          style={
            styles.offlineNoteBody
          }
        >
          If the server is unavailable, this entry stays encrypted on this device and syncs later. Account balances remain server-confirmed until sync completes.
        </Text>
      </AppCard>


      <AppButton
        label={
          createMutation.isPending
            ? 'Saving...'
            : `Save ${type === 'expense' ? 'expense' : 'income'}`
        }
        loading={
          createMutation.isPending
        }
        disabled={
          !canSave
        }
        icon={
          type === 'expense'
            ? 'arrow-up-outline'
            : 'arrow-down-outline'
        }
        onPress={() => {
          void save();
        }}
        style={
          styles.saveButton
        }
      />
    </ScrollView>
  );
}


const styles =
  StyleSheet.create({
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
        spacing.lg,
      paddingBottom: 120,
    },

    eyebrow: {
      color:
        colors.primary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight:
        typography.weightBold,
      letterSpacing: 1.25,
    },

    title: {
      marginTop:
        spacing.sm,
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
      marginTop:
        spacing.sm,
      marginBottom:
        spacing.lg,
      color:
        colors.textSecondary,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
    },

    segment: {
      flexDirection: 'row',
      padding:
        spacing.xxs,
      borderRadius:
        radii.md,
      backgroundColor:
        colors.surfaceMuted,
      marginBottom:
        spacing.lg,
    },

    segmentButton: {
      flex: 1,
      minHeight:
        layout.touchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius:
        radii.sm,
    },

    segmentButtonSelected: {
      backgroundColor:
        colors.surface,
      ...elevation.card,
    },

    segmentText: {
      color:
        colors.textSecondary,
      fontSize:
        typography.small,
      fontWeight:
        typography.weightBold,
    },

    segmentTextSelected: {
      color:
        colors.primary,
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
      marginBottom:
        spacing.xs,
      marginTop:
        spacing.md,
    },

    amountWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 72,
      paddingHorizontal:
        spacing.md,
      borderRadius:
        radii.lg,
      borderWidth: 1,
      borderColor:
        colors.borderStrong,
      backgroundColor:
        colors.surface,
      ...elevation.card,
    },

    currency: {
      color:
        colors.textSecondary,
      fontSize:
        typography.small,
      fontWeight:
        typography.weightBold,
      marginRight:
        spacing.sm,
    },

    amountInput: {
      flex: 1,
      minHeight: 64,
      color:
        colors.text,
      fontSize: 28,
      lineHeight: 34,
      fontWeight:
        typography.weightExtraBold,
      letterSpacing: -0.5,
    },

    input: {
      minHeight: 54,
      borderRadius:
        radii.md,
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        colors.surface,
      color:
        colors.text,
      paddingHorizontal:
        spacing.md,
      fontSize:
        typography.body,
    },

    notes: {
      minHeight: 104,
      paddingTop:
        spacing.md,
      textAlignVertical: 'top',
    },

    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap:
        spacing.sm,
    },

    chip: {
      minHeight:
        layout.touchTarget,
      justifyContent: 'center',
      paddingHorizontal:
        spacing.md,
      paddingVertical:
        spacing.sm,
      borderRadius:
        radii.pill,
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        colors.surface,
    },

    chipSelected: {
      borderColor:
        colors.primary,
      backgroundColor:
        colors.primarySoft,
    },

    chipText: {
      color:
        colors.textSecondary,
      fontSize:
        typography.small,
      fontWeight:
        typography.weightSemibold,
    },

    chipTextSelected: {
      color:
        colors.primary,
      fontWeight:
        typography.weightBold,
    },

    error: {
      marginTop:
        spacing.lg,
    },

    errorText: {
      color:
        colors.danger,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
    },

    offlineNote: {
      marginTop:
        spacing.lg,
      gap:
        spacing.xs,
    },

    offlineNoteTitle: {
      color:
        colors.primary,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightBold,
    },

    offlineNoteBody: {
      color:
        colors.textSecondary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    saveButton: {
      marginTop:
        spacing.lg,
    },

    saveButtonDisabled: {
      opacity: 0.45,
    },

    saveButtonText: {
      color:
        colors.textOnPrimary,
      fontSize:
        typography.body,
      fontWeight:
        typography.weightBold,
    },
  });
