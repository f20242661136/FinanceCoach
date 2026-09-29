import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';

import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import {
  colors,
  layout,
  radii,
  spacing,
  typography,
} from '@/design/tokens';

type TextFieldProps =
  TextInputProps & {
    label: string;
    error?: string;
    helperText?: string;
    secure?: boolean;
    required?: boolean;
  };

export function TextField({
  label,
  error,
  helperText,
  secure = false,
  required = false,
  style,
  accessibilityLabel,
  accessibilityState,
  editable = true,
  multiline = false,
  ...props
}: TextFieldProps) {
  const [
    showSecureValue,
    setShowSecureValue,
  ] = useState(false);

  const isSecure =
    secure && !showSecureValue;

  const inputAccessibilityLabel =
    accessibilityLabel
    ?? (
      required
        ? `${label}, required`
        : label
    );

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>
        {label}
        {required ? (
          <Text style={styles.required}>
            {' *'}
          </Text>
        ) : null}
      </Text>

      <View
        style={[
          styles.fieldContainer,
          multiline
            && styles.multilineContainer,
          error
            && styles.fieldError,
          !editable
            && styles.fieldDisabled,
        ]}
      >
        <TextInput
          {...props}
          accessibilityLabel={
            inputAccessibilityLabel
          }
          accessibilityState={{
            ...accessibilityState,
            disabled: !editable,
          }}
          editable={editable}
          multiline={multiline}
          placeholderTextColor={
            colors.textTertiary
          }
          selectionColor={
            colors.focus
          }
          secureTextEntry={isSecure}
          style={[
            styles.input,
            multiline
              && styles.multilineInput,
            style,
          ]}
        />

        {secure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              showSecureValue
                ? 'Hide password'
                : 'Show password'
            }
            accessibilityState={{
              disabled: !editable,
            }}
            disabled={!editable}
            hitSlop={8}
            onPress={() =>
              setShowSecureValue(
                current => !current,
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
              color={
                editable
                  ? colors.textSecondary
                  : colors.textTertiary
              }
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
    color:
      colors.text,
    fontSize:
      typography.small,
    lineHeight:
      typography.lineHeightSmall,
    fontWeight:
      typography.weightBold,
  },

  required: {
    color:
      colors.danger,
  },

  fieldContainer: {
    minHeight:
      layout.touchTarget + 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor:
      colors.surface,
    borderWidth: 1,
    borderColor:
      colors.border,
    borderRadius:
      radii.md,
  },

  multilineContainer: {
    alignItems: 'flex-start',
  },

  fieldError: {
    borderColor:
      colors.danger,
  },

  fieldDisabled: {
    backgroundColor:
      colors.surfaceMuted,
  },

  input: {
    flex: 1,
    minHeight:
      layout.touchTarget,
    paddingHorizontal:
      spacing.md,
    paddingVertical:
      spacing.sm,
    color:
      colors.text,
    fontSize:
      typography.body,
    lineHeight:
      typography.lineHeightBody,
  },

  multilineInput: {
    minHeight: 108,
    textAlignVertical: 'top',
  },

  iconButton: {
    minWidth:
      layout.touchTarget,
    minHeight:
      layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },

  error: {
    color:
      colors.danger,
    fontSize:
      typography.caption,
    lineHeight:
      typography.lineHeightCaption,
  },

  helper: {
    color:
      colors.textSecondary,
    fontSize:
      typography.caption,
    lineHeight:
      typography.lineHeightCaption,
  },
});