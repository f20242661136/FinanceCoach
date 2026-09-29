begin;

create extension if not exists pgtap
with schema extensions;

select plan(9);

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
values (
  '00000000-0000-0000-0000-000000000000',
  '55555555-5555-4555-8555-555555555555',
  'authenticated',
  'authenticated',
  'premium-gating@example.test',
  '',
  now(),
  '{}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
);

update public.challenges
set is_premium = true
where code = 'weekly_log_5_transactions';

select set_config(
  'request.jwt.claim.sub',
  '55555555-5555-4555-8555-555555555555',
  true
);

set local role authenticated;

select ok(
  not has_function_privilege(
    'authenticated',
    'public.reconcile_revenuecat_premium_entitlement(uuid,boolean,text,text,text,text,timestamptz,boolean,text,timestamptz)',
    'EXECUTE'
  ),
  'authenticated cannot execute RevenueCat reconciliation RPC'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.reconcile_revenuecat_premium_entitlement(uuid,boolean,text,text,text,text,timestamptz,boolean,text,timestamptz)',
    'EXECUTE'
  ),
  'service role can execute RevenueCat reconciliation RPC'
);

select throws_ok(
  $$
    select public.start_gamification_challenge(
      (
        select c.id
        from public.challenges c
        where c.code = 'weekly_log_5_transactions'
      ),
      'UTC'
    )
  $$,
  '42501',
  'Premium subscription required',
  'free users cannot start premium-marked challenges'
);

select lives_ok(
  $$
    select public.start_gamification_challenge(
      (
        select c.id
        from public.challenges c
        where c.code = 'daily_log_transaction'
      ),
      'UTC'
    )
  $$,
  'free users can still start non-premium challenges'
);

reset role;

insert into public.subscription_webhook_events (
  revenuecat_event_id,
  event_type,
  app_user_id,
  user_id,
  entitlement_ids,
  product_id,
  store,
  environment,
  period_type,
  event_timestamp,
  purchased_at,
  expiration_at,
  payload
)
values (
  'phase10-test-initial-purchase',
  'INITIAL_PURCHASE',
  '55555555-5555-4555-8555-555555555555',
  '55555555-5555-4555-8555-555555555555',
  array['premium'],
  'finance_coach_premium',
  'PLAY_STORE',
  'SANDBOX',
  'TRIAL',
  now(),
  now(),
  now() + interval '7 days',
  '{}'::jsonb
);

insert into public.subscription_entitlements (
  user_id,
  entitlement_id,
  is_active,
  product_id,
  store,
  environment,
  current_period_ends_at,
  will_renew,
  last_event_type,
  last_event_id,
  last_event_at
)
values (
  '55555555-5555-4555-8555-555555555555',
  'premium',
  true,
  'finance_coach_premium',
  'PLAY_STORE',
  'SANDBOX',
  now() + interval '7 days',
  true,
  'INITIAL_PURCHASE',
  'phase10-test-initial-purchase',
  now()
);

select is(
  (
    select se.period_type
    from public.subscription_entitlements se
    where se.user_id =
      '55555555-5555-4555-8555-555555555555'
  ),
  'TRIAL',
  'projected entitlement records the RevenueCat trial period'
);

set local role authenticated;

select is(
  public.get_my_subscription_status()
    ->> 'period_type',
  'TRIAL',
  'subscription status exposes trial state'
);

select is(
  public.get_my_subscription_status()
    ->> 'has_premium',
  'true',
  'active trial grants server-verified premium access'
);

select lives_ok(
  $$
    select public.start_gamification_challenge(
      (
        select c.id
        from public.challenges c
        where c.code = 'weekly_log_5_transactions'
      ),
      'UTC'
    )
  $$,
  'premium users can start premium-marked challenges'
);

reset role;

update public.subscription_entitlements
set
  is_active = false,
  current_period_ends_at = now() - interval '1 minute',
  updated_at = now()
where user_id =
  '55555555-5555-4555-8555-555555555555';

set local role authenticated;

select throws_ok(
  $$
    select public.start_gamification_challenge(
      (
        select c.id
        from public.challenges c
        where c.code = 'weekly_log_5_transactions'
      ),
      'UTC'
    )
  $$,
  '42501',
  'Premium subscription required',
  'expired premium access is rejected server-side'
);

reset role;

select * from finish();

rollback;
