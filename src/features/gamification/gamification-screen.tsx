import Ionicons from '@expo/vector-icons/Ionicons';

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

function levelProgressWidth(
  value: number,
): `${number}%` {
  return `${value}%`;
}

function friendlyDate(
  value: string,
): string {
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
    },
  );
}

export function GamificationScreen() {
  const timezone =
    useMemo(
      () =>
        deviceTimezone(),
      [],
    );

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
      <View style={styles.centered}>
        <StatePanel
          loading
          title="Loading progress"
          description="Checking your verified habits, streaks, challenges, and badges."
        />
      </View>
    );
  }

  if (
    query.error
    && !summary
  ) {
    return (
      <View style={styles.centered}>
        <StatePanel
          title="Progress unavailable"
          description={
            toUserFacingError(
              query.error,
              'generic',
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
                void query.refetch();
              }}
            />
          }
        />
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
          challenge =>
            challenge.status
            === 'active',
        )
        .map(
          challenge => [
            challenge.challenge_id,
            challenge,
          ],
        ),
    );

  const activeChallengeCount =
    summary.my_challenges
      .filter(
        challenge =>
          challenge.status
          === 'active',
      )
      .length;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={
        styles.content
      }
      showsVerticalScrollIndicator={false}
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
      <View style={styles.header}>
        <Text style={styles.eyebrow}>
          PROGRESS
        </Text>

        <Text
          accessibilityRole="header"
          style={styles.title}
        >
          Build better money habits
        </Text>

        <Text style={styles.subtitle}>
          Points, streaks, and challenges reflect verified activity. They are designed to encourage consistency, not financial pressure.
        </Text>
      </View>

      {startMutation.error ? (
        <InlineNotice
          tone="error"
          message={
            toUserFacingError(
              startMutation.error,
              'generic',
            )
          }
        />
      ) : null}

      {refreshMutation.error ? (
        <InlineNotice
          tone="error"
          message={
            toUserFacingError(
              refreshMutation.error,
              'generic',
            )
          }
        />
      ) : null}

      <View style={styles.levelCard}>
        <View style={styles.levelTop}>
          <View style={styles.levelIdentity}>
            <View style={styles.levelIcon}>
              <Ionicons
                name="trophy-outline"
                size={24}
                color={
                  colors.textOnPrimary
                }
              />
            </View>

            <View>
              <Text style={styles.levelLabel}>
                LEVEL {summary.level}
              </Text>

              <Text style={styles.levelName}>
                {summary.level_name}
              </Text>
            </View>
          </View>

          <View style={styles.pointsBlock}>
            <Text style={styles.pointsValue}>
              {summary.total_points}
            </Text>

            <Text style={styles.pointsLabel}>
              points
            </Text>
          </View>
        </View>

        <View style={styles.progressArea}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width:
                    levelProgressWidth(
                      levelProgress,
                    ),
                },
              ]}
            />
          </View>

          <Text style={styles.levelMeta}>
            {summary.next_level
              ? `${
                  summary.next_level_minimum_points
                } points for Level ${
                  summary.next_level
                } - ${
                  summary.next_level_name
                }`
              : 'Highest configured level reached'}
          </Text>
        </View>
      </View>

      <View style={styles.summaryStrip}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {activeChallengeCount}
          </Text>

          <Text style={styles.summaryLabel}>
            Active
          </Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {summary.streaks.length}
          </Text>

          <Text style={styles.summaryLabel}>
            Streaks
          </Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {summary.badges.length}
          </Text>

          <Text style={styles.summaryLabel}>
            Badges
          </Text>
        </View>
      </View>

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>
          Streaks
        </Text>

        <Text style={styles.sectionMeta}>
          Consistency over intensity
        </Text>
      </View>

      <View style={styles.streakGrid}>
        {summary.streaks.map(
          streak => (
            <View
              key={
                streak.streak_type
              }
              style={styles.streakCard}
            >
              <View style={styles.streakIcon}>
                <Ionicons
                  name="flame-outline"
                  size={18}
                  color={
                    colors.primary
                  }
                />
              </View>

              <Text style={styles.streakName}>
                {gamificationStreakLabel(
                  streak.streak_type,
                )}
              </Text>

              <Text style={styles.streakValue}>
                {streak.current_count}
              </Text>

              <Text style={styles.streakMeta}>
                Best {streak.best_count}
              </Text>
            </View>
          ),
        )}
      </View>

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>
          Challenges
        </Text>

        <Text style={styles.sectionMeta}>
          Verified from app data
        </Text>
      </View>

      <View style={styles.challengeList}>
        {summary.available_challenges.map(
          challenge => {
            const active =
              activeChallengeByDefinition
                .get(
                  challenge.id,
                );

            const completed =
              summary.my_challenges
                .find(
                  item =>
                    item.challenge_id
                      === challenge.id
                    && item.status
                      === 'completed',
                );

            return (
              <View
                key={
                  challenge.id
                }
                style={[
                  styles.challengeCard,
                  completed
                    ? styles.challengeCardCompleted
                    : null,
                ]}
              >
                <View style={styles.challengeHeader}>
                  <View style={styles.challengeIdentity}>
                    <View
                      style={[
                        styles.challengeIcon,
                        completed
                          ? styles.challengeIconCompleted
                          : null,
                      ]}
                    >
                      <Ionicons
                        name={
                          completed
                            ? 'checkmark-outline'
                            : 'flag-outline'
                        }
                        size={19}
                        color={
                          completed
                            ? colors.success
                            : colors.primary
                        }
                      />
                    </View>

                    <View style={styles.challengeCopy}>
                      <Text style={styles.challengeTitle}>
                        {challenge.title}
                      </Text>

                      <Text style={styles.challengeCadence}>
                        {challenge.cadence
                          === 'daily'
                          ? 'Daily'
                          : 'Weekly'}
                        {'  |  +'}
                        {challenge.points_reward}
                        {' points'}
                      </Text>
                    </View>
                  </View>

                  {challenge.is_premium ? (
                    <View style={styles.premiumPill}>
                      <Text style={styles.premiumText}>
                        PRO
                      </Text>
                    </View>
                  ) : null}
                </View>

                <Text style={styles.challengeDescription}>
                  {challenge.description}
                </Text>

                {active ? (
                  <View style={styles.challengeActive}>
                    <View style={styles.challengeProgressRow}>
                      <View>
                        <Text style={styles.challengeProgressLabel}>
                          Progress
                        </Text>

                        <Text style={styles.challengeProgress}>
                          {active.progress_count}
                          /
                          {active.target_count}
                        </Text>
                      </View>

                      <Text style={styles.challengePeriod}>
                        {friendlyDate(
                          active.period_start,
                        )}
                        {' - '}
                        {friendlyDate(
                          active.period_end,
                        )}
                      </Text>
                    </View>

                    <AppButton
                      label={
                        refreshMutation.isPending
                          ? 'Checking...'
                          : 'Check progress'
                      }
                      variant="secondary"
                      loading={
                        refreshMutation.isPending
                      }
                      icon="refresh-outline"
                      onPress={() => {
                        void refreshMutation
                          .mutateAsync(
                            active.id,
                          );
                      }}
                    />
                  </View>
                ) : completed ? (
                  <View style={styles.completedBanner}>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={18}
                      color={
                        colors.success
                      }
                    />

                    <Text style={styles.completedText}>
                      Completed
                    </Text>
                  </View>
                ) : (
                  <AppButton
                    label={
                      startMutation.isPending
                        ? 'Starting...'
                        : 'Start challenge'
                    }
                    icon="play-outline"
                    loading={
                      startMutation.isPending
                    }
                    onPress={() => {
                      void startMutation
                        .mutateAsync(
                          challenge.id,
                        );
                    }}
                  />
                )}
              </View>
            );
          },
        )}
      </View>

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>
          Badges
        </Text>

        <Text style={styles.sectionMeta}>
          {summary.badges.length} earned
        </Text>
      </View>

      {summary.badges.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="ribbon-outline"
              size={22}
              color={
                colors.primary
              }
            />
          </View>

          <View style={styles.emptyCopy}>
            <Text style={styles.emptyTitle}>
              Your first badge is ahead
            </Text>

            <Text style={styles.emptyBody}>
              Keep using Finance Coach normally. Badges come from verified activity, not from spending more.
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.badgeList}>
          {summary.badges.map(
            badge => (
              <View
                key={
                  badge.id
                }
                style={styles.badgeCard}
              >
                <View style={styles.badgeIcon}>
                  <Ionicons
                    name="ribbon-outline"
                    size={20}
                    color={
                      colors.success
                    }
                  />
                </View>

                <View style={styles.badgeCopy}>
                  <Text style={styles.badgeName}>
                    {badge.name}
                  </Text>

                  <Text style={styles.badgeDescription}>
                    {badge.description}
                  </Text>
                </View>
              </View>
            ),
          )}
        </View>
      )}

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>
          Recent points
        </Text>

        <Text style={styles.sectionMeta}>
          Verified events
        </Text>
      </View>

      {summary.recent_point_events.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="star-outline"
              size={22}
              color={
                colors.primary
              }
            />
          </View>

          <View style={styles.emptyCopy}>
            <Text style={styles.emptyTitle}>
              No point events yet
            </Text>

            <Text style={styles.emptyBody}>
              Point events appear as you use Finance Coach and complete verified activities.
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.eventList}>
          {summary.recent_point_events.map(
            (
              event,
              index,
            ) => (
              <View
                key={
                  event.id
                }
              >
                {index > 0 ? (
                  <View style={styles.divider} />
                ) : null}

                <View style={styles.eventRow}>
                  <View style={styles.eventIcon}>
                    <Ionicons
                      name="star-outline"
                      size={17}
                      color={
                        colors.primary
                      }
                    />
                  </View>

                  <View style={styles.eventCopy}>
                    <Text style={styles.eventName}>
                      {gamificationEventLabel(
                        event.event_type,
                      )}
                    </Text>

                    <Text style={styles.eventDate}>
                      {new Date(
                        event.created_at,
                      ).toLocaleDateString()}
                    </Text>
                  </View>

                  <Text style={styles.eventPoints}>
                    +{event.points}
                  </Text>
                </View>
              </View>
            ),
          )}
        </View>
      )}

      <View style={styles.noteCard}>
        <View style={styles.noteIcon}>
          <Ionicons
            name="heart-outline"
            size={20}
            color={
              colors.primary
            }
          />
        </View>

        <View style={styles.noteCopy}>
          <Text style={styles.noteTitle}>
            Healthy motivation
          </Text>

          <Text style={styles.noteBody}>
            Finance Coach does not reward spending more money. Progress is tied to useful behaviors such as recording, planning, saving, and completing verified challenges.
          </Text>
        </View>
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

    subtitle: {
      maxWidth: 460,
      color:
        colors.textSecondary,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
    },

    levelCard: {
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

    levelTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent:
        'space-between',
      gap:
        spacing.md,
    },

    levelIdentity: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap:
        spacing.sm,
    },

    levelIcon: {
      width: 46,
      height: 46,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius:
        radii.lg,
      backgroundColor:
        colors.focus,
    },

    levelLabel: {
      color:
        colors.accentStrong,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight:
        typography.weightBold,
      letterSpacing: 1,
    },

    levelName: {
      marginTop:
        spacing.xxs,
      color:
        colors.textOnPrimary,
      fontSize:
        typography.heading,
      lineHeight:
        typography.lineHeightHeading,
      fontWeight:
        typography.weightExtraBold,
    },

    pointsBlock: {
      alignItems: 'flex-end',
    },

    pointsValue: {
      color:
        colors.textOnPrimary,
      fontSize:
        typography.heading,
      lineHeight:
        typography.lineHeightHeading,
      fontWeight:
        typography.weightExtraBold,
    },

    pointsLabel: {
      color:
        colors.accentStrong,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    progressArea: {
      gap:
        spacing.xs,
    },

    progressTrack: {
      height: 9,
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

    levelMeta: {
      color:
        colors.accentStrong,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    summaryStrip: {
      flexDirection: 'row',
      alignItems: 'center',
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

    summaryItem: {
      flex: 1,
      alignItems: 'center',
      gap:
        spacing.xxs,
    },

    summaryDivider: {
      width: 1,
      height: 34,
      backgroundColor:
        colors.border,
    },

    summaryValue: {
      color:
        colors.primary,
      fontSize:
        typography.subheading,
      lineHeight:
        typography.lineHeightSubheading,
      fontWeight:
        typography.weightExtraBold,
    },

    summaryLabel: {
      color:
        colors.textSecondary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    sectionHeading: {
      flexDirection: 'row',
      alignItems: 'center',
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

    sectionMeta: {
      color:
        colors.textTertiary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    streakGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap:
        spacing.sm,
    },

    streakCard: {
      width: '48%',
      minHeight: 138,
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

    streakIcon: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius:
        radii.md,
      backgroundColor:
        colors.primarySoft,
    },

    streakName: {
      marginTop:
        spacing.sm,
      color:
        colors.textSecondary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight:
        typography.weightBold,
    },

    streakValue: {
      marginTop:
        spacing.xxs,
      color:
        colors.primary,
      fontSize: 28,
      lineHeight: 34,
      fontWeight:
        typography.weightExtraBold,
    },

    streakMeta: {
      color:
        colors.textTertiary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    challengeList: {
      gap:
        spacing.md,
    },

    challengeCard: {
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

    challengeCardCompleted: {
      borderColor:
        colors.accentStrong,
      backgroundColor:
        colors.successSurface,
    },

    challengeHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent:
        'space-between',
      gap:
        spacing.sm,
    },

    challengeIdentity: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap:
        spacing.sm,
    },

    challengeIcon: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius:
        radii.md,
      backgroundColor:
        colors.primarySoft,
    },

    challengeIconCompleted: {
      backgroundColor:
        colors.successSurface,
    },

    challengeCopy: {
      flex: 1,
      minWidth: 0,
    },

    challengeTitle: {
      color:
        colors.text,
      fontSize:
        typography.body,
      lineHeight:
        typography.lineHeightBody,
      fontWeight:
        typography.weightBold,
    },

    challengeCadence: {
      marginTop:
        spacing.xxs,
      color:
        colors.textTertiary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    premiumPill: {
      paddingHorizontal:
        spacing.sm,
      paddingVertical:
        spacing.xs,
      borderRadius:
        radii.pill,
      backgroundColor:
        colors.warningSurface,
    },

    premiumText: {
      color:
        colors.warning,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight:
        typography.weightExtraBold,
    },

    challengeDescription: {
      color:
        colors.textSecondary,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
    },

    challengeActive: {
      gap:
        spacing.sm,
    },

    challengeProgressRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent:
        'space-between',
      gap:
        spacing.md,
      padding:
        spacing.sm,
      borderRadius:
        radii.md,
      backgroundColor:
        colors.surfaceMuted,
    },

    challengeProgressLabel: {
      color:
        colors.textTertiary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    challengeProgress: {
      marginTop:
        spacing.xxs,
      color:
        colors.primary,
      fontSize:
        typography.subheading,
      lineHeight:
        typography.lineHeightSubheading,
      fontWeight:
        typography.weightExtraBold,
    },

    challengePeriod: {
      flex: 1,
      color:
        colors.textTertiary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      textAlign: 'right',
    },

    completedBanner: {
      minHeight:
        layout.touchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap:
        spacing.xs,
      borderRadius:
        radii.md,
      backgroundColor:
        colors.successSurface,
    },

    completedText: {
      color:
        colors.success,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightBold,
    },

    emptyCard: {
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

    badgeList: {
      gap:
        spacing.sm,
    },

    badgeCard: {
      minHeight: 72,
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
    },

    badgeIcon: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius:
        radii.md,
      backgroundColor:
        colors.successSurface,
    },

    badgeCopy: {
      flex: 1,
      minWidth: 0,
    },

    badgeName: {
      color:
        colors.text,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightBold,
    },

    badgeDescription: {
      marginTop:
        spacing.xxs,
      color:
        colors.textSecondary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    eventList: {
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

    eventRow: {
      minHeight: 68,
      flexDirection: 'row',
      alignItems: 'center',
      gap:
        spacing.sm,
      paddingVertical:
        spacing.sm,
    },

    divider: {
      height:
        StyleSheet.hairlineWidth,
      backgroundColor:
        colors.border,
    },

    eventIcon: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius:
        radii.md,
      backgroundColor:
        colors.primarySoft,
    },

    eventCopy: {
      flex: 1,
      minWidth: 0,
    },

    eventName: {
      color:
        colors.text,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightBold,
    },

    eventDate: {
      marginTop:
        spacing.xxs,
      color:
        colors.textTertiary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    eventPoints: {
      color:
        colors.success,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightExtraBold,
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
        colors.primarySoft,
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
        colors.primary,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightBold,
    },

    noteBody: {
      color:
        colors.textSecondary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },
  });