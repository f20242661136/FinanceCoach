-- ============================================================
-- CORE FINANCIAL LEDGER
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================

create type public.transaction_type as enum (
    'income',
    'expense',
    'transfer',
    'adjustment'
);

create type public.balance_effect as enum (
    'credit',
    'debit',
    'neutral'
);

create type public.category_kind as enum (
    'income',
    'expense'
);


-- ============================================================
-- ACCOUNT OWNERSHIP + CURRENCY FOUNDATION
-- ============================================================

alter table public.accounts
add constraint accounts_id_user_currency_unique
unique (
    id,
    user_id,
    currency_code
);


-- ============================================================
-- CATEGORIES
-- ============================================================

create table public.categories (
    id uuid primary key default gen_random_uuid(),

    user_id uuid
        references auth.users(id)
        on delete cascade,

    kind public.category_kind not null,

    system_key text,

    default_name text not null,

    translation_key text,

    icon_name text,

    color_token text,

    is_system boolean not null default false,

    sort_order integer not null default 0,

    deleted_at timestamptz,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    constraint categories_name_not_blank_check
        check (
            length(btrim(default_name)) between 1 and 80
        ),

    constraint categories_sort_order_check
        check (sort_order >= 0),

    constraint categories_system_ownership_check
        check (
            (
                is_system = true
                and user_id is null
                and system_key is not null
            )
            or
            (
                is_system = false
                and user_id is not null
                and system_key is null
            )
        )
);


create unique index categories_system_key_unique_idx
on public.categories(system_key)
where is_system = true;


create unique index categories_user_name_unique_idx
on public.categories (
    user_id,
    kind,
    lower(default_name)
)
where
    is_system = false
    and deleted_at is null;


create index categories_user_kind_idx
on public.categories (
    user_id,
    kind
)
where deleted_at is null;


create trigger categories_set_updated_at
before update on public.categories
for each row
execute function private.set_updated_at();


-- ============================================================
-- SYSTEM CATEGORIES
-- ============================================================

insert into public.categories (
    kind,
    system_key,
    default_name,
    translation_key,
    icon_name,
    is_system,
    sort_order
)
values
    (
        'income',
        'salary',
        'Salary',
        'category.salary',
        'briefcase',
        true,
        10
    ),
    (
        'income',
        'freelance',
        'Freelance',
        'category.freelance',
        'laptop',
        true,
        20
    ),
    (
        'income',
        'business_income',
        'Business',
        'category.businessIncome',
        'storefront',
        true,
        30
    ),
    (
        'income',
        'investment_income',
        'Investment Income',
        'category.investmentIncome',
        'trending-up',
        true,
        40
    ),
    (
        'income',
        'other_income',
        'Other Income',
        'category.otherIncome',
        'plus-circle',
        true,
        90
    ),

    (
        'expense',
        'food',
        'Food',
        'category.food',
        'restaurant',
        true,
        110
    ),
    (
        'expense',
        'transport',
        'Transport',
        'category.transport',
        'car',
        true,
        120
    ),
    (
        'expense',
        'housing',
        'Housing',
        'category.housing',
        'home',
        true,
        130
    ),
    (
        'expense',
        'utilities',
        'Utilities',
        'category.utilities',
        'flash',
        true,
        140
    ),
    (
        'expense',
        'shopping',
        'Shopping',
        'category.shopping',
        'bag',
        true,
        150
    ),
    (
        'expense',
        'health',
        'Health',
        'category.health',
        'medical',
        true,
        160
    ),
    (
        'expense',
        'education',
        'Education',
        'category.education',
        'school',
        true,
        170
    ),
    (
        'expense',
        'entertainment',
        'Entertainment',
        'category.entertainment',
        'game-controller',
        true,
        180
    ),
    (
        'expense',
        'charity',
        'Charity',
        'category.charity',
        'heart',
        true,
        190
    ),
    (
        'expense',
        'other_expense',
        'Other Expense',
        'category.otherExpense',
        'ellipsis-horizontal',
        true,
        900
    );


-- ============================================================
-- LEDGER REVISION SEQUENCE
-- ============================================================

create sequence private.ledger_revision_seq;

revoke all
on sequence private.ledger_revision_seq
from public, anon, authenticated;


-- ============================================================
-- TRANSACTIONS
-- ============================================================

