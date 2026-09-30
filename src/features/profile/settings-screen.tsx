import Ionicons from '@expo/vector-icons/Ionicons';

import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useState,
} from 'react';

import {
  useRouter,
} from 'expo-router';

import {
  AppButton,
} from '@/components/ui/app-button';

import {
  AppCard,
} from '@/components/ui/app-card';

import {
  AppScreen,
} from '@/components/ui/app-screen';

import {
  AppScreenHeader,
} from '@/components/ui/app-screen-header';

import {
  InlineNotice,
} from '@/components/ui/inline-notice';

import {
  colors,
  layout,
  radii,
  spacing,
  typography,
} from '@/design/tokens';

import {
  useAuth,
} from '@/features/auth/auth-context';

import {
  toUserFacingError,
} from '@/lib/user-facing-error';

type SettingsLinkProps = {
  icon:
    keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
};

function SettingsLink({
  icon,
  title,
  description,
  onPress,
}: SettingsLinkProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={
        description
      }
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingsLink,
        pressed
          && styles.settingsLinkPressed,
      ]}
    >
      <View style={styles.linkIcon}>
        <Ionicons
          name={icon}
          size={21}
          color={
            colors.primary
          }
        />
      </View>

      <View style={styles.linkCopy}>
        <Text style={styles.linkTitle}>
          {title}
        </Text>

        <Text style={styles.linkDescription}>
          {description}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward-outline"
        size={20}
        color={
          colors.textTertiary
        }
      />
    </Pressable>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>
        {label}
      </Text>

      <Text
        numberOfLines={2}
        style={styles.detailValue}
      >
        {value}
      </Text>
    </View>
  );
}

export function SettingsScreen() {
  const router =
    useRouter();

  const {
    session,
    profile,
    signOut,
  } = useAuth();

  const [
    isSigningOut,
    setIsSigningOut,
  ] = useState(false);

  const [
    signOutError,
    setSignOutError,
  ] = useState<string | null>(
    null,
  );

  const displayName =
    profile?.display_name
      ?.trim()
    || 'Finance Coach member';

  const email =
    session?.user.email
    || 'Email unavailable';

  const signOutNow =
    async () => {
      setIsSigningOut(true);
      setSignOutError(null);

      try {
        await signOut();
      } catch (error) {
        setSignOutError(
          toUserFacingError(
            error,
            'generic',
          ),
        );
      } finally {
        setIsSigningOut(false);
      }
    };

  const requestSignOut =
    () => {
      Alert.alert(
        'Log out of Finance Coach?',
        'This ends your session on this device. You will need to sign in again to continue.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Log out',
            style: 'destructive',
            onPress: () => {
              void signOutNow();
            },
          },
        ],
      );
    };

  return (
    <AppScreen
      header={
        <AppScreenHeader
          eyebrow="Your workspace"
          title="Settings"
          subtitle="Manage your account, preferences, Premium access, privacy, and session."
        />
      }
    >
      <AppCard style={styles.profileCard}>
        <View style={styles.profileTop}>
          <View style={styles.avatar}>
            <Ionicons
              name="person-outline"
              size={28}
              color={
                colors.primary
              }
            />
          </View>

          <View style={styles.profileCopy}>
            <Text style={styles.profileName}>
              {displayName}
            </Text>

            <Text
              numberOfLines={2}
              style={styles.profileEmail}
            >
              {email}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <DetailRow
          label="Base currency"
          value={
            profile
              ?.base_currency_code
            || 'Not set'
          }
        />

        <DetailRow
          label="Locale"
          value={
            profile?.locale
            || 'Not set'
          }
        />

        <DetailRow
          label="Timezone"
          value={
            profile?.timezone
            || 'Not set'
          }
        />
      </AppCard>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Preferences
        </Text>

        <Text style={styles.sectionBody}>
          Choose how Finance Coach looks and how it communicates with you.
        </Text>

        <AppCard style={styles.linksCard}>
          <View style={styles.appearanceRow}>
            <View style={styles.linkIcon}>
              <Ionicons
                name="contrast-outline"
                size={21}
                color={colors.primary}
              />
            </View>

            <View style={styles.linkCopy}>
              <View style={styles.appearanceTitleRow}>
                <Text style={styles.linkTitle}>
                  Appearance
                </Text>

                <View style={styles.appearanceStatus}>
                  <Text style={styles.appearanceStatusText}>
                    Light
                  </Text>
                </View>
              </View>

              <Text style={styles.linkDescription}>
                System, Light, and Dark will be available in the dedicated Appearance phase.
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <SettingsLink
            icon="notifications-outline"
            title="Notifications"
            description="Choose reminders, alerts, and quiet hours."
            onPress={() => {
              router.push(
                '/notification-settings' as never,
              );
            }}
          />

          <View style={styles.divider} />

          <SettingsLink
            icon="card-outline"
            title="Finance Coach Premium"
            description="Review access, restore purchases, and manage billing."
            onPress={() => {
              router.push(
                '/subscription' as never,
              );
            }}
          />
        </AppCard>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Privacy and security
        </Text>
        <SettingsLink icon="lock-closed-outline" title="App lock & privacy" description="PIN, biometrics, auto-lock, recovery code, and privacy mode." onPress={() => router.push('/security' as never)} />

        <AppCard
          tone="muted"
          style={styles.infoCard}
        >
          <View style={styles.infoRow}>
            <Ionicons
              name="shield-checkmark-outline"
              size={22}
              color={
                colors.primary
              }
            />

            <Text style={styles.infoText}>
              Finance Coach uses your authenticated account for server-confirmed financial records and supports secure local-first entry where available.
            </Text>
          </View>
        </AppCard>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Account and session
        </Text>

        <AppCard style={styles.sessionCard}>
          <Text style={styles.sessionTitle}>
            Log out on this device
          </Text>

          <Text style={styles.sessionBody}>
            Use this when you are finished or want to sign in with another Finance Coach account.
          </Text>

          {signOutError ? (
            <InlineNotice
              tone="error"
              message={
                signOutError
              }
            />
          ) : null}

          <AppButton
            label="Log out"
            variant="danger"
            icon="log-out-outline"
            loading={
              isSigningOut
            }
            disabled={
              isSigningOut
            }
            onPress={
              requestSignOut
            }
          />
        </AppCard>
      </View>

      <Text style={styles.footer}>
        Finance Coach
      </Text>
    </AppScreen>
  );
}

