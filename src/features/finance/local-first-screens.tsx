import {
  HomeNotificationsCard,
} from '../notifications/home-notifications-card';

import {
  HomeAiCoachCard,
} from '../ai-coach/home-ai-coach-card';

import {
  HomeGamificationCard,
} from '../gamification/home-gamification-card';

import {
  HomeRoscaCard,
} from '../rosca/home-rosca-card';

import {
  HomeLoansCard,
} from '../loans/home-loans-card';

import {
  HomeSixJarCard,
} from '../six-jars/home-six-jar-card';

import {
  DashboardCommandCenter,
} from '../dashboard/dashboard-command-center';

import {
  HomeSavingsGoalCard,
} from '../goals/home-savings-goal-card';

import {
  HomeBudgetCard,
} from '../budgets/home-budget-card';

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
  AppButton,
} from '@/components/ui/app-button';
import {
  AppSectionHeader,
} from '@/components/ui/app-section-header';
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
    return `${currencyCode} —`;
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


function SectionHeading({
  title,
  supportingText,
}: {
  title: string;
  supportingText?: string;
}) {
  return (
    <AppSectionHeader
      title={title}
      subtitle={supportingText}
    />
  );
}


function PrimaryAction({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <AppButton
      label={label}
      icon="add-outline"
      onPress={onPress}
    />
  );
}


function SecondaryAction({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <AppButton
      label={label}
      variant="secondary"
      onPress={onPress}
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
            {' · '}
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
        ? '−'
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
            ? ` · ${item.category_name}`
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


export function LocalHomeScreen() {
  const router =
    useRouter();

  const {
    accounts,
    activity,
    lastSyncAt,
    isInitialLoading,
    isRefreshing,
    isShowingSavedData,
    refresh,
  } =
    useLocalFinanceData(6);

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
      <View
        style={
          styles.hero
        }
      >
        <Text
          style={
            styles.eyebrow
          }
        >
          FINANCE COACH
        </Text>

        <Text
          style={
            styles.heroTitle
          }
        >
          Your money, clearly.
        </Text>

        <Text
          style={
            styles.heroBody
          }
        >
          Saved securely on this device and refreshed from your trusted ledger.
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

      <HomeBudgetCard />

      <HomeSavingsGoalCard />

      <HomeSixJarCard />

      <HomeLoansCard />

      <HomeRoscaCard />

      <HomeGamificationCard />

      <HomeAiCoachCard />

      <HomeNotificationsCard />

      <View
        style={
          styles.actionRow
        }
      >
        <View
          style={
            styles.actionColumn
          }
        >
          <PrimaryAction
            label="Quick add"
            onPress={() => {
              router.push(
                '/quick-add',
              );
            }}
          />
        </View>

        <View
          style={
            styles.actionColumn
          }
        >
          <SecondaryAction
            label="Add account"
            onPress={() => {
              router.push(
                '/add-account',
              );
            }}
          />
        </View>
      </View>

      <View
        style={{
          marginTop: -18,
          marginBottom: 28,
        }}
      >
        <SecondaryAction
          label="Transfer between accounts"
          onPress={() => {
            router.push('/transfer' as never);
          }}
        />
      </View>

      {isInitialLoading ? (
        <LoadingState />
      ) : (
        <>
          <SectionHeading
            title="Accounts"
            supportingText="Balances are calculated by the server ledger."
          />

          {accounts.length === 0 ? (
            <EmptyState
              title="No accounts yet"
              body="Add your first account to start building your financial picture."
            />
          ) : (
            <View
              style={
                styles.stack
              }
            >
              {accounts
                .slice(0, 4)
                .map(
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

          <View
            style={
              styles.sectionSpacer
            }
          />

          <SectionHeading
            title="Recent activity"
            supportingText="Your latest ledger entries."
          />

          {activity.length === 0 ? (
            <EmptyState
              title="No activity yet"
              body="Income and expenses will appear here as you add them."
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
        </>
      )}
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
