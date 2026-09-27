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
  useCreateSavingsGoal,
} from './savings-goal-query';

import type {
  SavingsGoalType,
} from './savings-goal-contract';


const GOAL_TYPES:
  {
    value: SavingsGoalType;
    label: string;
  }[] =
  [
    {
      value: 'general',
      label: 'General',
    },
    {
      value: 'emergency_fund',
      label: 'Emergency fund',
    },
    {
      value: 'retirement',
      label: 'Retirement',
    },
    {
      value: 'education',
      label: 'Education',
    },
    {
      value: 'vehicle',
      label: 'Vehicle',
    },
    {
      value: 'home',
      label: 'Home',
    },
    {
      value: 'travel',
      label: 'Travel',
    },
    {
      value: 'custom',
      label: 'Custom',
    },
  ];


export function CreateGoalScreen() {
  const router =
    useRouter();

  const reference =
    useLocalFinanceReferenceData();

  const createGoal =
    useCreateSavingsGoal();


  const [
    name,
    setName,
  ] =
    useState('');

  const [
    goalType,
    setGoalType,
  ] =
    useState<SavingsGoalType>(
      'general',
    );

  const [
    currencyCode,
    setCurrencyCode,
  ] =
    useState(
      'PKR',
    );

  const [
    targetAmount,
    setTargetAmount,
  ] =
    useState('');

  const [
    targetDate,
    setTargetDate,
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
      currencies.length === 0
    ) {
      return;
    }

    if (
      currencies.some(
        (currency) =>
          currency.code ===
          currencyCode,
      )
    ) {
      return;
    }

    // Currency reference data intentionally seeds the editable form once available.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrencyCode(
      currencies[0].code,
    );
  }, [
    currencies,
    currencyCode,
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
        targetDate.trim()
        &&
        !/^\d{4}-\d{2}-\d{2}$/.test(
          targetDate.trim(),
        )
      ) {
        throw new Error(
          'Use YYYY-MM-DD for the target date.',
        );
      }

      await createGoal
        .mutateAsync({
          name:
            name.trim(),

          goalType,

          currencyCode:
            selectedCurrency.code,

          targetAmountMinor:
            parseDecimalToMinor(
              targetAmount,
              selectedCurrency.minorUnit,
            ),

          targetDate:
            targetDate.trim()
              || null,

          notes:
            notes.trim()
              || null,
        });


      router.back();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Could not create goal.',
      );
    }
  }


  const canSave =
    Boolean(
      name.trim()
      && targetAmount.trim()
      && selectedCurrency,
    )
    && !createGoal.isPending;


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
        NEW GOAL
      </Text>

      <Text
        style={
          styles.title
        }
      >
        What are you saving for?
      </Text>

      <Text
        style={
          styles.subtitle
        }
      >
        Every contribution is recorded separately so your progress history stays trustworthy.
      </Text>


      <Text
        style={
          styles.label
        }
      >
        Goal name
      </Text>

      <TextInput
        value={
          name
        }
        onChangeText={
          setName
        }
        placeholder="e.g. Emergency fund"
        style={
          styles.input
        }
      />


      <Text
        style={
          styles.label
        }
      >
        Goal type
      </Text>

      <View
        style={
          styles.chips
        }
      >
        {GOAL_TYPES.map(
          (item) => (
            <Pressable
              key={
                item.value
              }
              onPress={() => {
                setGoalType(
                  item.value,
                );
              }}
              style={[
                styles.chip,

                goalType ===
                  item.value
                  ? styles.chipSelected
                  : null,
              ]}
            >
              <Text
                style={[
                  styles.chipText,

                  goalType ===
                    item.value
                    ? styles.chipTextSelected
                    : null,
                ]}
              >
                {item.label}
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
        Target amount
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
            targetAmount
          }
          onChangeText={
            setTargetAmount
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


      <Text
        style={
          styles.label
        }
      >
        Target date
      </Text>

      <TextInput
        value={
          targetDate
        }
        onChangeText={
          setTargetDate
        }
        autoCapitalize="none"
        placeholder="Optional · YYYY-MM-DD"
        style={
          styles.input
        }
      />


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
        placeholder="Optional"
        multiline
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
            ? styles.saveButtonDisabled
            : null,
        ]}
      >
        <Text
          style={
            styles.saveButtonText
          }
        >
          {createGoal.isPending
            ? 'Creating…'
            : 'Create goal'}
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
