begin;

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
values
(
  '00000000-0000-0000-0000-000000000000',
  '33333333-3333-4333-8333-333333333333',
  'authenticated',
  'authenticated',
  'loan-idempotency-a@example.test',
  '',
  now(),
  '{}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
),
(
  '00000000-0000-0000-0000-000000000000',
  '44444444-4444-4444-8444-444444444444',
  'authenticated',
  'authenticated',
  'loan-idempotency-b@example.test',
  '',
  now(),
  '{}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
);

select set_config(
  'request.jwt.claim.sub',
  '33333333-3333-4333-8333-333333333333',
  true
);

set local role authenticated;

select lives_ok(
  $$
    select public.create_loan(
      'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'::uuid,
      'borrowed',
      'Regression lender',
      'PKR',
      '10000',
      date '2026-09-01',
      date '2026-12-31',
      null,
      'none',
      null,
      'Final-payment retry regression'
    )
  $$,
  'user A can create regression loan'
);

select lives_ok(
  $$
    select public.add_loan_payment(
      'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb'::uuid,
      'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'::uuid,
      '2500',
      date '2026-09-26',
      'First payment'
    )
  $$,
  'first payment succeeds'
);

select lives_ok(
  $$
    select public.add_loan_payment(
      'cccccccc-1111-4111-8111-cccccccccccc'::uuid,
      'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'::uuid,
      '7500',
      date '2026-09-26',
      'Final payment'
    )
  $$,
  'final payment succeeds'
);

select is(
  (
    select l.status
    from public.loans l
    where l.id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'::uuid
  ),
  'settled',
  'final payment settles the loan'
);

select is(
  public.add_loan_payment(
    'cccccccc-1111-4111-8111-cccccccccccc'::uuid,
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'::uuid,
    '7500',
    date '2026-09-26',
    'Final payment'
  ),
  'cccccccc-1111-4111-8111-cccccccccccc'::uuid,
  'exact final-payment retry succeeds after settlement'
);

select is(
  (
    select count(*)::integer
    from public.loan_payments lp
    where lp.loan_id =
      'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'::uuid
      and lp.deleted_at is null
  ),
  2,
  'exact retry does not duplicate the final payment'
);

select is(
  (
    select coalesce(sum(lp.amount_minor), 0)::bigint
    from public.loan_payments lp
    where lp.loan_id =
      'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'::uuid
      and lp.deleted_at is null
  ),
  10000::bigint,
  'exact retry does not change total paid principal'
);

select throws_ok(
  $$
    select public.add_loan_payment(
      'cccccccc-1111-4111-8111-cccccccccccc'::uuid,
      'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'::uuid,
      '7499',
      date '2026-09-26',
      'Final payment'
    )
  $$,
  '23505',
  'Payment ID was already used with different data',
  'altered retry remains rejected after settlement'
);

reset role;

select set_config(
  'request.jwt.claim.sub',
  '44444444-4444-4444-8444-444444444444',
  true
);

set local role authenticated;

select throws_ok(
  $$
    select public.add_loan_payment(
      'cccccccc-1111-4111-8111-cccccccccccc'::uuid,
      'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'::uuid,
      '7500',
      date '2026-09-26',
      'Final payment'
    )
  $$,
  '42501',
  'Loan not found',
  'another user cannot replay the final payment'
);

reset role;

select * from finish();

rollback;