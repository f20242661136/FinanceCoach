import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  getNotificationCenter,
  getNotificationPreferences,
  markNotificationOpened,
  refreshMyNotificationSchedule,
  updateNotificationPreferences,
} from './notification-service';

import type {
  UpdateNotificationPreferencesInput,
} from './notification-contract';


export const notificationKeys = {
  all:
    [
      'notifications',
    ] as const,

  preferences:
    (
      timezone: string,
    ) =>
      [
        'notifications',
        'preferences',
        timezone,
      ] as const,

  center:
    [
      'notifications',
      'center',
    ] as const,
};


export function
useNotificationPreferences(
  timezone: string,
) {
  return useQuery({
    queryKey:
      notificationKeys.preferences(
        timezone,
      ),

    queryFn:
      () =>
        getNotificationPreferences(
          timezone,
        ),

    enabled:
      Boolean(
        timezone,
      ),

    retry:
      1,

    staleTime:
      60_000,
  });
}


export function
useNotificationCenter() {
  return useQuery({
    queryKey:
      notificationKeys.center,

    queryFn:
      getNotificationCenter,

    retry:
      1,

    staleTime:
      30_000,
  });
}


export function
useUpdateNotificationPreferences(
  timezone: string,
) {
  const queryClient =
    useQueryClient();


  return useMutation({
    mutationKey: [
      'notifications',
      'update-preferences',
    ],

    mutationFn:
      (
        input:
          UpdateNotificationPreferencesInput,
      ) =>
        updateNotificationPreferences(
          input,
        ),

    onSuccess:
      async () => {
        await queryClient
          .invalidateQueries({
            queryKey:
              notificationKeys.preferences(
                timezone,
              ),
          });
      },
  });
}


export function
useRefreshMyNotificationSchedule() {
  const queryClient =
    useQueryClient();


  return useMutation({
    mutationKey: [
      'notifications',
      'refresh-schedule',
    ],

    mutationFn:
      refreshMyNotificationSchedule,

    onSuccess:
      async () => {
        await queryClient
          .invalidateQueries({
            queryKey:
              notificationKeys.center,
          });
      },
  });
}


export function
useMarkNotificationOpened() {
  const queryClient =
    useQueryClient();


  return useMutation({
    mutationKey: [
      'notifications',
      'opened',
    ],

    mutationFn:
      markNotificationOpened,

    onSuccess:
      async () => {
        await queryClient
          .invalidateQueries({
            queryKey:
              notificationKeys.center,
          });
      },
  });
}