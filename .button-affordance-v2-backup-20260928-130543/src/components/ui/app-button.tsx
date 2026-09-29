import Ionicons from '@expo/vector-icons/Ionicons';

import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import {
  colors,
  elevation,
  radii,
  spacing,
  typography,
} from '@/design/tokens';

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger';

type AppButtonProps = Omit<
  PressableProps,
  'style'
> & {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
};

export function AppButton({
  label,
  variant = 'primary',
  loading = false,
  icon,
  disabled,
  fullWidth = true,
  style,
  ...props
}: AppButtonProps) {
  const isDisabled =
    Boolean(disabled || loading);

  const usesLightContent =
    variant === 'primary'
    || variant === 'danger';

  const contentColor =
    usesLightContent
      ? colors.textOnPrimary
      : colors.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{
        disabled: isDisabled,
        busy: loading,
      }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        fullWidth
          ? styles.fullWidth
          : null,

        variant === 'primary'
          ? styles.primary
          : null,

        variant === 'secondary'
          ? styles.secondary
          : null,

        variant === 'ghost'
          ? styles.ghost
          : null,

        variant === 'danger'
          ? styles.danger
          : null,

        pressed && !isDisabled
          ? styles.pressed
          : null,

        pressed
        && !isDisabled
        && variant === 'primary'
          ? styles.primaryPressed
          : null,

        pressed
        && !isDisabled
        && variant === 'secondary'
          ? styles.secondaryPressed
          : null,

        pressed
        && !isDisabled
        && variant === 'ghost'
          ? styles.ghostPressed
          : null,

        pressed
        && !isDisabled
        && variant === 'danger'
          ? styles.dangerPressed
          : null,

        isDisabled
          ? styles.disabled
          : null,

        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={contentColor}
        />
      ) : (
        <>
          {icon ? (
            <Ionicons
              name={icon}
              size={19}
              color={contentColor}
            />
          ) : null}

          <Text
            numberOfLines={2}
            style={[
              styles.label,
              usesLightContent
                ? styles.lightLabel
                : styles.primaryLabel,
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    paddingVertical: 13,
    borderRadius: radii.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },

  fullWidth: {
    width: '100%',
  },

  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...elevation.card,
  },

  primaryPressed: {
    backgroundColor: colors.primaryPressed,
    borderColor: colors.primaryPressed,
  },

  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    ...elevation.card,
  },

  secondaryPressed: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryPressed,
  },

  ghost: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.borderStrong,
  },

  ghostPressed: {
    backgroundColor: colors.accent,
    borderColor: colors.primary,
  },

  danger: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
    ...elevation.card,
  },

  dangerPressed: {
    opacity: 0.9,
  },

  pressed: {
    transform: [
      {
        scale: 0.985,
      },
    ],
  },

  disabled: {
    opacity: 0.5,
  },

  label: {
    flexShrink: 1,
    color: colors.text,
    fontSize: typography.body,
    lineHeight: typography.lineHeightBody,
    fontWeight: typography.weightExtraBold,
    textAlign: 'center',
  },

  lightLabel: {
    color: colors.textOnPrimary,
  },

  primaryLabel: {
    color: colors.primary,
  },
});