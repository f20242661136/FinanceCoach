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
  useRecentActivity,
} from '@/features/transactions/transaction-hooks';

import {
  ActivityRow,
  EmptyState,
  ErrorState,
  FinanceCard,
  LoadingState,
  PrimaryButton,
  SecondaryButton,
  financeColors,
} from '@/features/finance/finance-ui';

export default function ActivityScreen() {
  const insets =
    useSafeAreaInsets();

  const activity =
    useRecentActivity(50);

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
            activity.isRefetching
          }
          onRefresh={() => {
            void activity.refetch();
          }}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>
          Activity
        </Text>

        <Text style={styles.subtitle}>
          A ledger-backed view of your
          recent money movement.
        </Text>
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          title="Expense"
          icon="remove-circle-outline"
          style={styles.action}
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
          title="Income"
          icon="add-circle-outline"
          style={styles.action}
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
          title="Nothing here yet"
          description="Add your first income or expense and it will appear here."
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
    gap: 5,
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
  },

  actions: {
    flexDirection: 'row',
    gap: 10,
  },

  action: {
    flex: 1,
  },
});