create table public.transactions (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references auth.users(id)
        on delete restrict,

    account_id uuid not null,

    category_id uuid
        references public.categories(id)
        on delete restrict,

    type public.transaction_type not null,

    balance_effect public.balance_effect not null,

    amount_minor bigint not null,

    currency_code text not null,

    description text,

    merchant text,

    transaction_date date not null default current_date,

    notes text,

    -- Used to make repeated CREATE operations idempotent.
    client_operation_id uuid not null default gen_random_uuid(),

    -- Extensible metadata for future domains.
    metadata jsonb not null default '{}'::jsonb,

    -- Optimistic concurrency support.
    version integer not null default 1,

    -- Monotonically increasing change cursor.
    server_revision bigint not null,

    deleted_at timestamptz,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    constraint transactions_account_owner_currency_fk
        foreign key (
            account_id,
            user_id,
            currency_code
        )
        references public.accounts (
            id,
            user_id,
            currency_code
        )
        on delete restrict,

    constraint transactions_id_user_unique
        unique (
            id,
            user_id
        ),

    constraint transactions_user_operation_unique
        unique (
            user_id,
            client_operation_id
        ),

    constraint transactions_amount_positive_check
        check (
            amount_minor > 0
        ),

    constraint transactions_version_check
        check (
            version >= 1
        ),

    constraint transactions_metadata_object_check
        check (
            jsonb_typeof(metadata) = 'object'
        ),

    constraint transactions_description_length_check
        check (
            description is null
            or char_length(description) <= 160
        ),

    constraint transactions_merchant_length_check
        check (
            merchant is null
            or char_length(merchant) <= 120
        ),

    constraint transactions_notes_length_check
        check (
            notes is null
            or char_length(notes) <= 2000
        ),

    constraint transactions_type_effect_check
        check (
            (
                type = 'income'
                and balance_effect = 'credit'
            )
            or
            (
                type = 'expense'
                and balance_effect = 'debit'
            )
            or
            (
                type = 'transfer'
                and balance_effect = 'neutral'
            )
            or
            (
                type = 'adjustment'
                and balance_effect in ('credit', 'debit')
            )
        ),

    constraint transactions_category_presence_check
        check (
            (
                type in ('income', 'expense')
                and category_id is not null
            )
            or
            (
                type = 'transfer'
                and category_id is null
            )
            or
            type = 'adjustment'
        )
);


-- ============================================================
-- TRANSACTION PREPARATION / VALIDATION
-- ============================================================

create or replace function private.prepare_transaction_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_category_kind public.category_kind;
    v_category_user_id uuid;
    v_category_is_system boolean;
    v_category_deleted_at timestamptz;
    v_account_status public.account_status;
begin

    -- --------------------------------------------------------
    -- Account validation
    -- --------------------------------------------------------

    if
        tg_op = 'INSERT'
        or new.account_id is distinct from old.account_id
        or new.currency_code is distinct from old.currency_code
    then

        select a.status
        into v_account_status
        from public.accounts a
        where
            a.id = new.account_id
            and a.user_id = new.user_id
            and a.currency_code = new.currency_code;

        if not found then
            raise exception
                'Account ownership or currency validation failed';
        end if;

        if v_account_status <> 'active' then
            raise exception
                'New financial activity requires an active account';
        end if;

    end if;


    -- --------------------------------------------------------
    -- Category validation
    -- --------------------------------------------------------

    if new.category_id is not null then

        select
            c.kind,
            c.user_id,
            c.is_system,
            c.deleted_at
        into
            v_category_kind,
            v_category_user_id,
            v_category_is_system,
            v_category_deleted_at
        from public.categories c
        where c.id = new.category_id;

        if not found then
            raise exception
                'Category does not exist';
        end if;

        if v_category_deleted_at is not null then
            raise exception
                'Deleted category cannot be used';
        end if;

        if
            v_category_is_system = false
            and v_category_user_id <> new.user_id
        then
            raise exception
                'Category does not belong to this user';
        end if;

        if
            new.type = 'income'
            and v_category_kind <> 'income'
        then
            raise exception
                'Income transaction requires an income category';
        end if;

        if
            new.type = 'expense'
            and v_category_kind <> 'expense'
        then
            raise exception
                'Expense transaction requires an expense category';
        end if;

    end if;


    -- --------------------------------------------------------
    -- Revisioning
    -- --------------------------------------------------------

    if tg_op = 'INSERT' then
        new.version = 1;
    else
        new.version = old.version + 1;
    end if;

    new.server_revision =
        nextval('private.ledger_revision_seq');

    new.updated_at = now();

    return new;
