import {
  z,
} from 'zod';


const timeSchema =
  z.string()
    .regex(
      /^([01]\d|2[0-3]):[0-5]\d$/,
    );


export const notificationTypeSchema =
  z.enum([
    'bill_reminder',
    'budget_warning',
    'savings_reminder',
    'loan_payment_reminder',
    'rosca_contribution_reminder',
    'challenge_reminder',
    'streak_reminder',
    'ai_insight',
    'motivational_message',
  ]);


export type NotificationType =
  z.infer<
    typeof notificationTypeSchema
  >;


export const notificationPreferencesSchema =
  z.object({
    master_enabled:
      z.boolean(),

    push_enabled:
      z.boolean(),

    in_app_enabled:
      z.boolean(),

    timezone:
      z.string().min(1),

    quiet_hours_enabled:
      z.boolean(),

    quiet_hours_start:
      timeSchema,

    quiet_hours_end:
      timeSchema,

    reminder_time_local:
      timeSchema,

    streak_reminder_time_local:
      timeSchema,

    budget_warning_threshold_basis_points:
      z.number()
        .int()
        .min(5000)
        .max(10000),

    bill_reminders_enabled:
      z.boolean(),

    budget_warnings_enabled:
      z.boolean(),

    savings_reminders_enabled:
      z.boolean(),

    loan_payment_reminders_enabled:
      z.boolean(),

    rosca_contribution_reminders_enabled:
      z.boolean(),

    challenge_reminders_enabled:
      z.boolean(),

    streak_reminders_enabled:
      z.boolean(),

    ai_insights_enabled:
      z.boolean(),

    motivational_messages_enabled:
      z.boolean(),
  });


export type NotificationPreferences =
  z.infer<
    typeof notificationPreferencesSchema
  >;


export type UpdateNotificationPreferencesInput =
  NotificationPreferences;


export const notificationCenterItemSchema =
  z.object({
    id:
      z.string().uuid(),

    notification_type:
      notificationTypeSchema,

    title:
      z.string().min(1),

    body:
      z.string().min(1),

    deep_link:
      z.string()
        .nullable(),

    scheduled_for:
      z.string().min(1),

    status:
      z.enum([
        'pending',
        'sent',
        'failed',
      ]),

    sent_at:
      z.string()
        .nullable(),

    opened:
      z.boolean(),
  });


export const notificationCenterListSchema =
  z.array(
    notificationCenterItemSchema,
  );


export type NotificationCenterItem =
  z.infer<
    typeof notificationCenterItemSchema
  >;