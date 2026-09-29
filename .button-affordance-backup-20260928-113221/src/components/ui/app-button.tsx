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
  layout,
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
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
  ...props
}: AppButtonProps) {
  const isDisabled =
    Boolean(disabled) || loading;

  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel ?? label
      }
      accessibilityHint={
        accessibilityHint
      }
      accessibilityState={{
        ...accessibilityState,
        disabled: isDisabled,
        busy: loading,
      }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        fullWidth && styles.fullWidth,
        variant === 'primary'
          && styles.primary,
        variant === 'secondary'
          && styles.secondary,
        variant === 'ghost'
          && styles.ghost,
        variant === 'danger'
          && styles.danger,
        pressed
          && !isDisabled
          && variant === 'primary'
          && styles.primaryPressed,
        pressed
          && !isDisabled
          && variant === 'danger'
          && styles.dangerPressed,
        pressed
          && !isDisabled
          && variant !== 'primary'
          && variant !== 'danger'
          && styles.neutralPressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === 'primary'
              || variant === 'danger'
              ? colors.textOnPrimary
              : colors.primary
          }
        />
      ) : (
        <>
          {icon ? (
            <Ionicons
              name={icon}
              size={18}
              color={
                variant === 'primary'
                  || variant === 'danger'
                  ? colors.textOnPrimary
                  : colors.primary
              }
            />
          ) : null}

          <Text
            numberOfLines={2}
            style={[
              styles.label,
              variant === 'primary'
                || variant === 'danger'
                ? styles.primaryLabel
                : styles.neutralLabel,
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
    minHeight: layout.touchTarget,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
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
    backgroundColor:
      colors.primaryPressed,
    borderColor:
      colors.primaryPressed,
  },

  secondary: {
    backgroundColor:
      colors.surface,
    borderColor:
      colors.borderStrong,
  },

  danger: {
    backgroundColor:
      colors.danger,
    borderColor:
      colors.danger,
  },

  dangerPressed: {
    opacity: 0.86,
  },

  ghost: {
    backgroundColor:
      'transparent',
    borderColor:
      'transparent',
  },

  neutralPressed: {
    backgroundColor:
      colors.surfaceMuted,
  },

  disabled: {
    opacity: 0.55,
  },

  label: {
    flexShrink: 1,
    textAlign: 'center',
    fontSize:
      typography.body,
    lineHeight:
      typography.lineHeightBody,
    fontWeight:
      typography.weightBold,
  },

  primaryLabel: {
    color:
      colors.textOnPrimary,
  },

  neutralLabel: {
    color:
      colors.primary,
  },
});