end;
$$;


revoke execute
on function private.prepare_transaction_row()
from public, anon, authenticated;


create trigger transactions_prepare_row
before insert or update
on public.transactions
for each row
execute function private.prepare_transaction_row();


-- ============================================================
-- TRANSFERS
-- ============================================================

create table public.transaction_transfers (
    transaction_id uuid primary key,

    user_id uuid not null,

    from_account_id uuid not null,

    to_account_id uuid not null,

    source_currency_code text not null,

    destination_currency_code text not null,

    source_amount_minor bigint not null,

    destination_amount_minor bigint not null,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    constraint transaction_transfers_transaction_owner_fk
        foreign key (
            transaction_id,
            user_id
        )
        references public.transactions (
            id,
            user_id
        )
        on delete restrict,

    constraint transaction_transfers_source_account_fk
        foreign key (
            from_account_id,
            user_id,
            source_currency_code
        )
        references public.accounts (
            id,
            user_id,
            currency_code
        )
        on delete restrict,

    constraint transaction_transfers_destination_account_fk
        foreign key (
            to_account_id,
            user_id,
            destination_currency_code
        )
        references public.accounts (
            id,
            user_id,
            currency_code
        )
        on delete restrict,

    constraint transaction_transfers_different_accounts_check
        check (
            from_account_id <> to_account_id
        ),

    constraint transaction_transfers_source_amount_check
        check (
            source_amount_minor > 0
        ),

    constraint transaction_transfers_destination_amount_check
        check (
            destination_amount_minor > 0
        )
);


create trigger transaction_transfers_set_updated_at
before update
on public.transaction_transfers
for each row
execute function private.set_updated_at();


-- ============================================================
-- DEFERRED TRANSFER INTEGRITY
-- ============================================================

create or replace function private.enforce_transfer_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_transaction_id uuid;

    v_type public.transaction_type;
    v_user_id uuid;
    v_account_id uuid;
    v_amount_minor bigint;
    v_currency_code text;
    v_effect public.balance_effect;
    v_category_id uuid;

    v_transfer public.transaction_transfers%rowtype;
begin

    if tg_table_name = 'transactions' then
        v_transaction_id := coalesce(new.id, old.id);
    else
        v_transaction_id :=
            coalesce(new.transaction_id, old.transaction_id);
    end if;


    select
        t.type,
        t.user_id,
        t.account_id,
        t.amount_minor,
        t.currency_code,
        t.balance_effect,
        t.category_id
    into
        v_type,
        v_user_id,
        v_account_id,
        v_amount_minor,
        v_currency_code,
        v_effect,
        v_category_id
    from public.transactions t
    where t.id = v_transaction_id;


    -- Transaction may have been removed by privileged maintenance.
    if not found then
        return null;
    end if;


    select tr.*
    into v_transfer
    from public.transaction_transfers tr
    where tr.transaction_id = v_transaction_id;


    if v_type = 'transfer' then

        if not found then
            raise exception
                'Transfer transaction requires transfer details';
        end if;

        if
            v_transfer.user_id <> v_user_id
            or v_transfer.from_account_id <> v_account_id
            or v_transfer.source_amount_minor <> v_amount_minor
            or v_transfer.source_currency_code <> v_currency_code
            or v_effect <> 'neutral'
            or v_category_id is not null
        then
            raise exception
                'Transfer transaction and transfer details are inconsistent';
        end if;

    else

        if found then
            raise exception
                'Non-transfer transaction cannot have transfer details';
        end if;

    end if;

    return null;
end;
$$;


revoke execute
on function private.enforce_transfer_integrity()
from public, anon, authenticated;


create constraint trigger transactions_transfer_integrity
after insert or update or delete
on public.transactions
deferrable initially deferred
for each row
execute function private.enforce_transfer_integrity();


create constraint trigger transaction_transfers_integrity
after insert or update or delete
on public.transaction_transfers
deferrable initially deferred
for each row
execute function private.enforce_transfer_integrity();


-- ============================================================
-- INDEXES
-- ============================================================

create index transactions_user_date_idx
on public.transactions (
    user_id,
    transaction_date desc
)
where deleted_at is null;


