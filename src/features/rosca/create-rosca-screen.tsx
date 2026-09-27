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
  useCreateRoscaGroup,
} from './rosca-query';

import type {
  RoscaFrequency,
} from './rosca-contract';


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


export function CreateRoscaScreen() {
  const router =
    useRouter();

  const reference =
    useLocalFinanceReferenceData();

  const mutation =
    useCreateRoscaGroup();


  const [
    name,
    setName,
  ] =
    useState('');

  const [
    displayName,
    setDisplayName,
  ] =
    useState('');

  const [
    currencyCode,
    setCurrencyCode,
  ] =
    useState('');

  const [
    amount,
    setAmount,
  ] =
    useState('');

  const [
    frequency,
    setFrequency,
  ] =
    useState<RoscaFrequency>(
      'monthly',
    );

  const [
    cycleCount,
    setCycleCount,
  ] =
    useState('5');

  const [
    startDate,
    setStartDate,
  ] =
    useState(
      today(),
    );

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
        !/^\d+$/.test(
          cycleCount,
        )
      ) {
        throw new Error(
          'Member/cycle count must be a whole number.',
        );
      }

      const count =
        Number(
          cycleCount,
        );

      if (
        !Number.isSafeInteger(
          count,
        )
        || count < 2
        || count > 100
      ) {
        throw new Error(
          'Member/cycle count must be between 2 and 100.',
        );
      }


      const result =
        await mutation
          .mutateAsync({
            name:
              name.trim(),

            currencyCode:
              selectedCurrency.code,

            contributionAmountMinor:
              parseDecimalToMinor(
                amount,
                selectedCurrency.minorUnit,
              ),

            contributionFrequency:
              frequency,

            cycleCount:
              count,

            startDate,

            creatorDisplayName:
              displayName.trim(),
          });


      router.replace({
        pathname:
          '/rosca-detail' as never,

        params: {
          groupId:
            result.groupId,
        },
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Could not create ROSCA group.',
      );
    }
  }


  const canSave =
    Boolean(
      name.trim()
      && displayName.trim()
      && amount.trim()
      && selectedCurrency,
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
    >
      <Text
        style={
          styles.eyebrow
        }
      >
        NEW ROSCA
      </Text>

      <Text
        style={
          styles.title
        }
      >
        Create a rotating savings group
      </Text>

      <Text
        style={
          styles.subtitle
        }
      >
        The member count equals the cycle count. Joining order determines payout order.
      </Text>


      <Text
        style={
          styles.label
        }
      >
        Group name
      </Text>

      <TextInput
        value={
          name
        }
        onChangeText={
          setName
        }
        placeholder="e.g. Family savings circle"
        style={
          styles.input
        }
      />


      <Text
        style={
          styles.label
        }
      >
        Your display name
      </Text>

      <TextInput
        value={
          displayName
        }
        onChangeText={
          setDisplayName
        }
        placeholder="Name visible inside this group"
        style={
          styles.input
        }
      />


      <Text
        style={
          styles.label
        }
      >
        Contribution per member
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
        Frequency
      </Text>

      <View
        style={
          styles.chips
        }
      >
        {([
          'weekly',
          'monthly',
        ] as RoscaFrequency[]).map(
          (value) => (
            <Pressable
              key={
                value
              }
              onPress={() => {
                setFrequency(
                  value,
                );
              }}
              style={[
                styles.chip,

                value ===
                  frequency
                  ? styles.chipSelected
                  : null,
              ]}
            >
              <Text
                style={[
                  styles.chipText,

                  value ===
                    frequency
                    ? styles.chipTextSelected
                    : null,
                ]}
              >
                {value ===
                  'weekly'
                  ? 'Weekly'
                  : 'Monthly'}
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
        Members / cycles
      </Text>

      <TextInput
        value={
          cycleCount
        }
        onChangeText={
          setCycleCount
        }
        keyboardType="number-pad"
        placeholder="5"
        style={
          styles.input
        }
      />


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
          Separate financial domain
        </Text>

        <Text
          style={
            styles.infoText
          }
        >
          Creating the ROSCA schedules obligations and payouts only. It does not move money or change account balances.
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
            ? 'Creating…'
            : 'Create ROSCA'}
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
      paddingHorizontal: layout.screenHorizontalPadding,
      paddingTop: 22,
      paddingBottom: 120,
    },

    eyebrow: {
      color: colors.primary,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
      letterSpacing: 1.4,
    },

    title: {
      marginTop: 8,
      color: colors.text,
      fontSize: typography.title,
      lineHeight: 34,
      fontWeight: typography.weightBold,
    },

    subtitle: {
      marginTop: 8,
      marginBottom: 18,
      color: colors.textSecondary,
      fontSize: typography.small,
      lineHeight: 21,
    },

    label: {
      marginTop: 18,
      marginBottom: 8,
      color: colors.text,
      fontSize: typography.small,
      fontWeight: typography.weightBold,
    },

    input: {
      minHeight: 52,
      paddingHorizontal: 14,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      color: colors.text,
      fontSize: typography.small,
    },

    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 62,
      paddingHorizontal: 14,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },

    currencyPrefix: {
      marginRight: 9,
      color: colors.textSecondary,
      fontSize: typography.small,
      fontWeight: typography.weightBold,
    },

    amountInput: {
      flex: 1,
      color: colors.text,
      fontSize: typography.heading,
      fontWeight: typography.weightBold,
    },

    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },

    chip: {
      paddingHorizontal: 13,
      paddingVertical: 10,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },

    chipSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },

    chipText: {
      color: colors.textSecondary,
      fontSize: typography.caption,
      fontWeight: typography.weightSemibold,
    },

    chipTextSelected: {
      color: colors.primary,
      fontWeight: typography.weightBold,
    },

    infoCard: {
      marginTop: 20,
      padding: 14,
      borderRadius: radii.md,
      backgroundColor: colors.surfaceMuted,
      ...elevation.card
    },

    infoTitle: {
      color: colors.textSecondary,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
    },

    infoText: {
      marginTop: 4,
      color: colors.textSecondary,
      fontSize: typography.caption,
      lineHeight: 17,
    },

    errorCard: {
      marginTop: 14,
      padding: 13,
      borderRadius: radii.md,
      backgroundColor: colors.dangerSurface,
    },

    errorText: {
      color: colors.danger,
      fontSize: typography.small,
      lineHeight: 18,
    },

    saveButton: {
      minHeight: 54,
      marginTop: 22,
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
      fontWeight: typography.weightBold,
    },
  });