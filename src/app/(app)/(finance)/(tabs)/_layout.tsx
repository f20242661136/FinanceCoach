import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

import {
  financeColors,
} from '@/features/finance/finance-ui';

export default function FinanceTabs() {
  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: false,

        tabBarActiveTintColor:
          financeColors.primary,

        tabBarInactiveTintColor:
          financeColors.textMuted,

        tabBarStyle: {
          borderTopColor:
            financeColors.border,

          backgroundColor:
            financeColors.surface,

          height: 66,
          paddingTop: 7,
          paddingBottom: 7,
        },

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',

          tabBarIcon: ({
            color,
            size,
          }) => (
            <Ionicons
              name="home-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="accounts"
        options={{
          title: 'Accounts',

          tabBarIcon: ({
            color,
            size,
          }) => (
            <Ionicons
              name="wallet-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',

          tabBarIcon: ({
            color,
            size,
          }) => (
            <Ionicons
              name="receipt-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}