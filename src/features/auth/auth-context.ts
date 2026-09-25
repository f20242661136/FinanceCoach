import {
  createContext,
  useContext,
} from 'react';

import type { Session } from '@supabase/supabase-js';

import type { Database } from '@/types/database.types';

export type Profile =
  Database['public']['Tables']['profiles']['Row'];

export type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;

  isReady: boolean;
  isAuthenticated: boolean;
  needsOnboarding: boolean;

  error: string | null;

  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext =
  createContext<AuthContextValue | undefined>(
    undefined,
  );

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used inside AuthProvider.',
    );
  }

  return context;
}
