import { Redirect } from 'expo-router';

import { useAuth } from '@/features/auth/auth-context';

export default function IndexRoute() {
  const {
    isAuthenticated,
    needsOnboarding,
  } = useAuth();

  if (!isAuthenticated) {
    return (
      <Redirect href="/sign-in" />
    );
  }

  if (needsOnboarding) {
    return (
      <Redirect href="/setup" />
    );
  }

  return <Redirect href="/home" />;
}