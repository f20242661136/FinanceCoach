import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

import {
  colors,
  layout,
  typography,
} from '@/design/tokens';

export default function FinanceTabs() {
  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: false,

        tabBarActiveTintColor:
          colors.primary,

        tabBarInactiveTintColor:
          colors.textSecondary,

        tabBarStyle: {
          borderTopColor:
            colors.border,

          backgroundColor:
            colors.surface,

          height: layout.tabBarHeight,
          paddingTop: 7,
          paddingBottom: 7,
        },

        tabBarLabelStyle: {
          fontSize: typography.caption,
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