create index transactions_user_account_date_idx
on public.transactions (
    user_id,
    account_id,
    transaction_date desc
)
where deleted_at is null;


create index transactions_user_category_date_idx
on public.transactions (
    user_id,
    category_id,
    transaction_date desc
)
where
    deleted_at is null
    and category_id is not null;


create index transactions_user_revision_idx
on public.transactions (
    user_id,
    server_revision
);


create index transaction_transfers_user_from_idx
on public.transaction_transfers (
    user_id,
    from_account_id
);


create index transaction_transfers_user_to_idx
on public.transaction_transfers (
    user_id,
    to_account_id
);


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.categories
enable row level security;

alter table public.transactions
enable row level security;

alter table public.transaction_transfers
enable row level security;


-- ============================================================
-- REVOKE DEFAULT ACCESS
-- ============================================================

revoke all
on table public.categories
from public, anon, authenticated;

revoke all
on table public.transactions
from public, anon, authenticated;

revoke all
on table public.transaction_transfers
from public, anon, authenticated;


-- ============================================================
-- CATEGORY PERMISSIONS
-- ============================================================

grant select
on public.categories
to authenticated;


grant insert (
    id,
    user_id,
    kind,
    default_name,
    icon_name,
    color_token,
    sort_order
)
on public.categories
to authenticated;


grant update (
    default_name,
    icon_name,
    color_token,
    sort_order,
    deleted_at
)
on public.categories
to authenticated;


create policy "categories_select_available"
on public.categories
for select
to authenticated
using (
    is_system = true
    or (select auth.uid()) = user_id
);


create policy "categories_insert_own"
on public.categories
for insert
to authenticated
with check (
    (select auth.uid()) = user_id
    and is_system = false
    and system_key is null
);


create policy "categories_update_own"
on public.categories
for update
to authenticated
using (
    is_system = false
    and (select auth.uid()) = user_id
)
with check (
    is_system = false
    and (select auth.uid()) = user_id
);


-- ============================================================
-- TRANSACTION PERMISSIONS
-- ============================================================

grant select
on public.transactions
to authenticated;


grant insert (
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
    client_operation_id,
    metadata,
    deleted_at
)
on public.transactions
to authenticated;


grant update (
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
    metadata,
    deleted_at
)
on public.transactions
to authenticated;


create policy "transactions_select_own"
on public.transactions
for select
to authenticated
using (
    (select auth.uid()) = user_id
);


create policy "transactions_insert_own"
on public.transactions
for insert
to authenticated
with check (
    (select auth.uid()) = user_id
);


create policy "transactions_update_own"
on public.transactions
for update
to authenticated
using (
    (select auth.uid()) = user_id
)
with check (
    (select auth.uid()) = user_id
);


-- No DELETE policy.
-- Financial transactions are soft-deleted.


-- ============================================================
-- TRANSFER PERMISSIONS
-- ============================================================

grant select
on public.transaction_transfers
to authenticated;


grant insert (
    transaction_id,
    user_id,
    from_account_id,
    to_account_id,
    source_currency_code,
    destination_currency_code,
    source_amount_minor,
    destination_amount_minor
)
on public.transaction_transfers
to authenticated;


grant update (
    from_account_id,
    to_account_id,
    source_currency_code,
    destination_currency_code,
    source_amount_minor,
    destination_amount_minor
)
on public.transaction_transfers
to authenticated;


create policy "transaction_transfers_select_own"
on public.transaction_transfers
for select
to authenticated
using (
    (select auth.uid()) = user_id
);


create policy "transaction_transfers_insert_own"
on public.transaction_transfers
for insert
to authenticated
with check (
    (select auth.uid()) = user_id
);


create policy "transaction_transfers_update_own"
on public.transaction_transfers
for update
to authenticated
using (
    (select auth.uid()) = user_id
)
with check (
    (select auth.uid()) = user_id
);


-- ============================================================
-- ATOMIC TRANSFER RPC
-- ============================================================

