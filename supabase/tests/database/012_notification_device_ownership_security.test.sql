begin;

select plan(11);

select has_function(
  'public',
  'register_notification_device',
  array['uuid', 'text', 'text'],
  'register_notification_device(uuid,text,text) exists'
);

select ok(
  (
    select p.prosecdef
    from pg_proc p
    join pg_namespace n
      on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'register_notification_device'
      and pg_get_function_identity_arguments(p.oid)
          = 'p_device_id uuid, p_expo_push_token text, p_platform text'
  ),
  'register_notification_device remains SECURITY DEFINER'
);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
(
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-4111-8111-111111111111',
  'authenticated',
  'authenticated',
  'notification-a@example.test',
  '',
  now(),
  '{}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
),
(
  '00000000-0000-0000-0000-000000000000',
  '22222222-2222-4222-8222-222222222222',
  'authenticated',
  'authenticated',
  'notification-b@example.test',
  '',
  now(),
  '{}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
);

select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-4111-8111-111111111111',
  true
);

set local role authenticated;

select lives_ok(
  $$
    select public.register_notification_device(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
      'ExpoPushToken[audit-device-token]',
      'android'
    )
  $$,
  'user A can register an unowned token'
);

select is(
  public.register_notification_device(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
    'ExpoPushToken[audit-device-token]',
    'android'
  ),
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
  'same-owner exact retry returns the canonical device id'
);

reset role;

select is(
  (
    select d.user_id
    from public.notification_devices d
    where d.expo_push_token = 'ExpoPushToken[audit-device-token]'
  ),
  '11111111-1111-4111-8111-111111111111'::uuid,
  'token remains owned by user A after exact retry'
);

select set_config(
  'request.jwt.claim.sub',
  '22222222-2222-4222-8222-222222222222',
  true
);

set local role authenticated;

select throws_ok(
  $$
    select public.register_notification_device(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
      'ExpoPushToken[audit-device-token]',
      'android'
    )
  $$,
  '42501',
  'Expo push token is already registered to another user',
  'user B cannot take over user A active push token'
);

reset role;

select is(
  (
    select d.user_id
    from public.notification_devices d
    where d.expo_push_token = 'ExpoPushToken[audit-device-token]'
  ),
  '11111111-1111-4111-8111-111111111111'::uuid,
  'failed takeover leaves token ownership unchanged'
);

select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-4111-8111-111111111111',
  true
);

set local role authenticated;

select lives_ok(
  $$
    select public.unregister_notification_device(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
    )
  $$,
  'user A can explicitly unregister its device'
);

reset role;

select set_config(
  'request.jwt.claim.sub',
  '22222222-2222-4222-8222-222222222222',
  true
);

set local role authenticated;

select throws_ok(
  $$
    select public.register_notification_device(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
      'ExpoPushToken[audit-device-token]',
      'android'
    )
  $$,
  '42501',
  'Expo push token belongs to another device',
  'inactive token still cannot move to a different device id'
);

select is(
  public.register_notification_device(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
    'ExpoPushToken[audit-device-token]',
    'android'
  ),
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
  'inactive token can move on the same installation/device id'
);

reset role;

select is(
  (
    select d.user_id
    from public.notification_devices d
    where d.expo_push_token = 'ExpoPushToken[audit-device-token]'
  ),
  '22222222-2222-4222-8222-222222222222'::uuid,
  'same-device handoff updates ownership to user B'
);

select * from finish();

rollback;