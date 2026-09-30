import { SecurityProvider } from '@/features/security/security-provider';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';

import {
  colors,
} from '@/design/tokens';
import {
  AuthProvider,
} from '@/features/auth/auth-provider';
import {
  useAuth,
} from '@/features/auth/auth-context';
import {
  LoadingScreen,
} from '@/components/ui/loading-screen';
import {
  ProfileErrorScreen,
} from '@/components/ui/profile-error-screen';
import {
  SubscriptionProvider,
} from '@/features/subscriptions/subscription-provider';

function RootNavigator() {
  const {
    isReady,
    isAuthenticated,
    needsOnboarding,
    hasProfileError,
    error,
    refreshProfile,
    signOut,
  } = useAuth();

  if (!isReady) {
    return <LoadingScreen />;
  }

  if (hasProfileError) {
    return (
      <ProfileErrorScreen
        detail={error}
        onRetry={refreshProfile}
        onSignOut={signOut}
      />
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor:
            colors.background,
        },
      }}
    >
      <Stack.Screen name="index" />

      <Stack.Protected
        guard={!isAuthenticated}
      >
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      <Stack.Protected
        guard={
          isAuthenticated &&
          needsOnboarding
        }
      >
        <Stack.Screen
          name="(onboarding)"
        />
      </Stack.Protected>

      <Stack.Protected
        guard={
          isAuthenticated &&
          !needsOnboarding
        }
      >
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <>
      <StatusBar
        style="dark"
        animated
      />

      <SafeAreaView
        edges={[
          'top',
        ]}
        style={
          styles.rootSystemSafeArea
        }
      >
        <AuthProvider>
          <SecurityProvider>
          <SubscriptionProvider>
            <RootNavigator />
          </SubscriptionProvider>
          </SecurityProvider>
        </AuthProvider>
      </SafeAreaView>
    </>
  );
}

const styles =
  StyleSheet.create({
    rootSystemSafeArea: {
      flex: 1,
      backgroundColor:
        colors.background,
    },
  });
