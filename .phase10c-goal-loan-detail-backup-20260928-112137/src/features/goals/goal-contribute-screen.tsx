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
  parseDecimalToMinor,
} from '../budgets/budget-money';

import {
  useAddSavingsContribution,
  useSavingsGoalStatus,
} from './savings-goal-query';


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


export function GoalContributeScreen() {
  const router =
    useRouter();

  const params =
    useLocalSearchParams<{
      goalId?:
        | string
        | string[];
    }>();

  const goalId =
    firstParam(
      params.goalId,
    );

  const goalsQuery =
    useSavingsGoalStatus();

  const reference =
    useLocalFinanceReferenceData();

  const addContribution =
    useAddSavingsContribution();


  const goal =
    goalsQuery.data
      ?.find(
        (item) =>
          item.id ===
          goalId,
      )
    ?? null;


  const [
    amount,
    setAmount,
  ] =
    useState('');

  const [
    contributionDate,
    setContributionDate,
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
    goal
      ? (
          reference.data
            ?.currencies
            .find(
              (currency) =>
                currency.code ===
                goal.currency_code,
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
      if (!goal) {
        throw new Error(
          'Goal is unavailable.',
        );
      }

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
          contributionDate,
        )
      ) {
        throw new Error(
          'Use YYYY-MM-DD for the contribution date.',
        );
      }

      await addContribution
        .mutateAsync({
          goalId:
            goal.id,

          amountMinor:
            parseDecimalToMinor(
              amount,
              minorUnit,
            ),

          contributionDate,

          note:
            note.trim()
              || null,
        });


      router.back();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Could not add contribution.',
      );
    }
  }


  if (
    goalsQuery.isLoading
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
          Loading goal…
        </Text>
      </View>
    );
  }


  if (!goal) {
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
          Goal unavailable
        </Text>
      </View>
    );
  }


  const canSave =
    Boolean(
      amount.trim()
      && contributionDate.trim(),
    )
    && !addContribution.isPending;


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
        CONTRIBUTION
      </Text>

      <Text
        style={
          styles.title
        }
      >
        Add to {goal.name}
      </Text>

      <Text
        style={
          styles.subtitle
        }
      >
        This records progress history. It does not automatically move real money between accounts.
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
          {goal.currency_code}
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
        Date
      </Text>

      <TextInput
        value={
          contributionDate
        }
        onChangeText={
          setContributionDate
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
          Planning record
        </Text>

        <Text
          style={
            styles.infoText
          }
        >
          A contribution updates the goal’s progress history only. It does not create a bank transfer or change an account balance.
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
          {addContribution.isPending
            ? 'Saving…'
            : 'Add contribution'}
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

    eyebrow: {
      color: colors.primary,
      fontSize: typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight: typography.weightBold,
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
      fontWeight: typography.weightBold,
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
      fontWeight: typography.weightBold,
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
      fontWeight: typography.weightBold,
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
      fontWeight: typography.weightBold,
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
      fontWeight: typography.weightBold,
    },
  });
