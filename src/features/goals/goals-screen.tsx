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
  useRouter,
} from 'expo-router';

import {
  useLocalFinanceReferenceData,
} from '../../offline/sync/use-local-finance-reference-data';

import {
  formatMinor,
} from '../budgets/budget-money';

import {
  goalProgressWidth,
  formatGoalProgressPercent,
} from './savings-goal-format';

import {
  useSavingsGoalStatus,
} from './savings-goal-query';


function labelGoalType(
  value: string,
): string {
  return value
    .replace(
      /_/g,
      ' ',
    )
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}


export function GoalsScreen() {
  const router =
    useRouter();

  const query =
    useSavingsGoalStatus();

  const reference =
    useLocalFinanceReferenceData();

  const goals =
    query.data ?? [];


  function minorUnitFor(
    currencyCode: string,
  ): number {
    return (
      reference.data
        ?.currencies
        .find(
          (currency) =>
            currency.code ===
            currencyCode,
        )
        ?.minorUnit
      ?? 2
    );
  }


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
            query.isRefetching
          }
          onRefresh={() => {
            void query.refetch();
          }}
        />
      }
    >
      <View
        style={
          styles.headerRow
        }
      >
        <View
          style={
            styles.headerCopy
          }
        >
          <Text
            style={
              styles.eyebrow
            }
          >
            SAVE
          </Text>

          <Text
            style={
              styles.title
            }
          >
            Savings goals
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            Build progress from contribution history you can always reconstruct.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            router.push(
              '/create-goal' as never,
            );
          }}
          style={
            styles.addButton
          }
        >
          <Text
            style={
              styles.addButtonText
            }
          >
            + Add
          </Text>
        </Pressable>
      </View>


      {query.isLoading ? (
        <View
          style={
            styles.stateCard
          }
        >
          <Text
            style={
              styles.stateTitle
            }
          >
            Loading goals…
          </Text>
        </View>
      ) : null}


      {query.error ? (
        <View
          style={[
            styles.stateCard,
            styles.errorCard,
          ]}
        >
          <Text
            style={
              styles.errorTitle
            }
          >
            Couldn’t load goals
          </Text>

          <Text
            style={
              styles.stateBody
            }
          >
            {query.error instanceof Error
              ? query.error.message
              : 'Please try again.'}
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void query.refetch();
            }}
            style={
              styles.retryButton
            }
          >
            <Text
              style={
                styles.retryButtonText
              }
            >
              Retry
            </Text>
          </Pressable>
        </View>
      ) : null}


      {!query.isLoading
      && !query.error
      && goals.length === 0 ? (
        <View
          style={
            styles.emptyCard
          }
        >
          <Text
            style={
              styles.emptyTitle
            }
          >
            Create your first goal
          </Text>

          <Text
            style={
              styles.emptyBody
            }
          >
            Emergency fund, travel, education, a home, retirement or anything else you want to work toward.
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              router.push(
                '/create-goal' as never,
              );
            }}
            style={
              styles.primaryButton
            }
          >
            <Text
              style={
                styles.primaryButtonText
              }
            >
              Create goal
            </Text>
          </Pressable>
        </View>
      ) : null}


      <View
        style={
          styles.list
        }
      >
        {goals.map(
          (goal) => {
            const minorUnit =
              minorUnitFor(
                goal.currency_code,
              );

            return (
              <Pressable
                key={
                  goal.id
                }
                accessibilityRole="button"
                onPress={() => {
                  router.push({
                    pathname:
                      '/goal-detail' as never,

                    params: {
                      goalId:
                        goal.id,
                    },
                  });
                }}
                style={({ pressed }) => [
                  styles.card,

                  goal.is_target_reached
                    ? styles.completedCard
                    : null,

                  pressed
                    ? styles.pressed
                    : null,
                ]}
              >
                <View
                  style={
                    styles.cardHeader
                  }
                >
                  <View
                    style={
                      styles.cardHeaderCopy
                    }
                  >
                    <Text
                      style={
                        styles.cardTitle
                      }
                    >
                      {goal.name}
                    </Text>

                    <Text
                      style={
                        styles.cardMeta
                      }
                    >
                      {labelGoalType(
                        goal.goal_type,
                      )}

                      {' · '}

                      {goal.currency_code}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusPill,

                      goal.is_target_reached
                        ? styles.completedPill
                        : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,

                        goal.is_target_reached
                          ? styles.completedPillText
                          : null,
                      ]}
                    >
                      {goal.is_target_reached
                        ? 'Target reached'
                        : formatGoalProgressPercent(
                            goal.progress_basis_points,
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
                    styles.moneyRow
                  }
                >
                  <View>
                    <Text
                      style={
                        styles.moneyLabel
                      }
                    >
                      Saved
                    </Text>

                    <Text
                      style={
                        styles.moneyValue
                      }
                    >
                      {goal.currency_code}{' '}
                      {formatMinor(
                        goal.contributed_minor,
                        minorUnit,
                      )}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.moneyRight
                    }
                  >
                    <Text
                      style={
                        styles.moneyLabel
                      }
                    >
                      Target
                    </Text>

                    <Text
                      style={
                        styles.moneyValue
                      }
                    >
                      {goal.currency_code}{' '}
                      {formatMinor(
                        goal.target_amount_minor,
                        minorUnit,
                      )}
                    </Text>
                  </View>
                </View>


                <View
                  style={
                    styles.footerRow
                  }
                >
                  <Text
                    style={
                      styles.footerText
                    }
                  >
                    {goal.target_date
                      ? `Target ${goal.target_date}`
                      : 'No target date'}
                  </Text>

                  <Text
                    style={
                      styles.footerText
                    }
                  >
                    {goal.contribution_count}{' '}
                    contribution{
                      goal.contribution_count === '1'
                        ? ''
                        : 's'
                    }
                  </Text>
                </View>
              </Pressable>
            );
          },
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

    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      marginBottom: spacing.lg,
    },

    headerCopy: {
      flex: 1,
      minWidth: 0,
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
      color: colors.textSecondary,
      fontSize: typography.small,
      lineHeight:
        typography.lineHeightSmall,
    },

    addButton: {
      minHeight: layout.touchTarget,
      paddingHorizontal: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.md,
      backgroundColor: colors.primary,
    },

    addButtonText: {
      color: colors.textOnPrimary,
      fontSize: typography.small,
      fontWeight:
        typography.weightBold,
    },

    stateCard: {
      padding: spacing.lg,
      borderRadius: radii.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...elevation.card,
    },

    errorCard: {
      backgroundColor:
        colors.dangerSurface,
      borderColor: colors.danger,
    },

    stateTitle: {
      color: colors.text,
      fontSize: typography.body,
      lineHeight:
        typography.lineHeightBody,
      fontWeight:
        typography.weightBold,
    },

    errorTitle: {
      color: colors.danger,
      fontSize: typography.body,
      lineHeight:
        typography.lineHeightBody,
      fontWeight:
        typography.weightBold,
    },

    stateBody: {
      marginTop: spacing.xs,
      color: colors.textSecondary,
      fontSize: typography.small,
      lineHeight:
        typography.lineHeightSmall,
    },

    retryButton: {
      alignSelf: 'flex-start',
      marginTop: spacing.md,
      minHeight: layout.touchTarget,
      paddingHorizontal: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.md,
      backgroundColor: colors.primary,
    },

    retryButtonText: {
      color: colors.textOnPrimary,
      fontSize: typography.small,
      fontWeight:
        typography.weightBold,
    },

    emptyCard: {
      padding: spacing.lg,
      borderRadius: radii.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...elevation.card,
    },

    emptyTitle: {
      color: colors.text,
      fontSize: typography.subheading,
      lineHeight:
        typography.lineHeightSubheading,
      fontWeight:
        typography.weightBold,
    },

    emptyBody: {
      marginTop: spacing.xs,
      color: colors.textSecondary,
      fontSize: typography.small,
      lineHeight:
        typography.lineHeightSmall,
    },

    primaryButton: {
      alignSelf: 'flex-start',
      marginTop: spacing.md,
      minHeight: layout.touchTarget,
      paddingHorizontal: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.md,
      backgroundColor: colors.primary,
    },

    primaryButtonText: {
      color: colors.textOnPrimary,
      fontSize: typography.small,
      fontWeight:
        typography.weightBold,
    },

    list: {
      gap: spacing.md,
    },

    card: {
      padding: spacing.md,
      borderRadius: radii.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...elevation.card,
    },

    completedCard: {
      backgroundColor:
        colors.successSurface,
      borderColor:
        colors.accentStrong,
    },

    pressed: {
      opacity: 0.82,
      transform: [
        {
          scale: 0.995,
        },
      ],
    },

    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
    },

    cardHeaderCopy: {
      flex: 1,
      minWidth: 0,
    },

    cardTitle: {
      color: colors.text,
      fontSize: typography.subheading,
      lineHeight:
        typography.lineHeightSubheading,
      fontWeight:
        typography.weightBold,
    },

    cardMeta: {
      marginTop: spacing.xxs,
      color: colors.textSecondary,
      fontSize: typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    statusPill: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radii.pill,
      backgroundColor:
        colors.primarySoft,
    },

    completedPill: {
      backgroundColor:
        colors.successSurface,
    },

    statusPillText: {
      color: colors.primary,
      fontSize: typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight:
        typography.weightBold,
    },

    completedPillText: {
      color: colors.success,
    },

    progressTrack: {
      height: 9,
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

    moneyRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.md,
      marginTop: spacing.md,
    },

    moneyRight: {
      alignItems: 'flex-end',
    },

    moneyLabel: {
      color: colors.textTertiary,
      fontSize: typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight:
        typography.weightSemibold,
    },

    moneyValue: {
      marginTop: spacing.xxs,
      color: colors.text,
      fontSize: typography.body,
      lineHeight:
        typography.lineHeightBody,
      fontWeight:
        typography.weightBold,
    },

    footerRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: spacing.sm,
      marginTop: spacing.md,
    },

    footerText: {
      color: colors.textTertiary,
      fontSize: typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },
  });
