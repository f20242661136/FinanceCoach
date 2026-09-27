# Notification Dispatcher Deployment

The dispatcher is protected by `NOTIFICATION_DISPATCH_SECRET`, not by a mobile/user JWT.

## Hosted secrets

Set this secret in staging/production:

- `NOTIFICATION_DISPATCH_SECRET`

The value must be a long random server-only secret.

Never expose it to the Expo app.

## Hosted schedule

Recommended starting cadence: every 5 minutes.

Supabase Cron can invoke Edge Functions from Postgres. Store the project URL and
dispatcher secret in Supabase Vault, then schedule an HTTP POST to:

`https://<project-ref>.supabase.co/functions/v1/notification-dispatch`

with:

`x-notification-dispatch-secret: <secret>`

Do not hard-code the secret inside migrations or Git.

Conceptual SQL after creating Vault secrets named
`project_url` and `notification_dispatch_secret`:

```sql
select cron.schedule(
  'finance-coach-notification-dispatch',
  '*/5 * * * *',
  $$
  select net.http_post(
    url :=
      (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'project_url'
      )
      || '/functions/v1/notification-dispatch',

    headers :=
      jsonb_build_object(
        'Content-Type',
        'application/json',

        'x-notification-dispatch-secret',
        (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'notification_dispatch_secret'
        )
      ),

    body :=
      '{}'::jsonb
  );
  $$
);
```

Enable/configure `pg_cron`, `pg_net`, and Vault using the hosted Supabase
Dashboard before creating the job.

## Delivery behavior

Each dispatcher run:

1. refreshes deterministic schedules;
2. claims due notifications with `FOR UPDATE SKIP LOCKED`;
3. sends eligible push messages through Expo Push Service;
4. records push tickets;
5. checks tickets that are at least 15 minutes old for Expo receipts;
6. deactivates devices when Expo reports `DeviceNotRegistered`;
7. retries transient failures, capped by the database attempt counter.

## Device requirements

Remote push notifications require an actual Android/iOS device and configured
push credentials. Emulator testing can validate preferences, scheduling,
notification-center behavior, Edge Function compilation and deep-link logic,
but it cannot prove real remote delivery.