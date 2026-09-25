begin;

create extension if not exists pgtap
with schema extensions;

select plan(21);


-- ============================================================
-- SCHEMA TESTS
-- ============================================================

select has_table(
    'public',
    'categories',
    'categories table exists'
);


select has_table(
    'public',
    'transactions',
    'transactions table exists'
);


select has_table(
    'public',
    'transaction_transfers',
    'transfer table exists'
);


select has_column(
    'public',
    'transactions',
    'client_operation_id',
    'transactions have an idempotency key'
);


select has_column(
    'public',
    'transactions',
    'server_revision',
    'transactions have a server revision'
);


select ok(
    (
        select relrowsecurity
        from pg_class
        where oid = 'public.categories'::regclass
    ),
    'RLS enabled on categories'
);


select ok(
    (
        select relrowsecurity
        from pg_class
        where oid = 'public.transactions'::regclass
    ),
    'RLS enabled on transactions'
);


select ok(
    (
        select relrowsecurity
        from pg_class
        where oid = 'public.transaction_transfers'::regclass
    ),
    'RLS enabled on transaction transfers'
);


select ok(
    (
        select count(*)
        from public.categories
        where is_system = true
    ) >= 10,
    'system categories are seeded'
);


-- ============================================================
-- TEST USERS
-- ============================================================

insert into auth.users (
    id,
    email
)
values
(
    '11111111-1111-1111-1111-111111111111',
    'ledger-user-a@test.local'
),
(
    '22222222-2222-2222-2222-222222222222',
    'ledger-user-b@test.local'
);


-- ============================================================
-- TEST ACCOUNTS
-- ============================================================

insert into public.accounts (
    id,
    user_id,
    name,
    account_type_code,
    currency_code,
    opening_balance_minor
)
values
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    '11111111-1111-1111-1111-111111111111',
    'User A Bank',
    'bank',
    'PKR',
    10000
),
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    '11111111-1111-1111-1111-111111111111',
    'User A Cash',
    'cash',
    'PKR',
    0
),
(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
    '22222222-2222-2222-2222-222222222222',
    'User B Bank',
    'bank',
    'PKR',
    5000
);


-- ============================================================
-- USER B CUSTOM CATEGORY
-- ============================================================

insert into public.categories (
    id,
    user_id,
    kind,
    default_name
)
values (
    'cccccccc-cccc-cccc-cccc-ccccccccccc1',
    '22222222-2222-2222-2222-222222222222',
    'expense',
    'User B Private Category'
);


-- ============================================================
-- INITIAL LEDGER
-- ============================================================

insert into public.transactions (
    id,
    user_id,
    account_id,
    category_id,
    type,
    balance_effect,
    amount_minor,
    currency_code,
    transaction_date,
    client_operation_id
)
values
(
    'dddddddd-dddd-dddd-dddd-ddddddddddd1',
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    (
        select id
        from public.categories
        where system_key = 'salary'
    ),
    'income',
    'credit',
    5000,
    'PKR',
    current_date,
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1'
),
(
    'dddddddd-dddd-dddd-dddd-ddddddddddd2',
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    (
        select id
        from public.categories
        where system_key = 'food'
    ),
    'expense',
    'debit',
    2000,
    'PKR',
    current_date,
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2'
),
(
    'dddddddd-dddd-dddd-dddd-ddddddddddd3',
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    null,
    'adjustment',
    'credit',
    500,
    'PKR',
    current_date,
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee3'
);


-- ============================================================
-- USER A AUTHENTICATION
-- ============================================================

set local role authenticated;

set local request.jwt.claim.sub =
    '11111111-1111-1111-1111-111111111111';


select results_eq(
    $$
        select count(*)
        from public.accounts
    $$,
    array[2::bigint],
    'User A sees only their accounts'
);


select results_eq(
    $$
        select count(*)
        from public.categories
        where is_system = true
    $$,
    array[15::bigint],
    'User A sees system categories'
);


select results_eq(
    $$
        select count(*)
        from public.categories
        where id =
            'cccccccc-cccc-cccc-cccc-ccccccccccc1'
    $$,
    array[0::bigint],
    'User A cannot see User B private category'
);


-- ============================================================
-- CREATE ATOMIC TRANSFER
-- ============================================================

select lives_ok(
    $$
        select public.create_transfer(
            p_from_account_id :=
                'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',

            p_to_account_id :=
                'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',

            p_source_amount_minor :=
                3000,

            p_destination_amount_minor :=
                3000,

            p_transaction_id :=
                'ffffffff-ffff-ffff-ffff-fffffffffff1',

            p_client_operation_id :=
                '99999999-9999-9999-9999-999999999991'
        )
    $$,
    'User A can create an atomic transfer'
);


select results_eq(
    $$
        select public.get_account_balance_minor(
            'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'
        )
    $$,
    array[10500::bigint],
    'Bank balance is calculated correctly'
);


select results_eq(
    $$
        select public.get_account_balance_minor(
            'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'
        )
    $$,
    array[3000::bigint],
    'Transfer destination balance is calculated correctly'
);


select results_eq(
    $$
        select count(*)
        from public.transactions
    $$,
    array[4::bigint],
    'User A sees their four ledger transactions'
);


-- ============================================================
-- SOFT DELETE
-- ============================================================

update public.transactions
set deleted_at = now()
where id =
    'dddddddd-dddd-dddd-dddd-ddddddddddd2';


select results_eq(
    $$
        select public.get_account_balance_minor(
            'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'
        )
    $$,
    array[12500::bigint],
    'Soft deleted expense no longer affects balance'
);


-- Restore.

update public.transactions
set deleted_at = null
where id =
    'dddddddd-dddd-dddd-dddd-ddddddddddd2';


select results_eq(
    $$
        select public.get_account_balance_minor(
            'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'
        )
    $$,
    array[10500::bigint],
    'Restored expense affects balance again'
);


-- ============================================================
-- USER B AUTHENTICATION
-- ============================================================

set local request.jwt.claim.sub =
    '22222222-2222-2222-2222-222222222222';


select results_eq(
    $$
        select count(*)
        from public.transactions
    $$,
    array[0::bigint],
    'User B cannot see User A transactions'
);


select results_eq(
    $$
        select count(*)
        from public.accounts
    $$,
    array[1::bigint],
    'User B only sees their own account'
);


select throws_ok(
    $$
        select public.create_transfer(
            p_from_account_id :=
                'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',

            p_to_account_id :=
                'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',

            p_source_amount_minor :=
                100,

            p_destination_amount_minor :=
                100
        )
    $$,
    null,
    null,
    'User B cannot transfer into User A private account'
);


select * from finish();

rollback;
