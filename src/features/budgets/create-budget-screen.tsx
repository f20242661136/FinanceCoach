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
  useLocalTransactionOptions,
} from '../../offline/sync/use-local-transaction-options';

import {
  useLocalFinanceReferenceData,
} from '../../offline/sync/use-local-finance-reference-data';

import {
  useCreateBudget,
} from './budget-query';

import {
  parseDecimalToMinor,
} from './budget-money';

import type {
  BudgetPeriodType,
} from './budget-contract';


function pad2(
  value: number,
): string {
  return String(
    value,
  ).padStart(
    2,
    '0',
  );
}


function dateText(
  date: Date,
): string {
  return [
    date.getFullYear(),
    pad2(
      date.getMonth() + 1,
    ),
    pad2(
      date.getDate(),
    ),
  ].join('-');
}


function monthlyPeriod(): {
  start: string;
  end: string;
} {
  const now =
    new Date();

  const start =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    );

  const end =
    new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
    );

  return {
    start:
      dateText(
        start,
      ),

    end:
      dateText(
        end,
      ),
  };
}


function annualPeriod(): {
  start: string;
  end: string;
} {
  const year =
    new Date()
      .getFullYear();

  return {
    start:
      `${year}-01-01`,

    end:
      `${year}-12-31`,
  };
}


