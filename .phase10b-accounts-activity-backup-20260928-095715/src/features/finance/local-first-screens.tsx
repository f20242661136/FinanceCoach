import Ionicons from '@expo/vector-icons/Ionicons';


import {
  HomeSubscriptionCard,
} from '../subscriptions/home-subscription-card';






import {
  DashboardCommandCenter,
} from '../dashboard/dashboard-command-center';



import {
  SyncQueueBanner,
} from './sync-queue-banner';

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

import type {
  LocalAccountSummary,
  LocalActivityItem,
} from '../../offline/sync/local-finance-repository';

import {
  useLocalFinanceData,
} from '../../offline/sync/use-local-finance-data';



import {
  StatePanel,
} from '@/components/ui/state-panel';
import {
  StatusChip,
} from '@/components/ui/status-chip';
import {
  colors,
  elevation,
  layout,
  radii,
  spacing,
  typography,
} from '@/design/tokens';


const palette = {
  background: colors.background,
  surface: colors.surface,
  surfaceMuted: colors.surfaceMuted,
  text: colors.text,
  textMuted: colors.textSecondary,
  border: colors.border,
  primary: colors.primary,
  primaryPressed: colors.primaryPressed,
  positive: colors.success,
  negative: colors.danger,
  warningBackground: colors.warningSurface,
  warningText: colors.warning,
};


function groupDigits(
  value: string,
): string {
  return value.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ',',
  );
}


function formatMinor(
  value: string,
  currencyCode: string,
  minorUnit: number,
): string {
  const negative =
    value.startsWith('-');

  let digits =
    negative
      ? value.slice(1)
      : value;

  if (!/^\d+$/.test(digits)) {
    return `${currencyCode} ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â`;
  }

  if (minorUnit > 0) {
    digits =
      digits.padStart(
        minorUnit + 1,
        '0',
      );
  }

  const whole =
    minorUnit === 0
      ? digits
      : digits.slice(
          0,
          -minorUnit,
        );

  const fraction =
    minorUnit === 0
      ? ''
      : digits.slice(
          -minorUnit,
        );

  return `${
    negative ? '-' : ''
  }${currencyCode} ${groupDigits(
    whole || '0',
  )}${
    minorUnit > 0
      ? `.${fraction}`
      : ''
  }`;
}


function formatDate(
  value: string,
): string {
  const parsed =
    new Date(
      `${value}T00:00:00`,
    );

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return value;
  }

  return parsed.toLocaleDateString(
    undefined,
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    },
  );
}


function formatLastSync(
  value: string | null,
): string | null {
  if (!value) {
    return null;
  }

  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return null;
  }

  return parsed.toLocaleString(
    undefined,
    {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    },
  );
}


function activityTitle(
  item: LocalActivityItem,
): string {
  if (item.merchant?.trim()) {
    return item.merchant.trim();
  }

  if (item.description?.trim()) {
    return item.description.trim();
  }

  if (item.category_name?.trim()) {
    return item.category_name.trim();
  }

  if (item.type === 'income') {
    return 'Income';
  }

  if (item.type === 'expense') {
    return 'Expense';
  }

  if (item.type === 'transfer') {
    return 'Transfer';
  }

  return 'Adjustment';
}


function OfflineStatus({
  isShowingSavedData,
  lastSyncAt,
}: {
  isShowingSavedData: boolean;
  lastSyncAt: string | null;
}) {
  if (!isShowingSavedData) {
    return null;
  }

  const formatted =
    formatLastSync(
      lastSyncAt,
    );

  return (
    <View
      style={
        styles.offlineBanner
      }
      accessibilityRole="text"
    >
      <Text
        style={
          styles.offlineTitle
        }
      >
        Showing saved data
      </Text>

      <Text
        style={
          styles.offlineBody
        }
      >
        {formatted
          ? `Last updated ${formatted}. Pull down to try again.`
          : 'Pull down to try syncing again.'}
      </Text>
    </View>
  );
}


function EmptyState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <StatePanel
      title={title}
      description={body}
      icon="wallet-outline"
      tone="info"
    />
  );
}