const styles =
  StyleSheet.create({
    profileCard: {
      gap:
        spacing.lg,
      padding:
        spacing.lg,
      backgroundColor:
        colors.primary,
      borderColor:
        colors.primary,
    },

    profileTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap:
        spacing.md,
    },

    avatar: {
      width: 54,
      height: 54,
      borderRadius:
        radii.lg,
      alignItems: 'center',
      justifyContent:
        'center',
      backgroundColor:
        colors.primaryPressed,
      borderWidth: 1,
      borderColor:
        colors.accentStrong,
    },

    profileCopy: {
      flex: 1,
      minWidth: 0,
      gap:
        spacing.xxs,
    },

    profileName: {
      color:
        colors.textOnPrimary,
      fontSize:
        typography.subheading,
      lineHeight:
        typography.lineHeightSubheading,
      fontWeight:
        typography.weightExtraBold,
    },

    profileEmail: {
      color:
        colors.accent,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
    },

    detailRow: {
      minHeight:
        layout.touchTarget,
      flexDirection: 'row',
      alignItems:
        'flex-start',
      justifyContent:
        'space-between',
      gap:
        spacing.md,
      paddingVertical:
        spacing.sm,
    },

    detailLabel: {
      color:
        colors.accentStrong,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
    },

    detailValue: {
      flex: 1,
      color:
        colors.textOnPrimary,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightBold,
      textAlign:
        'right',
    },

    divider: {
      height:
        StyleSheet.hairlineWidth,
      backgroundColor:
        colors.border,
    },

    section: {
      gap:
        spacing.sm,
    },

    sectionTitle: {
      color:
        colors.text,
      fontSize:
        typography.subheading,
      lineHeight:
        typography.lineHeightSubheading,
      fontWeight:
        typography.weightBold,
    },

    sectionBody: {
      color:
        colors.textSecondary,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
    },

    linksCard: {
      padding: 0,
      overflow:
        'hidden',
    },

    settingsLink: {
      minHeight: 82,
      flexDirection: 'row',
      alignItems: 'center',
      gap:
        spacing.md,
      padding:
        spacing.md,
      backgroundColor:
        colors.surface,
    },

    settingsLinkPressed: {
      backgroundColor:
        colors.primarySoft,
      transform: [
        {
          scale: 0.995,
        },
      ],
    },

    linkIcon: {
      width: 42,
      height: 42,
      borderRadius:
        radii.md,
      alignItems: 'center',
      justifyContent:
        'center',
      backgroundColor:
        colors.primarySoft,
      borderWidth: 1,
      borderColor:
        colors.accentStrong,
    },

    linkCopy: {
      flex: 1,
      minWidth: 0,
      gap:
        spacing.xxs,
    },

    linkTitle: {
      color:
        colors.text,
      fontSize:
        typography.body,
      lineHeight:
        typography.lineHeightBody,
      fontWeight:
        typography.weightBold,
    },

    linkDescription: {
      color:
        colors.textSecondary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },


    appearanceRow: {
      minHeight: 82,
      flexDirection: 'row',
      alignItems: 'center',
      gap:
        spacing.md,
      padding:
        spacing.md,
      backgroundColor:
        colors.surfaceMuted,
    },

    appearanceTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap:
        spacing.xs,
    },

    appearanceStatus: {
      paddingHorizontal:
        spacing.sm,
      paddingVertical:
        spacing.xxs,
      borderRadius:
        radii.pill,
      backgroundColor:
        colors.surface,
      borderWidth: 1,
      borderColor:
        colors.borderStrong,
    },

    appearanceStatusText: {
      color:
        colors.textSecondary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight:
        typography.weightBold,
    },
    infoCard: {
      gap:
        spacing.md,
    },

    infoRow: {
      flexDirection: 'row',
      alignItems:
        'flex-start',
      gap:
        spacing.sm,
    },

    infoText: {
      flex: 1,
      color:
        colors.textSecondary,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
    },

    sessionCard: {
      gap:
        spacing.md,
      borderColor:
        colors.danger,
    },

    sessionTitle: {
      color:
        colors.text,
      fontSize:
        typography.body,
      lineHeight:
        typography.lineHeightBody,
      fontWeight:
        typography.weightBold,
    },

    sessionBody: {
      color:
        colors.textSecondary,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
    },

    footer: {
      color:
        colors.textTertiary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      textAlign:
        'center',
      paddingHorizontal:
        spacing.sm,
    },
  });
