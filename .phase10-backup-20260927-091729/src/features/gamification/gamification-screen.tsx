import {
  useMemo,
} from 'react';

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
  typography,
} from '@/design/tokens';

import {
  useRouter,
} from 'expo-router';

import {
  useSubscription,
} from '@/features/subscriptions/subscription-context';

import {
  gamificationEventLabel,
  gamificationStreakLabel,
} from './gamification-format';

import {
  useGamificationSummary,
  useRefreshGamificationChallenge,
  useStartGamificationChallenge,
} from './gamification-query';


function deviceTimezone(): string {
  try {
    return (
      Intl.DateTimeFormat()
        .resolvedOptions()
        .timeZone
      || 'UTC'
    );
  } catch {
    return 'UTC';
  }
}


function progressPercent(
  current: bigint,
  start: bigint,
  end: bigint | null,
): number {
  if (
    end === null
    || end <= start
  ) {
    return 100;
  }

  const numerator =
    current > start
      ? current - start
      : BigInt(0);

  const denominator =
    end - start;

  const scaled =
    Number(
      (
        numerator
        * BigInt(10000)
      )
      / denominator,
    )
    / 100;

  return Math.max(
    0,
    Math.min(
      100,
      scaled,
    ),
  );
}


export function GamificationScreen() {
  const router =
    useRouter();

  const {
    status:
      subscriptionStatus,
    hasPremiumEntitlement,
  } =
    useSubscription();

  const timezone =
    useMemo(() => deviceTimezone(), []);

  const query =
    useGamificationSummary(
      timezone,
    );

  const startMutation =
    useStartGamificationChallenge(
      timezone,
    );

  const refreshMutation =
    useRefreshGamificationChallenge(
      timezone,
    );

  const summary =
    query.data;


  if (
    query.isLoading
    && !summary
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
          Loading progress…
        </Text>
      </View>
    );
  }


  if (
    query.error
    && !summary
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
          Progress unavailable
        </Text>

        <Text
          style={
            styles.muted
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
    );
  }


  if (!summary) {
    return null;
  }


  const totalPoints =
    BigInt(
      summary.total_points,
    );

  const currentMinimum =
    BigInt(
      summary.level_minimum_points,
    );

  const nextMinimum =
    summary.next_level_minimum_points
      ? BigInt(
          summary.next_level_minimum_points,
        )
      : null;

  const levelProgress =
    progressPercent(
      totalPoints,
      currentMinimum,
      nextMinimum,
    );


  const activeChallengeByDefinition =
    new Map(
      summary.my_challenges
        .filter(
          (challenge) =>
            challenge.status ===
              'active',
        )
        .map(
          (challenge) => [
            challenge.challenge_id,
            challenge,
          ],
        ),
    );


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
      <Text
        style={
          styles.eyebrow
        }
      >
        PROGRESS
      </Text>

      <Text
        style={
          styles.title
        }
      >
        Build better money habits
      </Text>

      <Text
        style={
          styles.subtitle
        }
      >
        Points, streaks and challenges reflect verified activity. They are designed to encourage consistency, not financial pressure.
      </Text>


      <View
        style={
          styles.levelCard
        }
      >
        <View
          style={
            styles.levelHeader
          }
        >
          <View>
            <Text
              style={
                styles.levelLabel
              }
            >
              LEVEL {summary.level}
            </Text>

            <Text
              style={
                styles.levelName
              }
            >
              {summary.level_name}
            </Text>
          </View>

          <View
            style={
              styles.pointsBlock
            }
          >
            <Text
              style={
                styles.pointsValue
              }
            >
              {summary.total_points}
            </Text>

            <Text
              style={
                styles.pointsLabel
              }
            >
              points
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
                  `${levelProgress}%`,
              },
            ]}
          />
        </View>


        <Text
          style={
            styles.levelMeta
          }
        >
          {summary.next_level
            ? `${
                summary.next_level_minimum_points
              } points for Level ${
                summary.next_level
              } · ${
                summary.next_level_name
              }`
            : 'Highest configured level reached'}
        </Text>
      </View>


      <Text
        style={
          styles.sectionTitle
        }
      >
        Streaks
      </Text>

      <View
        style={
          styles.streakGrid
        }
      >
        {summary.streaks.map(
          (streak) => (
            <View
              key={
                streak.streak_type
              }
              style={
                styles.streakCard
              }
            >
              <Text
                style={
                  styles.streakName
                }
              >
                {gamificationStreakLabel(
                  streak.streak_type,
                )}
              </Text>

              <Text
                style={
                  styles.streakValue
                }
              >
                {streak.current_count}
              </Text>

              <Text
                style={
                  styles.streakMeta
                }
              >
                current · best {streak.best_count}
              </Text>
            </View>
          ),
        )}
      </View>


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
          Challenges
        </Text>

        <Text
          style={
            styles.sectionMeta
          }
        >
          Verified from app data
        </Text>
      </View>


      <View
        style={
          styles.challengeList
        }
      >
        {summary.available_challenges.map(
          (challenge) => {
            const active =
              activeChallengeByDefinition
                .get(
                  challenge.id,
                );

            const completed =
              summary.my_challenges
                .find(
                  (item) =>
                    item.challenge_id ===
                      challenge.id
                    &&
                    item.status ===
                      'completed',
                );


            return (
              <View
                key={
                  challenge.id
                }
                style={
                  styles.challengeCard
                }
              >
                <View
                  style={
                    styles.challengeHeader
                  }
                >
                  <View
                    style={
                      styles.challengeCopy
                    }
                  >
                    <Text
                      style={
                        styles.challengeTitle
                      }
                    >
                      {challenge.title}
                    </Text>

                    <Text
                      style={
                        styles.challengeCadence
                      }
                    >
                      {challenge.cadence ===
                        'daily'
                        ? 'Daily'
                        : 'Weekly'}
                      {' · +'}
                      {challenge.points_reward}
                      {' points'}
                    </Text>
                  </View>

                  {challenge.is_premium ? (
                    <View
                      style={
                        styles.premiumPill
                      }
                    >
                      <Text
                        style={
                          styles.premiumText
                        }
                      >
                        PRO
                      </Text>
                    </View>
                  ) : null}
                </View>


                <Text
                  style={
                    styles.challengeDescription
                  }
                >
                  {challenge.description}
                </Text>


                {active ? (
                  <>
                    <View
                      style={
                        styles.challengeProgressRow
                      }
                    >
                      <Text
                        style={
                          styles.challengeProgress
                        }
                      >
                        {active.progress_count}
                        /
                        {active.target_count}
                      </Text>

                      <Text
                        style={
                          styles.challengePeriod
                        }
                      >
                        {active.period_start}
                        {' → '}
                        {active.period_end}
                      </Text>
                    </View>

                    <Pressable
                      accessibilityRole="button"
                      disabled={
                        refreshMutation.isPending
                      }
                      onPress={() => {
                        void refreshMutation
                          .mutateAsync(
                            active.id,
                          );
                      }}
                      style={
                        styles.secondaryAction
                      }
                    >
                      <Text
                        style={
                          styles.secondaryActionText
                        }
                      >
                        Check progress
                      </Text>
                    </Pressable>
                  </>
                ) : completed ? (
                  <View
                    style={
                      styles.completedBanner
                    }
                  >
                    <Text
                      style={
                        styles.completedText
                      }
                    >
                      Completed
                    </Text>
                  </View>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    disabled={
                      startMutation.isPending
                      || (
                        challenge.is_premium
                        && subscriptionStatus ===
                          'initializing'
                      )
                    }
                    onPress={() => {
                      if (
                        challenge.is_premium
                        && !hasPremiumEntitlement
                      ) {
                        router.push(
                          '/subscription' as never,
                        );

                        return;
                      }

                      void startMutation
                        .mutateAsync(
                          challenge.id,
                        );
                    }}
                    style={
                      styles.primaryAction
                    }
                  >
                    <Text
                      style={
                        styles.primaryActionText
                      }
                    >
                      {challenge.is_premium
                      && !hasPremiumEntitlement
                        ? subscriptionStatus ===
                            'initializing'
                          ? 'Checking Premium…'
                          : 'Unlock with Premium'
                        : 'Start challenge'}
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          },
        )}
      </View>


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
          Badges
        </Text>

        <Text
          style={
            styles.sectionMeta
          }
        >
          {summary.badges.length} earned
        </Text>
      </View>


      {summary.badges.length === 0 ? (
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
            Your first badge is ahead
          </Text>

          <Text
            style={
              styles.emptyBody
            }
          >
            Keep using the app normally. Badges are awarded from verified activity.
          </Text>
        </View>
      ) : (
        <View
          style={
            styles.badgeList
          }
        >
          {summary.badges.map(
            (badge) => (
              <View
                key={
                  badge.id
                }
                style={
                  styles.badgeCard
                }
              >
                <View
                  style={
                    styles.badgeIcon
                  }
                >
                  <Text
                    style={
                      styles.badgeIconText
                    }
                  >
                    ✓
                  </Text>
                </View>

                <View
                  style={
                    styles.badgeCopy
                  }
                >
                  <Text
                    style={
                      styles.badgeName
                    }
                  >
                    {badge.name}
                  </Text>

                  <Text
                    style={
                      styles.badgeDescription
                    }
                  >
                    {badge.description}
                  </Text>
                </View>
              </View>
            ),
          )}
        </View>
      )}


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
          Recent points
        </Text>

        <Text
          style={
            styles.sectionMeta
          }
        >
          Event based
        </Text>
      </View>


      {summary.recent_point_events.length ===
        0 ? (
        <View
          style={
            styles.emptyCard
          }
        >
          <Text
            style={
              styles.emptyBody
            }
          >
            Point events will appear as you use Finance Coach.
          </Text>
        </View>
      ) : (
        <View
          style={
            styles.eventList
          }
        >
          {summary.recent_point_events.map(
            (event) => (
              <View
                key={
                  event.id
                }
                style={
                  styles.eventRow
                }
              >
                <View
                  style={
                    styles.eventCopy
                  }
                >
                  <Text
                    style={
                      styles.eventName
                    }
                  >
                    {gamificationEventLabel(
                      event.event_type,
                    )}
                  </Text>

                  <Text
                    style={
                      styles.eventDate
                    }
                  >
                    {new Date(
                      event.created_at,
                    ).toLocaleDateString()}
                  </Text>
                </View>

                <Text
                  style={
                    styles.eventPoints
                  }
                >
                  +{event.points}
                </Text>
              </View>
            ),
          )}
        </View>
      )}


      <View
        style={
          styles.noteCard
        }
      >
        <Text
          style={
            styles.noteTitle
          }
        >
          Healthy motivation
        </Text>

        <Text
          style={
            styles.noteBody
          }
        >
          Finance Coach does not reward spending more money. Progress is tied to useful behaviors such as recording, planning, saving and completing verified challenges.
        </Text>
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
      width: '100%',
      maxWidth: layout.contentMaxWidth,
      alignSelf: 'center',
      paddingHorizontal: layout.screenHorizontalPadding,
      paddingTop: 22,
      paddingBottom: 120,
    },

    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      backgroundColor: colors.background,
    },

    muted: {
      color: colors.textSecondary,
      fontSize: typography.small,
      lineHeight: 19,
      textAlign: 'center',
    },

    errorTitle: {
      marginBottom: 5,
      color: colors.danger,
      fontSize: typography.subheading,
      fontWeight: typography.weightBold,
    },

    retryButton: {
      marginTop: 14,
      paddingHorizontal: 15,
      paddingVertical: 10,
      borderRadius: radii.sm,
      backgroundColor: colors.primary,
    },

    retryButtonText: {
      color: colors.textOnPrimary,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
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
      lineHeight: 35,
      fontWeight: typography.weightBold,
    },

    subtitle: {
      marginTop: 8,
      color: colors.textSecondary,
      fontSize: typography.small,
      lineHeight: 21,
    },

    levelCard: {
      marginTop: 20,
      padding: 18,
      borderRadius: radii.lg,
      backgroundColor: colors.text,
      ...elevation.card
    },

    levelHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 16,
    },

    levelLabel: {
      color: colors.accentStrong,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
      letterSpacing: 1,
    },

    levelName: {
      marginTop: 5,
      color: colors.textOnPrimary,
      fontSize: typography.heading,
      fontWeight: typography.weightBold,
    },

    pointsBlock: {
      alignItems: 'flex-end',
    },

    pointsValue: {
      color: colors.textOnPrimary,
      fontSize: typography.heading,
      fontWeight: typography.weightBold,
    },

    pointsLabel: {
      marginTop: 1,
      color: colors.textTertiary,
      fontSize: typography.caption,
    },

    progressTrack: {
      height: 7,
      marginTop: 19,
      overflow: 'hidden',
      borderRadius: radii.pill,
      backgroundColor: colors.borderStrong,
    },

    progressFill: {
      height: '100%',
      borderRadius: radii.pill,
      backgroundColor: colors.accentStrong,
    },

    levelMeta: {
      marginTop: 8,
      color: colors.textTertiary,
      fontSize: typography.caption,
      lineHeight: 15,
    },

    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginTop: 24,
      marginBottom: 10,
    },

    sectionTitle: {
      marginTop: 24,
      color: colors.text,
      fontSize: typography.subheading,
      fontWeight: typography.weightBold,
    },

    sectionMeta: {
      marginTop: 24,
      color: colors.textTertiary,
      fontSize: typography.caption,
    },

    streakGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 9,
      marginTop: 10,
    },

    streakCard: {
      width: '31%',
      minWidth: 95,
      padding: 13,
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...elevation.card
    },

    streakName: {
      color: colors.textSecondary,
      fontSize: typography.caption,
      fontWeight: typography.weightSemibold,
    },

    streakValue: {
      marginTop: 6,
      color: colors.primary,
      fontSize: typography.heading,
      fontWeight: typography.weightBold,
    },

    streakMeta: {
      marginTop: 2,
      color: colors.textTertiary,
      fontSize: typography.caption,
      lineHeight: 12,
    },

    challengeList: {
      gap: 10,
    },

    challengeCard: {
      padding: 16,
      borderRadius: radii.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...elevation.card
    },

    challengeHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },

    challengeCopy: {
      flex: 1,
    },

    challengeTitle: {
      color: colors.text,
      fontSize: typography.small,
      fontWeight: typography.weightBold,
    },

    challengeCadence: {
      marginTop: 3,
      color: colors.textSecondary,
      fontSize: typography.caption,
      fontWeight: typography.weightSemibold,
    },

    challengeDescription: {
      marginTop: 8,
      color: colors.textSecondary,
      fontSize: typography.caption,
      lineHeight: 17,
    },

    premiumPill: {
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: radii.pill,
      backgroundColor: colors.surfaceMuted,
    },

    premiumText: {
      color: colors.textSecondary,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
      letterSpacing: 0.7,
    },

    challengeProgressRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 12,
    },

    challengeProgress: {
      color: colors.primary,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
    },

    challengePeriod: {
      color: colors.textTertiary,
      fontSize: typography.caption,
    },

    primaryAction: {
      alignSelf: 'flex-start',
      marginTop: 12,
      paddingHorizontal: 13,
      paddingVertical: 9,
      borderRadius: radii.sm,
      backgroundColor: colors.primary,
    },

    primaryActionText: {
      color: colors.textOnPrimary,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
    },

    secondaryAction: {
      alignSelf: 'flex-start',
      marginTop: 10,
      paddingHorizontal: 13,
      paddingVertical: 9,
      borderRadius: radii.sm,
      backgroundColor: colors.primarySoft,
    },

    secondaryActionText: {
      color: colors.primary,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
    },

    completedBanner: {
      alignSelf: 'flex-start',
      marginTop: 12,
      paddingHorizontal: 11,
      paddingVertical: 7,
      borderRadius: radii.pill,
      backgroundColor: colors.primarySoft,
    },

    completedText: {
      color: colors.primary,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
    },

    badgeList: {
      gap: 8,
    },

    badgeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
      padding: 13,
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...elevation.card
    },

    badgeIcon: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.pill,
      backgroundColor: colors.primarySoft,
    },

    badgeIconText: {
      color: colors.primary,
      fontSize: typography.small,
      fontWeight: typography.weightBold,
    },

    badgeCopy: {
      flex: 1,
    },

    badgeName: {
      color: colors.text,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
    },

    badgeDescription: {
      marginTop: 2,
      color: colors.textSecondary,
      fontSize: typography.caption,
      lineHeight: 15,
    },

    emptyCard: {
      padding: 15,
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...elevation.card
    },

    emptyTitle: {
      color: colors.text,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
    },

    emptyBody: {
      marginTop: 3,
      color: colors.textSecondary,
      fontSize: typography.caption,
      lineHeight: 16,
    },

    eventList: {
      gap: 7,
    },

    eventRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...elevation.card
    },

    eventCopy: {
      flex: 1,
    },

    eventName: {
      color: colors.text,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
      textTransform: 'capitalize',
    },

    eventDate: {
      marginTop: 2,
      color: colors.textTertiary,
      fontSize: typography.caption,
    },

    eventPoints: {
      color: colors.primary,
      fontSize: typography.small,
      fontWeight: typography.weightBold,
    },

    noteCard: {
      marginTop: 22,
      padding: 14,
      borderRadius: radii.md,
      backgroundColor: colors.surfaceMuted,
      ...elevation.card
    },

    noteTitle: {
      color: colors.textSecondary,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
    },

    noteBody: {
      marginTop: 4,
      color: colors.textSecondary,
      fontSize: typography.caption,
      lineHeight: 17,
    },
  });