create or replace function public.create_transfer(
    p_from_account_id uuid,
    p_to_account_id uuid,
    p_source_amount_minor bigint,
    p_destination_amount_minor bigint,
    p_transaction_date date default current_date,
    p_description text default null,
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

    v_source_currency text;
    v_destination_currency text;

    v_existing_id uuid;
    v_existing_type public.transaction_type;
begin

    v_user_id := auth.uid();

    if v_user_id is null then
        raise exception
            'Authentication required'
            using errcode = '42501';
    end if;


    -- --------------------------------------------------------
    -- Idempotent retry
    -- --------------------------------------------------------

    select
        t.id,
        t.type
    into
        v_existing_id,
        v_existing_type
    from public.transactions t
    where
        t.user_id = v_user_id
        and t.client_operation_id = p_client_operation_id;

    if found then

        if v_existing_type <> 'transfer' then
            raise exception
                'Client operation ID has already been used';
        end if;

        return v_existing_id;

    end if;


    -- --------------------------------------------------------
    -- Validation
    -- --------------------------------------------------------

    if p_from_account_id = p_to_account_id then
        raise exception
            'Transfer accounts must be different';
    end if;


    if
        p_source_amount_minor <= 0
        or p_destination_amount_minor <= 0
    then
        raise exception
            'Transfer amounts must be positive';
    end if;


    select a.currency_code
    into v_source_currency
    from public.accounts a
    where
        a.id = p_from_account_id
        and a.user_id = v_user_id
        and a.status = 'active';

    if not found then
        raise exception
            'Source account is unavailable';
    end if;


    select a.currency_code
    into v_destination_currency
    from public.accounts a
    where
        a.id = p_to_account_id
        and a.user_id = v_user_id
        and a.status = 'active';

    if not found then
        raise exception
            'Destination account is unavailable';
    end if;


    -- --------------------------------------------------------
    -- Parent transaction
    -- --------------------------------------------------------

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
        transaction_date,
        notes,
        client_operation_id
    )
    values (
        p_transaction_id,
        v_user_id,
        p_from_account_id,
        null,
        'transfer',
        'neutral',
        p_source_amount_minor,
        v_source_currency,
        p_description,
        p_transaction_date,
        p_notes,
        p_client_operation_id
    );


    -- --------------------------------------------------------
    -- Transfer detail
    -- --------------------------------------------------------

    insert into public.transaction_transfers (
        transaction_id,
        user_id,
        from_account_id,
        to_account_id,
        source_currency_code,
        destination_currency_code,
        source_amount_minor,
        destination_amount_minor
    )
    values (
        p_transaction_id,
        v_user_id,
        p_from_account_id,
        p_to_account_id,
        v_source_currency,
        v_destination_currency,
        p_source_amount_minor,
        p_destination_amount_minor
    );


    return p_transaction_id;
end;
$$;


revoke execute
on function public.create_transfer(
    uuid,
    uuid,
    bigint,
    bigint,
    date,
    text,
    text,
    uuid,
    uuid
)
from public, anon;


grant execute
on function public.create_transfer(
    uuid,
    uuid,
    bigint,
    bigint,
    date,
    text,
    text,
    uuid,
    uuid
)
to authenticated;


-- ============================================================
-- DETERMINISTIC ACCOUNT BALANCE
-- ============================================================

create or replace function public.get_account_balance_minor(
    p_account_id uuid
)
returns bigint
language sql
stable
security invoker
set search_path = ''
as $$

    select
        a.opening_balance_minor

        +

        coalesce(
            (
                select sum(
                    case
                        when t.balance_effect = 'credit'
                            then t.amount_minor

                        when t.balance_effect = 'debit'
                            then -t.amount_minor

                        else 0
                    end
                )
                from public.transactions t
                where
                    t.user_id = a.user_id
                    and t.account_id = a.id
                    and t.type <> 'transfer'
                    and t.deleted_at is null
            ),
            0
        )

        +

        coalesce(
            (
                select sum(
                    case

                        when tr.from_account_id = a.id
                            then -tr.source_amount_minor

                        when tr.to_account_id = a.id
                            then tr.destination_amount_minor

                        else 0

                    end
                )
                from public.transaction_transfers tr

                join public.transactions t
                    on t.id = tr.transaction_id
                    and t.user_id = tr.user_id

                where
                    tr.user_id = a.user_id

                    and t.deleted_at is null

                    and (
                        tr.from_account_id = a.id
                        or tr.to_account_id = a.id
                    )
            ),
            0
        )

    from public.accounts a

    where
        a.id = p_account_id
        and a.user_id = (select auth.uid());

$$;


revoke execute
on function public.get_account_balance_minor(uuid)
from public, anon;


grant execute
on function public.get_account_balance_minor(uuid)
to authenticated;
