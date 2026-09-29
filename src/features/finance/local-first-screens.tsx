import Ionicons from '@expo/vector-icons/Ionicons';






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
    return `${currencyCode} ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â`;
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
  const isPending =
    account.sync_status
    !== 'synced';

  return (
    <View style={styles.accountCardModern}>
      <View style={styles.accountCardTop}>
        <View style={styles.accountIcon}>
          <Ionicons
            name="wallet-outline"
            size={21}
            color={
              colors.primary
            }
          />
        </View>

        <View style={styles.accountIdentityModern}>
          <Text
            numberOfLines={1}
            style={styles.accountNameModern}
          >
            {account.name}
          </Text>

          <Text style={styles.accountMetaModern}>
            {account.account_type_code
              .replace(
                /_/g,
                ' ',
              )}
            {'  |  '}
            {account.currency_code}
          </Text>
        </View>

        <StatusChip
          label={
            isPending
              ? 'Pending sync'
              : account.status
          }
          tone={
            isPending
              ? 'warning'
              : account.status
                === 'active'
                ? 'success'
                : 'neutral'
          }
        />
      </View>

      <View style={styles.accountBalanceBlock}>
        <Text style={styles.accountBalanceLabel}>
          Current balance
        </Text>

        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.72}
          style={styles.accountBalanceModern}
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

      {isPending ? (
        <View style={styles.accountSyncNote}>
          <Ionicons
            name="cloud-upload-outline"
            size={15}
            color={
              colors.warning
            }
          />

          <Text style={styles.accountSyncNoteText}>
            Saved on this device and waiting to sync.
          </Text>
        </View>
      ) : null}
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
        ? '-'
        : '';

  const icon =
    isIncome
      ? 'arrow-down-outline'
      : isExpense
        ? 'arrow-up-outline'
        : item.type === 'transfer'
          ? 'swap-horizontal-outline'
          : 'create-outline';

  return (
    <View style={styles.activityRowModern}>
      <View
        style={[
          styles.activityTypeIcon,
          isIncome
            ? styles.activityTypeIconIncome
            : null,
          isExpense
            ? styles.activityTypeIconExpense
            : null,
        ]}
      >
        <Ionicons
          name={icon}
          size={18}
          color={
            isIncome
              ? colors.success
              : isExpense
                ? colors.danger
                : colors.primary
          }
        />
      </View>

      <View style={styles.activityMainModern}>
        <Text
          numberOfLines={1}
          style={styles.activityTitleModern}
        >
          {activityTitle(
            item,
          )}
        </Text>

        <Text
          numberOfLines={1}
          style={styles.activityMetaModern}
        >
          {item.account_name}
          {item.category_name
            ? `  |  ${item.category_name}`
            : ''}
        </Text>

        <Text style={styles.activityDateModern}>
          {formatDate(
            item.transaction_date,
          )}
        </Text>
      </View>

      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.72}
        style={[
          styles.activityAmountModern,
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


export function LocalHomeScreen() {
  const router = useRouter();

  const {
    activity,
    lastSyncAt,
    isInitialLoading,
    isRefreshing,
    isShowingSavedData,
    refresh,
  } = useLocalFinanceData(4);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => {
            void refresh();
          }}
        />
      }
    >
      <View style={styles.hero}>
        <View style={styles.homeHeroTop}>
          <View style={styles.homeHeroCopy}>
            <Text style={styles.eyebrow}>FINANCE COACH</Text>
            <Text accessibilityRole="header" style={styles.heroTitle}>
              Your money, clearly.
            </Text>
          </View>

          <View style={styles.homeHeroActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Notifications"
              hitSlop={8}
              onPress={() => router.push('/notifications' as never)}
              style={({ pressed }) => [
                styles.homeIconButton,
                pressed ? styles.homeIconButtonPressed : null,
              ]}
            >
              <Ionicons
                name="notifications-outline"
                size={21}
                color={colors.text}
              />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Settings"
              hitSlop={8}
              onPress={() => router.push('/settings' as never)}
              style={({ pressed }) => [
                styles.homeIconButton,
                pressed ? styles.homeIconButtonPressed : null,
              ]}
            >
              <Ionicons
                name="person-outline"
                size={21}
                color={colors.text}
              />
            </Pressable>
          </View>
        </View>

        <Text style={styles.heroBody}>
          See what matters now, then act only when something needs you.
        </Text>
      </View>

      <OfflineStatus
        isShowingSavedData={isShowingSavedData}
        lastSyncAt={lastSyncAt}
      />

      <SyncQueueBanner />

      <DashboardCommandCenter />

      <View style={styles.homeActivitySection}>
        <View style={styles.homeSectionHeader}>
          <Text style={styles.homeSectionTitle}>Recent activity</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="See all activity"
            hitSlop={8}
            onPress={() => router.push('/activity' as never)}
          >
            <Text style={styles.homeSectionAction}>See all</Text>
          </Pressable>
        </View>

        {isInitialLoading ? (
          <LoadingState />
        ) : activity.length === 0 ? (
          <EmptyState
            title="No activity yet"
            body="Add your first expense or income to start seeing your money story."
          />
        ) : (
          <View style={styles.activityCardModern}>
            {activity.slice(0, 3).map((item, index) => (
              <View key={item.id}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <ActivityRow item={item} />
              </View>
            ))}
          </View>
        )}
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

  const activeCount =
    accounts.filter(
      account =>
        account.status
        === 'active',
    ).length;

  const pendingCount =
    accounts.filter(
      account =>
        account.sync_status
        !== 'synced',
    ).length;

  return (
    <ScrollView
      style={styles.screen}
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
      <View style={styles.tabPageHero}>
        <View style={styles.tabPageHeroTop}>
          <View style={styles.tabPageHeroCopy}>
            <Text style={styles.tabPageEyebrow}>
              YOUR MONEY
            </Text>

            <Text
              accessibilityRole="header"
              style={styles.tabPageTitle}
            >
              Accounts
            </Text>

            <Text style={styles.tabPageBody}>
              Keep each real-world balance in one clear place. Different currencies stay separate.
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add account"
            onPress={() => {
              router.push(
                '/add-account' as never,
              );
            }}
            style={({ pressed }) => [
              styles.roundPrimaryAction,
              pressed
                ? styles.roundPrimaryActionPressed
                : null,
            ]}
          >
            <Ionicons
              name="add"
              size={24}
              color={
                colors.textOnPrimary
              }
            />
          </Pressable>
        </View>

        {!isInitialLoading ? (
          <View style={styles.pageStats}>
            <View style={styles.pageStat}>
              <Text style={styles.pageStatValue}>
                {accounts.length}
              </Text>

              <Text style={styles.pageStatLabel}>
                Total
              </Text>
            </View>

            <View style={styles.pageStatDivider} />

            <View style={styles.pageStat}>
              <Text style={styles.pageStatValue}>
                {activeCount}
              </Text>

              <Text style={styles.pageStatLabel}>
                Active
              </Text>
            </View>

            <View style={styles.pageStatDivider} />

            <View style={styles.pageStat}>
              <Text
                style={[
                  styles.pageStatValue,
                  pendingCount > 0
                    ? styles.pageStatWarning
                    : null,
                ]}
              >
                {pendingCount}
              </Text>

              <Text style={styles.pageStatLabel}>
                Pending
              </Text>
            </View>
          </View>
        ) : null}
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
        <View style={styles.fullEmptyState}>
          <View style={styles.fullEmptyIcon}>
            <Ionicons
              name="wallet-outline"
              size={28}
              color={
                colors.primary
              }
            />
          </View>

          <Text style={styles.fullEmptyTitle}>
            Add your first account
          </Text>

          <Text style={styles.fullEmptyBody}>
            Start with the account you use most, such as cash, a bank account, or a mobile wallet.
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add first account"
            onPress={() => {
              router.push(
                '/add-account' as never,
              );
            }}
            style={({ pressed }) => [
              styles.emptyPrimaryButton,
              pressed
                ? styles.roundPrimaryActionPressed
                : null,
            ]}
          >
            <Ionicons
              name="add-outline"
              size={18}
              color={
                colors.textOnPrimary
              }
            />

            <Text style={styles.emptyPrimaryButtonText}>
              Add account
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.modernStack}>
          {accounts.map(
            account => (
              <AccountCard
                key={account.id}
                account={account}
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

  const incomeCount =
    activity.filter(
      item =>
        item.type
        === 'income',
    ).length;

  const expenseCount =
    activity.filter(
      item =>
        item.type
        === 'expense',
    ).length;

  return (
    <ScrollView
      style={styles.screen}
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
      <View style={styles.tabPageHero}>
        <View style={styles.tabPageHeroTop}>
          <View style={styles.tabPageHeroCopy}>
            <Text style={styles.tabPageEyebrow}>
              LEDGER
            </Text>

            <Text
              accessibilityRole="header"
              style={styles.tabPageTitle}
            >
              Activity
            </Text>

            <Text style={styles.tabPageBody}>
              Review income, spending, transfers, and adjustments in one chronological list.
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add transaction"
            onPress={() => {
              router.push(
                '/quick-add' as never,
              );
            }}
            style={({ pressed }) => [
              styles.roundPrimaryAction,
              pressed
                ? styles.roundPrimaryActionPressed
                : null,
            ]}
          >
            <Ionicons
              name="add"
              size={24}
              color={
                colors.textOnPrimary
              }
            />
          </Pressable>
        </View>

        {!isInitialLoading ? (
          <View style={styles.pageStats}>
            <View style={styles.pageStat}>
              <Text style={styles.pageStatValue}>
                {activity.length}
              </Text>

              <Text style={styles.pageStatLabel}>
                Loaded
              </Text>
            </View>

            <View style={styles.pageStatDivider} />

            <View style={styles.pageStat}>
              <Text
                style={[
                  styles.pageStatValue,
                  styles.pageStatPositive,
                ]}
              >
                {incomeCount}
              </Text>

              <Text style={styles.pageStatLabel}>
                Income
              </Text>
            </View>

            <View style={styles.pageStatDivider} />

            <View style={styles.pageStat}>
              <Text
                style={[
                  styles.pageStatValue,
                  styles.pageStatNegative,
                ]}
              >
                {expenseCount}
              </Text>

              <Text style={styles.pageStatLabel}>
                Expenses
              </Text>
            </View>
          </View>
        ) : null}
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
        <View style={styles.fullEmptyState}>
          <View style={styles.fullEmptyIcon}>
            <Ionicons
              name="receipt-outline"
              size={28}
              color={
                colors.primary
              }
            />
          </View>

          <Text style={styles.fullEmptyTitle}>
            No transactions yet
          </Text>

          <Text style={styles.fullEmptyBody}>
            Record your first income or expense. Finance Coach will build your activity history from real ledger entries.
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add first transaction"
            onPress={() => {
              router.push(
                '/quick-add' as never,
              );
            }}
            style={({ pressed }) => [
              styles.emptyPrimaryButton,
              pressed
                ? styles.roundPrimaryActionPressed
                : null,
            ]}
          >
            <Ionicons
              name="add-outline"
              size={18}
              color={
                colors.textOnPrimary
              }
            />

            <Text style={styles.emptyPrimaryButtonText}>
              Add transaction
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.activityCardModern}>
          {activity.map(
            (
              item,
              index,
            ) => (
              <View key={item.id}>
                {index > 0 ? (
                  <View style={styles.divider} />
                ) : null}

                <ActivityRow
                  item={item}
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
      marginBottom:
        spacing.md,
      padding:
        spacing.lg,
      borderRadius:
        radii.lg,
      backgroundColor:
        colors.primary,
      ...elevation.card,
    },

    eyebrow: {
      marginBottom:
        spacing.xs,
      color:
        colors.accentStrong,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight:
        typography.weightExtraBold,
      letterSpacing: 1.35,
    },

    heroTitle: {
      color:
        colors.textOnPrimary,
      fontSize:
        typography.heading,
      lineHeight:
        typography.lineHeightHeading,
      fontWeight:
        typography.weightExtraBold,
      letterSpacing: -0.4,
    },

    heroBody: {
      marginTop:
        spacing.xs,
      maxWidth: 420,
      color:
        colors.accent,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
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
    homeHeroTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: spacing.md,
    },

    homeHeroCopy: {
      flex: 1,
      gap: spacing.xs,
    },

    homeHeroActions: {
      flexDirection: 'row',
      gap: spacing.xs,
    },

    homeIconButton: {
      width: layout.touchTarget,
      height: layout.touchTarget,
      borderRadius: radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      ...elevation.card,
    },

    homeIconButtonPressed: {
      backgroundColor: colors.surfaceMuted,
      transform: [{ scale: 0.98 }],
    },

    homeActivitySection: {
      gap: spacing.sm,
      marginBottom: spacing.xl,
    },

    homeSectionHeader: {
      minHeight: 32,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },

    homeSectionTitle: {
      color: colors.text,
      fontSize: typography.subheading,
      lineHeight: typography.lineHeightSubheading,
      fontWeight: typography.weightSemibold,
    },

    homeSectionAction: {
      color: colors.primary,
      fontSize: typography.small,
      lineHeight: typography.lineHeightSmall,
      fontWeight: typography.weightSemibold,
    },

    tabPageHero: {
      gap:
        spacing.lg,
      marginBottom:
        spacing.lg,
      paddingTop:
        spacing.sm,
    },

    tabPageHeroTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap:
        spacing.md,
    },

    tabPageHeroCopy: {
      flex: 1,
      minWidth: 0,
      gap:
        spacing.xs,
    },

    tabPageEyebrow: {
      color:
        palette.primary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight:
        typography.weightExtraBold,
      letterSpacing: 1.1,
    },

    tabPageTitle: {
      color:
        palette.text,
      fontSize:
        typography.heading,
      lineHeight:
        typography.lineHeightHeading,
      fontWeight:
        typography.weightExtraBold,
      letterSpacing: -0.4,
    },

    tabPageBody: {
      maxWidth: 420,
      color:
        palette.textMuted,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
    },

    roundPrimaryAction: {
      width:
        layout.touchTarget,
      height:
        layout.touchTarget,
      borderRadius:
        radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        palette.primary,
      ...elevation.card,
    },

    roundPrimaryActionPressed: {
      opacity: 0.84,
      transform: [
        {
          scale: 0.97,
        },
      ],
    },

    pageStats: {
      flexDirection: 'row',
      alignItems: 'center',
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

    pageStat: {
      flex: 1,
      alignItems: 'center',
      gap:
        spacing.xxs,
    },

    pageStatDivider: {
      width: 1,
      height: 34,
      backgroundColor:
        palette.border,
    },

    pageStatValue: {
      color:
        palette.text,
      fontSize:
        typography.subheading,
      lineHeight:
        typography.lineHeightSubheading,
      fontWeight:
        typography.weightExtraBold,
    },

    pageStatLabel: {
      color:
        palette.textMuted,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    pageStatWarning: {
      color:
        colors.warning,
    },

    pageStatPositive: {
      color:
        colors.success,
    },

    pageStatNegative: {
      color:
        colors.danger,
    },

    fullEmptyState: {
      alignItems: 'center',
      gap:
        spacing.sm,
      paddingHorizontal:
        spacing.lg,
      paddingVertical:
        spacing.xl,
      borderRadius:
        radii.xl,
      borderWidth: 1,
      borderColor:
        palette.border,
      backgroundColor:
        palette.surface,
      ...elevation.card,
    },

    fullEmptyIcon: {
      width: 56,
      height: 56,
      borderRadius:
        radii.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        colors.primarySoft,
      marginBottom:
        spacing.xs,
    },

    fullEmptyTitle: {
      color:
        palette.text,
      fontSize:
        typography.subheading,
      lineHeight:
        typography.lineHeightSubheading,
      fontWeight:
        typography.weightBold,
      textAlign: 'center',
    },

    fullEmptyBody: {
      maxWidth: 360,
      color:
        palette.textMuted,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      textAlign: 'center',
    },

    emptyPrimaryButton: {
      minHeight:
        layout.touchTarget,
      marginTop:
        spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap:
        spacing.xs,
      paddingHorizontal:
        spacing.lg,
      borderRadius:
        radii.md,
      backgroundColor:
        palette.primary,
    },

    emptyPrimaryButtonText: {
      color:
        colors.textOnPrimary,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightBold,
    },

    modernStack: {
      gap:
        spacing.md,
    },

    accountCardModern: {
      gap:
        spacing.lg,
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

    accountCardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap:
        spacing.sm,
    },

    accountIcon: {
      width: 42,
      height: 42,
      borderRadius:
        radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        colors.primarySoft,
    },

    accountIdentityModern: {
      flex: 1,
      minWidth: 0,
    },

    accountNameModern: {
      color:
        palette.text,
      fontSize:
        typography.body,
      lineHeight:
        typography.lineHeightBody,
      fontWeight:
        typography.weightBold,
    },

    accountMetaModern: {
      marginTop:
        spacing.xxs,
      color:
        palette.textMuted,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      textTransform:
        'capitalize',
    },

    accountBalanceBlock: {
      gap:
        spacing.xxs,
    },

    accountBalanceLabel: {
      color:
        colors.textTertiary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    accountBalanceModern: {
      color:
        palette.text,
      fontSize:
        typography.heading,
      lineHeight:
        typography.lineHeightHeading,
      fontWeight:
        typography.weightExtraBold,
      letterSpacing: -0.4,
    },

    accountSyncNote: {
      flexDirection: 'row',
      alignItems: 'center',
      gap:
        spacing.xs,
      paddingTop:
        spacing.sm,
      borderTopWidth:
        StyleSheet.hairlineWidth,
      borderTopColor:
        palette.border,
    },

    accountSyncNoteText: {
      flex: 1,
      color:
        colors.warning,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    activityCardModern: {
      paddingHorizontal:
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

    activityRowModern: {
      minHeight: 88,
      flexDirection: 'row',
      alignItems: 'center',
      gap:
        spacing.sm,
      paddingVertical:
        spacing.md,
    },

    activityTypeIcon: {
      width: 38,
      height: 38,
      borderRadius:
        radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        colors.primarySoft,
    },

    activityTypeIconIncome: {
      backgroundColor:
        colors.successSurface,
    },

    activityTypeIconExpense: {
      backgroundColor:
        colors.dangerSurface,
    },

    activityMainModern: {
      flex: 1,
      minWidth: 0,
    },

    activityTitleModern: {
      color:
        palette.text,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightBold,
    },

    activityMetaModern: {
      marginTop:
        spacing.xxs,
      color:
        palette.textMuted,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    activityDateModern: {
      marginTop:
        spacing.xxs,
      color:
        colors.textTertiary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    activityAmountModern: {
      maxWidth: '40%',
      textAlign: 'right',
      color:
        palette.text,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightExtraBold,
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
