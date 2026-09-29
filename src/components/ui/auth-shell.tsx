import Ionicons from '@expo/vector-icons/Ionicons';

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

type AuthShellProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
};

function TrustPoint({
  icon,
  label,
}: {
  icon:
    keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.trustPoint}>
      <View style={styles.trustIcon}>
        <Ionicons
          name={icon}
          size={16}
          color={
            colors.textOnPrimary
          }
        />
      </View>

      <Text style={styles.trustLabel}>
        {label}
      </Text>
    </View>
  );
}

export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: AuthShellProps) {
  return (
    <SafeAreaView
      edges={[
        'left',
        'right',
        'bottom',
      ]}
      style={styles.safeArea}
    >
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
          <View style={styles.heroWrap}>
            <View style={styles.hero}>
              <View style={styles.brandRow}>
                <View style={styles.brandIcon}>
                  <Ionicons
                    name="wallet-outline"
                    size={23}
                    color={
                      colors.primary
                    }
                  />
                </View>

                <View style={styles.brandCopy}>
                  <Text style={styles.brandName}>
                    Finance Coach
                  </Text>

                  <Text style={styles.brandTagline}>
                    Money clarity, one step at a time.
                  </Text>
                </View>
              </View>

              <View style={styles.heroCopy}>
                <Text style={styles.eyebrow}>
                  {eyebrow}
                </Text>

                <Text
                  accessibilityRole="header"
                  style={styles.title}
                >
                  {title}
                </Text>

                <Text style={styles.subtitle}>
                  {subtitle}
                </Text>
              </View>

              <View style={styles.trustRow}>
                <TrustPoint
                  icon="shield-checkmark-outline"
                  label="Private account"
                />

                <TrustPoint
                  icon="checkmark-circle-outline"
                  label="Clear records"
                />
              </View>
            </View>
          </View>

          <View style={styles.formSection}>
            <View style={styles.formContent}>
              {children}

              {footer ? (
                <View style={styles.footer}>
                  {footer}
                </View>
              ) : null}
            </View>
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
      colors.primary,
  },

  scrollContent: {
    flexGrow: 1,
    backgroundColor:
      colors.primary,
  },

  heroWrap: {
    width: '100%',
    backgroundColor:
      colors.primary,
  },

  hero: {
    width: '100%',
    maxWidth:
      layout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal:
      layout.screenHorizontalPadding,
    paddingTop:
      spacing.md,
    paddingBottom:
      spacing.xl,
    gap:
      spacing.xl,
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap:
      spacing.sm,
  },

  brandIcon: {
    width: 44,
    height: 44,
    borderRadius:
      radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      colors.white,
  },

  brandCopy: {
    flex: 1,
    minWidth: 0,
  },

  brandName: {
    color:
      colors.textOnPrimary,
    fontSize:
      typography.body,
    lineHeight:
      typography.lineHeightBody,
    fontWeight:
      typography.weightExtraBold,
  },

  brandTagline: {
    color:
      colors.accentStrong,
    fontSize:
      typography.caption,
    lineHeight:
      typography.lineHeightCaption,
  },

  heroCopy: {
    gap:
      spacing.sm,
  },

  eyebrow: {
    color:
      colors.accentStrong,
    fontSize:
      typography.caption,
    lineHeight:
      typography.lineHeightCaption,
    fontWeight:
      typography.weightBold,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },

  title: {
    color:
      colors.textOnPrimary,
    fontSize:
      typography.title,
    lineHeight:
      typography.lineHeightTitle,
    fontWeight:
      typography.weightExtraBold,
    letterSpacing: -0.9,
  },

  subtitle: {
    color:
      colors.accent,
    fontSize:
      typography.body,
    lineHeight:
      typography.lineHeightBody,
  },

  trustRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap:
      spacing.sm,
  },

  trustPoint: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap:
      spacing.xs,
    paddingHorizontal:
      spacing.sm,
    paddingVertical:
      spacing.xs,
    borderRadius:
      radii.pill,
    borderWidth: 1,
    borderColor:
      colors.focus,
  },

  trustIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      colors.focus,
  },

  trustLabel: {
    color:
      colors.textOnPrimary,
    fontSize:
      typography.caption,
    lineHeight:
      typography.lineHeightCaption,
    fontWeight:
      typography.weightSemibold,
  },

  formSection: {
    flexGrow: 1,
    backgroundColor:
      colors.background,
    borderTopLeftRadius:
      radii.xl,
    borderTopRightRadius:
      radii.xl,
    ...elevation.floating,
  },

  formContent: {
    width: '100%',
    maxWidth:
      layout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal:
      layout.screenHorizontalPadding,
    paddingTop:
      spacing.lg,
    paddingBottom:
      spacing.xl,
    gap:
      spacing.lg,
  },

  footer: {
    paddingTop:
      spacing.xs,
  },
});