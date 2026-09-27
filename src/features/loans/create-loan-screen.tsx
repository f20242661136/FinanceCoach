import {
  useEffect,
  useState,
  useMemo,
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
  useRouter,
} from 'expo-router';

import {
  useLocalFinanceReferenceData,
} from '../../offline/sync/use-local-finance-reference-data';

import {
  parseDecimalToMinor,
} from '../budgets/budget-money';

import {
  percentTextToInterestBasisPoints,
} from './loan-format';

import {
  useCreateLoan,
} from './loan-query';

import type {
  LoanDirection,
  LoanPaymentFrequency,
} from './loan-contract';


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


export function CreateLoanScreen() {
  const router =
    useRouter();

  const reference =
    useLocalFinanceReferenceData();

  const mutation =
    useCreateLoan();


  const [
    direction,
    setDirection,
  ] =
    useState<LoanDirection>(
      'borrowed',
    );

  const [
    counterparty,
    setCounterparty,
  ] =
    useState('');

  const [
    currencyCode,
    setCurrencyCode,
  ] =
    useState('');

  const [
    principal,
    setPrincipal,
  ] =
    useState('');

  const [
    startDate,
    setStartDate,
  ] =
    useState(
      today(),
    );

  const [
    dueDate,
    setDueDate,
  ] =
    useState('');

  const [
    interestRate,
    setInterestRate,
  ] =
    useState('');

  const [
    paymentFrequency,
    setPaymentFrequency,
  ] =
    useState<LoanPaymentFrequency>(
      'none',
    );

  const [
    scheduledPayment,
    setScheduledPayment,
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


  const currencies = useMemo(
    () => reference.data
      ?.currencies ?? [],
    [reference.data
      ?.currencies],
  );


  useEffect(() => {
    if (
      currencyCode
      || currencies.length === 0
    ) {
      return;
    }

    // Currency reference data intentionally seeds the editable form once available.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrencyCode(
      currencies[0].code,
    );
  }, [
    currencyCode,
    currencies,
  ]);


  const selectedCurrency =
    currencies.find(
      (currency) =>
        currency.code ===
        currencyCode,
    )
    ?? null;


  async function save() {
    setErrorMessage(
      null,
    );

    try {
      if (!selectedCurrency) {
        throw new Error(
          'Choose a supported currency.',
        );
      }

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
          startDate,
        )
      ) {
        throw new Error(
          'Use YYYY-MM-DD for the start date.',
        );
      }

      if (
        dueDate.trim()
        &&
        !/^\d{4}-\d{2}-\d{2}$/.test(
          dueDate.trim(),
        )
      ) {
        throw new Error(
          'Use YYYY-MM-DD for the due date.',
        );
      }

      const scheduledPaymentMinor =
        paymentFrequency ===
          'none'
          || !scheduledPayment.trim()
          ? null
          : parseDecimalToMinor(
              scheduledPayment,
              selectedCurrency.minorUnit,
            );


      await mutation
        .mutateAsync({
          direction,

          counterpartyName:
            counterparty.trim(),

          currencyCode:
            selectedCurrency.code,

          principalMinor:
            parseDecimalToMinor(
              principal,
              selectedCurrency.minorUnit,
            ),

          startDate,

          dueDate:
            dueDate.trim()
              || null,

          interestRateBasisPoints:
            percentTextToInterestBasisPoints(
              interestRate,
            ),

          paymentFrequency,

          scheduledPaymentMinor,

          notes:
            notes.trim()
              || null,
        });


      router.back();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Could not create loan.',
      );
    }
  }


  const canSave =
    Boolean(
      counterparty.trim()
      && principal.trim()
      && selectedCurrency
      && startDate.trim(),
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
        NEW LOAN
      </Text>

      <Text
        style={
          styles.title
        }
      >
        Track a loan clearly
      </Text>

      <Text
        style={
          styles.subtitle
        }
      >
        Payments are recorded separately so remaining principal can always be reconstructed.
      </Text>


      <Text
        style={
          styles.label
        }
      >
        Direction
      </Text>

      <View
        style={
          styles.choiceRow
        }
      >
        <Pressable
          onPress={() => {
            setDirection(
              'borrowed',
            );
          }}
          style={[
            styles.choice,

            direction ===
              'borrowed'
              ? styles.choiceSelected
              : null,
          ]}
        >
          <Text
            style={[
              styles.choiceText,

              direction ===
                'borrowed'
                ? styles.choiceTextSelected
                : null,
            ]}
          >
            I borrowed
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setDirection(
              'given',
            );
          }}
          style={[
            styles.choice,

            direction ===
              'given'
              ? styles.choiceSelected
              : null,
          ]}
        >
          <Text
            style={[
              styles.choiceText,

              direction ===
                'given'
                ? styles.choiceTextSelected
                : null,
            ]}
          >
            I gave
          </Text>
        </Pressable>
      </View>


      <Text
        style={
          styles.label
        }
      >
        Counterparty
      </Text>

      <TextInput
        value={
          counterparty
        }
        onChangeText={
          setCounterparty
        }
        placeholder={
          direction ===
            'borrowed'
            ? 'Who lent you the money?'
            : 'Who did you lend to?'
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
        Principal
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
          {selectedCurrency
            ?.code
            ?? '—'}
        </Text>

        <TextInput
          value={
            principal
          }
          onChangeText={
            setPrincipal
          }
          keyboardType="decimal-pad"
          placeholder="0.00"
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
        Currency
      </Text>

      <View
        style={
          styles.chips
        }
      >
        {currencies.map(
          (currency) => (
            <Pressable
              key={
                currency.code
              }
              onPress={() => {
                setCurrencyCode(
                  currency.code,
                );
              }}
              style={[
                styles.chip,

                currency.code ===
                  currencyCode
                  ? styles.chipSelected
                  : null,
              ]}
            >
              <Text
                style={[
                  styles.chipText,

                  currency.code ===
                    currencyCode
                    ? styles.chipTextSelected
                    : null,
                ]}
              >
                {currency.code}
              </Text>
            </Pressable>
          ),
        )}
      </View>


      <View
        style={
          styles.twoColumn
        }
      >
        <View
          style={
            styles.column
          }
        >
          <Text
            style={
              styles.label
            }
          >
            Start date
          </Text>

          <TextInput
            value={
              startDate
            }
            onChangeText={
              setStartDate
            }
            autoCapitalize="none"
            placeholder="YYYY-MM-DD"
            style={
              styles.input
            }
          />
        </View>

        <View
          style={
            styles.column
          }
        >
          <Text
            style={
              styles.label
            }
          >
            Due date
          </Text>

          <TextInput
            value={
              dueDate
            }
            onChangeText={
              setDueDate
            }
            autoCapitalize="none"
            placeholder="Optional"
            style={
              styles.input
            }
          />
        </View>
      </View>


      <Text
        style={
          styles.label
        }
      >
        Interest rate
      </Text>

      <TextInput
        value={
          interestRate
        }
        onChangeText={
          setInterestRate
        }
        keyboardType="decimal-pad"
        placeholder="Optional annual rate, e.g. 12.5"
        style={
          styles.input
        }
      />

      <Text
        style={
          styles.helper
        }
      >
        Stored as metadata only. Automatic interest accrual is not enabled.
      </Text>


      <Text
        style={
          styles.label
        }
      >
        Payment frequency
      </Text>

      <View
        style={
          styles.chips
        }
      >
        {([
          'none',
          'weekly',
          'monthly',
          'custom',
        ] as LoanPaymentFrequency[]).map(
          (frequency) => (
            <Pressable
              key={
                frequency
              }
              onPress={() => {
                setPaymentFrequency(
                  frequency,
                );

                if (
                  frequency ===
                    'none'
                ) {
                  setScheduledPayment(
                    '',
                  );
                }
              }}
              style={[
                styles.chip,

                frequency ===
                  paymentFrequency
                  ? styles.chipSelected
                  : null,
              ]}
            >
              <Text
                style={[
                  styles.chipText,

                  frequency ===
                    paymentFrequency
                    ? styles.chipTextSelected
                    : null,
                ]}
              >
                {frequency ===
                  'none'
                  ? 'None'
                  : frequency[0]
                      .toUpperCase()
                    +
                    frequency.slice(
                      1,
                    )}
              </Text>
            </Pressable>
          ),
        )}
      </View>


      {paymentFrequency !==
        'none' ? (
        <>
          <Text
            style={
              styles.label
            }
          >
            Scheduled payment
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
              {selectedCurrency
                ?.code
                ?? '—'}
            </Text>

            <TextInput
              value={
                scheduledPayment
              }
              onChangeText={
                setScheduledPayment
              }
              keyboardType="decimal-pad"
              placeholder="Optional"
              style={
                styles.amountInput
              }
            />
          </View>
        </>
      ) : null}


      <Text
        style={
          styles.label
        }
      >
        Notes
      </Text>

      <TextInput
        value={
          notes
        }
        onChangeText={
          setNotes
        }
        multiline
        placeholder="Optional"
        style={[
          styles.input,
          styles.notes,
        ]}
      />


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
            ? 'Saving…'
            : 'Create loan'}
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

    choiceRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },

    choice: {
      flex: 1,
      minHeight: layout.touchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },

    choiceSelected: {
      borderColor: colors.primary,
      backgroundColor:
        colors.primarySoft,
    },

    choiceText: {
      color: colors.textSecondary,
      fontSize: typography.small,
      fontWeight:
        typography.weightSemibold,
    },

    choiceTextSelected: {
      color: colors.primary,
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

    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },

    chip: {
      minHeight: layout.touchTarget,
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },

    chipSelected: {
      borderColor: colors.primary,
      backgroundColor:
        colors.primarySoft,
    },

    chipText: {
      color: colors.textSecondary,
      fontSize: typography.small,
      fontWeight:
        typography.weightSemibold,
    },

    chipTextSelected: {
      color: colors.primary,
      fontWeight:
        typography.weightBold,
    },

    twoColumn: {
      flexDirection: 'row',
      gap: spacing.sm,
    },

    column: {
      flex: 1,
      minWidth: 0,
    },

    helper: {
      marginTop: spacing.xs,
      color: colors.textTertiary,
      fontSize: typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    errorCard: {
      marginTop: spacing.lg,
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
