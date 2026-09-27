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

type AppSectionHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

export function AppSectionHeader({
  title,
  subtitle,
  action,
}: AppSectionHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.copy}>
        <Text style={styles.title}>
          {title}
        </Text>

        {subtitle ? (
          <Text style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent:
      'space-between',
    gap: spacing.md,
  },

  copy: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xxs,
  },

  title: {
    color: colors.text,
    fontSize:
      typography.subheading,
    lineHeight:
      typography.lineHeightSubheading,
    fontWeight:
      typography.weightBold,
  },

  subtitle: {
    color:
      colors.textSecondary,
    fontSize:
      typography.small,
    lineHeight:
      typography.lineHeightSmall,
  },
});
