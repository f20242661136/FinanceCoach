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
  ...props
}: AppButtonProps) {
  const isDisabled =
    Boolean(
      disabled
      || loading,
    );

  const foreground =
    variant === 'primary'
    || variant === 'danger'
      ? colors.textOnPrimary
      : colors.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{
        disabled:
          isDisabled,
        busy:
          loading,
      }}
      disabled={
        isDisabled
      }
      style={({
        pressed,
      }) => [
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

        pressed
        && !isDisabled
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
          color={
            foreground
          }
        />
      ) : (
        <>
          {icon ? (
            <Ionicons
              name={icon}
              size={19}
              color={
                foreground
              }
            />
          ) : null}

          <Text
            numberOfLines={2}
            style={[
              styles.label,

              variant === 'primary'
              || variant === 'danger'
                ? styles.inverseLabel
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

const styles =
  StyleSheet.create({
    base: {
      minHeight:
        Math.max(
          layout.touchTarget,
          52,
        ),
      paddingHorizontal:
        spacing.lg,
      paddingVertical: 14,
      borderRadius:
        radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap:
        spacing.sm,
      borderWidth: 1.5,
    },

    fullWidth: {
      width: '100%',
    },

    primary: {
      backgroundColor:
        colors.primary,
      borderColor:
        colors.primary,
      ...elevation.card,
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
        colors.primary,
      ...elevation.card,
    },

    secondaryPressed: {
      backgroundColor:
        colors.primarySoft,
      borderColor:
        colors.primaryPressed,
    },

    ghost: {
      backgroundColor:
        colors.primarySoft,
      borderColor:
        colors.borderStrong,
    },

    ghostPressed: {
      backgroundColor:
        colors.surfaceMuted,
      borderColor:
        colors.primary,
    },

    danger: {
      backgroundColor:
        colors.danger,
      borderColor:
        colors.danger,
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
      backgroundColor:
        colors.surfaceMuted,
      borderColor:
        colors.border,
      shadowOpacity: 0,
      elevation: 0,
    },

    label: {
      flexShrink: 1,
      fontSize:
        typography.body,
      lineHeight:
        typography.lineHeightBody,
      fontWeight:
        typography.weightExtraBold,
      textAlign: 'center',
    },

    inverseLabel: {
      color:
        colors.textOnPrimary,
    },

    primaryLabel: {
      color:
        colors.primary,
    },
  });