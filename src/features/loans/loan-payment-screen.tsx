import {
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
  elevation,
  layout,
  radii,
  spacing,
  typography,
} from '@/design/tokens';

import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';

import {
  useLocalFinanceReferenceData,
} from '../../offline/sync/use-local-finance-reference-data';

import {
  formatMinor,
  parseDecimalToMinor,
} from '../budgets/budget-money';

import {
  useAddLoanPayment,
  useLoanStatus,
} from './loan-query';


function today(): string {
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


function firstParam(
  value:
    | string
    | string[]
    | undefined,
): string {
  return Array.isArray(
    value,
  )
    ? value[0] ?? ''
    : value ?? '';
}


export function LoanPaymentScreen() {
  const router =
    useRouter();

  const params =
    useLocalSearchParams<{
      loanId?:
        | string
        | string[];
    }>();

  const loanId =
    firstParam(
      params.loanId,
    );

  const loansQuery =
    useLoanStatus();

  const reference =
    useLocalFinanceReferenceData();

  const mutation =
    useAddLoanPayment();


  const loan =
    loansQuery.data
      ?.find(
        (item) =>
          item.id ===
          loanId,
      )
    ?? null;


  const [
    amount,
    setAmount,
  ] =
    useState('');

  const [
    paymentDate,
    setPaymentDate,
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
    errorMessage,
    setErrorMessage,
  ] =
    useState<string | null>(
      null,
    );


  const minorUnit =
    loan
      ? (
          reference.data
            ?.currencies
            .find(
              (currency) =>
                currency.code ===
                loan.currency_code,
            )
            ?.minorUnit
          ?? 2
        )
      : 2;


  async function save() {
    setErrorMessage(
      null,
    );

    try {
      if (!loan) {
        throw new Error(
          'Loan is unavailable.',
        );
      }

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
          paymentDate,
        )
      ) {
        throw new Error(
          'Use YYYY-MM-DD for the payment date.',
        );
      }

      const amountMinor =
        parseDecimalToMinor(
          amount,
          minorUnit,
        );


      if (
        BigInt(
          amountMinor,
        )
        >
        BigInt(
          loan.remaining_minor,
        )
      ) {
        throw new Error(
          'Payment cannot exceed remaining principal.',
        );
      }


      await mutation
        .mutateAsync({
          loanId:
            loan.id,

          amountMinor,

          paymentDate,

          note:
            note.trim()
              || null,
        });


      router.back();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Could not record payment.',
      );
    }
  }


  if (
    loansQuery.isLoading
  ) {
    return (
      <View
        style={
          styles.centered
        }
      >
        <Text
          style={
            styles.muted
          }
        >
          Loading loan…
        </Text>
      </View>
    );
  }


  if (!loan) {
    return (
      <View
        style={
          styles.centered
        }
      >
        <Text
          style={
            styles.errorTitle
          }
        >
          Loan unavailable
        </Text>
      </View>
    );
  }


  const canSave =
    Boolean(
      amount.trim()
      && paymentDate.trim(),
    )
    && !mutation.isPending;


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
    >
      <Text
        style={
          styles.eyebrow
        }
      >
        LOAN PAYMENT
      </Text>

      <Text
        style={
          styles.title
        }
      >
        Record payment
      </Text>

      <Text
        style={
          styles.subtitle
        }
      >
        {loan.counterparty_name}
        {' · Remaining '}
        {loan.currency_code}{' '}
        {formatMinor(
          loan.remaining_minor,
          minorUnit,
        )}
      </Text>


      <Text
        style={
          styles.label
        }
      >
        Amount
      </Text>

      <View
        style={
          styles.amountRow
        }
      >
        <Text
          style={
            styles.currencyPrefix
          }
        >
          {loan.currency_code}
        </Text>

        <TextInput
          value={
            amount
          }
          onChangeText={
            setAmount
          }
          keyboardType="decimal-pad"
          placeholder="0.00"
          style={
            styles.amountInput
          }
        />
      </View>


      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setAmount(
            formatMinor(
              loan.remaining_minor,
              minorUnit,
            ),
          );
        }}
        style={
          styles.settleButton
        }
      >
        <Text
          style={
            styles.settleButtonText
          }
        >
          Use full remaining amount
        </Text>
      </Pressable>


      <Text
        style={
          styles.label
        }
      >
        Payment date
      </Text>

      <TextInput
        value={
          paymentDate
        }
        onChangeText={
          setPaymentDate
        }
        autoCapitalize="none"
        placeholder="YYYY-MM-DD"
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
          note
        }
        onChangeText={
          setNote
        }
        multiline
        placeholder="Optional"
        style={[
          styles.input,
          styles.notes,
        ]}
      />


      <View
        style={
          styles.infoCard
        }
      >
        <Text
          style={
            styles.infoTitle
          }
        >
          Loan history only
        </Text>

        <Text
          style={
            styles.infoText
          }
        >
          This payment reduces the loan’s remaining principal. It does not automatically move money between your accounts.
        </Text>
      </View>


      {errorMessage ? (
        <View
          style={
            styles.errorCard
          }
        >
          <Text
            style={
              styles.errorText
            }
          >
            {errorMessage}
          </Text>
        </View>
      ) : null}


      <Pressable
        accessibilityRole="button"
        disabled={
          !canSave
        }
        onPress={() => {
          void save();
        }}
        style={[
          styles.saveButton,

          !canSave
            ? styles.disabled
            : null,
        ]}
      >
        <Text
          style={
            styles.saveButtonText
          }
        >
          {mutation.isPending
            ? 'Recording…'
            : 'Record payment'}
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
      flexGrow: 1,
      width: '100%',
      maxWidth: layout.contentMaxWidth,
      alignSelf: 'center',
      paddingHorizontal:
        layout.screenHorizontalPadding,
      paddingTop: spacing.lg,
      paddingBottom: 120,
    },

    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
      backgroundColor: colors.background,
    },

    muted: {
      color: colors.textTertiary,
      fontSize: typography.small,
      lineHeight:
        typography.lineHeightSmall,
    },

    errorTitle: {
      color: colors.danger,
      fontSize: typography.subheading,
      lineHeight:
        typography.lineHeightSubheading,
      fontWeight:
        typography.weightBold,
    },

    eyebrow: {
      color: colors.primary,
      fontSize: typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight:
        typography.weightBold,
      letterSpacing: 1.2,
    },

    title: {
      marginTop: spacing.sm,
      color: colors.text,
      fontSize: typography.title,
      lineHeight:
        typography.lineHeightTitle,
      fontWeight:
        typography.weightExtraBold,
      letterSpacing: -0.6,
    },

    subtitle: {
      marginTop: spacing.sm,
      marginBottom: spacing.md,
      color: colors.textSecondary,
      fontSize: typography.small,
      lineHeight:
        typography.lineHeightSmall,
    },

    label: {
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
      color: colors.text,
      fontSize: typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightBold,
    },

    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 72,
      paddingHorizontal: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      backgroundColor: colors.surface,
      ...elevation.card,
    },

    currencyPrefix: {
      marginRight: spacing.sm,
      color: colors.textSecondary,
      fontSize: typography.small,
      fontWeight:
        typography.weightBold,
    },

    amountInput: {
      flex: 1,
      minHeight: 64,
      color: colors.text,
      fontSize: 28,
      lineHeight: 34,
      fontWeight:
        typography.weightExtraBold,
      letterSpacing: -0.4,
    },

    settleButton: {
      alignSelf: 'flex-start',
      minHeight: layout.touchTarget,
      marginTop: spacing.sm,
      paddingHorizontal: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.md,
      backgroundColor:
        colors.primarySoft,
    },

    settleButtonText: {
      color: colors.primary,
      fontSize: typography.caption,
      fontWeight:
        typography.weightBold,
    },

    input: {
      minHeight: 54,
      paddingHorizontal: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      backgroundColor: colors.surface,
      color: colors.text,
      fontSize: typography.body,
    },

    notes: {
      minHeight: 104,
      paddingTop: spacing.md,
      textAlignVertical: 'top',
    },

    infoCard: {
      marginTop: spacing.lg,
      padding: spacing.md,
      borderRadius: radii.md,
      backgroundColor:
        colors.infoSurface,
      borderWidth: 1,
      borderColor: colors.border,
    },

    infoTitle: {
      color: colors.info,
      fontSize: typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightBold,
    },

    infoText: {
      marginTop: spacing.xs,
      color: colors.textSecondary,
      fontSize: typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    errorCard: {
      marginTop: spacing.md,
      padding: spacing.md,
      borderRadius: radii.md,
      backgroundColor:
        colors.dangerSurface,
      borderWidth: 1,
      borderColor: colors.danger,
    },

    errorText: {
      color: colors.danger,
      fontSize: typography.small,
      lineHeight:
        typography.lineHeightSmall,
    },

    saveButton: {
      minHeight: 54,
      marginTop: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.md,
      backgroundColor: colors.primary,
    },

    disabled: {
      opacity: 0.45,
    },

    saveButtonText: {
      color: colors.textOnPrimary,
      fontSize: typography.body,
      fontWeight:
        typography.weightBold,
    },
  });
