import Ionicons from '@expo/vector-icons/Ionicons';

import {
  useMemo,
} from 'react';

import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useRouter,
} from 'expo-router';

import {
  AppButton,
} from '@/components/ui/app-button';

import {
  InlineNotice,
} from '@/components/ui/inline-notice';

import {
  StatePanel,
} from '@/components/ui/state-panel';

import {
  colors,
  elevation,
  layout,
  radii,
  spacing,
  typography,
} from '@/design/tokens';

import {
  toUserFacingError,
} from '@/lib/user-facing-error';

import {
  useMarkNotificationOpened,
  useNotificationCenter,
  useRefreshMyNotificationSchedule,
} from './notification-query';

function deviceTimezone(): string {
  try {
    return (
      Intl.DateTimeFormat()
        .resolvedOptions()
        .timeZone
      || 'UTC'
    );
  } catch {
    return 'UTC';
  }
}

function typeLabel(
  value: string,
): string {
  return value
    .replace(
      /_/g,
      ' ',
    )
    .replace(
      /\b\w/g,
      letter =>
        letter.toUpperCase(),
    );
}

function typeIcon(
  value: string,
): keyof typeof Ionicons.glyphMap {
  switch (value) {
    case 'bill_reminder':
      return 'receipt-outline';

    case 'budget_warning':
      return 'pie-chart-outline';

    case 'savings_reminder':
      return 'flag-outline';

    case 'loan_payment_reminder':
      return 'cash-outline';

    case 'rosca_contribution_reminder':
      return 'people-outline';

    case 'challenge_reminder':
    case 'streak_reminder':
      return 'trophy-outline';

    case 'ai_insight':
      return 'sparkles-outline';

    default:
      return 'notifications-outline';
  }
}

function statusTone(
  status: string,
): 'normal' | 'warning' | 'danger' {
  if (status === 'failed') {
    return 'danger';
  }

  if (status === 'pending') {
    return 'warning';
  }

  return 'normal';
}

