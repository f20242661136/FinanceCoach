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

  const confirmSignOut =
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
        'Your encrypted local data remains on this device, but you will need to sign in again to continue.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Log out',
            style: 'destructive',
            onPress: () => {
              void confirmSignOut();
            },
          },
        ],
      );
    };

  return (
    <AppScreen
      header={
        <View style={styles.headerBlock}>
          <AppButton
            label="Back"
            icon="arrow-back-outline"
            variant="ghost"
            fullWidth={false}
            accessibilityHint="Return to the previous screen"
            onPress={() => {
              router.back();
            }}
          />

          <AppScreenHeader
            eyebrow="Your account"
            title="Settings"
            subtitle="Manage your profile, preferences, notifications, subscription, and session."
          />
        </View>
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

            <Text style={styles.profileEmail}>
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

        <AppCard style={styles.linksCard}>
          <SettingsLink
            icon="notifications-outline"
            title="Notifications"
            description="Choose which reminders and alerts Finance Coach can send."
            onPress={() => {
              router.push(
                '/notification-settings' as never,
              );
            }}
          />

          <View style={styles.divider} />

          <SettingsLink
            icon="card-outline"
            title="Subscription"
            description="Review Premium access, purchases, restore options, and billing."
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
          Session
        </Text>

        <AppCard style={styles.sessionCard}>
          <Text style={styles.sessionTitle}>
            Finished for now?
          </Text>

          <Text style={styles.sessionBody}>
            Logging out ends this Finance Coach session. You can sign back in with the same account later.
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
            label={
              isSigningOut
                ? 'Logging out...'
                : 'Log out'
            }
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
        Finance Coach keeps important financial calculations and ledger changes server-confirmed while supporting secure offline entry where available.
      </Text>
    </AppScreen>
  );
}

const styles =
  StyleSheet.create({
    headerBlock: {
      alignItems:
        'flex-start',
      gap:
        spacing.sm,
    },

    profileCard: {
      gap:
        spacing.md,
    },

    profileTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap:
        spacing.md,
    },

    avatar: {
      width: 52,
      height: 52,
      borderRadius:
        radii.md,
      alignItems: 'center',
      justifyContent:
        'center',
      backgroundColor:
        colors.primarySoft,
    },

    profileCopy: {
      flex: 1,
      minWidth: 0,
      gap:
        spacing.xxs,
    },

    profileName: {
      color:
        colors.text,
      fontSize:
        typography.subheading,
      lineHeight:
        typography.lineHeightSubheading,
      fontWeight:
        typography.weightBold,
    },

    profileEmail: {
      color:
        colors.textSecondary,
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
        colors.textSecondary,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
    },

    detailValue: {
      flex: 1,
      color:
        colors.text,
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

    linksCard: {
      padding: 0,
      overflow:
        'hidden',
    },

    settingsLink: {
      minHeight: 76,
      flexDirection: 'row',
      alignItems: 'center',
      gap:
        spacing.md,
      padding:
        spacing.md,
    },

    settingsLinkPressed: {
      backgroundColor:
        colors.surfaceMuted,
    },

    linkIcon: {
      width: 40,
      height: 40,
      borderRadius:
        radii.md,
      alignItems: 'center',
      justifyContent:
        'center',
      backgroundColor:
        colors.primarySoft,
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

    sessionCard: {
      gap:
        spacing.md,
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