function AccountCard({
  account,
}: {
  account: LocalAccountSummary;
}) {
  return (
    <View
      style={
        styles.accountCard
      }
    >
      <View
        style={
          styles.accountTopRow
        }
      >
        <View
          style={
            styles.accountIdentity
          }
        >
          <Text
            numberOfLines={1}
            style={
              styles.accountName
            }
          >
            {account.name}
          </Text>

          <Text
            style={
              styles.accountMeta
            }
          >
            {account.account_type_code.replace(
              /_/g,
              ' ',
            )}
            {' Ãƒâ€šÃ‚Â· '}
            {account.currency_code}
          </Text>
        </View>

        <StatusChip
          label={
            account.sync_status !== 'synced'
              ? 'Pending sync'
              : account.status
          }
          tone={
            account.sync_status !== 'synced'
              ? 'warning'
              : account.status === 'active'
                ? 'success'
                : 'neutral'
          }
        />
      </View>

      <Text
        style={
          styles.accountBalance
        }
        accessibilityLabel={`Balance ${formatMinor(
          account.current_balance_minor,
          account.currency_code,
          account.currency_minor_unit,
        )}`}
      >
        {formatMinor(
          account.current_balance_minor,
          account.currency_code,
          account.currency_minor_unit,
        )}
      </Text>
    </View>
  );
}


function ActivityRow({
  item,
}: {
  item: LocalActivityItem;
}) {
  const isIncome =
    item.type === 'income';

  const isExpense =
    item.type === 'expense';

  const sign =
    isIncome
      ? '+'
      : isExpense
        ? 'ÃƒÂ¢Ã‹â€ Ã¢â‚¬â„¢'
        : '';

  return (
    <View
      style={
        styles.activityRow
      }
    >
      <View
        style={
          styles.activityMain
        }
      >
        <Text
          numberOfLines={1}
          style={
            styles.activityTitle
          }
        >
          {activityTitle(
            item,
          )}
        </Text>

        <Text
          numberOfLines={1}
          style={
            styles.activityMeta
          }
        >
          {item.account_name}
          {item.category_name
            ? ` Ãƒâ€šÃ‚Â· ${item.category_name}`
            : ''}
        </Text>

        <Text
          style={
            styles.activityDate
          }
        >
          {formatDate(
            item.transaction_date,
          )}
        </Text>
      </View>

      <Text
        style={[
          styles.activityAmount,

          isIncome
            ? styles.positiveAmount
            : null,

          isExpense
            ? styles.negativeAmount
            : null,
        ]}
      >
        {sign}
        {formatMinor(
          item.amount_minor,
          item.currency_code,
          item.currency_minor_unit,
        )}
      </Text>
    </View>
  );
}


function LoadingState() {
  return (
    <StatePanel
      loading
      description="Loading saved finances..."
    />
  );
}


type HomeToolTileProps = {
  icon:
    keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
};

function HomeToolTile({
  icon,
  title,
  description,
  onPress,
}: HomeToolTileProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
      onPress={onPress}
      style={({ pressed }) => [
        styles.homeToolTile,
        pressed
          ? styles.homeToolTilePressed
          : null,
      ]}
    >
      <View style={styles.homeToolIcon}>
        <Ionicons
          name={icon}
          size={21}
          color={
            colors.primary
          }
        />
      </View>

      <Text style={styles.homeToolTitle}>
        {title}
      </Text>

      <Text
        numberOfLines={2}
        style={styles.homeToolDescription}
      >
        {description}
      </Text>
    </Pressable>
  );
}

export function LocalHomeScreen() {
  const router =
    useRouter();

  const {
    lastSyncAt,
    isRefreshing,
    isShowingSavedData,
    refresh,
  } =
    useLocalFinanceData(1);

  return (
    <ScrollView
      style={
        styles.screen
      }
      contentContainerStyle={
        styles.content
      }
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
      refreshControl={
        <RefreshControl
          refreshing={
            isRefreshing
          }
          onRefresh={() => {
            void refresh();
          }}
        />
      }
    >
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>
          FINANCE COACH
        </Text>

        <Text
          accessibilityRole="header"
          style={styles.heroTitle}
        >
          Your money at a glance.
        </Text>

        <Text style={styles.heroBody}>
          See what matters now, then open a focused tool when you need more detail.
        </Text>
      </View>

      <OfflineStatus
        isShowingSavedData={
          isShowingSavedData
        }
        lastSyncAt={
          lastSyncAt
        }
      />

      <SyncQueueBanner />

      <DashboardCommandCenter />

      <View style={styles.homeToolsSection}>
        <View style={styles.homeToolsHeading}>
          <Text style={styles.homeToolsTitle}>
            Explore tools
          </Text>

          <Text style={styles.homeToolsBody}>
            Planning, coaching, and shared-money tools stay close without crowding your dashboard.
          </Text>
        </View>

        <View style={styles.homeToolsGrid}>
          <HomeToolTile
            icon="grid-outline"
            title="Six Jars"
            description="Organize money by purpose."
            onPress={() => {
              router.push(
                '/six-jars' as never,
              );
            }}
          />

          <HomeToolTile
            icon="cash-outline"
            title="Loans"
            description="Track balances and payments."
            onPress={() => {
              router.push(
                '/loans' as never,
              );
            }}
          />

          <HomeToolTile
            icon="people-outline"
            title="ROSCA"
            description="Manage group saving cycles."
            onPress={() => {
              router.push(
                '/rosca' as never,
              );
            }}
          />

          <HomeToolTile
            icon="trophy-outline"
            title="Challenges"
            description="Build consistent money habits."
            onPress={() => {
              router.push(
                '/gamification' as never,
              );
            }}
          />

          <HomeToolTile
            icon="sparkles-outline"
            title="AI Coach"
            description="Ask about your financial picture."
            onPress={() => {
              router.push(
                '/ai-coach' as never,
              );
            }}
          />

          <HomeToolTile
            icon="notifications-outline"
            title="Notifications"
            description="Review reminders and alerts."
            onPress={() => {
              router.push(
                '/notifications' as never,
              );
            }}
          />
        </View>
      </View>
    </ScrollView>
  );
}

