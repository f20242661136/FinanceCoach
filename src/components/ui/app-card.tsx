import type {
  PropsWithChildren,
} from 'react';

import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import {
  colors,
  elevation,
  layout,
  radii,
} from '@/design/tokens';

type AppCardTone =
  | 'default'
  | 'muted'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

type AppCardProps =
  PropsWithChildren<{
    tone?: AppCardTone;
    style?: StyleProp<ViewStyle>;
  }>;

export function AppCard({
  children,
  tone = 'default',
  style,
}: AppCardProps) {
  return (
    <View
      style={[
        styles.base,
        tone === 'muted'
          && styles.muted,
        tone === 'success'
          && styles.success,
        tone === 'warning'
          && styles.warning,
        tone === 'danger'
          && styles.danger,
        tone === 'info'
          && styles.info,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor:
      colors.surface,
    borderColor:
      colors.border,
    borderWidth: 1,
    borderRadius:
      radii.lg,
    padding:
      layout.cardPadding,
    ...elevation.card,
  },

  muted: {
    backgroundColor:
      colors.surfaceMuted,
  },

  success: {
    backgroundColor:
      colors.successSurface,
    borderColor:
      colors.accentStrong,
  },

  warning: {
    backgroundColor:
      colors.warningSurface,
  },

  danger: {
    backgroundColor:
      colors.dangerSurface,
  },

  info: {
    backgroundColor:
      colors.infoSurface,
  },
});
