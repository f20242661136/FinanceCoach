-- ============================================================
-- 0001: FOUNDATION / IDENTITY / ACCOUNTS
-- Finance Coach
-- ============================================================
--
-- Responsibilities:
-- - currency reference data
-- - application profiles
-- - account type configuration
-- - financial accounts
-- - ownership/RLS
-- - foundational timestamps and indexes
--
-- Transactions intentionally belong to a later migration.
-- ============================================================


-- ============================================================
-- PRIVATE SCHEMA
-- ============================================================

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;


-- ============================================================
-- ENUMS
-- ============================================================

create type public.account_status as enum (
    'active',
    'inactive',
    'archived'
);

create type public.account_balance_class as enum (
    'asset',
    'liability'
);


-- ============================================================
-- CURRENCIES
-- ============================================================

create table public.currencies (
    code text primary key,
    name text not null,
    symbol text not null,
    minor_unit smallint not null default 2,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),

    constraint currencies_code_format_check
        check (
            code = upper(code)
            and char_length(code) = 3
        ),

    constraint currencies_minor_unit_check
        check (minor_unit between 0 and 4),

    constraint currencies_name_not_blank_check
        check (length(btrim(name)) > 0),

    constraint currencies_symbol_not_blank_check
        check (length(btrim(symbol)) > 0)
);


-- Currency data is configuration/reference data.
-- PKR is included because Pakistan is the initial market,
-- but no business logic assumes PKR.

insert into public.currencies (
    code,
    name,
    symbol,
    minor_unit
)
values
    ('PKR', 'Pakistani Rupee', 'Rs', 2),
    ('USD', 'US Dollar', '$', 2),
    ('GBP', 'British Pound', '£', 2),
    ('AED', 'UAE Dirham', 'د.إ', 2),
    ('SAR', 'Saudi Riyal', '﷼', 2),
    ('INR', 'Indian Rupee', '₹', 2),
    ('EUR', 'Euro', '€', 2)
on conflict (code) do nothing;


-- ============================================================
-- USER PROFILES
-- ============================================================

create table public.profiles (
    user_id uuid primary key
        references auth.users(id)
        on delete cascade,

    display_name text,

    base_currency_code text
        references public.currencies(code),

    locale text not null default 'en',

    timezone text not null default 'UTC',

    date_format text not null default 'YYYY-MM-DD',

    number_format text not null default 'locale',

    onboarding_completed boolean not null default false,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    constraint profiles_display_name_length_check
        check (
            display_name is null
            or char_length(display_name) <= 120
        ),

    constraint profiles_locale_not_blank_check
        check (length(btrim(locale)) > 0),

    constraint profiles_timezone_not_blank_check
        check (length(btrim(timezone)) > 0)
);


-- ============================================================
-- ACCOUNT TYPES
-- ============================================================

create table public.account_types (
    code text primary key,

    translation_key text not null unique,

    balance_class public.account_balance_class not null,

    is_system boolean not null default true,

    is_active boolean not null default true,

    sort_order integer not null default 0,

    created_at timestamptz not null default now(),

    constraint account_types_code_format_check
        check (
            code = lower(code)
            and code ~ '^[a-z0-9_]+$'
        ),

    constraint account_types_sort_order_check
        check (sort_order >= 0)
);


insert into public.account_types (
    code,
    translation_key,
    balance_class,
    sort_order
)
values
    ('cash',           'accountType.cash',          'asset',     10),
    ('bank',           'accountType.bank',          'asset',     20),
    ('digital_wallet', 'accountType.digitalWallet', 'asset',     30),
    ('credit_card',    'accountType.creditCard',    'liability', 40),
    ('investment',     'accountType.investment',    'asset',     50),
    ('other',          'accountType.other',         'asset',     60)
on conflict (code) do nothing;


-- ============================================================
-- ACCOUNTS
-- ============================================================

