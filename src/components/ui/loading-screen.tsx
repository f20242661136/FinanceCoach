import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  colors,
  spacing,
  typography,
} from '@/design/tokens';
import { copy } from '@/i18n/copy';

import { BrandMark } from './brand-mark';

export function LoadingScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <BrandMark />

        <View style={styles.loader}>
          <ActivityIndicator
            size="small"
            color={colors.primary}
          />

          <Text style={styles.message}>
            {copy.common.loading}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },

  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },

  message: {
    color: colors.textSecondary,
    fontSize: typography.small,
  },
});