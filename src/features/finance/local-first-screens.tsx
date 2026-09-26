import {
  ActivityIndicator,
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


const palette = {
  background: '#F5F7F3',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF3ED',
  text: '#172019',
  textMuted: '#647069',
  border: '#DDE5DC',
  primary: '#245C45',
  primaryPressed: '#1D4C39',
  positive: '#1F6A48',
  negative: '#A34343',
  warningBackground: '#FFF7E8',
  warningText: '#73551E',
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
    return `${currencyCode} â€”`;
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
        {title}
      </Text>

      <Text
        style={
          styles.emptyBody
        }
      >
        {body}
      </Text>
    </View>
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
    <View
      style={
        styles.sectionHeading
      }
    >
      <Text
        style={
          styles.sectionTitle
        }
      >
        {title}
      </Text>

      {supportingText ? (
        <Text
          style={
            styles.sectionSupporting
          }
        >
          {supportingText}
        </Text>
      ) : null}
    </View>
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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        label
      }
      onPress={
        onPress
      }
      style={({
        pressed,
      }) => [
        styles.primaryAction,
        pressed
          ? styles.primaryActionPressed
          : null,
      ]}
    >
      <Text
        style={
          styles.primaryActionText
        }
      >
        {label}
      </Text>
    </Pressable>
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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        label
      }
      onPress={
        onPress
      }
      style={({
        pressed,
      }) => [
        styles.secondaryAction,
        pressed
          ? styles.secondaryActionPressed
          : null,
      ]}
    >
      <Text
        style={
          styles.secondaryActionText
        }
      >
        {label}
      </Text>
    </Pressable>
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
            {' Â· '}
            {account.currency_code}
          </Text>
        </View>

        <View
          style={
            styles.statusPill
          }
        >
          <Text
            style={
              styles.statusPillText
            }
          >
            {account.status}
          </Text>
        </View>
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
        ? 'âˆ’'
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
            ? ` Â· ${item.category_name}`
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
    <View
      style={
        styles.loading
      }
    >
      <ActivityIndicator
        size="small"
      />

      <Text
        style={
          styles.loadingText
        }
      >
        Loading saved financesâ€¦
      </Text>
    </View>
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
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 120,
    },

    hero: {
      paddingTop: 8,
      paddingBottom: 22,
    },

    eyebrow: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1.4,
      color:
        palette.primary,
      marginBottom: 8,
    },

    heroTitle: {
      fontSize: 32,
      lineHeight: 38,
      fontWeight: '700',
      color:
        palette.text,
      letterSpacing: -0.7,
    },

    heroBody: {
      marginTop: 9,
      maxWidth: 420,
      fontSize: 15,
      lineHeight: 22,
      color:
        palette.textMuted,
    },

    pageHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      gap: 16,
      marginBottom: 20,
    },

    pageHeaderCopy: {
      flex: 1,
    },

    pageTitle: {
      fontSize: 28,
      lineHeight: 34,
      fontWeight: '700',
      color:
        palette.text,
      letterSpacing: -0.5,
    },

    pageSubtitle: {
      marginTop: 5,
      fontSize: 14,
      lineHeight: 20,
      color:
        palette.textMuted,
    },

    offlineBanner: {
      backgroundColor:
        palette.warningBackground,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 16,
    },

    offlineTitle: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '700',
      color:
        palette.warningText,
    },

    offlineBody: {
      marginTop: 2,
      fontSize: 12,
      lineHeight: 17,
      color:
        palette.warningText,
    },

    actionRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 28,
    },

    actionColumn: {
      flex: 1,
    },

    primaryAction: {
      minHeight: 50,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 14,
      backgroundColor:
        palette.primary,
      paddingHorizontal: 16,
    },

    primaryActionPressed: {
      opacity: 0.84,
    },

    primaryActionText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#FFFFFF',
    },

    secondaryAction: {
      minHeight: 50,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 14,
      backgroundColor:
        palette.surface,
      borderWidth: 1,
      borderColor:
        palette.border,
      paddingHorizontal: 16,
    },

    secondaryActionPressed: {
      backgroundColor:
        palette.surfaceMuted,
    },

    secondaryActionText: {
      fontSize: 15,
      fontWeight: '700',
      color:
        palette.text,
    },

    compactButton: {
      minWidth: 66,
      minHeight: 42,
      paddingHorizontal: 15,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 13,
      backgroundColor:
        palette.primary,
    },

    compactButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },

    sectionHeading: {
      marginBottom: 12,
    },

    sectionTitle: {
      fontSize: 19,
      lineHeight: 24,
      fontWeight: '700',
      color:
        palette.text,
    },

    sectionSupporting: {
      marginTop: 3,
      fontSize: 13,
      lineHeight: 18,
      color:
        palette.textMuted,
    },

    sectionSpacer: {
      height: 28,
    },

    stack: {
      gap: 10,
    },

    accountCard: {
      borderRadius: 18,
      padding: 17,
      backgroundColor:
        palette.surface,
      borderWidth: 1,
      borderColor:
        palette.border,
    },

    accountTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent:
        'space-between',
      gap: 12,
    },

    accountIdentity: {
      flex: 1,
    },

    accountName: {
      fontSize: 16,
      lineHeight: 21,
      fontWeight: '700',
      color:
        palette.text,
    },

    accountMeta: {
      marginTop: 3,
      fontSize: 12,
      lineHeight: 17,
      textTransform:
        'capitalize',
      color:
        palette.textMuted,
    },

    statusPill: {
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor:
        palette.surfaceMuted,
    },

    statusPillText: {
      fontSize: 11,
      lineHeight: 14,
      textTransform:
        'capitalize',
      fontWeight: '700',
      color:
        palette.primary,
    },

    accountBalance: {
      marginTop: 19,
      fontSize: 22,
      lineHeight: 27,
      fontWeight: '700',
      color:
        palette.text,
      letterSpacing: -0.35,
    },

    activityCard: {
      backgroundColor:
        palette.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor:
        palette.border,
      paddingHorizontal: 16,
    },

    activityRow: {
      minHeight: 88,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 14,
    },

    activityMain: {
      flex: 1,
      minWidth: 0,
    },

    activityTitle: {
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '700',
      color:
        palette.text,
    },

    activityMeta: {
      marginTop: 3,
      fontSize: 12,
      lineHeight: 17,
      color:
        palette.textMuted,
    },

    activityDate: {
      marginTop: 3,
      fontSize: 11,
      lineHeight: 15,
      color:
        palette.textMuted,
    },

    activityAmount: {
      maxWidth: '44%',
      textAlign: 'right',
      fontSize: 14,
      lineHeight: 19,
      fontWeight: '700',
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
      borderRadius: 18,
      padding: 22,
      backgroundColor:
        palette.surface,
      borderWidth: 1,
      borderColor:
        palette.border,
    },

    emptyTitle: {
      fontSize: 16,
      lineHeight: 21,
      fontWeight: '700',
      color:
        palette.text,
    },

    emptyBody: {
      marginTop: 5,
      fontSize: 14,
      lineHeight: 20,
      color:
        palette.textMuted,
    },

    loading: {
      minHeight: 180,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },

    loadingText: {
      fontSize: 13,
      color:
        palette.textMuted,
    },
  });