export function LocalAccountsScreen() {
  const router =
    useRouter();

  const {
    accounts,
    lastSyncAt,
    isInitialLoading,
    isRefreshing,
    isShowingSavedData,
    refresh,
  } =
    useLocalFinanceData(1);

  return (
    <ScrollView
      style={
        styles.screen
      }
      contentContainerStyle={
        styles.content
      }
      nestedScrollEnabled
      refreshControl={
        <RefreshControl
          refreshing={
            isRefreshing
          }
          onRefresh={() => {
            void refresh();
          }}
        />
      }
    >
      <View
        style={
          styles.pageHeader
        }
      >
        <View
          style={
            styles.pageHeaderCopy
          }
        >
          <Text
            style={
              styles.pageTitle
            }
          >
            Accounts
          </Text>

          <Text
            style={
              styles.pageSubtitle
            }
          >
            Your saved account balances by currency.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add account"
          onPress={() => {
            router.push(
              '/add-account',
            );
          }}
          style={({
            pressed,
          }) => [
            styles.compactButton,
            pressed
              ? styles.primaryActionPressed
              : null,
          ]}
        >
          <Text
            style={
              styles.compactButtonText
            }
          >
            Add
          </Text>
        </Pressable>
      </View>

      <OfflineStatus
        isShowingSavedData={
          isShowingSavedData
        }
        lastSyncAt={
          lastSyncAt
        }
      />

      <SyncQueueBanner />

      {isInitialLoading ? (
        <LoadingState />
      ) : accounts.length === 0 ? (
        <EmptyState
          title="No accounts yet"
          body="Add an account to start tracking balances and transactions."
        />
      ) : (
        <View
          style={
            styles.stack
          }
        >
          {accounts.map(
            (
              account,
            ) => (
              <AccountCard
                key={
                  account.id
                }
                account={
                  account
                }
              />
            ),
          )}
        </View>
      )}
    </ScrollView>
  );
}


export function LocalActivityScreen() {
  const router =
    useRouter();

  const {
    activity,
    lastSyncAt,
    isInitialLoading,
    isRefreshing,
    isShowingSavedData,
    refresh,
  } =
    useLocalFinanceData(100);

  return (
    <ScrollView
      style={
        styles.screen
      }
      contentContainerStyle={
        styles.content
      }
      nestedScrollEnabled
      refreshControl={
        <RefreshControl
          refreshing={
            isRefreshing
          }
          onRefresh={() => {
            void refresh();
          }}
        />
      }
    >
      <View
        style={
          styles.pageHeader
        }
      >
        <View
          style={
            styles.pageHeaderCopy
          }
        >
          <Text
            style={
              styles.pageTitle
            }
          >
            Activity
          </Text>

          <Text
            style={
              styles.pageSubtitle
            }
          >
            Recent income, expenses, transfers and adjustments.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quick add transaction"
          onPress={() => {
            router.push(
              '/quick-add',
            );
          }}
          style={({
            pressed,
          }) => [
            styles.compactButton,
            pressed
              ? styles.primaryActionPressed
              : null,
          ]}
        >
          <Text
            style={
              styles.compactButtonText
            }
          >
            Add
          </Text>
        </Pressable>
      </View>

      <OfflineStatus
        isShowingSavedData={
          isShowingSavedData
        }
        lastSyncAt={
          lastSyncAt
        }
      />

      <SyncQueueBanner />

      {isInitialLoading ? (
        <LoadingState />
      ) : activity.length === 0 ? (
        <EmptyState
          title="No activity yet"
          body="Your transactions will appear here after you add them."
        />
      ) : (
        <View
          style={
            styles.activityCard
          }
        >
          {activity.map(
            (
              item,
              index,
            ) => (
              <View
                key={
                  item.id
                }
              >
                {index > 0 ? (
                  <View
                    style={
                      styles.divider
                    }
                  />
                ) : null}

                <ActivityRow
                  item={
                    item
                  }
                />
              </View>
            ),
          )}
        </View>
      )}
    </ScrollView>
  );
}


