import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import {
  Pressable,
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
import { useFinancialDashboardSummary } from '@/features/dashboard/dashboard-query';

type PlanLinkProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
};

function PlanLink({
  icon,
  title,
  description,
  onPress,
}: PlanLinkProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
      onPress={onPress}
      style={({ pressed }) => [
        styles.linkRow,
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={styles.linkIcon}>
        <Ionicons
          name={icon}
          size={20}
          color={colors.primary}
        />
      </View>

      <View style={styles.linkCopy}>
        <Text style={styles.linkTitle}>{title}</Text>
        <Text style={styles.linkBody}>{description}</Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color={colors.textTertiary}
      />
    </Pressable>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.groupCard}>{children}</View>
    </View>
  );
}

export function PlanScreen() {
  const router = useRouter();
  const dashboard = useFinancialDashboardSummary();
  const summary = dashboard.data;

  const budgetWarnings = summary
    ? BigInt(summary.budgets.over_budget_count)
      + BigInt(summary.budgets.near_limit_count)
    : BigInt(0);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <Text accessibilityRole="header" style={styles.title}>
          Plan
        </Text>
        <Text style={styles.subtitle}>
          Give every part of your money a job without turning planning into another chore.
        </Text>
      </View>

      {summary ? (
        <View style={styles.monthCard}>
          <View style={styles.monthTopRow}>
            <View>
              <Text style={styles.microLabel}>THIS MONTH</Text>
              <Text style={styles.monthTitle}>
                {budgetWarnings > BigInt(0)
                  ? `${budgetWarnings.toString()} budget ${budgetWarnings === BigInt(1) ? 'item needs' : 'items need'} attention`
                  : 'No budget warnings right now'}
              </Text>
            </View>

            <View
              style={[
                styles.statusIcon,
                budgetWarnings > BigInt(0)
                  ? styles.statusIconWarning
                  : styles.statusIconGood,
              ]}
            >
              <Ionicons
                name={
                  budgetWarnings > BigInt(0)
                    ? 'alert-circle-outline'
                    : 'checkmark-circle-outline'
                }
                size={22}
                color={
                  budgetWarnings > BigInt(0)
                    ? colors.warning
                    : colors.success
                }
              />
            </View>
          </View>

          <View style={styles.monthMetaRow}>
            <Text style={styles.monthMeta}>
              {summary.budgets.active_count} active budgets
            </Text>
            <View style={styles.dot} />
            <Text style={styles.monthMeta}>
              {summary.goals.active_count} active goals
            </Text>
          </View>

          {budgetWarnings > BigInt(0) ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Review budget warnings"
              onPress={() => router.push('/budgets' as never)}
              style={({ pressed }) => [
                styles.reviewAction,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={styles.reviewActionText}>Review budgets</Text>
              <Ionicons
                name="arrow-forward"
                size={17}
                color={colors.primary}
              />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <Section title="Spending">
        <PlanLink
          icon="pie-chart-outline"
          title="Budgets"
          description="Set limits and see what is left to spend."
          onPress={() => router.push('/budgets' as never)}
        />
        <View style={styles.divider} />
        <PlanLink
          icon="grid-outline"
          title="Six Jars"
          description="Organize money by purpose."
          onPress={() => router.push('/six-jars' as never)}
        />
      </Section>

      <Section title="Saving">
        <PlanLink
          icon="flag-outline"
          title="Goals"
          description="Track progress toward the things you are saving for."
          onPress={() => router.push('/goals' as never)}
        />
      </Section>

      <Section title="Debt & shared money">
        <PlanLink
          icon="cash-outline"
          title="Loans"
          description="Track balances, payments, and payoff progress."
          onPress={() => router.push('/loans' as never)}
        />
        <View style={styles.divider} />
        <PlanLink
          icon="people-outline"
          title="ROSCA"
          description="Manage group saving cycles."
          onPress={() => router.push('/rosca' as never)}
        />
      </Section>

      <Section title="Habits">
        <PlanLink
          icon="trophy-outline"
          title="Challenges"
          description="Build consistent money habits one step at a time."
          onPress={() => router.push('/gamification' as never)}
        />
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: layout.screenHorizontalPadding,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
  },

  hero: {
    gap: spacing.xs,
  },

  title: {
    color: colors.text,
    fontSize: typography.title,
    lineHeight: typography.lineHeightTitle,
    fontWeight: typography.weightBold,
    letterSpacing: -0.5,
  },

  subtitle: {
    maxWidth: 520,
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: typography.lineHeightBody,
  },

  monthCard: {
    padding: layout.cardPadding,
    gap: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    ...elevation.card,
  },

  monthTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },

  microLabel: {
    color: colors.textTertiary,
    fontSize: typography.caption,
    lineHeight: typography.lineHeightCaption,
    fontWeight: typography.weightSemibold,
    letterSpacing: 0.8,
  },

  monthTitle: {
    maxWidth: 430,
    marginTop: spacing.xs,
    color: colors.text,
    fontSize: typography.subheading,
    lineHeight: typography.lineHeightSubheading,
    fontWeight: typography.weightSemibold,
  },

  statusIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statusIconWarning: {
    backgroundColor: colors.warningSurface,
  },

  statusIconGood: {
    backgroundColor: colors.successSurface,
  },

  monthMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },

  monthMeta: {
    color: colors.textSecondary,
    fontSize: typography.small,
    lineHeight: typography.lineHeightSmall,
  },

  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.textTertiary,
  },

  reviewAction: {
    minHeight: layout.touchTarget,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  reviewActionText: {
    color: colors.primary,
    fontSize: typography.small,
    fontWeight: typography.weightSemibold,
  },

  section: {
    gap: spacing.sm,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: typography.subheading,
    lineHeight: typography.lineHeightSubheading,
    fontWeight: typography.weightSemibold,
  },

  groupCard: {
    overflow: 'hidden',
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    ...elevation.card,
  },

  linkRow: {
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: layout.cardPadding,
    paddingVertical: spacing.md,
  },

  linkIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },

  linkCopy: {
    flex: 1,
    gap: 2,
  },

  linkTitle: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: typography.lineHeightBody,
    fontWeight: typography.weightSemibold,
  },

  linkBody: {
    color: colors.textSecondary,
    fontSize: typography.small,
    lineHeight: typography.lineHeightSmall,
  },

  divider: {
    height: 1,
    marginLeft: 82,
    backgroundColor: colors.border,
  },

  pressed: {
    opacity: 0.72,
  },
});
