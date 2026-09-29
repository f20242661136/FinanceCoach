import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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

import { BrandMark } from './brand-mark';

type AuthShellProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: AuthShellProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={
            styles.scrollContent
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <BrandMark />

            <View style={styles.headingGroup}>
              <Text style={styles.eyebrow}>
                {eyebrow}
              </Text>

              <Text style={styles.title}>
                {title}
              </Text>

              <Text style={styles.subtitle}>
                {subtitle}
              </Text>
            </View>

            <View style={styles.card}>
              {children}
            </View>

            {footer ? (
              <View style={styles.footer}>
                {footer}
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },

  content: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    gap: spacing.xl,
  },

  headingGroup: {
    gap: spacing.sm,
  },

  eyebrow: {
    color: colors.success,
    fontSize: typography.small,
    fontWeight: typography.weightExtraBold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  title: {
    color: colors.text,
    fontSize: typography.title,
    lineHeight: typography.lineHeightTitle,
    fontWeight: '800',
    letterSpacing: -0.8,
  },

  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: typography.lineHeightBody,
  },

  card: {
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },

  footer: {
    paddingBottom: spacing.lg,
  },
});