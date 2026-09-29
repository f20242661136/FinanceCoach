import Ionicons from '@expo/vector-icons/Ionicons';

import {
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
  useLocalSearchParams,
  useRouter,
} from 'expo-router';

import {
  AppButton,
} from '@/components/ui/app-button';

import {
  InlineNotice,
} from '@/components/ui/inline-notice';

import {
  StatePanel,
} from '@/components/ui/state-panel';

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

function amountValidationMessage(
  error: unknown,
): string {
  if (!(error instanceof Error)) {
    return 'Enter a valid payment amount.';
  }

  if (
    error.message
      === 'Budget limit must be greater than zero.'
  ) {
    return 'Payment amount must be greater than zero.';
  }

  return error.message;
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
        item =>
          item.id
          === loanId,
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
              currency =>
                currency.code
                === loan.currency_code,
            )
            ?.minorUnit
          ?? 2
        )
      : 2;

  async function save() {
    setErrorMessage(
      null,
    );

    if (!loan) {
      setErrorMessage(
        'Loan is unavailable.',
      );
      return;
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        paymentDate,
      )
    ) {
      setErrorMessage(
        'Use YYYY-MM-DD for the payment date.',
      );
      return;
    }

    let amountMinor: string;

    try {
      amountMinor =
        parseDecimalToMinor(
          amount,
          minorUnit,
        );
    } catch (error) {
      setErrorMessage(
        amountValidationMessage(
          error,
        ),
      );
      return;
    }

    if (
      BigInt(
        amountMinor,
      )
      > BigInt(
          loan.remaining_minor,
        )
    ) {
      setErrorMessage(
        'Payment cannot exceed remaining principal.',
      );
      return;
    }

    try {
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
        toUserFacingError(
          error,
          'loan',
        ),
      );
    }
  }

  if (
    loansQuery.isLoading
  ) {
    return (
      <View style={styles.centered}>
        <StatePanel
          loading
          title="Loading loan"
          description="Preparing the payment form."
        />
      </View>
    );
  }

  if (
    loansQuery.error
    && !loan
  ) {
    return (
      <View style={styles.centered}>
        <StatePanel
          title="Loan unavailable"
          description={
            toUserFacingError(
              loansQuery.error,
              'loan',
            )
          }
          icon="alert-circle-outline"
          tone="danger"
          action={
            <AppButton
              label="Go back"
              variant="secondary"
              fullWidth={false}
              onPress={() => {
                router.back();
              }}
            />
          }
        />
      </View>
    );
  }

  if (!loan) {
    return (
      <View style={styles.centered}>
        <StatePanel
          title="Loan unavailable"
          description="This loan may no longer be available."
          icon="cash-outline"
          action={
            <AppButton
              label="Go back"
              variant="secondary"
              fullWidth={false}
              onPress={() => {
                router.back();
              }}
            />
          }
        />
      </View>
    );
  }

  if (
    loan.status === 'settled'
    || BigInt(
      loan.remaining_minor,
    ) === BigInt(0)
  ) {
    return (
      <View style={styles.centered}>
        <StatePanel
          title="Loan already settled"
          description="There is no remaining principal to record against this loan."
          icon="checkmark-circle-outline"
          tone="success"
          action={
            <AppButton
              label="Go back"
              variant="secondary"
              fullWidth={false}
              onPress={() => {
                router.back();
              }}
            />
          }
        />
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
    <SafeAreaView
      edges={[
        'left',
        'right',
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
                accessibilityLabel="Close loan payment form"
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
                  LOAN PAYMENT
                </Text>

                <Text
                  accessibilityRole="header"
                  style={styles.title}
                >
                  Record payment
                </Text>

                <Text style={styles.subtitle}>
                  Add a repayment to {loan.counterparty_name}. The amount cannot exceed the remaining principal.
                </Text>
              </View>
            </View>

            <View style={styles.loanSummary}>
              <View style={styles.loanSummaryIcon}>
                <Ionicons
                  name="cash-outline"
                  size={21}
                  color={
                    colors.primary
                  }
                />
              </View>

              <View style={styles.loanSummaryCopy}>
                <Text style={styles.loanSummaryLabel}>
                  Remaining principal
                </Text>

                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                  style={styles.loanSummaryValue}
                >
                  {loan.currency_code}{' '}
                  {formatMinor(
                    loan.remaining_minor,
                    minorUnit,
                  )}
                </Text>
              </View>
            </View>

            <View style={styles.amountSection}>
              <Text style={styles.amountLabel}>
                Payment amount
              </Text>

              <View style={styles.amountWrap}>
                <Text style={styles.currencyPrefix}>
                  {loan.currency_code}
                </Text>

                <TextInput
                  accessibilityLabel="Loan payment amount"
                  value={amount}
                  onChangeText={setAmount}
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

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Use full remaining principal"
                onPress={() => {
                  setAmount(
                    formatMinor(
                      loan.remaining_minor,
                      minorUnit,
                    ),
                  );
                }}
                style={({ pressed }) => [
                  styles.fullAmountButton,
                  pressed
                    ? styles.fullAmountButtonPressed
                    : null,
                ]}
              >
                <Ionicons
                  name="checkmark-done-outline"
                  size={17}
                  color={
                    colors.primary
                  }
                />

                <Text style={styles.fullAmountText}>
                  Use full remaining amount
                </Text>
              </Pressable>
            </View>

            <View style={styles.section}>
              <View style={styles.field}>
                <Text style={styles.label}>
                  Payment date
                  <Text style={styles.required}>
                    {' *'}
                  </Text>
                </Text>

                <TextInput
                  accessibilityLabel="Loan payment date"
                  value={
                    paymentDate
                  }
                  onChangeText={
                    setPaymentDate
                  }
                  autoCapitalize="none"
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
                  accessibilityLabel="Loan payment note"
                  value={note}
                  onChangeText={setNote}
                  multiline
                  placeholder="Optional"
                  placeholderTextColor={
                    colors.textTertiary
                  }
                  style={[
                    styles.input,
                    styles.notes,
                  ]}
                />
              </View>
            </View>

            <View style={styles.infoCard}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={
                  colors.primary
                }
              />

              <Text style={styles.infoText}>
                This reduces the remaining principal and adds a repayment-history record. It does not automatically move money between your accounts.
              </Text>
            </View>

            {errorMessage ? (
              <InlineNotice
                tone="error"
                message={errorMessage}
              />
            ) : null}
          </ScrollView>

          <View style={styles.actionFooter}>
            <AppButton
              label={
                mutation.isPending
                  ? 'Recording payment...'
                  : 'Record payment'
              }
              icon="checkmark-outline"
              loading={
                mutation.isPending
              }
              disabled={
                !canSave
              }
              onPress={() => {
                void save();
              }}
            />
          </View>
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

    centered: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal:
        layout.screenHorizontalPadding,
      backgroundColor:
        colors.background,
    },

    content: {
      flexGrow: 1,
      width: '100%',
      maxWidth:
        layout.contentMaxWidth,
      alignSelf: 'center',
      gap:
        spacing.lg,
      paddingHorizontal:
        layout.screenHorizontalPadding,
      paddingTop:
        spacing.md,
      paddingBottom:
        spacing.xl,
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
        typography.title,
      lineHeight:
        typography.lineHeightTitle,
      fontWeight:
        typography.weightExtraBold,
      letterSpacing: -0.6,
    },

    subtitle: {
      color:
        colors.textSecondary,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
    },

    loanSummary: {
      flexDirection: 'row',
      alignItems: 'center',
      gap:
        spacing.sm,
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

    loanSummaryIcon: {
      width: 42,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius:
        radii.md,
      backgroundColor:
        colors.primarySoft,
    },

    loanSummaryCopy: {
      flex: 1,
      minWidth: 0,
    },

    loanSummaryLabel: {
      color:
        colors.textSecondary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    loanSummaryValue: {
      marginTop:
        spacing.xxs,
      color:
        colors.text,
      fontSize:
        typography.subheading,
      lineHeight:
        typography.lineHeightSubheading,
      fontWeight:
        typography.weightExtraBold,
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

    currencyPrefix: {
      minWidth: 46,
      marginRight:
        spacing.sm,
      color:
        colors.accentStrong,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightBold,
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

    fullAmountButton: {
      alignSelf: 'flex-start',
      minHeight:
        layout.touchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      gap:
        spacing.xs,
      paddingHorizontal:
        spacing.md,
      borderRadius:
        radii.md,
      backgroundColor:
        colors.primarySoft,
    },

    fullAmountButtonPressed: {
      opacity: 0.82,
    },

    fullAmountText: {
      color:
        colors.primary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight:
        typography.weightBold,
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

    notes: {
      minHeight: 104,
      paddingTop:
        spacing.md,
      textAlignVertical: 'top',
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