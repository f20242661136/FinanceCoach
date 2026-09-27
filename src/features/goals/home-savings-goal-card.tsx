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
  spacing,
  typography,
} from '@/design/tokens';

import {
  useRouter,
} from 'expo-router';

import {
  formatGoalProgressPercent,
} from './savings-goal-format';

import {
  useSavingsGoalStatus,
} from './savings-goal-query';


export function HomeSavingsGoalCard() {
  const router =
    useRouter();

  const query =
    useSavingsGoalStatus();

  const goals =
    query.data ?? [];


  const active =
    goals.filter(
      (goal) =>
        !goal.is_target_reached
        && goal.status === 'active',
    );


  const nextGoal =
    active.reduce(
      (
        current,
        goal,
      ) => {
        if (!current) {
          return goal;
        }

        return (
          BigInt(
            goal.progress_basis_points,
          )
          >
          BigInt(
            current.progress_basis_points,
          )
        )
          ? goal
          : current;
      },
      active[0],
    );


  const completedCount =
    goals.filter(
      (goal) =>
        goal.is_target_reached,
    ).length;


  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        router.push(
          '/goals' as never,
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
          SAVINGS GOALS
        </Text>

        <Text
          style={
            styles.chevron
          }
        >
          ›
        </Text>
      </View>


      {query.isLoading ? (
        <Text
          style={
            styles.body
          }
        >
          Loading goal progress…
        </Text>
      ) : goals.length === 0 ? (
        <>
          <Text
            style={
              styles.title
            }
          >
            Give your savings a purpose
          </Text>

          <Text
            style={
              styles.body
            }
          >
            Create a goal and build progress with contribution history.
          </Text>
        </>
      ) : nextGoal ? (
        <>
          <Text
            style={
              styles.title
            }
          >
            {nextGoal.name}
          </Text>

          <Text
            style={
              styles.body
            }
          >
            {formatGoalProgressPercent(
              nextGoal.progress_basis_points,
            )}{' '}
            complete
            {completedCount > 0
              ? ` · ${completedCount} reached`
              : ''}
          </Text>
        </>
      ) : (
        <>
          <Text
            style={
              styles.title
            }
          >
            All current targets reached
          </Text>

          <Text
            style={
              styles.body
            }
          >
            {completedCount}{' '}
            goal{
              completedCount === 1
                ? ''
                : 's'
            } reached.
          </Text>
        </>
      )}
    </Pressable>
  );
}


const styles =
  StyleSheet.create({
    card: {
      marginBottom: spacing.md,
      padding: spacing.md,
      borderRadius: radii.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...elevation.card,
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
      gap: spacing.sm,
    },

    eyebrow: {
      color: colors.primary,
      fontSize: typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight:
        typography.weightBold,
      letterSpacing: 1.1,
    },

    chevron: {
      color: colors.textTertiary,
      fontSize: 22,
      lineHeight: 22,
    },

    title: {
      marginTop: spacing.sm,
      color: colors.text,
      fontSize: typography.subheading,
      lineHeight:
        typography.lineHeightSubheading,
      fontWeight:
        typography.weightBold,
    },

    body: {
      marginTop: spacing.xs,
      color: colors.textSecondary,
      fontSize: typography.small,
      lineHeight:
        typography.lineHeightSmall,
    },
  });
