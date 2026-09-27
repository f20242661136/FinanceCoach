# Finance Coach Notification Architecture

## Trust boundary

PostgreSQL decides whether a reminder is valid and when it can be delivered.

The mobile client can:

- manage its own notification preferences;
- register/unregister its own Expo push token;
- refresh its own deterministic schedule;
- read its own notification center;
- acknowledge that a notification was opened.

The mobile client cannot directly insert arbitrary server notifications.

## Privacy

Notification copy is intentionally generic. Financial amounts, merchant names,
loan counterparties, account balances, and other sensitive values are not
placed in lock-screen notification text by default.

## Quiet hours

All server-generated reminders pass through the user's IANA timezone and quiet
hours before they enter the pending delivery queue.

## Deduplication

Each generated notification has a deterministic `(user_id, dedupe_key)` unique
constraint, so refreshing schedules cannot repeatedly queue the same reminder.

## Generation vs delivery

Development 01 generates and stores valid notification work.

Development 02 will add:

- Expo Notifications client integration;
- permission handling;
- Expo push-token registration;
- Android notification channel;
- settings UI and notification center;
- server-side Expo Push Service dispatcher;
- delivery receipt/error recording;
- deep-link handling;
- hosted Supabase Cron wiring documentation.

Supabase/PostgreSQL remains the source of truth for notification eligibility.