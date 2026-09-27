import type {
  PropsWithChildren,
  ReactNode,
} from 'react';

import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type TextStyle,
} from 'react-native';

import Ionicons from '@expo/vector-icons/Ionicons';

import type {
  RecentActivity,
} from '@/features/transactions/transaction-service';

import {
  formatMinorUnits,
} from '@/domain/money/money';

import {
  AppCard,
} from '@/components/ui/app-card';
import {
  AppSectionHeader,
} from '@/components/ui/app-section-header';
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

/**
 * Backward-compatible finance palette.
 *
 * Feature screens can keep importing financeColors while the underlying
 * visual language now comes from the canonical design token contract.
 */
export const financeColors = {
  background: colors.background,
  surface: colors.surface,
  surfaceSoft: colors.surfaceMuted,
  text: colors.text,
  textMuted: colors.textSecondary,
  border: colors.border,
  primary: colors.primary,
  primaryPressed: colors.primaryPressed,
  positive: colors.success,
  negative: colors.danger,
  warning: colors.warning,
  neutral: colors.neutral,
} as const;

export function FinanceCard({
  children,
}: PropsWithChildren) {
  return (
    <AppCard>
      {children}
    </AppCard>
  );
}

export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <AppSectionHeader
      title={title}
      action={action}
    />
  );
}

export function PrimaryButton({
  title,
  loading = false,
  disabled = false,
  icon,
  style: providedStyle,
  ...props
}: PressableProps & {
  title: string;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      disabled={disabled || loading}
      style={(state) => [
        styles.primaryButton,

        state.pressed &&
          styles.primaryButtonPressed,

        (disabled || loading) &&
          styles.buttonDisabled,

        typeof providedStyle === 'function'
          ? providedStyle(state)
          : providedStyle,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={colors.textOnPrimary}
        />
      ) : (
        <>
          {icon ? (
            <Ionicons
              name={icon}
              size={18}
              color={colors.textOnPrimary}
            />
          ) : null}

          <Text
            style={
              styles.primaryButtonText
            }
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function SecondaryButton({
  title,
  icon,
  style: providedStyle,
  ...props
}: PressableProps & {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      style={(state) => [
        styles.secondaryButton,

        state.pressed && {
          opacity: 0.7,
        },

        typeof providedStyle === 'function'
          ? providedStyle(state)
          : providedStyle,
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={18}
          color={
            financeColors.primary
          }
        />
      ) : null}

      <Text
        style={
          styles.secondaryButtonText
        }
      >
        {title}
      </Text>
    </Pressable>
  );
}

export function LoadingState() {
  return (
    <StatePanel
      loading
      description="Loading your finances..."
    />
  );
}

export function ErrorState({
  onRetry,
}: {
  onRetry?: () => void;
}) {
  return (
    <StatePanel
      title="We could not load this yet"
      description="Your saved financial data has not been changed."
      icon="cloud-offline-outline"
      tone="danger"
      action={
        onRetry ? (
          <SecondaryButton
            title="Try again"
            onPress={onRetry}
          />
        ) : undefined
      }
    />
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <StatePanel
      title={title}
      description={description}
      icon="wallet-outline"
      tone="info"
      action={action}
    />
  );
}

function activityAmountStyle(
  activity: RecentActivity,
): TextStyle {
  if (activity.type === 'income') {
    return {
      color:
        financeColors.positive,
    };
  }

  if (activity.type === 'expense') {
    return {
      color:
        financeColors.negative,
    };
  }

  return {
    color:
      financeColors.neutral,
  };
}

export function ActivityRow({
  activity,
}: {
  activity: RecentActivity;
}) {
  const isIncome =
    activity.type === 'income';

  const isExpense =
    activity.type === 'expense';

  const prefix =
    isIncome
      ? '+'
      : isExpense
        ? '−'
        : '';

  const title =
    activity.merchant ||
    activity.category_name ||
    (
      activity.type
        .charAt(0)
        .toUpperCase() +
      activity.type.slice(1)
    );

  return (
    <View style={styles.activityRow}>
      <View
        style={[
          styles.activityIcon,
          isIncome
            ? styles.incomeIcon
            : isExpense
              ? styles.expenseIcon
              : null,
        ]}
      >
        <Ionicons
          name={
            isIncome
              ? 'arrow-down'
              : isExpense
                ? 'arrow-up'
                : 'swap-horizontal'
          }
          size={17}
          color={
            isIncome
              ? financeColors.positive
              : isExpense
                ? financeColors.negative
                : financeColors.neutral
          }
        />
      </View>

      <View style={styles.activityMain}>
        <Text
          numberOfLines={1}
          style={styles.activityTitle}
        >
          {title}
        </Text>

        <Text
          numberOfLines={1}
          style={styles.activitySubtitle}
        >
          {activity.account_name}
          {' · '}
          {activity.transaction_date}
        </Text>
      </View>

      <Text
        style={[
          styles.activityAmount,
          activityAmountStyle(
            activity,
          ),
        ]}
      >
        {prefix}
        {formatMinorUnits(
          activity.amount_minor,
          activity.currency_code,
          activity.currency_minor_unit,
        )}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor:
      financeColors.surface,

    borderColor:
      financeColors.border,

    borderWidth: 1,
    borderRadius: radii.lg,
    padding: layout.cardPadding,
    ...elevation.card,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    gap: spacing.sm,
  },

  sectionTitle: {
    fontSize: typography.subheading,
    lineHeight: typography.lineHeightSubheading,
    fontWeight: typography.weightBold,
    color: financeColors.text,
  },

  primaryButton: {
    minHeight: layout.touchTarget + 2,
    borderRadius: radii.md,
    backgroundColor:
      financeColors.primary,

    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },

  primaryButtonPressed: {
    backgroundColor:
      financeColors.primaryPressed,
  },

  primaryButtonText: {
    color: colors.textOnPrimary,
    fontSize: typography.body,
    fontWeight: typography.weightBold,
  },

  secondaryButton: {
    minHeight: layout.touchTarget,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor:
      financeColors.surfaceSoft,
  },

  secondaryButtonText: {
    color: financeColors.primary,
    fontWeight: typography.weightBold,
  },

  buttonDisabled: {
    opacity: 0.55,
  },

  state: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },

  stateTitle: {
    color: financeColors.text,
    fontSize: typography.subheading,
    lineHeight: typography.lineHeightSubheading,
    fontWeight: typography.weightBold,
    textAlign: 'center',
  },

  stateText: {
    color:
      financeColors.textMuted,

    fontSize: typography.small,
    lineHeight: typography.lineHeightSmall,
    textAlign: 'center',
  },

  activityRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },

  activityIcon: {
    height: 38,
    width: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      financeColors.surfaceSoft,
  },

  incomeIcon: {
    backgroundColor: colors.successSurface,
  },

  expenseIcon: {
    backgroundColor: colors.dangerSurface,
  },

  activityMain: {
    flex: 1,
    minWidth: 0,
  },

  activityTitle: {
    fontSize: 15,
    fontWeight: typography.weightSemibold,
    color: financeColors.text,
  },

  activitySubtitle: {
    fontSize: typography.caption,
    lineHeight: typography.lineHeightCaption,
    marginTop: spacing.xxs,
    color:
      financeColors.textMuted,
  },

  activityAmount: {
    fontSize: 13,
    fontWeight: typography.weightBold,
  },
});