const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor:
        palette.background,
    },

    content: {
      flexGrow: 1,
      width: '100%',
      maxWidth:
        layout.contentMaxWidth,
      alignSelf: 'center',
      paddingHorizontal:
        layout.screenHorizontalPadding,
      paddingTop:
        spacing.md,
      paddingBottom: 120,
    },

    hero: {
      paddingTop:
        spacing.sm,
      paddingBottom:
        spacing.lg,
    },

    eyebrow: {
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight:
        typography.weightBold,
      letterSpacing: 1.25,
      color:
        palette.primary,
      marginBottom:
        spacing.sm,
    },

    heroTitle: {
      fontSize:
        typography.title,
      lineHeight:
        typography.lineHeightTitle,
      fontWeight:
        typography.weightExtraBold,
      color:
        palette.text,
      letterSpacing: -0.7,
    },

    heroBody: {
      marginTop:
        spacing.sm,
      maxWidth: 440,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      color:
        palette.textMuted,
    },

    homeToolsSection: {
      gap:
        spacing.md,
      marginTop:
        spacing.sm,
    },

    homeToolsHeading: {
      gap:
        spacing.xs,
    },

    homeToolsTitle: {
      color:
        palette.text,
      fontSize:
        typography.subheading,
      lineHeight:
        typography.lineHeightSubheading,
      fontWeight:
        typography.weightBold,
    },

    homeToolsBody: {
      maxWidth: 460,
      color:
        palette.textMuted,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
    },

    homeToolsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap:
        spacing.sm,
    },

    homeToolTile: {
      width: '48%',
      minHeight: 142,
      padding:
        spacing.md,
      borderRadius:
        radii.lg,
      borderWidth: 1,
      borderColor:
        palette.border,
      backgroundColor:
        palette.surface,
      ...elevation.card,
    },

    homeToolTilePressed: {
      backgroundColor:
        palette.surfaceMuted,
      borderColor:
        colors.borderStrong,
      transform: [
        {
          scale: 0.99,
        },
      ],
    },

    homeToolIcon: {
      width: 40,
      height: 40,
      borderRadius:
        radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        colors.primarySoft,
    },

    homeToolTitle: {
      marginTop:
        spacing.sm,
      color:
        palette.text,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightBold,
    },

    homeToolDescription: {
      marginTop:
        spacing.xxs,
      color:
        palette.textMuted,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },
    pageHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      gap:
        spacing.md,
      marginBottom:
        spacing.lg,
    },

    pageHeaderCopy: {
      flex: 1,
      minWidth: 0,
    },

    pageTitle: {
      fontSize:
        typography.heading,
      lineHeight:
        typography.lineHeightHeading,
      fontWeight:
        typography.weightExtraBold,
      color:
        palette.text,
      letterSpacing: -0.4,
    },

    pageSubtitle: {
      marginTop:
        spacing.xs,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      color:
        palette.textMuted,
    },

    offlineBanner: {
      backgroundColor:
        palette.warningBackground,
      borderRadius:
        radii.md,
      borderWidth: 1,
      borderColor:
        colors.warning,
      paddingHorizontal:
        spacing.md,
      paddingVertical:
        spacing.sm,
      marginBottom:
        spacing.md,
    },

    offlineTitle: {
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightBold,
      color:
        palette.warningText,
    },

    offlineBody: {
      marginTop:
        spacing.xxs,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      color:
        palette.warningText,
    },

    actionRow: {
      flexDirection: 'row',
      gap:
        spacing.sm,
      marginBottom:
        spacing.lg,
    },

    actionColumn: {
      flex: 1,
    },

    primaryAction: {
      minHeight:
        layout.touchTarget,
    },

    primaryActionPressed: {
      opacity: 0.84,
    },

    primaryActionText: {
      fontSize:
        typography.body,
      fontWeight:
        typography.weightBold,
      color:
        colors.textOnPrimary,
    },

    secondaryAction: {
      minHeight:
        layout.touchTarget,
    },

    secondaryActionPressed: {
      backgroundColor:
        palette.surfaceMuted,
    },

    secondaryActionText: {
      fontSize:
        typography.body,
      fontWeight:
        typography.weightBold,
      color:
        palette.text,
    },

    compactButton: {
      minWidth:
        layout.touchTarget,
      minHeight:
        layout.touchTarget,
      paddingHorizontal:
        spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius:
        radii.md,
      backgroundColor:
        palette.primary,
    },

    compactButtonText: {
      color:
        colors.textOnPrimary,
      fontSize:
        typography.small,
      fontWeight:
        typography.weightBold,
    },

    sectionHeading: {
      marginBottom:
        spacing.sm,
    },

    sectionTitle: {
      fontSize:
        typography.subheading,
      lineHeight:
        typography.lineHeightSubheading,
      fontWeight:
        typography.weightBold,
      color:
        palette.text,
    },

    sectionSupporting: {
      marginTop:
        spacing.xxs,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      color:
        palette.textMuted,
    },

    sectionSpacer: {
      height:
        spacing.xl,
    },

    stack: {
      gap:
        spacing.sm,
    },

    accountCard: {
      borderRadius:
        radii.lg,
      padding:
        spacing.md,
      backgroundColor:
        palette.surface,
      borderWidth: 1,
      borderColor:
        palette.border,
      ...elevation.card,
    },

    accountTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent:
        'space-between',
      gap:
        spacing.md,
    },

    accountIdentity: {
      flex: 1,
      minWidth: 0,
    },

    accountName: {
      fontSize:
        typography.body,
      lineHeight:
        typography.lineHeightBody,
      fontWeight:
        typography.weightBold,
      color:
        palette.text,
    },

    accountMeta: {
      marginTop:
        spacing.xxs,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      textTransform:
        'capitalize',
      color:
        palette.textMuted,
    },

    statusPill: {
      paddingHorizontal:
        spacing.sm,
      paddingVertical:
        spacing.xs,
      borderRadius:
        radii.pill,
      backgroundColor:
        palette.surfaceMuted,
    },

    statusPillText: {
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      textTransform:
        'capitalize',
      fontWeight:
        typography.weightBold,
      color:
        palette.primary,
    },

    accountBalance: {
      marginTop:
        spacing.lg,
      fontSize:
        typography.heading,
      lineHeight:
        typography.lineHeightHeading,
      fontWeight:
        typography.weightExtraBold,
      color:
        palette.text,
      letterSpacing: -0.4,
    },

    activityCard: {
      backgroundColor:
        palette.surface,
      borderRadius:
        radii.lg,
      borderWidth: 1,
      borderColor:
        palette.border,
      paddingHorizontal:
        spacing.md,
      ...elevation.card,
    },

    activityRow: {
      minHeight: 84,
      flexDirection: 'row',
      alignItems: 'center',
      gap:
        spacing.md,
      paddingVertical:
        spacing.md,
    },

    activityMain: {
      flex: 1,
      minWidth: 0,
    },

    activityTitle: {
      fontSize: 15,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightSemibold,
      color:
        palette.text,
    },

    activityMeta: {
      marginTop:
        spacing.xxs,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      color:
        palette.textMuted,
    },

    activityDate: {
      marginTop:
        spacing.xxs,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      color:
        colors.textTertiary,
    },

    activityAmount: {
      maxWidth: '44%',
      textAlign: 'right',
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightBold,
      color:
        palette.text,
    },

    positiveAmount: {
      color:
        palette.positive,
    },

    negativeAmount: {
      color:
        palette.negative,
    },

    divider: {
      height:
        StyleSheet.hairlineWidth,
      backgroundColor:
        palette.border,
    },

    emptyCard: {
      borderRadius:
        radii.lg,
      padding:
        spacing.lg,
      backgroundColor:
        palette.surface,
      borderWidth: 1,
      borderColor:
        palette.border,
    },

    emptyTitle: {
      fontSize:
        typography.body,
      lineHeight:
        typography.lineHeightBody,
      fontWeight:
        typography.weightBold,
      color:
        palette.text,
    },

    emptyBody: {
      marginTop:
        spacing.xs,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      color:
        palette.textMuted,
    },

    loading: {
      minHeight: 180,
      alignItems: 'center',
      justifyContent: 'center',
      gap:
        spacing.sm,
    },

    loadingText: {
      fontSize:
        typography.small,
      color:
        palette.textMuted,
    },
  });
