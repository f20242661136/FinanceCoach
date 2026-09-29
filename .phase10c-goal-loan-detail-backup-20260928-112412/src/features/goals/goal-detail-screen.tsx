import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
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
        (item) =>
          item.id ===
          goalId,
      )
    ?? null;


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


  const refreshing =
    goalsQuery.isRefetching
    || historyQuery.isRefetching;


  async function refresh() {
    await Promise.all([
      goalsQuery.refetch(),
      historyQuery.refetch(),
    ]);
  }


  if (
    !goalId
  ) {
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


  if (
    goalsQuery.isLoading
    || (
      !goal
      && goalsQuery.isFetching
    )
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
          Goal not found
        </Text>
      </View>
    );
  }


  const history =
    historyQuery.data
      ?? [];


  return (
    <ScrollView
      style={
        styles.screen
      }
      contentContainerStyle={
        styles.content
      }
      refreshControl={
        <RefreshControl
          refreshing={
            refreshing
          }
          onRefresh={() => {
            void refresh();
          }}
        />
      }
    >
      <Text
        style={
          styles.eyebrow
        }
      >
        GOAL
      </Text>

      <Text
        style={
          styles.title
        }
      >
        {goal.name}
      </Text>

      <Text
        style={
          styles.subtitle
        }
      >
        {goal.currency_code}
        {goal.target_date
          ? ` · Target ${goal.target_date}`
          : ' · No target date'}
      </Text>


      <View
        style={
          styles.heroCard
        }
      >
        <View
          style={
            styles.heroTop
          }
        >
          <View>
            <Text
              style={
                styles.heroLabel
              }
            >
              Progress
            </Text>

            <Text
              style={
                styles.heroPercent
              }
            >
              {formatGoalProgressPercent(
                goal.progress_basis_points,
              )}
            </Text>
          </View>

          <View
            style={
              styles.heroRight
            }
          >
            <Text
              style={
                styles.heroLabel
              }
            >
              Remaining
            </Text>

            <Text
              style={
                styles.heroMoney
              }
            >
              {goal.currency_code}{' '}
              {formatMinor(
                goal.remaining_minor,
                minorUnit,
              )}
            </Text>
          </View>
        </View>


        <View
          style={
            styles.progressTrack
          }
        >
          <View
            style={[
              styles.progressFill,

              {
                width:
                  goalProgressWidth(
                    goal.progress_basis_points,
                  ),
              },
            ]}
          />
        </View>


        <View
          style={
            styles.savedRow
          }
        >
          <Text
            style={
              styles.savedText
            }
          >
            Saved{' '}
            {goal.currency_code}{' '}
            {formatMinor(
              goal.contributed_minor,
              minorUnit,
            )}
          </Text>

          <Text
            style={
              styles.savedText
            }
          >
            Target{' '}
            {goal.currency_code}{' '}
            {formatMinor(
              goal.target_amount_minor,
              minorUnit,
            )}
          </Text>
        </View>


        <Pressable
          accessibilityRole="button"
          disabled={
            goal.is_target_reached
          }
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
          style={[
            styles.contributeButton,

            goal.is_target_reached
              ? styles.contributeButtonDisabled
              : null,
          ]}
        >
          <Text
            style={
              styles.contributeButtonText
            }
          >
            {goal.is_target_reached
              ? 'Target reached'
              : 'Add contribution'}
          </Text>
        </Pressable>
      </View>


      {goal.notes ? (
        <View
          style={
            styles.noteCard
          }
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            Notes
          </Text>

          <Text
            style={
              styles.noteText
            }
          >
            {goal.notes}
          </Text>
        </View>
      ) : null}


      <View
        style={
          styles.sectionHeader
        }
      >
        <Text
          style={
            styles.sectionTitle
          }
        >
          Contribution history
        </Text>

        <Text
          style={
            styles.sectionMeta
          }
        >
          {goal.contribution_count}{' '}
          total
        </Text>
      </View>


      {historyQuery.isLoading ? (
        <Text
          style={
            styles.muted
          }
        >
          Loading history…
        </Text>
      ) : null}


      {!historyQuery.isLoading
      && history.length === 0 ? (
        <View
          style={
            styles.emptyHistory
          }
        >
          <Text
            style={
              styles.emptyTitle
            }
          >
            No contributions yet
          </Text>

          <Text
            style={
              styles.muted
            }
          >
            Your contribution history will appear here.
          </Text>
        </View>
      ) : null}


      <View
        style={
          styles.historyList
        }
      >
        {history.map(
          (item) => (
            <View
              key={
                item.id
              }
              style={
                styles.historyRow
              }
            >
              <View
                style={
                  styles.historyCopy
                }
              >
                <Text
                  style={
                    styles.historyDate
                  }
                >
                  {item.contribution_date}
                </Text>

                {item.note ? (
                  <Text
                    numberOfLines={2}
                    style={
                      styles.historyNote
                    }
                  >
                    {item.note}
                  </Text>
                ) : null}
              </View>

              <Text
                style={
                  styles.historyAmount
                }
              >
                + {goal.currency_code}{' '}
                {formatMinor(
                  item.amount_minor,
                  minorUnit,
                )}
              </Text>
            </View>
          ),
        )}
      </View>
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
      marginTop: spacing.xs,
      color: colors.textSecondary,
      fontSize: typography.small,
      lineHeight:
        typography.lineHeightSmall,
    },

    heroCard: {
      marginTop: spacing.lg,
      padding: spacing.lg,
      borderRadius: radii.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...elevation.card,
    },

    heroTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.md,
    },

    heroRight: {
      alignItems: 'flex-end',
    },

    heroLabel: {
      color: colors.textTertiary,
      fontSize: typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight:
        typography.weightSemibold,
    },

    heroPercent: {
      marginTop: spacing.xxs,
      color: colors.primary,
      fontSize: 30,
      lineHeight: 36,
      fontWeight:
        typography.weightExtraBold,
    },

    heroMoney: {
      marginTop: spacing.xs,
      color: colors.text,
      fontSize: typography.body,
      lineHeight:
        typography.lineHeightBody,
      fontWeight:
        typography.weightBold,
    },

    progressTrack: {
      height: 10,
      marginTop: spacing.md,
      overflow: 'hidden',
      borderRadius: radii.pill,
      backgroundColor:
        colors.surfaceStrong,
    },

    progressFill: {
      height: '100%',
      borderRadius: radii.pill,
      backgroundColor: colors.primary,
    },

    savedRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: spacing.sm,
      marginTop: spacing.md,
    },

    savedText: {
      color: colors.textSecondary,
      fontSize: typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    contributeButton: {
      minHeight: layout.touchTarget,
      marginTop: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.md,
      backgroundColor: colors.primary,
    },

    contributeButtonDisabled: {
      opacity: 0.5,
    },

    contributeButtonText: {
      color: colors.textOnPrimary,
      fontSize: typography.small,
      fontWeight:
        typography.weightBold,
    },

    noteCard: {
      marginTop: spacing.md,
      padding: spacing.md,
      borderRadius: radii.md,
      backgroundColor:
        colors.infoSurface,
      borderWidth: 1,
      borderColor: colors.border,
    },

    noteText: {
      marginTop: spacing.xs,
      color: colors.textSecondary,
      fontSize: typography.small,
      lineHeight:
        typography.lineHeightSmall,
    },

    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      marginTop: spacing.xl,
      marginBottom: spacing.sm,
    },

    sectionTitle: {
      color: colors.text,
      fontSize: typography.subheading,
      lineHeight:
        typography.lineHeightSubheading,
      fontWeight:
        typography.weightBold,
    },

    sectionMeta: {
      color: colors.textTertiary,
      fontSize: typography.caption,
      lineHeight:
        typography.lineHeightCaption,
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

    emptyHistory: {
      padding: spacing.lg,
      borderRadius: radii.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...elevation.card,
    },

    emptyTitle: {
      marginBottom: spacing.xs,
      color: colors.text,
      fontSize: typography.body,
      lineHeight:
        typography.lineHeightBody,
      fontWeight:
        typography.weightBold,
    },

    historyList: {
      gap: spacing.sm,
    },

    historyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...elevation.card,
    },

    historyCopy: {
      flex: 1,
      minWidth: 0,
    },

    historyDate: {
      color: colors.text,
      fontSize: typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightSemibold,
    },

    historyNote: {
      marginTop: spacing.xxs,
      color: colors.textSecondary,
      fontSize: typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    historyAmount: {
      color: colors.success,
      fontSize: typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightBold,
      textAlign: 'right',
    },
  });
