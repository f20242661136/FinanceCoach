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
import { copy } from '@/i18n/copy';

export function BrandMark() {
  return (
    <View style={styles.container}>
      <View style={styles.mark}>
        <Ionicons
          name="wallet-outline"
          size={24}
          color={colors.white}
        />
      </View>

      <View style={styles.copy}>
        <Text style={styles.name}>
          {copy.brand.name}
        </Text>

        <Text style={styles.tagline}>
          {copy.brand.tagline}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  mark: {
    width: 46,
    height: 46,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  copy: {
    flex: 1,
  },

  name: {
    color: colors.text,
    fontWeight: '800',
    fontSize: typography.body,
  },

  tagline: {
    marginTop: 2,
    color: colors.textSecondary,
    fontSize: typography.caption,
  },
});