import {
  useMemo,
} from 'react';

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  colors,
  elevation,
  radii,
  typography,
} from '@/design/tokens';

import {
  useRouter,
} from 'expo-router';

import {
  gamificationStreakLabel,
} from './gamification-format';

import {
  useGamificationSummary,
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


export function HomeGamificationCard() {
  const router =
    useRouter();

  const timezone =
    useMemo(() => deviceTimezone(), []);

  const query =
    useGamificationSummary(
      timezone,
    );

  const summary =
    query.data;


  const strongestStreak =
    summary
      ?.streaks
      .slice()
      .sort(
        (a, b) =>
          b.current_count
          - a.current_count,
      )[0]
    ?? null;


  const activeChallenge =
    summary
      ?.my_challenges
      .find(
        (challenge) =>
          challenge.status ===
            'active',
      )
    ?? null;


  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        router.push(
          '/gamification' as never,
        );
      }}
      style={({ pressed }) => [
        styles.card,

        pressed
          ? styles.pressed
          : null,
      ]}
    >
      <View
        style={
          styles.header
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
            styles.chevron
          }
        >
          ›
        </Text>
      </View>


      {query.isLoading
      && !summary ? (
        <Text
          style={
            styles.body
          }
        >
          Loading your progress…
        </Text>
      ) : !summary ? (
        <>
          <Text
            style={
              styles.title
            }
          >
            Build consistent money habits
          </Text>

          <Text
            style={
              styles.body
            }
          >
            Challenges, streaks and points are based on verified activity.
          </Text>
        </>
      ) : (
        <>
          <View
            style={
              styles.topRow
            }
          >
            <View
              style={
                styles.levelBlock
              }
            >
              <Text
                style={
                  styles.title
                }
              >
                Level {summary.level}
              </Text>

              <Text
                style={
                  styles.body
                }
              >
                {summary.level_name}
                {' · '}
                {summary.total_points}
                {' points'}
              </Text>
            </View>

            {strongestStreak ? (
              <View
                style={
                  styles.streakBlock
                }
              >
                <Text
                  style={
                    styles.streakValue
                  }
                >
                  {strongestStreak.current_count}
                </Text>

                <Text
                  style={
                    styles.streakLabel
                  }
                >
                  {gamificationStreakLabel(
                    strongestStreak.streak_type,
                  )}{' '}
                  streak
                </Text>
              </View>
            ) : null}
          </View>


          {activeChallenge ? (
            <View
              style={
                styles.challengeLine
              }
            >
              <Text
                numberOfLines={1}
                style={
                  styles.challengeText
                }
              >
                {activeChallenge.title}
              </Text>

              <Text
                style={
                  styles.challengeProgress
                }
              >
                {activeChallenge.progress_count}
                /
                {activeChallenge.target_count}
              </Text>
            </View>
          ) : (
            <Text
              style={
                styles.challengeEmpty
              }
            >
              No active challenge
            </Text>
          )}
        </>
      )}
    </Pressable>
  );
}


const styles =
  StyleSheet.create({
    card: {
      marginBottom: 18,
      padding: 17,
      borderRadius: radii.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...elevation.card
    },

    pressed: {
      opacity: 0.82,
      transform: [
        {
          scale: 0.995,
        },
      ],
    },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    eyebrow: {
      color: colors.primary,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
      letterSpacing: 1.2,
    },

    chevron: {
      color: colors.textTertiary,
      fontSize: typography.heading,
      lineHeight: 22,
    },

    topRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 14,
      marginTop: 8,
    },

    levelBlock: {
      flex: 1,
    },

    title: {
      color: colors.text,
      fontSize: typography.subheading,
      fontWeight: typography.weightBold,
    },

    body: {
      marginTop: 4,
      color: colors.textSecondary,
      fontSize: typography.caption,
      lineHeight: 18,
    },

    streakBlock: {
      alignItems: 'flex-end',
    },

    streakValue: {
      color: colors.primary,
      fontSize: typography.heading,
      fontWeight: typography.weightBold,
    },

    streakLabel: {
      marginTop: 1,
      color: colors.textTertiary,
      fontSize: typography.caption,
    },

    challengeLine: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 13,
      paddingTop: 11,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },

    challengeText: {
      flex: 1,
      color: colors.textSecondary,
      fontSize: typography.caption,
      fontWeight: typography.weightSemibold,
    },

    challengeProgress: {
      color: colors.primary,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
    },

    challengeEmpty: {
      marginTop: 12,
      color: colors.textTertiary,
      fontSize: typography.caption,
    },
  });