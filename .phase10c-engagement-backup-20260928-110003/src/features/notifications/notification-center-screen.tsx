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
  colors,
  elevation,
  layout,
  radii,
  typography,
} from '@/design/tokens';

import {
  useRouter,
} from 'expo-router';

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
      (
        letter,
      ) =>
        letter.toUpperCase(),
    );
}


export function NotificationCenterScreen() {
  const router =
    useRouter();

  const timezone =
    useMemo(() => deviceTimezone(), []);

  const query =
    useNotificationCenter();

  const refreshSchedule =
    useRefreshMyNotificationSchedule();

  const markOpened =
    useMarkNotificationOpened();


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
      &&
      deepLink.startsWith(
        '/',
      )
      &&
      !deepLink.startsWith(
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
      style={
        styles.screen
      }
      contentContainerStyle={
        styles.content
      }
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
      <View
        style={
          styles.header
        }
      >
        <View
          style={
            styles.headerCopy
          }
        >
          <Text
            style={
              styles.eyebrow
            }
          >
            NOTIFICATIONS
          </Text>

          <Text
            style={
              styles.title
            }
          >
            Your reminders
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            router.push(
              '/notification-settings' as never,
            );
          }}
          style={
            styles.settingsButton
          }
        >
          <Text
            style={
              styles.settingsText
            }
          >
            Settings
          </Text>
        </Pressable>
      </View>


      {query.data?.length ? (
        <View
          style={
            styles.list
          }
        >
          {query.data.map(
            (
              item,
            ) => (
              <Pressable
                key={
                  item.id
                }
                accessibilityRole="button"
                onPress={() => {
                  void openNotification(
                    item.id,
                    item.deep_link,
                  );
                }}
                style={({ pressed }) => [
                  styles.card,

                  item.opened
                    ? styles.openedCard
                    : null,

                  pressed
                    ? styles.pressed
                    : null,
                ]}
              >
                <View
                  style={
                    styles.cardHeader
                  }
                >
                  <Text
                    style={
                      styles.typeText
                    }
                  >
                    {typeLabel(
                      item.notification_type,
                    )}
                  </Text>

                  <Text
                    style={
                      styles.statusText
                    }
                  >
                    {item.status}
                  </Text>
                </View>

                <Text
                  style={
                    styles.cardTitle
                  }
                >
                  {item.title}
                </Text>

                <Text
                  style={
                    styles.cardBody
                  }
                >
                  {item.body}
                </Text>

                <Text
                  style={
                    styles.cardDate
                  }
                >
                  {new Date(
                    item.scheduled_for,
                  ).toLocaleString()}
                </Text>
              </Pressable>
            ),
          )}
        </View>
      ) : (
        <View
          style={
            styles.emptyCard
          }
        >
          <Text
            style={
              styles.emptyTitle
            }
          >
            Nothing needs your attention
          </Text>

          <Text
            style={
              styles.emptyBody
            }
          >
            Pull to refresh. Finance Coach creates reminders only when trusted app data and your preferences say they are useful.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}


const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },

    content: {
      width: '100%',
      maxWidth: layout.contentMaxWidth,
      alignSelf: 'center',
      paddingHorizontal: layout.screenHorizontalPadding,
      paddingTop: 22,
      paddingBottom: 120,
    },

    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 18,
    },

    headerCopy: {
      flex: 1,
    },

    eyebrow: {
      color: colors.primary,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
      letterSpacing: 1.2,
    },

    title: {
      marginTop: 6,
      color: colors.text,
      fontSize: typography.title,
      fontWeight: typography.weightBold,
    },

    settingsButton: {
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: radii.sm,
      backgroundColor: colors.primarySoft,
    },

    settingsText: {
      color: colors.primary,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
    },

    list: {
      gap: 9,
    },

    card: {
      padding: 15,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      ...elevation.card
    },

    openedCard: {
      opacity: 0.76,
    },

    pressed: {
      opacity: 0.82,
      transform: [
        {
          scale: 0.995,
        },
      ],
    },

    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },

    typeText: {
      color: colors.primary,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
    },

    statusText: {
      color: colors.textTertiary,
      fontSize: typography.caption,
      textTransform: 'uppercase',
    },

    cardTitle: {
      marginTop: 7,
      color: colors.text,
      fontSize: typography.small,
      fontWeight: typography.weightBold,
    },

    cardBody: {
      marginTop: 4,
      color: colors.textSecondary,
      fontSize: typography.caption,
      lineHeight: 17,
    },

    cardDate: {
      marginTop: 9,
      color: colors.textTertiary,
      fontSize: typography.caption,
    },

    emptyCard: {
      padding: 18,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      ...elevation.card
    },

    emptyTitle: {
      color: colors.text,
      fontSize: typography.small,
      fontWeight: typography.weightBold,
    },

    emptyBody: {
      marginTop: 5,
      color: colors.textSecondary,
      fontSize: typography.caption,
      lineHeight: 17,
    },
  });