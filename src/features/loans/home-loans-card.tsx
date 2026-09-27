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
  useLoanStatus,
} from './loan-query';


export function HomeLoansCard() {
  const router =
    useRouter();

  const query =
    useLoanStatus();

  const loans =
    query.data ?? [];


  const active =
    loans.filter(
      (loan) =>
        loan.status !==
          'settled',
    );

  const overdue =
    active.filter(
      (loan) =>
        loan.is_overdue,
    );


  const borrowed =
    active.filter(
      (loan) =>
        loan.direction ===
          'borrowed',
    ).length;

  const given =
    active.filter(
      (loan) =>
        loan.direction ===
          'given',
    ).length;


  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        router.push(
          '/loans' as never,
        );
      }}
      style={({ pressed }) => [
        styles.card,

        overdue.length > 0
          ? styles.warningCard
          : null,

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
          LOANS
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
          Loading loan status…
        </Text>
      ) : loans.length === 0 ? (
        <>
          <Text
            style={
              styles.title
            }
          >
            Keep loans organized
          </Text>

          <Text
            style={
              styles.body
            }
          >
            Track money borrowed or given with clear payment history.
          </Text>
        </>
      ) : (
        <>
          <Text
            style={[
              styles.title,

              overdue.length > 0
                ? styles.warningTitle
                : null,
            ]}
          >
            {overdue.length > 0
              ? `${overdue.length} overdue`
              : `${active.length} active`}
          </Text>

          <Text
            style={
              styles.body
            }
          >
            {borrowed} borrowed
            {' · '}
            {given} given
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

    warningCard: {
      backgroundColor:
        colors.warningSurface,
      borderColor: colors.warning,
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

    warningTitle: {
      color: colors.warning,
    },

    body: {
      marginTop: spacing.xs,
      color: colors.textSecondary,
      fontSize: typography.small,
      lineHeight:
        typography.lineHeightSmall,
    },
  });
