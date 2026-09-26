begin;

create extension if not exists pgtap
with schema extensions;

select plan(9);


insert into auth.users (
    id,
    email
)
values
(
    '41111111-1111-1111-1111-111111111111',
    'gate4-a@test.local'
),
(
    '42222222-2222-2222-2222-222222222222',
    'gate4-b@test.local'
);


set local role authenticated;

set local request.jwt.claim.sub =
    '41111111-1111-1111-1111-111111111111';


select lives_ok(
    $$
        select public.create_account(
            p_name := 'Main Bank',
            p_account_type_code := 'bank',
            p_currency_code := 'PKR',
            p_opening_balance_minor := '250000',
            p_account_id :=
                '4aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'
        )
    $$,
    'authenticated user can create an asset account'
);


select results_eq(
    $$
        select opening_balance_minor
        from public.accounts
        where id =
            '4aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'
    $$,
    array[250000::bigint],
    'asset opening balance is stored positively'
);


select lives_ok(
    $$
        select public.create_account(
            p_name := 'Credit Card',
            p_account_type_code := 'credit_card',
            p_currency_code := 'PKR',
            p_opening_balance_minor := '100000',
            p_account_id :=
                '4aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'
        )
    $$,
    'authenticated user can create a liability account'
);


select results_eq(
    $$
        select opening_balance_minor
        from public.accounts
        where id =
            '4aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'
    $$,
    array[-100000::bigint],
    'liability opening amount is stored negatively'
);


select lives_ok(
    $$
        select public.create_financial_transaction(
            p_account_id :=
                '4aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',

            p_category_id := (
                select id
                from public.categories
                where system_key = 'food'
            ),

            p_type := 'expense',

            p_amount_minor :=
                '4500',

            p_transaction_id :=
                '4ddddddd-dddd-dddd-dddd-ddddddddddd1',

            p_client_operation_id :=
                '4eeeeeee-eeee-eeee-eeee-eeeeeeeeeee1'
        )
    $$,
    'authenticated user can create a validated expense'
);


select results_eq(
    $$
        select public.create_financial_transaction(
            p_account_id :=
                '4aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',

            p_category_id := (
                select id
                from public.categories
                where system_key = 'food'
            ),

            p_type := 'expense',

            p_amount_minor :=
                '4500',

            p_transaction_id :=
                '4ddddddd-dddd-dddd-dddd-ddddddddddd9',

            p_client_operation_id :=
                '4eeeeeee-eeee-eeee-eeee-eeeeeeeeeee1'
        )
    $$,

    array[
        '4ddddddd-dddd-dddd-dddd-ddddddddddd1'::uuid
    ],

    'retrying an operation returns the existing transaction'
);


select results_eq(
    $$
        select count(*)
        from public.transactions
        where client_operation_id =
            '4eeeeeee-eeee-eeee-eeee-eeeeeeeeeee1'
    $$,

    array[1::bigint],

    'idempotency prevents duplicate transactions'
);


select results_eq(
    $$
        select current_balance_minor
        from public.get_account_summaries()
        where id =
            '4aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'
    $$,

    array['245500'::text],

    'account summary is calculated from the trusted ledger'
);


set local request.jwt.claim.sub =
    '42222222-2222-2222-2222-222222222222';


select results_eq(
    $$
        select count(*)
        from public.get_account_summaries()
    $$,

    array[0::bigint],

    'another user cannot see the first users accounts'
);


select * from finish();

rollback;