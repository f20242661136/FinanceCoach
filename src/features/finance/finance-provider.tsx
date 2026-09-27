import {
  NotificationRuntime,
} from '../notifications/notification-runtime';

import {
  type PropsWithChildren,
  useEffect,
  useRef,
} from 'react';

import {
  QueryClientProvider,
} from '@tanstack/react-query';

import { queryClient } from '@/lib/query-client';
import { supabase } from '@/lib/supabase';

export function FinanceProvider({
  children,
}: PropsWithChildren) {
  const previousUserId =
    useRef<string | null>(null);

  useEffect(() => {
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        previousUserId.current =
          data.session?.user.id ?? null;
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const nextUserId =
          session?.user.id ?? null;

        if (
          previousUserId.current !==
          nextUserId
        ) {
          queryClient.clear();
        }

        previousUserId.current =
          nextUserId;
      },
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <QueryClientProvider
      client={queryClient}
    >
      <NotificationRuntime />
      {children}
    </QueryClientProvider>
  );
}