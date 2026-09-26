-- ============================================================
-- Gate 4: authenticated accounts + transaction API
-- ============================================================


-- ------------------------------------------------------------
-- Create account
-- ------------------------------------------------------------

create or replace function public.create_account(
    p_name text,
    p_account_type_code text,
    p_currency_code text,
    p_opening_balance_minor text default '0',
    p_account_id uuid default gen_random_uuid()
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
    v_user_id uuid;
    v_balance_class public.account_balance_class;
    v_opening_input bigint;
    v_opening_stored bigint;
    v_existing_owner uuid;
begin
    v_user_id := auth.uid();

    if v_user_id is null then
        raise exception
            'Authentication required'
            using errcode = '42501';
    end if;

    if
        p_name is null
        or char_length(btrim(p_name)) not between 1 and 80
    then
        raise exception
            'Account name must contain 1 to 80 characters';
    end if;

    if
        p_opening_balance_minor is null
        or p_opening_balance_minor !~ '^[0-9]+$'
    then
        raise exception
            'Opening balance must be a non-negative integer in minor units';
    end if;

    begin
        v_opening_input :=
            p_opening_balance_minor::bigint;
    exception
        when numeric_value_out_of_range then
            raise exception
                'Opening balance is outside the supported range';
    end;

    select at.balance_class
    into v_balance_class
    from public.account_types at
    where
        at.code = p_account_type_code
        and at.is_active = true;

    if not found then
        raise exception
            'Account type is unavailable';
    end if;

    perform 1
    from public.currencies c
    where
        c.code = p_currency_code
        and c.is_active = true;

    if not found then
        raise exception
            'Currency is unavailable';
    end if;

    select a.user_id
    into v_existing_owner
    from public.accounts a
    where a.id = p_account_id;

    if found then
        if v_existing_owner = v_user_id then
            return p_account_id;
        end if;

        raise exception
            'Account identifier is already in use';
    end if;

    -- Assets are positive positions.
    -- Liabilities are stored as negative positions.
    v_opening_stored :=
        case
            when v_balance_class = 'liability'
                then -v_opening_input
            else v_opening_input
        end;

    insert into public.accounts (
        id,
        user_id,
        name,
        account_type_code,
        currency_code,
        opening_balance_minor
    )
    values (
        p_account_id,
        v_user_id,
        btrim(p_name),
        p_account_type_code,
        p_currency_code,
        v_opening_stored
    );

    return p_account_id;
end;
$$;


revoke execute
on function public.create_account(
    text,
    text,
    text,
    text,
    uuid
)
from public, anon;

grant execute
on function public.create_account(
    text,
    text,
    text,
    text,
    uuid
)
to authenticated;


-- ------------------------------------------------------------
-- Create income / expense
-- ------------------------------------------------------------

create or replace function public.create_financial_transaction(
    p_account_id uuid,
    p_category_id uuid,
    p_type public.transaction_type,
    p_amount_minor text,
    p_transaction_date date default current_date,
    p_description text default null,
    p_merchant text default null,
    p_notes text default null,
    p_transaction_id uuid default gen_random_uuid(),
    p_client_operation_id uuid default gen_random_uuid()
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
    v_user_id uuid;
    v_currency_code text;
    v_amount bigint;
    v_effect public.balance_effect;

    v_existing_id uuid;
    v_existing_type public.transaction_type;
    v_existing_account_id uuid;
    v_existing_category_id uuid;
    v_existing_amount bigint;
begin
    v_user_id := auth.uid();

    if v_user_id is null then
        raise exception
            'Authentication required'
            using errcode = '42501';
    end if;

    if p_type not in ('income', 'expense') then
        raise exception
            'Only income and expense are supported by this entry API';
    end if;

    if
        p_amount_minor is null
        or p_amount_minor !~ '^[0-9]+$'
    then
        raise exception
            'Amount must be a positive integer in minor units';
    end if;

    begin
        v_amount :=
            p_amount_minor::bigint;
    exception
        when numeric_value_out_of_range then
            raise exception
                'Amount is outside the supported range';
    end;

    if v_amount <= 0 then
        raise exception
            'Amount must be greater than zero';
    end if;


    -- Idempotency.
    select
        t.id,
        t.type,
        t.account_id,
        t.category_id,
        t.amount_minor
    into
        v_existing_id,
        v_existing_type,
        v_existing_account_id,
        v_existing_category_id,
        v_existing_amount
    from public.transactions t
    where
        t.user_id = v_user_id
        and t.client_operation_id =
            p_client_operation_id;

    if found then
        if
            v_existing_type = p_type
            and v_existing_account_id = p_account_id
            and v_existing_category_id
                is not distinct from p_category_id
            and v_existing_amount = v_amount
        then
            return v_existing_id;
        end if;

        raise exception
            'Client operation identifier conflicts with an existing transaction';
    end if;


    select a.currency_code
    into v_currency_code
    from public.accounts a
    where
        a.id = p_account_id
        and a.user_id = v_user_id
        and a.status = 'active';

    if not found then
        raise exception
            'Account is unavailable';
    end if;


    v_effect :=
        case
            when p_type = 'income'
                then 'credit'::public.balance_effect
            else
                'debit'::public.balance_effect
        end;


    insert into public.transactions (
        id,
        user_id,
        account_id,
        category_id,
        type,
        balance_effect,
        amount_minor,
        currency_code,
        description,
        merchant,
        transaction_date,
        notes,
        client_operation_id
    )
    values (
        p_transaction_id,
        v_user_id,
        p_account_id,
        p_category_id,
        p_type,
        v_effect,
        v_amount,
        v_currency_code,
        nullif(btrim(p_description), ''),
        nullif(btrim(p_merchant), ''),
        p_transaction_date,
        nullif(btrim(p_notes), ''),
        p_client_operation_id
    );

    return p_transaction_id;
end;
$$;


revoke execute
on function public.create_financial_transaction(
    uuid,
    uuid,
    public.transaction_type,
    text,
    date,
    text,
    text,
    text,
    uuid,
    uuid
)
from public, anon;

grant execute
on function public.create_financial_transaction(
    uuid,
    uuid,
    public.transaction_type,
    text,
    date,
    text,
    text,
    text,
    uuid,
    uuid
)
to authenticated;


-- ------------------------------------------------------------
-- Account read model
--
-- Reuse the already-tested ledger balance function instead of
-- introducing a second accounting implementation.
-- ------------------------------------------------------------

create or replace function public.get_account_summaries()
returns table (
    id uuid,
    name text,
    account_type_code text,
    balance_class public.account_balance_class,
    currency_code text,
    currency_minor_unit smallint,
    opening_balance_minor text,
    current_balance_minor text,
    status public.account_status
)
language sql
stable
security invoker
set search_path = ''
as $$
    select
        a.id,
        a.name,
        a.account_type_code,
        at.balance_class,
        a.currency_code,
        c.minor_unit,
        a.opening_balance_minor::text,

        public.get_account_balance_minor(
            a.id
        )::text,

        a.status

    from public.accounts a

    join public.account_types at
        on at.code =
            a.account_type_code

    join public.currencies c
        on c.code =
            a.currency_code

    where
        a.user_id =
            (select auth.uid())

        and a.status <>
            'archived'

    order by
        a.created_at asc;
$$;


revoke execute
on function public.get_account_summaries()
from public, anon;

grant execute
on function public.get_account_summaries()
to authenticated;


-- ------------------------------------------------------------
-- Recent activity read model
-- ------------------------------------------------------------

create or replace function public.get_recent_activity(
    p_limit integer default 20
)
returns table (
    id uuid,
    type public.transaction_type,
    amount_minor text,
    currency_code text,
    currency_minor_unit smallint,
    transaction_date date,
    merchant text,
    description text,
    account_id uuid,
    account_name text,
    category_id uuid,
    category_name text,
    destination_account_id uuid,
    destination_account_name text,
    destination_amount_minor text,
    destination_currency_code text,
    destination_currency_minor_unit smallint,
    created_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
    select
        t.id,
        t.type,
        t.amount_minor::text,
        t.currency_code,
        source_currency.minor_unit,
        t.transaction_date,
        t.merchant,
        t.description,
        t.account_id,
        source_account.name,
        t.category_id,
        category.default_name,

        transfer.to_account_id,

        destination_account.name,

        transfer.destination_amount_minor::text,

        transfer.destination_currency_code,

        destination_currency.minor_unit,

        t.created_at

    from public.transactions t

    join public.accounts source_account
        on source_account.id =
            t.account_id

        and source_account.user_id =
            t.user_id

    join public.currencies source_currency
        on source_currency.code =
            t.currency_code

    left join public.categories category
        on category.id =
            t.category_id

    left join public.transaction_transfers transfer
        on transfer.transaction_id =
            t.id

        and transfer.user_id =
            t.user_id

    left join public.accounts destination_account
        on destination_account.id =
            transfer.to_account_id

        and destination_account.user_id =
            transfer.user_id

    left join public.currencies destination_currency
        on destination_currency.code =
            transfer.destination_currency_code

    where
        t.user_id =
            (select auth.uid())

        and t.deleted_at is null

    order by
        t.transaction_date desc,
        t.created_at desc

    limit greatest(
        1,
        least(
            coalesce(
                p_limit,
                20
            ),
            100
        )
    );
$$;


revoke execute
on function public.get_recent_activity(integer)
from public, anon;

grant execute
on function public.get_recent_activity(integer)
to authenticated;