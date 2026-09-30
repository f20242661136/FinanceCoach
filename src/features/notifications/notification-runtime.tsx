import {
  useEffect,
  useRef,
} from 'react';

import * as Notifications
  from 'expo-notifications';

import {
  useRouter,
} from 'expo-router';

import {
  useQueryClient,
} from '@tanstack/react-query';

import {
  refreshExistingPushRegistration,
} from './notification-client';

import {
  notificationKeys,
} from './notification-query';

import {
  markNotificationOpened,
} from './notification-service';


Notifications.setNotificationHandler({
  handleNotification:
    async () => ({
      shouldShowBanner:
        false,

      shouldShowList:
        false,

      shouldPlaySound:
        false,

      shouldSetBadge:
        false,
    }),
});


function safeInternalPath(
  value: unknown,
): string | null {
  if (
    typeof value !==
      'string'
  ) {
    return null;
  }


  if (
    !value.startsWith(
      '/',
    )
    ||
    value.startsWith(
      '//',
    )
  ) {
    return null;
  }


  return value;
}


export function NotificationRuntime() {
  const router =
    useRouter();

  const queryClient =
    useQueryClient();

  const handledResponseIds =
    useRef(
      new Set<string>(),
    );


  useEffect(() => {
    void refreshExistingPushRegistration();


    const receivedSubscription =
      Notifications
        .addNotificationReceivedListener(
          () => {
            void queryClient
              .invalidateQueries({
                queryKey:
                  notificationKeys.center,
              });
          },
        );


    const handleResponse =
      async (
        response:
          Notifications
            .NotificationResponse,
      ) => {
        const responseId =
          response
            .notification
            .request
            .identifier;


        if (
          handledResponseIds
            .current
            .has(
              responseId,
            )
        ) {
          return;
        }


        handledResponseIds
          .current
          .add(
            responseId,
          );


        const data =
          response
            .notification
            .request
            .content
            .data;


        const notificationId =
          typeof data
            ?.notificationId ===
            'string'
            ? data.notificationId
            : null;


        if (notificationId) {
          try {
            await markNotificationOpened(
              notificationId,
            );
          } catch {
            // Navigation should still work if acknowledgement fails.
          }


          void queryClient
            .invalidateQueries({
              queryKey:
                notificationKeys.center,
            });
        }


        const deepLink =
          safeInternalPath(
            data
              ?.deepLink,
          );


        if (deepLink) {
          router.push(
            deepLink as never,
          );
        }
      };


    const responseSubscription =
      Notifications
        .addNotificationResponseReceivedListener(
          (
            response,
          ) => {
            void handleResponse(
              response,
            );
          },
        );


    void Notifications
      .getLastNotificationResponseAsync()
      .then(
        (
          response,
        ) => {
          if (response) {
            void handleResponse(
              response,
            );
          }
        },
      );


    return () => {
      receivedSubscription
        .remove();

      responseSubscription
        .remove();
    };
  }, [
    queryClient,
    router,
  ]);


  return null;
}
