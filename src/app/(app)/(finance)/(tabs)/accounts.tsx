import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { router } from 'expo-router';
import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  useAccountSummaries,
} from '@/features/accounts/account-hooks';

import {
  formatMinorUnits,
} from '@/domain/money/money';

import {
  EmptyState,
  ErrorState,
  FinanceCard,
  LoadingState,
  PrimaryButton,
  financeColors,
} from '@/features/finance/finance-ui';

export default function AccountsScreen() {
  const insets =
    useSafeAreaInsets();

  const accounts =
    useAccountSummaries();

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
          refreshing={
            accounts.isRefetching
          }
          onRefresh={() => {
            void accounts.refetch();
          }}
        />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>
            Accounts
          </Text>

          <Text style={styles.subtitle}>
            Balances are calculated from
            your ledger, not manually
            stored totals.
          </Text>
        </View>

        <PrimaryButton
          title="Add"
          icon="add"
          onPress={() =>
            router.push(
              '/add-account',
            )
          }
        />
      </View>

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
          {accounts.data.map(
            (account) => (
              <FinanceCard
                key={account.id}
              >
                <View
                  style={
                    styles.accountTop
                  }
                >
                  <View style={{ flex: 1 }}>
                    <Text
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
                      {account.account_type_code
                        .replaceAll(
                          '_',
                          ' ',
                        )}
                      {' Â· '}
                      {account.currency_code}
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.status
                    }
                  >
                    {account.status}
                  </Text>
                </View>

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
            ),
          )}
        </View>
      ) : (
        <EmptyState
          title="No accounts yet"
          description="Add the places where you hold money or owe money."
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

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },

  headerCopy: {
    flex: 1,
  },

  title: {
    color:
      financeColors.text,

    fontSize: 30,
    fontWeight: '800',
  },

  subtitle: {
    color:
      financeColors.textMuted,

    lineHeight: 20,
    marginTop: 5,
  },

  stack: {
    gap: 10,
  },

  accountTop: {
    flexDirection: 'row',
    gap: 12,
  },

  accountName: {
    color:
      financeColors.text,

    fontSize: 17,
    fontWeight: '700',
  },

  accountMeta: {
    color:
      financeColors.textMuted,

    fontSize: 13,
    marginTop: 4,
    textTransform: 'capitalize',
  },

  status: {
    color:
      financeColors.primary,

    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },

  balance: {
    color:
      financeColors.text,

    fontSize: 24,
    fontWeight: '800',
    marginTop: 20,
  },
});