import Ionicons from '@expo/vector-icons/Ionicons';
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

type NoticeTone =
  | 'error'
  | 'success'
  | 'info';

type InlineNoticeProps = {
  message: string;
  tone?: NoticeTone;
};

export function InlineNotice({
  message,
  tone = 'info',
}: InlineNoticeProps) {
  const palette =
    tone === 'error'
      ? {
          background: colors.dangerSurface,
          foreground: colors.danger,
          icon: 'alert-circle-outline' as const,
        }
      : tone === 'success'
        ? {
            background:
              colors.successSurface,
            foreground: colors.success,
            icon:
              'checkmark-circle-outline' as const,
          }
        : {
            background: colors.infoSurface,
            foreground: colors.info,
            icon:
              'information-circle-outline' as const,
          };

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.container,
        {
          backgroundColor:
            palette.background,
        },
      ]}
    >
      <Ionicons
        name={palette.icon}
        size={20}
        color={palette.foreground}
      />

      <Text
        style={[
          styles.message,
          {
            color: palette.foreground,
          },
        ]}
      >
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
  },

  message: {
    flex: 1,
    fontSize: typography.small,
    lineHeight: 20,
    fontWeight: '600',
  },
});