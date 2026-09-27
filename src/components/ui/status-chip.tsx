import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  colors,
  radii,
  spacing,
  typography,
} from '@/design/tokens';

type StatusTone =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

type StatusChipProps = {
  label: string;
  tone?: StatusTone;
};

export function StatusChip({
  label,
  tone = 'neutral',
}: StatusChipProps) {
  return (
    <View
      accessibilityRole="text"
      style={[
        styles.base,
        tone === 'success'
          && styles.success,
        tone === 'warning'
          && styles.warning,
        tone === 'danger'
          && styles.danger,
        tone === 'info'
          && styles.info,
      ]}
    >
      <Text
        style={[
          styles.label,
          tone === 'success'
            && styles.successLabel,
          tone === 'warning'
            && styles.warningLabel,
          tone === 'danger'
            && styles.dangerLabel,
          tone === 'info'
            && styles.infoLabel,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius:
      radii.pill,
    paddingHorizontal:
      spacing.sm,
    paddingVertical:
      spacing.xs,
    backgroundColor:
      colors.neutralSurface,
  },

  label: {
    color:
      colors.neutral,
    fontSize:
      typography.caption,
    lineHeight:
      typography.lineHeightCaption,
    fontWeight:
      typography.weightBold,
  },

  success: {
    backgroundColor:
      colors.successSurface,
  },

  successLabel: {
    color:
      colors.success,
  },

  warning: {
    backgroundColor:
      colors.warningSurface,
  },

  warningLabel: {
    color:
      colors.warning,
  },

  danger: {
    backgroundColor:
      colors.dangerSurface,
  },

  dangerLabel: {
    color:
      colors.danger,
  },

  info: {
    backgroundColor:
      colors.infoSurface,
  },

  infoLabel: {
    color:
      colors.info,
  },
});
