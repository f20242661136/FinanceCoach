import type {
  ReactNode,
} from 'react';

import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  colors,
  spacing,
  typography,
} from '@/design/tokens';

type AppScreenHeaderProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  action?: ReactNode;
};

export function AppScreenHeader({
  title,
  subtitle,
  eyebrow,
  action,
}: AppScreenHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.copy}>
        {eyebrow ? (
          <Text style={styles.eyebrow}>
            {eyebrow}
          </Text>
        ) : null}

        <Text
          accessibilityRole="header"
          style={styles.title}
        >
          {title}
        </Text>

        {subtitle ? (
          <Text style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {action ? (
        <View style={styles.action}>
          {action}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent:
      'space-between',
    gap:
      spacing.md,
  },

  copy: {
    flex: 1,
    minWidth: 0,
    gap:
      spacing.xs,
  },

  eyebrow: {
    color:
      colors.primary,
    fontSize:
      typography.caption,
    lineHeight:
      typography.lineHeightCaption,
    fontWeight:
      typography.weightBold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  title: {
    color:
      colors.text,
    fontSize:
      typography.heading,
    lineHeight:
      typography.lineHeightHeading,
    fontWeight:
      typography.weightExtraBold,
    letterSpacing: -0.4,
  },

  subtitle: {
    color:
      colors.textSecondary,
    fontSize:
      typography.small,
    lineHeight:
      typography.lineHeightSmall,
  },

  action: {
    flexShrink: 0,
  },
});