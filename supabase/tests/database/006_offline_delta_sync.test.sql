begin;

create extension if not exists pgtap
with schema extensions;

select plan(10);


insert into auth.users (
  id,
  email
)
values
(
  '61111111-1111-1111-1111-111111111111',
  'sync-a@test.local'
),
(
  '62222222-2222-2222-2222-222222222222',
  'sync-b@test.local'
);


set local role authenticated;

set local request.jwt.claim.sub =
  '61111111-1111-1111-1111-111111111111';


select lives_ok(
  $$
    select public.create_account(
      p_name := 'Sync Bank',
      p_account_type_code := 'bank',
      p_currency_code := 'PKR',
      p_opening_balance_minor := '250000',
      p_account_id :=
        '6aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'
    )
  $$,
  'sync user can create account'
);


create temporary table
  gate5_account_revision_before (
    revision bigint not null
  );

insert into gate5_account_revision_before (
  revision
)
select server_revision
from public.accounts
where id =
  '6aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';


select lives_ok(
  $$
    select public.create_financial_transaction(
      p_account_id :=
        '6aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',

      p_category_id := (
        select id
        from public.categories
        where system_key = 'food'
      ),

      p_type := 'expense',

      p_amount_minor := '4500',

      p_transaction_id :=
        '6ddddddd-dddd-dddd-dddd-ddddddddddd1',

      p_client_operation_id :=
        '6eeeeeee-eeee-eeee-eeee-eeeeeeeeeee1'
    )
  $$,
  'sync user can create ledger transaction'
);


select ok(
  (
    select
      a.server_revision >
      snapshot.revision

    from public.accounts a

    cross join
      gate5_account_revision_before snapshot

    where a.id =
      '6aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'
  ),
  'ledger mutation advances account sync revision'
);


select cmp_ok(
  jsonb_array_length(
    public.get_sync_delta(
      '0',
      '0',
      '0',
      100
    )->'accounts'
  ),
  '=',
  1,
  'account delta contains caller account'
);


select ok(
  jsonb_array_length(
    public.get_sync_delta(
      '0',
      '0',
      '0',
      100
    )->'categories'
  ) > 0,
  'category delta includes available categories'
);


select cmp_ok(
  jsonb_array_length(
    public.get_sync_delta(
      '0',
      '0',
      '0',
      100
    )->'transactions'
  ),
  '=',
  1,
  'transaction delta contains caller transaction'
);


select is(
  (
    public.get_sync_delta(
      '0',
      '0',
      '0',
      100
    )
    ->'accounts'
    ->0
    ->>'current_balance_minor'
  ),
  '245500',
  'account delta carries server-derived balance'
);


select is(
  jsonb_typeof(
    public.get_sync_delta(
      '0',
      '0',
      '0',
      100
    )
    ->'accounts'
    ->0
    ->'server_revision'
  ),
  'string',
  'revision counters are serialized as strings'
);


select ok(
  (
    with first_delta as (
      select public.get_sync_delta(
        '0',
        '0',
        '0',
        100
      ) as payload
    )

    select
      jsonb_array_length(
        next_delta->'accounts'
      )
      +
      jsonb_array_length(
        next_delta->'categories'
      )
      +
      jsonb_array_length(
        next_delta->'transactions'
      )
      = 0

    from (
      select public.get_sync_delta(
        payload
          ->'next'
          ->>'accounts',

        payload
          ->'next'
          ->>'categories',

        payload
          ->'next'
          ->>'transactions',

        100
      ) as next_delta

      from first_delta
    ) q
  ),
  'returned cursors exclude already-synced rows'
);


set local request.jwt.claim.sub =
  '62222222-2222-2222-2222-222222222222';


select is(
  (
    select
      jsonb_array_length(
        payload->'accounts'
      )
      +
      jsonb_array_length(
        payload->'transactions'
      )

    from (
      select public.get_sync_delta(
        '0',
        '0',
        '0',
        100
      ) as payload
    ) q
  ),
  0,
  'another authenticated user cannot sync private finance rows'
);


select * from finish();

rollback;