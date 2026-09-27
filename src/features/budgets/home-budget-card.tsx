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
  useBudgetStatus,
} from './budget-query';

import {
  formatUsagePercent,
} from './budget-money';


export function HomeBudgetCard() {
  const router =
    useRouter();

  const query =
    useBudgetStatus();

  const budgets =
    query.data ?? [];


  const overCount =
    budgets.filter(
      (budget) =>
        budget.is_over_budget,
    ).length;


  const highestUsage =
    budgets.reduce(
      (
        current,
        budget,
      ) => {
        if (!current) {
          return budget;
        }

        return (
          BigInt(
            budget.usage_basis_points,
          )
          >
          BigInt(
            current.usage_basis_points,
          )
        )
          ? budget
          : current;
      },
      budgets[0],
    );


  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        router.push(
          '/budgets' as never,
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
          BUDGETS
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
          Loading budget status…
        </Text>
      ) : budgets.length === 0 ? (
        <>
          <Text
            style={
              styles.title
            }
          >
            Set your first spending limit
          </Text>

          <Text
            style={
              styles.body
            }
          >
            Create an overall or category budget and track it against your ledger.
          </Text>
        </>
      ) : (
        <>
          <Text
            style={
              styles.title
            }
          >
            {overCount > 0
              ? `${overCount} budget${
                  overCount === 1
                    ? ''
                    : 's'
                } over limit`
              : 'Budgets are on track'}
          </Text>

          <Text
            style={
              styles.body
            }
          >
            {highestUsage
              ? `${highestUsage.name}: ${formatUsagePercent(
                  highestUsage.usage_basis_points,
                )} used`
              : 'Open budgets'}
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
