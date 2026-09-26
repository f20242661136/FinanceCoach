import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  router,
} from 'expo-router';

import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  useAccountSummaries,
} from '@/features/accounts/account-hooks';

import {
  useRecentActivity,
} from '@/features/transactions/transaction-hooks';

import {
  formatMinorUnits,
} from '@/domain/money/money';

import {
  ActivityRow,
  EmptyState,
  ErrorState,
  FinanceCard,
  LoadingState,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
  financeColors,
} from '@/features/finance/finance-ui';

export default function HomeScreen() {
  const insets =
    useSafeAreaInsets();

  const accounts =
    useAccountSummaries();

  const activity =
    useRecentActivity(5);

  const refreshing =
    accounts.isRefetching ||
    activity.isRefetching;

  const refresh = async () => {
    await Promise.all([
      accounts.refetch(),
      activity.refetch(),
    ]);
  };

  return (
    <ScrollView
      nestedScrollEnabled
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop:
            insets.top + 18,
        },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            void refresh();
          }}
          tintColor={
            financeColors.primary
          }
        />
      }
    >
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>
          FINANCE COACH
        </Text>

        <Text style={styles.title}>
          Your money, clearly.
        </Text>

        <Text style={styles.subtitle}>
          Accounts and activity stay
          separate by currency so the
          numbers remain meaningful.
        </Text>
      </View>

      <View style={styles.quickActions}>
        <PrimaryButton
          title="Add expense"
          icon="remove-circle-outline"
          style={styles.quickButton}
          onPress={() =>
            router.push({
              pathname:
                '/quick-add',
              params: {
                type: 'expense',
              },
            })
          }
        />

        <SecondaryButton
          title="Add income"
          icon="add-circle-outline"
          style={styles.quickButton}
          onPress={() =>
            router.push({
              pathname:
                '/quick-add',
              params: {
                type: 'income',
              },
            })
          }
        />
      </View>

      <SectionHeader
        title="Accounts"
        action={
          <SecondaryButton
            title="Add"
            icon="add"
            onPress={() =>
              router.push(
                '/add-account',
              )
            }
          />
        }
      />

      {accounts.isLoading ? (
        <LoadingState />
      ) : accounts.isError ? (
        <ErrorState
          onRetry={() => {
            void accounts.refetch();
          }}
        />
      ) : accounts.data?.length ? (
        <View style={styles.stack}>
          {accounts.data
            .slice(0, 4)
            .map((account) => (
              <FinanceCard
                key={account.id}
              >
                <Text
                  style={
                    styles.accountName
                  }
                >
                  {account.name}
                </Text>

                <Text
                  style={
                    styles.accountType
                  }
                >
                  {account.account_type_code
                    .replaceAll(
                      '_',
                      ' ',
                    )}
                </Text>

                <Text
                  style={
                    styles.balance
                  }
                >
                  {formatMinorUnits(
                    account.current_balance_minor,
                    account.currency_code,
                    account.currency_minor_unit,
                  )}
                </Text>
              </FinanceCard>
            ))}
        </View>
      ) : (
        <EmptyState
          title="Add your first account"
          description="Start with a bank account, cash wallet, card, or other place where money lives."
          action={
            <PrimaryButton
              title="Add account"
              icon="add"
              onPress={() =>
                router.push(
                  '/add-account',
                )
              }
            />
          }
        />
      )}

      <SectionHeader
        title="Recent activity"
        action={
          <SecondaryButton
            title="See all"
            onPress={() =>
              router.push(
                '/activity',
              )
            }
          />
        }
      />

      {activity.isLoading ? (
        <LoadingState />
      ) : activity.isError ? (
        <ErrorState
          onRetry={() => {
            void activity.refetch();
          }}
        />
      ) : activity.data?.length ? (
        <FinanceCard>
          {activity.data.map(
            (item) => (
              <ActivityRow
                key={item.id}
                activity={item}
              />
            ),
          )}
        </FinanceCard>
      ) : (
        <EmptyState
          title="No activity yet"
          description="Income and expenses will appear here after you add them."
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor:
      financeColors.background,
  },

  content: {
    paddingHorizontal: 18,
    paddingBottom: 36,
    gap: 18,
  },

  hero: {
    gap: 7,
    paddingBottom: 4,
  },

  eyebrow: {
    color:
      financeColors.primary,

    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
  },

  title: {
    color:
      financeColors.text,

    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
  },

  subtitle: {
    color:
      financeColors.textMuted,

    fontSize: 15,
    lineHeight: 22,
    maxWidth: 520,
  },

  quickActions: {
    flexDirection: 'row',
    gap: 10,
  },

  quickButton: {
    flex: 1,
  },

  stack: {
    gap: 10,
  },

  accountName: {
    color:
      financeColors.text,

    fontSize: 16,
    fontWeight: '700',
  },

  accountType: {
    color:
      financeColors.textMuted,

    fontSize: 12,
    marginTop: 3,
    textTransform: 'capitalize',
  },

  balance: {
    marginTop: 17,
    color:
      financeColors.text,

    fontSize: 23,
    fontWeight: '800',
  },
});