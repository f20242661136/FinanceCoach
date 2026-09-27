import {
  supabase,
} from '../../lib/supabase';

import {
  notificationCenterListSchema,
  notificationPreferencesSchema,
  type NotificationCenterItem,
  type NotificationPreferences,
  type UpdateNotificationPreferencesInput,
} from './notification-contract';


type RpcResult = {
  data: unknown;

  error: {
    message: string;
    code?: string;
  } | null;
};


const callRpc =
  supabase.rpc.bind(
    supabase,
  ) as unknown as (
    functionName: string,
    args?: Record<
      string,
      unknown
    >,
  ) => Promise<RpcResult>;


export async function
getNotificationPreferences(
  timezone: string,
): Promise<NotificationPreferences> {
  const {
    data,
    error,
  } =
    await callRpc(
      'get_notification_preferences',
      {
        p_timezone:
          timezone,
      },
    );


  if (error) {
    throw new Error(
      error.message,
    );
  }


  return notificationPreferencesSchema
    .parse(
      data,
    );
}


export async function
updateNotificationPreferences(
  input:
    UpdateNotificationPreferencesInput,
): Promise<NotificationPreferences> {
  const {
    data,
    error,
  } =
    await callRpc(
      'update_notification_preferences',
      {
        p_master_enabled:
          input.master_enabled,

        p_push_enabled:
          input.push_enabled,

        p_in_app_enabled:
          input.in_app_enabled,

        p_timezone:
          input.timezone,

        p_quiet_hours_enabled:
          input.quiet_hours_enabled,

        p_quiet_hours_start:
          input.quiet_hours_start,

        p_quiet_hours_end:
          input.quiet_hours_end,

        p_reminder_time_local:
          input.reminder_time_local,

        p_streak_reminder_time_local:
          input.streak_reminder_time_local,

        p_budget_warning_threshold_basis_points:
          input.budget_warning_threshold_basis_points,

        p_bill_reminders_enabled:
          input.bill_reminders_enabled,

        p_budget_warnings_enabled:
          input.budget_warnings_enabled,

        p_savings_reminders_enabled:
          input.savings_reminders_enabled,

        p_loan_payment_reminders_enabled:
          input.loan_payment_reminders_enabled,

        p_rosca_contribution_reminders_enabled:
          input.rosca_contribution_reminders_enabled,

        p_challenge_reminders_enabled:
          input.challenge_reminders_enabled,

        p_streak_reminders_enabled:
          input.streak_reminders_enabled,

        p_ai_insights_enabled:
          input.ai_insights_enabled,

        p_motivational_messages_enabled:
          input.motivational_messages_enabled,
      },
    );


  if (error) {
    throw new Error(
      error.message,
    );
  }


  return notificationPreferencesSchema
    .parse(
      data,
    );
}


export async function
registerNotificationDevice(
  deviceId: string,
  expoPushToken: string,
  platform:
    'android'
    | 'ios',
): Promise<string> {
  const {
    data,
    error,
  } =
    await callRpc(
      'register_notification_device',
      {
        p_device_id:
          deviceId,

        p_expo_push_token:
          expoPushToken,

        p_platform:
          platform,
      },
    );


  if (error) {
    throw new Error(
      error.message,
    );
  }


  if (
    typeof data !==
      'string'
  ) {
    throw new Error(
      'Notification device registration returned an invalid response.',
    );
  }


  return data;
}


export async function
unregisterNotificationDevice(
  deviceId: string,
): Promise<string> {
  const {
    data,
    error,
  } =
    await callRpc(
      'unregister_notification_device',
      {
        p_device_id:
          deviceId,
      },
    );


  if (error) {
    throw new Error(
      error.message,
    );
  }


  if (
    typeof data !==
      'string'
  ) {
    throw new Error(
      'Notification device removal returned an invalid response.',
    );
  }


  return data;
}


export async function
refreshMyNotificationSchedule(
  timezone: string,
): Promise<number> {
  const {
    data,
    error,
  } =
    await callRpc(
      'refresh_my_notification_schedule',
      {
        p_timezone:
          timezone,

        p_horizon_days:
          14,
      },
    );


  if (error) {
    throw new Error(
      error.message,
    );
  }


  if (
    typeof data !==
      'number'
  ) {
    throw new Error(
      'Notification schedule refresh returned an invalid response.',
    );
  }


  return data;
}


export async function
getNotificationCenter():
  Promise<
    NotificationCenterItem[]
  > {
  const {
    data,
    error,
  } =
    await callRpc(
      'get_notification_center',
      {
        p_limit:
          50,
      },
    );


  if (error) {
    throw new Error(
      error.message,
    );
  }


  return notificationCenterListSchema
    .parse(
      data,
    );
}


export async function
markNotificationOpened(
  notificationId: string,
): Promise<string> {
  const {
    data,
    error,
  } =
    await callRpc(
      'mark_notification_opened',
      {
        p_notification_id:
          notificationId,
      },
    );


  if (error) {
    throw new Error(
      error.message,
    );
  }


  if (
    typeof data !==
      'string'
  ) {
    throw new Error(
      'Notification open acknowledgement returned an invalid response.',
    );
  }


  return data;
}