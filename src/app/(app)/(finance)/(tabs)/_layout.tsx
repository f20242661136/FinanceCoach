import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs, useRouter } from 'expo-router';
import {
  StyleSheet,
  View,
} from 'react-native';

import {
  colors,
  elevation,
  layout,
  typography,
} from '@/design/tokens';

export default function FinanceTabs() {
  const router = useRouter();

  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarHideOnKeyboard: true,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
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
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'receipt' : 'receipt-outline'}
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="add"
        listeners={{
          tabPress: event => {
            event.preventDefault();
            router.push('/quick-add' as never);
          },
        }}
        options={{
          title: 'Add',
          tabBarIcon: () => (
            <View style={styles.addButton}>
              <Ionicons
                name="add"
                size={28}
                color={colors.textOnPrimary}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="plan"
        options={{
          title: 'Plan',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'pie-chart' : 'pie-chart-outline'}
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="coach"
        options={{
          title: 'Coach',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'sparkles' : 'sparkles-outline'}
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="accounts"
        options={{ href: null }}
      />

      <Tabs.Screen
        name="settings"
        options={{ href: null }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 0,
    backgroundColor: colors.surface,
    height: layout.tabBarHeight,
    paddingTop: 8,
    paddingBottom: 8,
    ...elevation.floating,
  },

  tabLabel: {
    fontSize: typography.caption,
    lineHeight: typography.lineHeightCaption,
    fontWeight: typography.weightSemibold,
  },

  addButton: {
    width: 48,
    height: 48,
    marginTop: -14,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    ...elevation.floating,
  },
});
