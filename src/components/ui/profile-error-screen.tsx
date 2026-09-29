import Ionicons from '@expo/vector-icons/Ionicons';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  colors,
  layout,
  radii,
  spacing,
  typography,
} from '@/design/tokens';
import { copy } from '@/i18n/copy';

import { AppButton } from './app-button';
import { BrandMark } from './brand-mark';

type ProfileErrorScreenProps = {
  detail?: string | null;
  onRetry: () => Promise<void>;
  onSignOut: () => Promise<void>;
};

export function ProfileErrorScreen({
  detail,
  onRetry,
  onSignOut,
}: ProfileErrorScreenProps) {
  return (
    <SafeAreaView
      edges={[
        'left',
        'right',
        'bottom',
      ]}
      style={styles.safeArea}
    >
      <View style={styles.content}>
        <BrandMark />

        <View style={styles.card}>
          <View style={styles.icon}>
            <Ionicons
              name="shield-checkmark-outline"
              size={30}
              color={colors.primary}
            />
          </View>

          <Text style={styles.title}>
            {copy.profileError.title}
          </Text>

          <Text style={styles.body}>
            {copy.profileError.body}
          </Text>

          {detail ? (
            <Text style={styles.detail}>
              {detail}
            </Text>
          ) : null}

          <View style={styles.actions}>
            <AppButton
              label={copy.common.retry}
              onPress={() => {
                void onRetry();
              }}
            />

            <AppButton
              label={copy.common.signOut}
              variant="secondary"
              onPress={() => {
                void onSignOut();
              }}
            />
          </View>
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
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    flex: 1,
    padding: spacing.lg,
    gap: spacing.xl,
  },

  card: {
    marginTop: 'auto',
    marginBottom: 'auto',
    padding: spacing.lg,
    gap: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  icon: {
    width: 54,
    height: 54,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: typography.weightExtraBold,
    lineHeight: typography.lineHeightHeading,
  },

  body: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: typography.lineHeightBody,
  },

  detail: {
    color: colors.danger,
    fontSize: typography.small,
    lineHeight: typography.lineHeightSmall,
  },

  actions: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
});