export function CreateBudgetScreen() {
  const router =
    useRouter();

  const createBudget =
    useCreateBudget();

  const categoryOptions =
    useLocalTransactionOptions(
      'expense',
    );

  const reference =
    useLocalFinanceReferenceData();


  const [
    name,
    setName,
  ] =
    useState(
      'Monthly spending',
    );

  const [
    amount,
    setAmount,
  ] =
    useState('');

  const [
    currencyCode,
    setCurrencyCode,
  ] =
    useState(
      'PKR',
    );

  const [
    periodType,
    setPeriodType,
  ] =
    useState<BudgetPeriodType>(
      'monthly',
    );

  const monthly =
    useMemo(() => monthlyPeriod(), []);

  const [
    periodStart,
    setPeriodStart,
  ] =
    useState(
      monthly.start,
    );

  const [
    periodEnd,
    setPeriodEnd,
  ] =
    useState(
      monthly.end,
    );

  const [
    categoryId,
    setCategoryId,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState<
      string | null
    >(
      null,
    );


  const currencies =
    reference.data
      ?.currencies
      ?? [];

  const categories =
    categoryOptions.data
      ?.categories
      ?? [];


  const selectedCurrency =
    currencies.find(
      (currency) =>
        currency.code ===
        currencyCode,
    )
    ?? currencies[0]
    ?? null;


  function changePeriod(
    value:
      BudgetPeriodType,
  ) {
    setPeriodType(
      value,
    );

    if (
      value === 'monthly'
    ) {
      const period =
        monthlyPeriod();

      setPeriodStart(
        period.start,
      );

      setPeriodEnd(
        period.end,
      );

      return;
    }


    if (
      value === 'annual'
    ) {
      const period =
        annualPeriod();

      setPeriodStart(
        period.start,
      );

      setPeriodEnd(
        period.end,
      );
    }
  }


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
          periodStart,
        )
        ||
        !/^\d{4}-\d{2}-\d{2}$/.test(
          periodEnd,
        )
      ) {
        throw new Error(
          'Use YYYY-MM-DD for budget dates.',
        );
      }


      await createBudget
        .mutateAsync({
          name:
            name.trim(),

          currencyCode:
            selectedCurrency.code,

          periodType,

          periodStart,

          periodEnd,

          limitMinor:
            parseDecimalToMinor(
              amount,
              selectedCurrency.minorUnit,
            ),

          categoryId,
        });


      router.back();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Could not create budget.',
      );
    }
  }


  const canSave =
    Boolean(
      name.trim()
      && amount.trim()
      && selectedCurrency,
    )
    && !createBudget.isPending;


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
        NEW BUDGET
      </Text>

      <Text
        style={
          styles.title
        }
      >
        Set a spending limit
      </Text>

      <Text
        style={
          styles.subtitle
        }
      >
        Spending and progress are calculated from your server ledger. Transfers do not count as expenses.
      </Text>


      <Text
        style={
          styles.label
        }
      >
        Name
      </Text>

      <TextInput
        value={
          name
        }
        onChangeText={
          setName
        }
        placeholder="e.g. Food budget"
        style={
          styles.input
        }
      />


      <Text
        style={
          styles.label
        }
      >
        Limit
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

                selectedCurrency
                  ?.code
                  === currency.code
                  ? styles.chipSelected
                  : null,
              ]}
            >
              <Text
                style={[
                  styles.chipText,

                  selectedCurrency
                    ?.code
                    === currency.code
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


      <Text
        style={
          styles.label
        }
      >
        Period
      </Text>

      <View
        style={
          styles.segment
        }
      >
        {(
          [
            'monthly',
            'annual',
            'custom',
          ] as const
        ).map(
          (value) => (
            <Pressable
              key={
                value
              }
              onPress={() => {
                changePeriod(
                  value,
                );
              }}
              style={[
                styles.segmentButton,

                periodType ===
                  value
                  ? styles.segmentButtonSelected
                  : null,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,

                  periodType ===
                    value
                    ? styles.segmentTextSelected
                    : null,
                ]}
              >
                {value === 'monthly'
                  ? 'Monthly'
                  : value === 'annual'
                    ? 'Annual'
                    : 'Custom'}
              </Text>
            </Pressable>
          ),
        )}
      </View>


      <View
        style={
          styles.dateRow
        }
      >
        <View
          style={
            styles.dateColumn
          }
        >
          <Text
            style={
              styles.label
            }
          >
            Start
          </Text>

          <TextInput
            value={
              periodStart
            }
            onChangeText={
              setPeriodStart
            }
            editable={
              periodType ===
              'custom'
            }
            style={[
              styles.input,

              periodType !==
                'custom'
                ? styles.readOnly
                : null,
            ]}
          />
        </View>


        <View
          style={
            styles.dateColumn
          }
        >
          <Text
            style={
              styles.label
            }
          >
            End
          </Text>

          <TextInput
            value={
              periodEnd
            }
            onChangeText={
              setPeriodEnd
            }
            editable={
              periodType ===
              'custom'
            }
            style={[
              styles.input,

              periodType !==
                'custom'
                ? styles.readOnly
                : null,
            ]}
          />
        </View>
      </View>


      <Text
        style={
          styles.label
        }
      >
        Scope
      </Text>

      <View
        style={
          styles.chips
        }
      >
        <Pressable
          onPress={() => {
            setCategoryId(
              null,
            );
          }}
          style={[
            styles.chip,

            categoryId === null
              ? styles.chipSelected
              : null,
          ]}
        >
          <Text
            style={[
              styles.chipText,

              categoryId === null
                ? styles.chipTextSelected
                : null,
            ]}
          >
            Overall spending
          </Text>
        </Pressable>


        {categories.map(
          (category) => (
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

                categoryId ===
                  category.id
                  ? styles.chipSelected
                  : null,
              ]}
            >
              <Text
                style={[
                  styles.chipText,

                  categoryId ===
                    category.id
                    ? styles.chipTextSelected
                    : null,
                ]}
              >
                {category.default_name}
              </Text>
            </Pressable>
          ),
        )}
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
          Server-calculated
        </Text>

        <Text
          style={
            styles.infoText
          }
        >
          Spent, remaining, percentage used, projected spend and over-budget status come from PostgreSQL — not from editable client calculations.
        </Text>
      </View>


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
            ? styles.saveButtonDisabled
            : null,
        ]}
      >
        <Text
          style={
            styles.saveButtonText
          }
        >
          {createBudget.isPending
            ? 'Creating…'
            : 'Create budget'}
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

    readOnly: {
      backgroundColor:
        colors.surfaceMuted,
      color: colors.textSecondary,
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

    segment: {
      flexDirection: 'row',
      padding: spacing.xxs,
      borderRadius: radii.md,
      backgroundColor:
        colors.surfaceMuted,
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
      fontSize: typography.caption,
      fontWeight:
        typography.weightBold,
    },

    segmentTextSelected: {
      color: colors.primary,
    },

    dateRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },

    dateColumn: {
      flex: 1,
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

    saveButton: {
      minHeight: 54,
      marginTop: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.md,
      backgroundColor: colors.primary,
    },

    saveButtonDisabled: {
      opacity: 0.45,
    },

    saveButtonText: {
      color: colors.textOnPrimary,
      fontSize: typography.body,
      fontWeight:
        typography.weightBold,
    },
  });
