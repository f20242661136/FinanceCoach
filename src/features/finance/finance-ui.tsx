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

export const financeColors = {
  background: '#F5F7F5',
  surface: '#FFFFFF',
  surfaceSoft: '#EEF5F1',
  text: '#17211B',
  textMuted: '#68746D',
  border: '#DDE5E0',
  primary: '#177653',
  primaryPressed: '#105C40',
  positive: '#177653',
  negative: '#A33A2B',
  warning: '#9A6700',
  neutral: '#526159',
} as const;

export function FinanceCard({
  children,
}: PropsWithChildren) {
  return (
    <View style={styles.card}>
      {children}
    </View>
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
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>
        {title}
      </Text>

      {action}
    </View>
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
          color="#FFFFFF"
        />
      ) : (
        <>
          {icon ? (
            <Ionicons
              name={icon}
              size={18}
              color="#FFFFFF"
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
    <View style={styles.state}>
      <ActivityIndicator
        size="small"
        color={financeColors.primary}
      />

      <Text style={styles.stateText}>
        Loading your financesÃ¢â‚¬Â¦
      </Text>
    </View>
  );
}

export function ErrorState({
  onRetry,
}: {
  onRetry?: () => void;
}) {
  return (
    <FinanceCard>
      <View style={styles.state}>
        <Ionicons
          name="cloud-offline-outline"
          size={28}
          color={financeColors.textMuted}
        />

        <Text style={styles.stateTitle}>
          We could not load this yet
        </Text>

        <Text style={styles.stateText}>
          Your saved financial data has
          not been changed.
        </Text>

        {onRetry ? (
          <SecondaryButton
            title="Try again"
            onPress={onRetry}
          />
        ) : null}
      </View>
    </FinanceCard>
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
    <FinanceCard>
      <View style={styles.state}>
        <Ionicons
          name="wallet-outline"
          size={30}
          color={financeColors.primary}
        />

        <Text style={styles.stateTitle}>
          {title}
        </Text>

        <Text style={styles.stateText}>
          {description}
        </Text>

        {action}
      </View>
    </FinanceCard>
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
        ? 'Ã¢Ë†â€™'
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
          {' Ã‚Â· '}
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
    borderRadius: 20,
    padding: 16,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    gap: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: financeColors.text,
  },

  primaryButton: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor:
      financeColors.primary,

    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
  },

  primaryButtonPressed: {
    backgroundColor:
      financeColors.primaryPressed,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  secondaryButton: {
    minHeight: 44,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor:
      financeColors.surfaceSoft,
  },

  secondaryButtonText: {
    color: financeColors.primary,
    fontWeight: '700',
  },

  buttonDisabled: {
    opacity: 0.55,
  },

  state: {
    alignItems: 'center',
    paddingVertical: 18,
    gap: 10,
  },

  stateTitle: {
    color: financeColors.text,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },

  stateText: {
    color:
      financeColors.textMuted,

    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },

  activityRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 10,
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
    backgroundColor: '#E7F4ED',
  },

  expenseIcon: {
    backgroundColor: '#F9ECE8',
  },

  activityMain: {
    flex: 1,
    minWidth: 0,
  },

  activityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: financeColors.text,
  },

  activitySubtitle: {
    fontSize: 12,
    marginTop: 3,
    color:
      financeColors.textMuted,
  },

  activityAmount: {
    fontSize: 13,
    fontWeight: '700',
  },
});