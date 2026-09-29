import Ionicons from '@expo/vector-icons/Ionicons';

import {
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';

import {
  colors,
  layout,
  radii,
  spacing,
  typography,
} from '@/design/tokens';

type ChoiceChipProps = {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  role?: 'button' | 'radio';
  onPress: () => void;
  accessibilityLabel?: string;
};

export function ChoiceChip({
  label,
  selected = false,
  disabled = false,
  icon,
  role = 'button',
  onPress,
  accessibilityLabel,
}: ChoiceChipProps) {
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={
        accessibilityLabel ?? label
      }
      accessibilityState={{
        selected,
        disabled,
      }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        selected && styles.selected,
        pressed
          && !disabled
          && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={16}
          color={
            selected
              ? colors.primary
              : colors.textSecondary
          }
        />
      ) : null}

      <Text
        numberOfLines={2}
        style={[
          styles.label,
          selected
            && styles.selectedLabel,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight:
      layout.touchTarget,
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap:
      spacing.xs,
    paddingHorizontal:
      spacing.md,
    paddingVertical:
      spacing.sm,
    borderWidth: 1,
    borderColor:
      colors.border,
    borderRadius:
      radii.pill,
    backgroundColor:
      colors.surface,
  },

  selected: {
    borderColor:
      colors.primary,
    backgroundColor:
      colors.primarySoft,
  },

  pressed: {
    opacity: 0.8,
  },

  disabled: {
    opacity: 0.5,
  },

  label: {
    flexShrink: 1,
    color:
      colors.textSecondary,
    fontSize:
      typography.small,
    lineHeight:
      typography.lineHeightSmall,
    fontWeight:
      typography.weightSemibold,
    textAlign: 'center',
  },

  selectedLabel: {
    color:
      colors.primary,
    fontWeight:
      typography.weightBold,
  },
});