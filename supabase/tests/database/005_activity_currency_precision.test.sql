begin;

create extension if not exists pgtap
with schema extensions;

select plan(1);

insert into auth.users (
    id,
    email
)
values (
    '51111111-1111-1111-1111-111111111111',
    'currency-precision@test.local'
);

set local role authenticated;

set local request.jwt.claim.sub =
    '51111111-1111-1111-1111-111111111111';

select public.create_account(
    p_name := 'Precision Bank',
    p_account_type_code := 'bank',
    p_currency_code := 'PKR',
    p_opening_balance_minor := '100000',
    p_account_id :=
        '5aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'
);

select public.create_financial_transaction(
    p_account_id :=
        '5aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',

    p_category_id := (
        select id
        from public.categories
        where system_key = 'food'
    ),

    p_type := 'expense',
    p_amount_minor := '1250',

    p_transaction_id :=
        '5ddddddd-dddd-dddd-dddd-ddddddddddd1',

    p_client_operation_id :=
        '5eeeeeee-eeee-eeee-eeee-eeeeeeeeeee1'
);

select results_eq(
    $$
        select currency_minor_unit
        from public.get_recent_activity(10)
        where id =
            '5ddddddd-dddd-dddd-dddd-ddddddddddd1'
    $$,
    array[2::smallint],
    'Recent activity carries authoritative currency precision'
);

select * from finish();

rollback;