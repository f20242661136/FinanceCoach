import Ionicons from '@expo/vector-icons/Ionicons';

import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';

import {
  AppButton,
} from '@/components/ui/app-button';

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
} from '../budgets/budget-money';

import {
  formatGoalProgressPercent,
  goalProgressWidth,
} from './savings-goal-format';

import {
  useSavingsContributionHistory,
  useSavingsGoalStatus,
} from './savings-goal-query';

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

function friendlyDate(
  value: string | null,
): string {
  if (!value) {
    return 'No target date';
  }

  const parsed =
    new Date(
      `${value}T00:00:00`,
    );

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return value;
  }

  return parsed.toLocaleDateString(
    undefined,
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    },
  );
}

function goalTypeLabel(
  value: string,
): string {
  return value
    .replace(
      /_/g,
      ' ',
    )
    .replace(
      /\b\w/g,
      letter =>
        letter.toUpperCase(),
    );
}

export function GoalDetailScreen() {
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

  const historyQuery =
    useSavingsContributionHistory(
      goalId,
    );

  const reference =
    useLocalFinanceReferenceData();

  const goal =
    goalsQuery.data
      ?.find(
        item =>
          item.id
          === goalId,
      )
    ?? null;

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

  const refreshing =
    goalsQuery.isRefetching
    || historyQuery.isRefetching;

  async function refresh() {
    await Promise.all([
      goalsQuery.refetch(),
      historyQuery.refetch(),
    ]);
  }

  if (!goalId) {
    return (
      <View style={styles.centered}>
        <StatePanel
          title="Goal unavailable"
          description="This goal link is missing the information needed to open it."
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

  if (
    goalsQuery.isLoading
    || (
      !goal
      && goalsQuery.isFetching
    )
  ) {
    return (
      <View style={styles.centered}>
        <StatePanel
          loading
          title="Loading goal"
          description="Preparing your target, progress, and contribution history."
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
              label="Try again"
              variant="secondary"
              fullWidth={false}
              onPress={() => {
                void goalsQuery.refetch();
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
          title="Goal not found"
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

  const history =
    historyQuery.data
    ?? [];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={
        styles.content
      }
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            void refresh();
          }}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>
          SAVINGS GOAL
        </Text>

        <Text
          accessibilityRole="header"
          style={styles.title}
        >
          {goal.name}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.metaPill}>
            <Text style={styles.metaPillText}>
              {goalTypeLabel(
                goal.goal_type,
              )}
            </Text>
          </View>

          <Text style={styles.metaText}>
            {goal.currency_code}
          </Text>

          <Text style={styles.metaDot}>
            |
          </Text>

          <Text style={styles.metaText}>
            {friendlyDate(
              goal.target_date,
            )}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.heroCard,
          goal.is_target_reached
            ? styles.heroCardComplete
            : null,
        ]}
      >
        <View style={styles.heroTop}>
          <View style={styles.heroMain}>
            <Text style={styles.heroLabel}>
              Progress
            </Text>

            <Text style={styles.heroPercent}>
              {formatGoalProgressPercent(
                goal.progress_basis_points,
              )}
            </Text>
          </View>

          <View
            style={[
              styles.heroStatus,
              goal.is_target_reached
                ? styles.heroStatusComplete
                : null,
            ]}
          >
            <Ionicons
              name={
                goal.is_target_reached
                  ? 'checkmark-circle-outline'
                  : 'flag-outline'
              }
              size={18}
              color={
                goal.is_target_reached
                  ? colors.success
                  : colors.accentStrong
              }
            />

            <Text
              style={[
                styles.heroStatusText,
                goal.is_target_reached
                  ? styles.heroStatusTextComplete
                  : null,
              ]}
            >
              {goal.is_target_reached
                ? 'Target reached'
                : 'In progress'}
            </Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width:
                  goalProgressWidth(
                    goal.progress_basis_points,
                  ),
              },
              goal.is_target_reached
                ? styles.progressFillComplete
                : null,
            ]}
          />
        </View>

        <View style={styles.moneyGrid}>
          <View style={styles.moneyCell}>
            <Text style={styles.moneyLabel}>
              Saved
            </Text>

            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              style={styles.moneyValue}
            >
              {goal.currency_code}{' '}
              {formatMinor(
                goal.contributed_minor,
                minorUnit,
              )}
            </Text>
          </View>

          <View style={styles.moneyDivider} />

          <View style={styles.moneyCell}>
            <Text style={styles.moneyLabel}>
              Remaining
            </Text>

            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              style={styles.moneyValue}
            >
              {goal.currency_code}{' '}
              {formatMinor(
                goal.remaining_minor,
                minorUnit,
              )}
            </Text>
          </View>
        </View>

        <View style={styles.targetStrip}>
          <Text style={styles.targetLabel}>
            Target
          </Text>

          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            style={styles.targetValue}
          >
            {goal.currency_code}{' '}
            {formatMinor(
              goal.target_amount_minor,
              minorUnit,
            )}
          </Text>
        </View>

        {!goal.is_target_reached ? (
          <AppButton
            label="Add contribution"
            icon="add-outline"
            onPress={() => {
              router.push({
                pathname:
                  '/goal-contribute' as never,
                params: {
                  goalId:
                    goal.id,
                },
              });
            }}
          />
        ) : null}
      </View>

      {goal.notes ? (
        <View style={styles.noteCard}>
          <View style={styles.noteIcon}>
            <Ionicons
              name="document-text-outline"
              size={19}
              color={
                colors.primary
              }
            />
          </View>

          <View style={styles.noteCopy}>
            <Text style={styles.noteTitle}>
              Notes
            </Text>

            <Text style={styles.noteText}>
              {goal.notes}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>
            Contribution history
          </Text>

          <Text style={styles.sectionBody}>
            Separate records that build progress for this goal.
          </Text>
        </View>

        <Text style={styles.sectionMeta}>
          {goal.contribution_count}
          {' total'}
        </Text>
      </View>

      {historyQuery.error ? (
        <StatePanel
          title="History unavailable"
          description={
            toUserFacingError(
              historyQuery.error,
              'goal',
            )
          }
          icon="alert-circle-outline"
          tone="danger"
          action={
            <AppButton
              label="Try again"
              variant="secondary"
              fullWidth={false}
              onPress={() => {
                void historyQuery.refetch();
              }}
            />
          }
        />
      ) : historyQuery.isLoading ? (
        <StatePanel
          loading
          title="Loading contributions"
          description="Checking the contribution history for this goal."
        />
      ) : history.length === 0 ? (
        <View style={styles.emptyHistory}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="add-circle-outline"
              size={23}
              color={
                colors.primary
              }
            />
          </View>

          <View style={styles.emptyCopy}>
            <Text style={styles.emptyTitle}>
              No contributions yet
            </Text>

            <Text style={styles.emptyBody}>
              Add your first contribution when you want to record progress toward this target.
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.historyCard}>
          {history.map(
            (
              item,
              index,
            ) => (
              <View key={item.id}>
                {index > 0 ? (
                  <View style={styles.divider} />
                ) : null}

                <View style={styles.historyRow}>
                  <View style={styles.historyIcon}>
                    <Ionicons
                      name="arrow-up-outline"
                      size={17}
                      color={
                        colors.success
                      }
                    />
                  </View>

                  <View style={styles.historyCopy}>
                    <Text style={styles.historyDate}>
                      {friendlyDate(
                        item.contribution_date,
                      )}
                    </Text>

                    {item.note ? (
                      <Text
                        numberOfLines={2}
                        style={styles.historyNote}
                      >
                        {item.note}
                      </Text>
                    ) : (
                      <Text style={styles.historyNote}>
                        Goal contribution
                      </Text>
                    )}
                  </View>

                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.72}
                    style={styles.historyAmount}
                  >
                    +{goal.currency_code}{' '}
                    {formatMinor(
                      item.amount_minor,
                      minorUnit,
                    )}
                  </Text>
                </View>
              </View>
            ),
          )}
        </View>
      )}

      <View style={styles.planningNotice}>
        <Ionicons
          name="information-circle-outline"
          size={20}
          color={
            colors.primary
          }
        />

        <Text style={styles.planningText}>
          Goal contributions are progress records. They do not automatically move money between real accounts.
        </Text>
      </View>
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
        spacing.lg,
      paddingBottom:
        spacing.xl,
    },

    header: {
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

    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap:
        spacing.xs,
    },

    metaPill: {
      paddingHorizontal:
        spacing.sm,
      paddingVertical:
        spacing.xs,
      borderRadius:
        radii.pill,
      backgroundColor:
        colors.primarySoft,
    },

    metaPillText: {
      color:
        colors.primary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight:
        typography.weightBold,
    },

    metaText: {
      color:
        colors.textSecondary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    metaDot: {
      color:
        colors.textTertiary,
      fontSize:
        typography.caption,
    },

    heroCard: {
      gap:
        spacing.lg,
      padding:
        spacing.lg,
      borderRadius:
        radii.xl,
      backgroundColor:
        colors.primary,
      ...elevation.floating,
    },

    heroCardComplete: {
      backgroundColor:
        colors.text,
    },

    heroTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent:
        'space-between',
      gap:
        spacing.md,
    },

    heroMain: {
      flex: 1,
      minWidth: 0,
    },

    heroLabel: {
      color:
        colors.accentStrong,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight:
        typography.weightBold,
    },

    heroPercent: {
      marginTop:
        spacing.xxs,
      color:
        colors.textOnPrimary,
      fontSize: 34,
      lineHeight: 40,
      fontWeight:
        typography.weightExtraBold,
      letterSpacing: -0.7,
    },

    heroStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      gap:
        spacing.xs,
      paddingHorizontal:
        spacing.sm,
      paddingVertical:
        spacing.xs,
      borderRadius:
        radii.pill,
      backgroundColor:
        colors.focus,
    },

    heroStatusComplete: {
      backgroundColor:
        colors.successSurface,
    },

    heroStatusText: {
      color:
        colors.accentStrong,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight:
        typography.weightBold,
    },

    heroStatusTextComplete: {
      color:
        colors.success,
    },

    progressTrack: {
      height: 10,
      overflow: 'hidden',
      borderRadius:
        radii.pill,
      backgroundColor:
        colors.focus,
    },

    progressFill: {
      height: '100%',
      borderRadius:
        radii.pill,
      backgroundColor:
        colors.accentStrong,
    },

    progressFillComplete: {
      backgroundColor:
        colors.success,
    },

    moneyGrid: {
      flexDirection: 'row',
      gap:
        spacing.md,
    },

    moneyCell: {
      flex: 1,
      minWidth: 0,
    },

    moneyDivider: {
      width: 1,
      backgroundColor:
        colors.focus,
    },

    moneyLabel: {
      color:
        colors.accentStrong,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    moneyValue: {
      marginTop:
        spacing.xxs,
      color:
        colors.textOnPrimary,
      fontSize:
        typography.subheading,
      lineHeight:
        typography.lineHeightSubheading,
      fontWeight:
        typography.weightExtraBold,
    },

    targetStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      gap:
        spacing.md,
      paddingTop:
        spacing.md,
      borderTopWidth:
        StyleSheet.hairlineWidth,
      borderTopColor:
        colors.focus,
    },

    targetLabel: {
      color:
        colors.accentStrong,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    targetValue: {
      flex: 1,
      color:
        colors.textOnPrimary,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightBold,
      textAlign: 'right',
    },

    noteCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap:
        spacing.sm,
      padding:
        spacing.md,
      borderRadius:
        radii.lg,
      backgroundColor:
        colors.surfaceMuted,
    },

    noteIcon: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius:
        radii.md,
      backgroundColor:
        colors.white,
    },

    noteCopy: {
      flex: 1,
      gap:
        spacing.xxs,
    },

    noteTitle: {
      color:
        colors.text,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightBold,
    },

    noteText: {
      color:
        colors.textSecondary,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
    },

    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent:
        'space-between',
      gap:
        spacing.md,
    },

    sectionTitle: {
      color:
        colors.text,
      fontSize:
        typography.subheading,
      lineHeight:
        typography.lineHeightSubheading,
      fontWeight:
        typography.weightBold,
    },

    sectionBody: {
      marginTop:
        spacing.xxs,
      color:
        colors.textSecondary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    sectionMeta: {
      color:
        colors.textTertiary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    emptyHistory: {
      flexDirection: 'row',
      alignItems: 'flex-start',
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

    emptyIcon: {
      width: 42,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius:
        radii.md,
      backgroundColor:
        colors.primarySoft,
    },

    emptyCopy: {
      flex: 1,
      gap:
        spacing.xxs,
    },

    emptyTitle: {
      color:
        colors.text,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightBold,
    },

    emptyBody: {
      color:
        colors.textSecondary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    historyCard: {
      paddingHorizontal:
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

    divider: {
      height:
        StyleSheet.hairlineWidth,
      backgroundColor:
        colors.border,
    },

    historyRow: {
      minHeight: 76,
      flexDirection: 'row',
      alignItems: 'center',
      gap:
        spacing.sm,
      paddingVertical:
        spacing.sm,
    },

    historyIcon: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius:
        radii.md,
      backgroundColor:
        colors.successSurface,
    },

    historyCopy: {
      flex: 1,
      minWidth: 0,
    },

    historyDate: {
      color:
        colors.text,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightBold,
    },

    historyNote: {
      marginTop:
        spacing.xxs,
      color:
        colors.textSecondary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    historyAmount: {
      maxWidth: '42%',
      color:
        colors.success,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightExtraBold,
      textAlign: 'right',
    },

    planningNotice: {
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

    planningText: {
      flex: 1,
      color:
        colors.textSecondary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },
  });