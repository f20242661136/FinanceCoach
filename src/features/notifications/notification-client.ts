import {
  Platform,
} from 'react-native';

import Constants
  from 'expo-constants';

import * as Crypto
  from 'expo-crypto';

import * as Device
  from 'expo-device';

import * as Notifications
  from 'expo-notifications';

import * as SecureStore
  from 'expo-secure-store';

import {
  registerNotificationDevice,
  unregisterNotificationDevice,
} from './notification-service';


const DEVICE_ID_KEY =
  'finance-coach.notification-device-id.v1';


export type PushRegistrationResult =
  | {
      status:
        'registered';

      deviceId: string;

      token: string;
    }

  | {
      status:
        'permission_denied'
        | 'physical_device_required'
        | 'project_id_missing'
        | 'unsupported_platform';

      message: string;
    };


export async function
ensureFinanceCoachNotificationChannel():
  Promise<void> {
  if (
    Platform.OS !==
      'android'
  ) {
    return;
  }


  await Notifications
    .setNotificationChannelAsync(
      'finance-coach-reminders',
      {
        name:
          'Finance Coach reminders',

        description:
          'Budget, savings, goal and finance reminders.',

        importance:
          Notifications
            .AndroidImportance
            .DEFAULT,

        vibrationPattern: [
          0,
          200,
          150,
          200,
        ],
      },
    );
}


export async function
getOrCreateNotificationDeviceId():
  Promise<string> {
  const existing =
    await SecureStore
      .getItemAsync(
        DEVICE_ID_KEY,
      );


  if (existing) {
    return existing;
  }


  const created =
    Crypto.randomUUID();


  await SecureStore
    .setItemAsync(
      DEVICE_ID_KEY,
      created,
    );


  return created;
}


function expoProjectId():
  string | null {
  return (
    Constants.expoConfig
      ?.extra
      ?.eas
      ?.projectId

    ??

    Constants.easConfig
      ?.projectId

    ??

    null
  );
}


export async function
registerCurrentDeviceForPush(
  requestPermission:
    boolean,
): Promise<PushRegistrationResult> {
  if (
    Platform.OS !== 'android'
    &&
    Platform.OS !== 'ios'
  ) {
    return {
      status:
        'unsupported_platform',

      message:
        'Push notifications are available on Android and iOS.',
    };
  }


  if (!Device.isDevice) {
    return {
      status:
        'physical_device_required',

      message:
        'Remote push notifications require a physical device. The notification center and scheduling can still be tested here.',
    };
  }


  await ensureFinanceCoachNotificationChannel();


  const existingPermission =
    await Notifications
      .getPermissionsAsync();


  let permissionStatus =
    existingPermission.status;


  if (
    permissionStatus !==
      'granted'
    &&
    requestPermission
  ) {
    const requested =
      await Notifications
        .requestPermissionsAsync();

    permissionStatus =
      requested.status;
  }


  if (
    permissionStatus !==
      'granted'
  ) {
    return {
      status:
        'permission_denied',

      message:
        requestPermission
          ? 'Notification permission was not granted.'
          : 'Notification permission has not been granted yet.',
    };
  }


  const projectId =
    expoProjectId();


  if (!projectId) {
    return {
      status:
        'project_id_missing',

      message:
        'Expo EAS projectId is missing from the app configuration.',
    };
  }


  const token =
    (
      await Notifications
        .getExpoPushTokenAsync({
          projectId,
        })
    ).data;


  const deviceId =
    await getOrCreateNotificationDeviceId();


  await registerNotificationDevice(
    deviceId,
    token,
    Platform.OS,
  );


  return {
    status:
      'registered',

    deviceId,

    token,
  };
}


export async function
refreshExistingPushRegistration():
  Promise<void> {
  try {
    const result =
      await registerCurrentDeviceForPush(
        false,
      );


    if (
      result.status ===
        'registered'
    ) {
      return;
    }
  } catch {
    // Push registration is best-effort at app startup.
    // The settings UI exposes explicit retry/error feedback.
  }
}


export async function
disableCurrentDevicePush():
  Promise<void> {
  const deviceId =
    await SecureStore
      .getItemAsync(
        DEVICE_ID_KEY,
      );


  if (!deviceId) {
    return;
  }


  await unregisterNotificationDevice(
    deviceId,
  );
}