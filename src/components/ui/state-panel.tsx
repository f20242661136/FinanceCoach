import Ionicons from '@expo/vector-icons/Ionicons';

import type {
  ReactNode,
} from 'react';

import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  colors,
  spacing,
  typography,
} from '@/design/tokens';

import {
  AppCard,
} from './app-card';

type StateTone =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

type StatePanelProps = {
  title?: string;
  description: string;
  icon?:
    keyof typeof Ionicons.glyphMap;
  tone?: StateTone;
  loading?: boolean;
  action?: ReactNode;
};

function toneColor(
  tone: StateTone,
) {
  if (tone === 'success') {
    return colors.success;
  }

  if (tone === 'warning') {
    return colors.warning;
  }

  if (tone === 'danger') {
    return colors.danger;
  }

  if (tone === 'info') {
    return colors.info;
  }

  return colors.textSecondary;
}

export function StatePanel({
  title,
  description,
  icon = 'information-circle-outline',
  tone = 'neutral',
  loading = false,
  action,
}: StatePanelProps) {
  const foreground =
    toneColor(tone);

  return (
    <AppCard>
      <View
        accessibilityLiveRegion="polite"
        style={styles.container}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={colors.primary}
          />
        ) : (
          <View style={styles.icon}>
            <Ionicons
              name={icon}
              size={28}
              color={foreground}
            />
          </View>
        )}

        {title ? (
          <Text style={styles.title}>
            {title}
          </Text>
        ) : null}

        <Text style={styles.description}>
          {description}
        </Text>

        {action}
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical:
      spacing.md,
  },

  icon: {
    minHeight: 32,
    justifyContent: 'center',
  },

  title: {
    color:
      colors.text,
    fontSize:
      typography.subheading,
    lineHeight:
      typography.lineHeightSubheading,
    fontWeight:
      typography.weightBold,
    textAlign: 'center',
  },

  description: {
    color:
      colors.textSecondary,
    fontSize:
      typography.small,
    lineHeight:
      typography.lineHeightSmall,
    textAlign: 'center',
  },
});
