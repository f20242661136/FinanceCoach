begin;

create extension if not exists pgtap
with schema extensions;

select plan(19);


-- ============================================================
-- TABLES
-- ============================================================

select has_table(
    'public',
    'currencies',
    'currencies table exists'
);

select has_table(
    'public',
    'profiles',
    'profiles table exists'
);

select has_table(
    'public',
    'account_types',
    'account_types table exists'
);

select has_table(
    'public',
    'accounts',
    'accounts table exists'
);


-- ============================================================
-- PRIMARY KEYS / MONEY
-- ============================================================

select col_is_pk(
    'public',
    'profiles',
    'user_id',
    'profiles.user_id is primary key'
);

select col_is_pk(
    'public',
    'accounts',
    'id',
    'accounts.id is primary key'
);

select has_column(
    'public',
    'accounts',
    'opening_balance_minor',
    'accounts stores opening balance'
);

select col_type_is(
    'public',
    'accounts',
    'opening_balance_minor',
    'bigint',
    'money is stored using bigint minor units'
);


-- ============================================================
-- RLS ENABLED
-- ============================================================

select ok(
    (
        select relrowsecurity
        from pg_class
        where oid = 'public.currencies'::regclass
    ),
    'RLS enabled on currencies'
);

select ok(
    (
        select relrowsecurity
        from pg_class
        where oid = 'public.profiles'::regclass
    ),
    'RLS enabled on profiles'
);

select ok(
    (
        select relrowsecurity
        from pg_class
        where oid = 'public.account_types'::regclass
    ),
    'RLS enabled on account_types'
);

select ok(
    (
        select relrowsecurity
        from pg_class
        where oid = 'public.accounts'::regclass
    ),
    'RLS enabled on accounts'
);


-- ============================================================
-- SEED CONFIGURATION
-- ============================================================

select results_eq(
    $$
        select count(*)
        from public.currencies
        where code in (
            'PKR',
            'USD',
            'GBP',
            'AED',
            'SAR',
            'INR',
            'EUR'
        )
    $$,
    $$ values (7::bigint) $$,
    'required currencies are seeded'
);


select results_eq(
    $$
        select count(*)
        from public.account_types
        where code in (
            'cash',
            'bank',
            'digital_wallet',
            'credit_card',
            'investment',
            'other'
        )
    $$,
    $$ values (6::bigint) $$,
    'required account types are seeded'
);


-- ============================================================
-- INDEX
-- ============================================================

select has_index(
    'public',
    'accounts',
    'accounts_user_status_idx',
    'accounts have user/status index'
);


-- ============================================================
-- RLS POLICY DEFINITIONS
-- ============================================================

select policies_are(
    'public',
    'currencies',
    array[
        'authenticated_read_currencies'
    ],
    'currencies expose only expected RLS policy'
);


select policies_are(
    'public',
    'account_types',
    array[
        'authenticated_read_account_types'
    ],
    'account_types expose only expected RLS policy'
);


select policies_are(
    'public',
    'profiles',
    array[
        'profiles_select_own',
        'profiles_update_own'
    ],
    'profiles expose expected ownership policies'
);


select policies_are(
    'public',
    'accounts',
    array[
        'accounts_select_own',
        'accounts_insert_own',
        'accounts_update_own'
    ],
    'accounts expose expected ownership policies'
);


select * from finish();

rollback;
