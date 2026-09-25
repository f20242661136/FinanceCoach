begin;

create extension if not exists pgtap
with schema extensions;

select plan(8);


-- ============================================================
-- CREATE TWO AUTH USERS
-- ============================================================

insert into auth.users (
    id,
    email,
    raw_user_meta_data
)
values
(
    '31111111-1111-1111-1111-111111111111',
    'auth-user-a@test.local',
    '{"full_name":"Alice Test"}'::jsonb
),
(
    '32222222-2222-2222-2222-222222222222',
    'auth-user-b@test.local',
    '{"full_name":"Bob Test"}'::jsonb
);


-- ============================================================
-- PROFILE TRIGGER
-- ============================================================

select results_eq(
    $$
        select count(*)
        from public.profiles
        where user_id in (
            '31111111-1111-1111-1111-111111111111',
            '32222222-2222-2222-2222-222222222222'
        )
    $$,
    array[2::bigint],
    'auth users automatically receive profiles'
);


select results_eq(
    $$
        select display_name
        from public.profiles
        where user_id =
            '31111111-1111-1111-1111-111111111111'
    $$,
    array['Alice Test'::text],
    'profile trigger copies full name metadata'
);


-- ============================================================
-- USER A AUTHENTICATION
-- ============================================================

set local role authenticated;

set local request.jwt.claim.sub =
    '31111111-1111-1111-1111-111111111111';


select results_eq(
    $$
        select count(*)
        from public.profiles
    $$,
    array[1::bigint],
    'User A sees exactly one profile'
);


select results_eq(
    $$
        select count(*)
        from public.profiles
        where user_id =
            '32222222-2222-2222-2222-222222222222'
    $$,
    array[0::bigint],
    'User A cannot see User B profile'
);


select lives_ok(
    $$
        update public.profiles
        set locale = 'en-PK'
        where user_id =
            '31111111-1111-1111-1111-111111111111'
    $$,
    'User A can update their own profile'
);


select results_eq(
    $$
        select locale
        from public.profiles
        where user_id =
            '31111111-1111-1111-1111-111111111111'
    $$,
    array['en-PK'::text],
    'User A profile update is persisted'
);


select results_eq(
    $$
        with attempted_update as (
            update public.profiles
            set locale = 'attacker-value'
            where user_id =
                '32222222-2222-2222-2222-222222222222'
            returning 1
        )
        select count(*)
        from attempted_update
    $$,
    array[0::bigint],
    'User A cannot update User B profile'
);


-- ============================================================
-- VERIFY USER B WAS UNTOUCHED
-- ============================================================

reset role;

select results_eq(
    $$
        select locale
        from public.profiles
        where user_id =
            '32222222-2222-2222-2222-222222222222'
    $$,
    array['en'::text],
    'User B profile remains unchanged'
);


select * from finish();

rollback;