create table public.accounts (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references auth.users(id)
        on delete restrict,

    name text not null,

    account_type_code text not null
        references public.account_types(code),

    currency_code text not null
        references public.currencies(code),

    -- Money is stored in integer minor units.
    --
    -- Examples:
    -- PKR 2,400.00 => 240000
    -- USD 19.95     => 1995
    --
    -- This field is signed from the user's net-position
    -- perspective. Asset balances can be positive; liability
    -- balances may be negative internally.
    opening_balance_minor bigint not null default 0,

    status public.account_status not null default 'active',

    icon_name text,

    color_token text,

    sort_order integer not null default 0,

    archived_at timestamptz,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    constraint accounts_name_not_blank_check
        check (
            length(btrim(name)) between 1 and 80
        ),

    constraint accounts_sort_order_check
        check (sort_order >= 0),

    -- Required later for composite ownership foreign keys:
    --
    -- transactions(account_id, user_id)
    --     -> accounts(id, user_id)
    --
    constraint accounts_id_user_unique
        unique (id, user_id)
);


-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

revoke execute
on function private.set_updated_at()
from public, anon, authenticated;


create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function private.set_updated_at();


create trigger accounts_set_updated_at
before update on public.accounts
for each row
execute function private.set_updated_at();


-- ============================================================
-- AUTH -> PROFILE TRIGGER
-- ============================================================

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (
        user_id,
        display_name
    )
    values (
        new.id,
        nullif(
            btrim(new.raw_user_meta_data ->> 'full_name'),
            ''
        )
    );

    return new;
end;
$$;


revoke execute
on function private.handle_new_user()
from public, anon, authenticated;

grant usage
on schema private
to supabase_auth_admin;

grant execute
on function private.handle_new_user()
to supabase_auth_admin;


create trigger on_auth_user_created
after insert on auth.users
for each row
execute function private.handle_new_user();


-- ============================================================
-- INDEXES
-- ============================================================

create index accounts_user_status_idx
on public.accounts (
    user_id,
    status
);


create index accounts_user_created_at_idx
on public.accounts (
    user_id,
    created_at desc
);


create index accounts_user_currency_idx
on public.accounts (
    user_id,
    currency_code
);


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.currencies
enable row level security;

alter table public.profiles
enable row level security;

alter table public.account_types
enable row level security;

alter table public.accounts
enable row level security;


-- ============================================================
-- REMOVE IMPLICIT CLIENT PERMISSIONS
-- ============================================================

revoke all
on table public.currencies
from public, anon, authenticated;

revoke all
on table public.account_types
from public, anon, authenticated;

revoke all
on table public.profiles
from public, anon, authenticated;

revoke all
on table public.accounts
from public, anon, authenticated;


-- ============================================================
-- LOOKUP TABLE GRANTS + POLICIES
-- ============================================================

grant select
on table public.currencies
to authenticated;


create policy "authenticated_read_currencies"
on public.currencies
for select
to authenticated
using (true);


grant select
on table public.account_types
to authenticated;


create policy "authenticated_read_account_types"
on public.account_types
for select
to authenticated
using (true);


-- ============================================================
-- PROFILE GRANTS + POLICIES
-- ============================================================

grant select
on table public.profiles
to authenticated;


grant update (
    display_name,
    base_currency_code,
    locale,
    timezone,
    date_format,
    number_format,
    onboarding_completed
)
on public.profiles
to authenticated;


create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (
    (select auth.uid()) = user_id
);


create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (
    (select auth.uid()) = user_id
)
with check (
    (select auth.uid()) = user_id
);


-- ============================================================
-- ACCOUNT GRANTS + POLICIES
-- ============================================================

grant select
on table public.accounts
to authenticated;


-- Offline architecture will eventually create UUIDs on-device,
-- so id is intentionally insertable by the authenticated owner.

grant insert (
    id,
    user_id,
    name,
    account_type_code,
    currency_code,
    opening_balance_minor,
    status,
    icon_name,
    color_token,
    sort_order,
    archived_at
)
on public.accounts
to authenticated;


grant update (
    name,
    account_type_code,
    currency_code,
    opening_balance_minor,
    status,
    icon_name,
    color_token,
    sort_order,
    archived_at
)
on public.accounts
to authenticated;


create policy "accounts_select_own"
on public.accounts
for select
to authenticated
using (
    (select auth.uid()) = user_id
);


create policy "accounts_insert_own"
on public.accounts
for insert
to authenticated
with check (
    (select auth.uid()) = user_id
);


create policy "accounts_update_own"
on public.accounts
for update
to authenticated
using (
    (select auth.uid()) = user_id
)
with check (
    (select auth.uid()) = user_id
);


-- Intentionally NO DELETE grant/policy.
--
-- Financial accounts should be archived rather than casually
-- hard-deleted.
