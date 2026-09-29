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

function amountValidationMessage(
  error: unknown,
): string {
  if (!(error instanceof Error)) {
    return 'Enter a valid contribution amount.';
  }

  if (
    error.message
      === 'Budget limit must be greater than zero.'
  ) {
    return 'Contribution amount must be greater than zero.';
  }

  return error.message;
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
        item =>
          item.id
          === goalId,
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
              currency =>
                currency.code
                === goal.currency_code,
            )
            ?.minorUnit
          ?? 2
        )
      : 2;

  async function save() {
    setErrorMessage(
      null,
    );

    if (!goal) {
      setErrorMessage(
        'Goal is unavailable.',
      );
      return;
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        contributionDate,
      )
    ) {
      setErrorMessage(
        'Use YYYY-MM-DD for the contribution date.',
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

    try {
      await addContribution
        .mutateAsync({
          goalId:
            goal.id,
          amountMinor,
          contributionDate,
          note:
            note.trim()
              || null,
        });

      router.back();
    } catch (error) {
      setErrorMessage(
        toUserFacingError(
          error,
          'goal',
        ),
      );
    }
  }

  if (
    goalsQuery.isLoading
  ) {
    return (
      <View style={styles.centered}>
        <StatePanel
          loading
          title="Loading goal"
          description="Preparing the contribution form."
        />
      </View>
    );
  }

  if (
    goalsQuery.error
    && !goal
  ) {
    return (
      <View style={styles.centered}>
        <StatePanel
          title="Goal unavailable"
          description={
            toUserFacingError(
              goalsQuery.error,
              'goal',
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

  if (!goal) {
    return (
      <View style={styles.centered}>
        <StatePanel
          title="Goal unavailable"
          description="This goal may no longer be available."
          icon="flag-outline"
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

  if (goal.is_target_reached) {
    return (
      <View style={styles.centered}>
        <StatePanel
          title="Target already reached"
          description="This savings goal has already reached its target."
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
      && contributionDate.trim(),
    )
    && !addContribution.isPending;

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
                accessibilityLabel="Close contribution form"
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
                  CONTRIBUTION
                </Text>

                <Text
                  accessibilityRole="header"
                  style={styles.title}
                >
                  Add to {goal.name}
                </Text>

                <Text style={styles.subtitle}>
                  Record progress toward your target. This does not automatically move money between real accounts.
                </Text>
              </View>
            </View>

            <View style={styles.goalSummary}>
              <View style={styles.goalSummaryIcon}>
                <Ionicons
                  name="flag-outline"
                  size={20}
                  color={
                    colors.primary
                  }
                />
              </View>

              <View style={styles.goalSummaryCopy}>
                <Text style={styles.goalSummaryLabel}>
                  Remaining to target
                </Text>

                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.72}
                  style={styles.goalSummaryValue}
                >
                  {goal.currency_code}{' '}
                  {formatMinor(
                    goal.remaining_minor,
                    minorUnit,
                  )}
                </Text>
              </View>
            </View>

            <View style={styles.amountSection}>
              <Text style={styles.amountLabel}>
                Contribution amount
              </Text>

              <View style={styles.amountWrap}>
                <Text style={styles.currencyPrefix}>
                  {goal.currency_code}
                </Text>

                <TextInput
                  accessibilityLabel="Contribution amount"
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
                  accessibilityLabel="Contribution date"
                  value={
                    contributionDate
                  }
                  onChangeText={
                    setContributionDate
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
                  accessibilityLabel="Contribution note"
                  value={note}
                  onChangeText={setNote}
                  placeholder="Optional"
                  placeholderTextColor={
                    colors.textTertiary
                  }
                  multiline
                  style={[
                    styles.input,
                    styles.notes,
                  ]}
                />
              </View>
            </View>

            {errorMessage ? (
              <InlineNotice
                tone="error"
                message={errorMessage}
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
                This creates a goal-progress record only. It does not create a transfer, transaction, or account-balance change.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.actionFooter}>
            <AppButton
              label={
                addContribution.isPending
                  ? 'Saving contribution...'
                  : 'Add contribution'
              }
              icon="add-outline"
              loading={
                addContribution.isPending
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

    goalSummary: {
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

    goalSummaryIcon: {
      width: 42,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius:
        radii.md,
      backgroundColor:
        colors.primarySoft,
    },

    goalSummaryCopy: {
      flex: 1,
      minWidth: 0,
    },

    goalSummaryLabel: {
      color:
        colors.textSecondary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    goalSummaryValue: {
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