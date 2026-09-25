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
  layout,
  radii,
  spacing,
  typography,
} from '@/design/tokens';

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost';

type AppButtonProps = Omit<
  PressableProps,
  'style'
> & {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function AppButton({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  fullWidth = true,
  style,
  ...props
}: AppButtonProps) {
  const isDisabled = disabled || loading;

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
        fullWidth && styles.fullWidth,
        variant === 'primary' &&
          styles.primary,
        variant === 'secondary' &&
          styles.secondary,
        variant === 'ghost' &&
          styles.ghost,
        pressed &&
          !isDisabled &&
          variant === 'primary' &&
          styles.primaryPressed,
        pressed &&
          !isDisabled &&
          variant !== 'primary' &&
          styles.neutralPressed,
        isDisabled && styles.disabled,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === 'primary'
              ? colors.white
              : colors.primary
          }
        />
      ) : (
        <Text
          style={[
            styles.label,
            variant === 'primary'
              ? styles.primaryLabel
              : styles.neutralLabel,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: layout.touchTarget,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  fullWidth: {
    width: '100%',
  },

  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  primaryPressed: {
    backgroundColor: colors.primaryPressed,
    borderColor: colors.primaryPressed,
  },

  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
  },

  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },

  neutralPressed: {
    backgroundColor: colors.surfaceMuted,
  },

  disabled: {
    opacity: 0.55,
  },

  label: {
    fontSize: typography.body,
    fontWeight: '700',
  },

  primaryLabel: {
    color: colors.white,
  },

  neutralLabel: {
    color: colors.primary,
  },
});