export function NotificationCenterScreen() {
  const router =
    useRouter();

  const timezone =
    useMemo(
      () =>
        deviceTimezone(),
      [],
    );

  const query =
    useNotificationCenter();

  const refreshSchedule =
    useRefreshMyNotificationSchedule();

  const markOpened =
    useMarkNotificationOpened();

  const items =
    query.data
    ?? [];

  const unreadCount =
    items.filter(
      item =>
        !item.opened,
    ).length;

  async function refresh() {
    await refreshSchedule
      .mutateAsync(
        timezone,
      );

    await query.refetch();
  }

  async function openNotification(
    id: string,
    deepLink: string | null,
  ) {
    try {
      await markOpened
        .mutateAsync(
          id,
        );
    } catch {
      // Navigation should remain usable if acknowledgement fails.
    }

    if (
      deepLink
      && deepLink.startsWith(
        '/',
      )
      && !deepLink.startsWith(
        '//',
      )
    ) {
      router.push(
        deepLink as never,
      );
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={
        styles.content
      }
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={
            query.isRefetching
            || refreshSchedule.isPending
          }
          onRefresh={() => {
            void refresh();
          }}
        />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>
              NOTIFICATIONS
            </Text>

            <Text
              accessibilityRole="header"
              style={styles.title}
            >
              Your reminders
            </Text>

            <Text style={styles.subtitle}>
              Useful reminders based on trusted app data and the notification preferences you choose.
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notification settings"
            onPress={() => {
              router.push(
                '/notification-settings' as never,
              );
            }}
            style={({ pressed }) => [
              styles.settingsButton,
              pressed
                ? styles.settingsButtonPressed
                : null,
            ]}
          >
            <Ionicons
              name="settings-outline"
              size={20}
              color={
                colors.primary
              }
            />
          </Pressable>
        </View>

        {!query.isLoading
        && !query.error ? (
          <View style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {items.length}
              </Text>

              <Text style={styles.summaryLabel}>
                Total
              </Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryItem}>
              <Text
                style={[
                  styles.summaryValue,
                  unreadCount > 0
                    ? styles.summaryUnread
                    : null,
                ]}
              >
                {unreadCount}
              </Text>

              <Text style={styles.summaryLabel}>
                Unread
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      {refreshSchedule.error ? (
        <InlineNotice
          tone="error"
          message={
            toUserFacingError(
              refreshSchedule.error,
              'notifications',
            )
          }
        />
      ) : null}

      {query.isLoading
      && !query.data ? (
        <StatePanel
          loading
          title="Loading reminders"
          description="Checking your notification center."
        />
      ) : null}

      {query.error
      && !query.data ? (
        <StatePanel
          title="Notifications unavailable"
          description={
            toUserFacingError(
              query.error,
              'notifications',
            )
          }
          icon="alert-circle-outline"
          tone="danger"
          action={
            <AppButton
              label="Try again"
              variant="secondary"
              fullWidth={false}
              onPress={() => {
                void query.refetch();
              }}
            />
          }
        />
      ) : null}

      {!query.isLoading
      && !query.error
      && items.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="notifications-off-outline"
              size={26}
              color={
                colors.primary
              }
            />
          </View>

          <Text style={styles.emptyTitle}>
            Nothing needs your attention
          </Text>

          <Text style={styles.emptyBody}>
            Finance Coach creates reminders only when trusted app data and your preferences say they are useful.
          </Text>

          <AppButton
            label="Review notification settings"
            variant="secondary"
            icon="settings-outline"
            onPress={() => {
              router.push(
                '/notification-settings' as never,
              );
            }}
          />
        </View>
      ) : null}

      {items.length > 0 ? (
        <View style={styles.list}>
          {items.map(
            item => {
              const tone =
                statusTone(
                  item.status,
                );

              return (
                <Pressable
                  key={
                    item.id
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`${item.opened ? 'Read' : 'Unread'} notification: ${item.title}`}
                  onPress={() => {
                    void openNotification(
                      item.id,
                      item.deep_link,
                    );
                  }}
                  style={({ pressed }) => [
                    styles.card,
                    item.opened
                      ? styles.cardOpened
                      : styles.cardUnread,
                    pressed
                      ? styles.cardPressed
                      : null,
                  ]}
                >
                  <View
                    style={[
                      styles.notificationIcon,
                      tone === 'warning'
                        ? styles.notificationIconWarning
                        : null,
                      tone === 'danger'
                        ? styles.notificationIconDanger
                        : null,
                    ]}
                  >
                    <Ionicons
                      name={
                        typeIcon(
                          item.notification_type,
                        )
                      }
                      size={20}
                      color={
                        tone === 'danger'
                          ? colors.danger
                          : tone === 'warning'
                            ? colors.warning
                            : colors.primary
                      }
                    />
                  </View>

                  <View style={styles.cardCopy}>
                    <View style={styles.cardHeader}>
                      <Text
                        numberOfLines={1}
                        style={styles.typeText}
                      >
                        {typeLabel(
                          item.notification_type,
                        )}
                      </Text>

                      {!item.opened ? (
                        <View
                          accessibilityLabel="Unread"
                          style={styles.unreadDot}
                        />
                      ) : null}
                    </View>

                    <Text
                      numberOfLines={2}
                      style={styles.cardTitle}
                    >
                      {item.title}
                    </Text>

                    <Text
                      numberOfLines={3}
                      style={styles.cardBody}
                    >
                      {item.body}
                    </Text>

                    <View style={styles.cardFooter}>
                      <Text style={styles.cardDate}>
                        {new Date(
                          item.scheduled_for,
                        ).toLocaleString()}
                      </Text>

                      <View
                        style={[
                          styles.statusPill,
                          tone === 'warning'
                            ? styles.statusPillWarning
                            : null,
                          tone === 'danger'
                            ? styles.statusPillDanger
                            : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            tone === 'warning'
                              ? styles.statusTextWarning
                              : null,
                            tone === 'danger'
                              ? styles.statusTextDanger
                              : null,
                          ]}
                        >
                          {item.status}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {item.deep_link ? (
                    <Ionicons
                      name="chevron-forward-outline"
                      size={18}
                      color={
                        colors.textTertiary
                      }
                    />
                  ) : null}
                </Pressable>
              );
            },
          )}
        </View>
      ) : null}

      <View style={styles.privacyCard}>
        <View style={styles.privacyIcon}>
          <Ionicons
            name="lock-closed-outline"
            size={20}
            color={
              colors.primary
            }
          />
        </View>

        <View style={styles.privacyCopy}>
          <Text style={styles.privacyTitle}>
            Privacy-conscious reminders
          </Text>

          <Text style={styles.privacyBody}>
            Lock-screen reminder text is intentionally generic and avoids sensitive balances, merchant names, and other detailed financial values by default.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor:
        colors.background,
    },

    content: {
      flexGrow: 1,
      width: '100%',
      maxWidth:
        layout.contentMaxWidth,
      alignSelf: 'center',
      gap:
        spacing.lg,
      paddingHorizontal:
        layout.screenHorizontalPadding,
      paddingTop:
        spacing.lg,
      paddingBottom:
        spacing.xl,
    },

    header: {
      gap:
        spacing.lg,
    },

    headerTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap:
        spacing.md,
    },

    headerCopy: {
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
        typography.weightExtraBold,
      letterSpacing: 1.1,
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
      letterSpacing: -0.6,
    },

    subtitle: {
      maxWidth: 450,
      color:
        colors.textSecondary,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
    },

    settingsButton: {
      width:
        layout.touchTarget,
      height:
        layout.touchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius:
        radii.md,
      backgroundColor:
        colors.primarySoft,
    },

    settingsButtonPressed: {
      opacity: 0.82,
      transform: [
        {
          scale: 0.97,
        },
      ],
    },

    summaryCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding:
        spacing.md,
      borderRadius:
        radii.lg,
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        colors.surface,
      ...elevation.card,
    },

    summaryItem: {
      flex: 1,
      alignItems: 'center',
      gap:
        spacing.xxs,
    },

    summaryDivider: {
      width: 1,
      height: 34,
      backgroundColor:
        colors.border,
    },

    summaryValue: {
      color:
        colors.text,
      fontSize:
        typography.subheading,
      lineHeight:
        typography.lineHeightSubheading,
      fontWeight:
        typography.weightExtraBold,
    },

    summaryUnread: {
      color:
        colors.primary,
    },

    summaryLabel: {
      color:
        colors.textSecondary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    emptyCard: {
      alignItems: 'center',
      gap:
        spacing.sm,
      padding:
        spacing.xl,
      borderRadius:
        radii.xl,
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        colors.surface,
      ...elevation.card,
    },

    emptyIcon: {
      width: 56,
      height: 56,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius:
        radii.lg,
      backgroundColor:
        colors.primarySoft,
      marginBottom:
        spacing.xs,
    },

    emptyTitle: {
      color:
        colors.text,
      fontSize:
        typography.subheading,
      lineHeight:
        typography.lineHeightSubheading,
      fontWeight:
        typography.weightBold,
      textAlign: 'center',
    },

    emptyBody: {
      maxWidth: 390,
      color:
        colors.textSecondary,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      textAlign: 'center',
    },

    list: {
      gap:
        spacing.sm,
    },

    card: {
      minHeight: 112,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap:
        spacing.sm,
      padding:
        spacing.md,
      borderRadius:
        radii.lg,
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        colors.surface,
      ...elevation.card,
    },

    cardUnread: {
      borderColor:
        colors.accentStrong,
    },

    cardOpened: {
      opacity: 0.82,
    },

    cardPressed: {
      opacity: 0.72,
      transform: [
        {
          scale: 0.995,
        },
      ],
    },

    notificationIcon: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius:
        radii.md,
      backgroundColor:
        colors.primarySoft,
    },

    notificationIconWarning: {
      backgroundColor:
        colors.warningSurface,
    },

    notificationIconDanger: {
      backgroundColor:
        colors.dangerSurface,
    },

    cardCopy: {
      flex: 1,
      minWidth: 0,
    },

    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap:
        spacing.xs,
    },

    typeText: {
      flex: 1,
      color:
        colors.primary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight:
        typography.weightBold,
    },

    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor:
        colors.primary,
    },

    cardTitle: {
      marginTop:
        spacing.xs,
      color:
        colors.text,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightBold,
    },

    cardBody: {
      marginTop:
        spacing.xxs,
      color:
        colors.textSecondary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    cardFooter: {
      marginTop:
        spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      flexWrap: 'wrap',
      gap:
        spacing.xs,
    },

    cardDate: {
      flex: 1,
      color:
        colors.textTertiary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    statusPill: {
      paddingHorizontal:
        spacing.xs,
      paddingVertical:
        spacing.xxs,
      borderRadius:
        radii.pill,
      backgroundColor:
        colors.neutralSurface,
    },

    statusPillWarning: {
      backgroundColor:
        colors.warningSurface,
    },

    statusPillDanger: {
      backgroundColor:
        colors.dangerSurface,
    },

    statusText: {
      color:
        colors.neutral,
      fontSize: 10,
      lineHeight: 14,
      fontWeight:
        typography.weightBold,
      textTransform: 'uppercase',
    },

    statusTextWarning: {
      color:
        colors.warning,
    },

    statusTextDanger: {
      color:
        colors.danger,
    },

    privacyCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap:
        spacing.sm,
      padding:
        spacing.md,
      borderRadius:
        radii.lg,
      backgroundColor:
        colors.primarySoft,
    },

    privacyIcon: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius:
        radii.md,
      backgroundColor:
        colors.white,
    },

    privacyCopy: {
      flex: 1,
      gap:
        spacing.xxs,
    },

    privacyTitle: {
      color:
        colors.primary,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightBold,
    },

    privacyBody: {
      color:
        colors.textSecondary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },
  });