import {
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  AppState,
  type AppStateStatus,
  Platform,
} from 'react-native';

import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

import {
  AuthContext,
  type Profile,
} from './auth-context';

import { signOutCurrentSession } from './auth-service';

type ProfileStatus =
  | 'idle'
  | 'ready'
  | 'error';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected authentication error occurred.';
}

async function getProfile(
  userId: string,
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export function AuthProvider({
  children,
}: PropsWithChildren) {
  const [session, setSession] =
    useState<Session | null>(null);

  const [sessionLoaded, setSessionLoaded] =
    useState(false);

  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [profileStatus, setProfileStatus] =
    useState<ProfileStatus>('idle');

  const [error, setError] =
    useState<string | null>(null);

  const userId = session?.user.id ?? null;

  useEffect(() => {
    let mounted = true;

    const loadInitialSession = async () => {
      try {
        const {
          data,
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (mounted) {
          setSession(data.session);
        }
      } catch (sessionError) {
        if (mounted) {
          setError(
            getErrorMessage(sessionError),
          );
        }
      } finally {
        if (mounted) {
          setSessionLoaded(true);
        }
      }
    };

    void loadInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        setSession(nextSession);
        setError(null);

        if (
          event === 'SIGNED_OUT' ||
          event === 'SIGNED_IN' ||
          event === 'INITIAL_SESSION'
        ) {
          setProfile(null);
          setProfileStatus('idle');
        }
      },
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    const handleAppState =
      (state: AppStateStatus) => {
        if (state === 'active') {
          void supabase.auth.startAutoRefresh();
        } else {
          void supabase.auth.stopAutoRefresh();
        }
      };

    handleAppState(AppState.currentState);

    const subscription =
      AppState.addEventListener(
        'change',
        handleAppState,
      );

    return () => {
      subscription.remove();
      void supabase.auth.stopAutoRefresh();
    };
  }, []);

  useEffect(() => {
    if (!sessionLoaded || !userId) {
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      try {
        const nextProfile =
          await getProfile(userId);

        if (!cancelled) {
          setProfile(nextProfile);
          setProfileStatus('ready');
          setError(null);
        }
      } catch (profileError) {
        if (!cancelled) {
          setProfile(null);
          setProfileStatus('error');
          setError(
            getErrorMessage(profileError),
          );
        }
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [
    sessionLoaded,
    userId,
  ]);

  const refreshProfile =
    useCallback(async (): Promise<void> => {
      if (!userId) {
        return;
      }

      try {
        const nextProfile =
          await getProfile(userId);

        setProfile(nextProfile);
        setProfileStatus('ready');
        setError(null);
      } catch (profileError) {
        setProfileStatus('error');
        setError(
          getErrorMessage(profileError),
        );

        throw profileError;
      }
    }, [userId]);

  const signOut =
    useCallback(async (): Promise<void> => {
      await signOutCurrentSession();
    }, []);

  const profileBelongsToSession =
    profile !== null &&
    profile.user_id === userId;

  const activeProfile =
    profileBelongsToSession
      ? profile
      : null;

  const hasProfileError =
    session !== null &&
    profileStatus === 'error';

  const isReady =
    sessionLoaded &&
    (
      !session ||
      profileBelongsToSession ||
      hasProfileError
    );

  const value = useMemo(
    () => ({
      session,
      profile: activeProfile,
      isReady,
      isAuthenticated:
        session !== null,
      needsOnboarding:
        session !== null &&
        activeProfile !== null &&
        activeProfile.onboarding_completed !== true,
      hasProfileError,
      error,
      refreshProfile,
      signOut,
    }),
    [
      session,
      activeProfile,
      isReady,
      hasProfileError,
      error,
      refreshProfile,
      signOut,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}