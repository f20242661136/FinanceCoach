import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useState } from 'react';

import {
  colors,
  layout,
  radii,
  spacing,
  typography,
} from '@/design/tokens';

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
  helperText?: string;
  secure?: boolean;
};

export function TextField({
  label,
  error,
  helperText,
  secure = false,
  ...props
}: TextFieldProps) {
  const [showSecureValue, setShowSecureValue] =
    useState(false);

  const isSecure =
    secure && !showSecureValue;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>
        {label}
      </Text>

      <View
        style={[
          styles.fieldContainer,
          error && styles.fieldError,
        ]}
      >
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={
            colors.textTertiary
          }
          selectionColor={colors.focus}
          secureTextEntry={isSecure}
          style={styles.input}
          {...props}
        />

        {secure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              showSecureValue
                ? 'Hide password'
                : 'Show password'
            }
            hitSlop={8}
            onPress={() =>
              setShowSecureValue(
                (current) => !current,
              )
            }
            style={styles.iconButton}
          >
            <Ionicons
              name={
                showSecureValue
                  ? 'eye-off-outline'
                  : 'eye-outline'
              }
              size={21}
              color={colors.textSecondary}
            />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          style={styles.error}
        >
          {error}
        </Text>
      ) : helperText ? (
        <Text style={styles.helper}>
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },

  label: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: '700',
  },

  fieldContainer: {
    minHeight: layout.touchTarget + 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
  },

  fieldError: {
    borderColor: colors.danger,
  },

  input: {
    flex: 1,
    minHeight: layout.touchTarget,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: typography.body,
  },

  iconButton: {
    minWidth: layout.touchTarget,
    minHeight: layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },

  error: {
    color: colors.danger,
    fontSize: typography.caption,
    lineHeight: 18,
  },

  helper: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    lineHeight: 18,
  },
});