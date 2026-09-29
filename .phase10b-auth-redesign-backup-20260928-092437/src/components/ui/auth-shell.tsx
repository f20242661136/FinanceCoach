import type {
  ReactNode,
} from 'react';

import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  colors,
  elevation,
  layout,
  radii,
  spacing,
  typography,
} from '@/design/tokens';

import {
  BrandMark,
} from './brand-mark';

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
            : 'height'
        }
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={
            styles.scrollContent
          }
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === 'ios'
              ? 'interactive'
              : 'on-drag'
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <BrandMark />

            <View style={styles.hero}>
              <View style={styles.eyebrowPill}>
                <Text style={styles.eyebrow}>
                  {eyebrow}
                </Text>
              </View>

              <Text
                accessibilityRole="header"
                style={styles.title}
              >
                {title}
              </Text>

              <Text style={styles.subtitle}>
                {subtitle}
              </Text>

              <View style={styles.trustRow}>
                <View style={styles.trustDot} />

                <Text style={styles.trustText}>
                  Private by design. Your financial data stays protected.
                </Text>
              </View>
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
    backgroundColor:
      colors.background,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal:
      layout.screenHorizontalPadding,
    paddingTop:
      spacing.md,
    paddingBottom:
      spacing.xl,
  },

  content: {
    width: '100%',
    maxWidth:
      layout.contentMaxWidth,
    alignSelf: 'center',
    gap:
      spacing.lg,
  },

  hero: {
    gap:
      spacing.md,
    padding:
      spacing.lg,
    borderRadius:
      radii.xl,
    borderWidth: 1,
    borderColor:
      colors.accentStrong,
    backgroundColor:
      colors.primarySoft,
  },

  eyebrowPill: {
    alignSelf: 'flex-start',
    paddingHorizontal:
      spacing.sm,
    paddingVertical:
      spacing.xs,
    borderRadius:
      radii.pill,
    backgroundColor:
      colors.surface,
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
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  title: {
    color:
      colors.text,
    fontSize:
      typography.title,
    lineHeight:
      typography.lineHeightTitle,
    fontWeight:
      typography.weightExtraBold,
    letterSpacing: -0.8,
  },

  subtitle: {
    color:
      colors.textSecondary,
    fontSize:
      typography.body,
    lineHeight:
      typography.lineHeightBody,
  },

  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap:
      spacing.sm,
  },

  trustDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor:
      colors.success,
  },

  trustText: {
    flex: 1,
    color:
      colors.textSecondary,
    fontSize:
      typography.caption,
    lineHeight:
      typography.lineHeightCaption,
  },

  card: {
    gap:
      spacing.md,
    padding:
      spacing.lg,
    backgroundColor:
      colors.surface,
    borderRadius:
      radii.xl,
    borderWidth: 1,
    borderColor:
      colors.border,
    ...elevation.card,
  },

  footer: {
    paddingHorizontal:
      spacing.sm,
    paddingBottom:
      spacing.sm,
  },
});