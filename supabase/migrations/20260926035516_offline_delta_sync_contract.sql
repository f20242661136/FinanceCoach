-- ============================================================
-- Gate 5B: authoritative read-side delta sync contract
-- ============================================================

-- Accounts and categories get their own monotonic revision streams.
-- Transactions already have server_revision from the ledger gate.

create sequence if not exists
  private.account_sync_revision_seq
  as bigint;

create sequence if not exists
  private.category_sync_revision_seq
  as bigint;


-- ------------------------------------------------------------
-- Account revision
-- ------------------------------------------------------------

alter table public.accounts
  add column if not exists
    server_revision bigint;

update public.accounts
set server_revision =
  nextval(
    'private.account_sync_revision_seq'::regclass
  )
where server_revision is null;

alter table public.accounts
  alter column server_revision
  set not null;


create or replace function
private.assign_account_server_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.server_revision is null then
      new.server_revision :=
        nextval(
          'private.account_sync_revision_seq'::regclass
        );
    end if;

  elsif
    new.server_revision
      is not distinct from
    old.server_revision
  then
    new.server_revision :=
      nextval(
        'private.account_sync_revision_seq'::regclass
      );
  end if;

  return new;
end;
$$;


drop trigger if exists
  accounts_server_revision
on public.accounts;

create trigger
  accounts_server_revision
before insert or update
on public.accounts
for each row
execute function
  private.assign_account_server_revision();


create index if not exists
  accounts_user_server_revision_idx
on public.accounts (
  user_id,
  server_revision
);


-- ------------------------------------------------------------
-- Category revision
-- ------------------------------------------------------------

alter table public.categories
  add column if not exists
    server_revision bigint;

update public.categories
set server_revision =
  nextval(
    'private.category_sync_revision_seq'::regclass
  )
where server_revision is null;

alter table public.categories
  alter column server_revision
  set not null;


create or replace function
private.assign_category_server_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.server_revision is null then
      new.server_revision :=
        nextval(
          'private.category_sync_revision_seq'::regclass
        );
    end if;

  elsif
    new.server_revision
      is not distinct from
    old.server_revision
  then
    new.server_revision :=
      nextval(
        'private.category_sync_revision_seq'::regclass
      );
  end if;

  return new;
end;
$$;


drop trigger if exists
  categories_server_revision
on public.categories;

create trigger
  categories_server_revision
before insert or update
on public.categories
for each row
execute function
  private.assign_category_server_revision();


create index if not exists
  categories_server_revision_idx
on public.categories (
  server_revision
);


-- ------------------------------------------------------------
-- Touch account read model when its ledger changes.
--
-- This is crucial:
-- SQLite receives the trusted server-derived balance whenever
-- a transaction changes rather than calculating its own
-- authoritative account balance.
-- ------------------------------------------------------------

create or replace function
private.bump_account_server_revision(
  p_user_id uuid,
  p_account_id uuid
)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.accounts
  set server_revision =
    nextval(
      'private.account_sync_revision_seq'::regclass
    )
  where
    user_id = p_user_id
    and id = p_account_id;
$$;


create or replace function
private.touch_transaction_account_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform private.bump_account_server_revision(
      old.user_id,
      old.account_id
    );

    return old;
  end if;

  if tg_op = 'UPDATE' then
    if
      old.user_id is distinct from new.user_id
      or old.account_id is distinct from new.account_id
    then
      perform private.bump_account_server_revision(
        old.user_id,
        old.account_id
      );
    end if;
  end if;

  perform private.bump_account_server_revision(
    new.user_id,
    new.account_id
  );

  return new;
end;
$$;


drop trigger if exists
  transactions_touch_account_revision
on public.transactions;

create trigger
  transactions_touch_account_revision
after insert or update or delete
on public.transactions
for each row
execute function
  private.touch_transaction_account_revision();


-- Transfer destination balances also change.
create or replace function
private.touch_transfer_destination_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform private.bump_account_server_revision(
      old.user_id,
      old.to_account_id
    );

    return old;
  end if;

  if tg_op = 'UPDATE' then
    if
      old.user_id is distinct from new.user_id
      or old.to_account_id
        is distinct from new.to_account_id
    then
      perform private.bump_account_server_revision(
        old.user_id,
        old.to_account_id
      );
    end if;
  end if;

  perform private.bump_account_server_revision(
    new.user_id,
    new.to_account_id
  );

  return new;
end;
$$;


drop trigger if exists
  transfers_touch_destination_revision
on public.transaction_transfers;

create trigger
  transfers_touch_destination_revision
after insert or update or delete
on public.transaction_transfers
for each row
execute function
  private.touch_transfer_destination_revision();


-- ------------------------------------------------------------
-- Delta API
--
-- Cursor inputs are TEXT intentionally. Mobile JavaScript must
-- never coerce BIGINT revision counters through Number.
-- ------------------------------------------------------------

create or replace function public.get_sync_delta(
  p_account_after text default '0',
  p_category_after text default '0',
  p_transaction_after text default '0',
  p_limit integer default 250
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid;

  v_account_after bigint;
  v_category_after bigint;
  v_transaction_after bigint;

  v_account_next bigint;
  v_category_next bigint;
  v_transaction_next bigint;

  v_limit integer;

  v_accounts jsonb;
  v_categories jsonb;
  v_transactions jsonb;

  v_accounts_more boolean;
  v_categories_more boolean;
  v_transactions_more boolean;
begin
  v_user_id :=
    auth.uid();

  if v_user_id is null then
    raise exception
      'Authentication required'
      using errcode = '42501';
  end if;


  if
    p_account_after !~ '^[0-9]+$'
    or p_category_after !~ '^[0-9]+$'
    or p_transaction_after !~ '^[0-9]+$'
  then
    raise exception
      'Sync cursors must be non-negative integers';
  end if;


  begin
    v_account_after :=
      p_account_after::bigint;

    v_category_after :=
      p_category_after::bigint;

    v_transaction_after :=
      p_transaction_after::bigint;

  exception
    when numeric_value_out_of_range then
      raise exception
        'Sync cursor is outside the supported range';
  end;


  v_limit :=
    greatest(
      1,
      least(
        coalesce(
          p_limit,
          250
        ),
        500
      )
    );


  -- ----------------------------------------------------------
  -- Accounts
  -- ----------------------------------------------------------

  select
    coalesce(
      jsonb_agg(
        (
          to_jsonb(q)
          - 'revision_sort'
        )
        order by q.revision_sort
      ),
      '[]'::jsonb
    ),

    coalesce(
      max(q.revision_sort),
      v_account_after
    )

  into
    v_accounts,
    v_account_next

  from (
    select
      a.id,
      a.name,

      a.account_type_code,

      at.balance_class::text
        as balance_class,

      a.currency_code,

      currency.minor_unit
        as currency_minor_unit,

      a.opening_balance_minor::text
        as opening_balance_minor,

      public.get_account_balance_minor(
        a.id
      )::text
        as current_balance_minor,

      a.status::text
        as status,

      a.server_revision::text
        as server_revision,

      a.created_at,
      a.updated_at,

      a.server_revision
        as revision_sort

    from public.accounts a

    join public.account_types at
      on at.code =
        a.account_type_code

    join public.currencies currency
      on currency.code =
        a.currency_code

    where
      a.user_id =
        v_user_id

      and a.server_revision >
        v_account_after

    order by
      a.server_revision

    limit v_limit
  ) q;


  -- ----------------------------------------------------------
  -- Categories
  -- ----------------------------------------------------------

  select
    coalesce(
      jsonb_agg(
        (
          to_jsonb(q)
          - 'revision_sort'
        )
        order by q.revision_sort
      ),
      '[]'::jsonb
    ),

    coalesce(
      max(q.revision_sort),
      v_category_after
    )

  into
    v_categories,
    v_category_next

  from (
    select
      c.id,

      c.kind::text
        as kind,

      c.default_name,
      c.is_system,
      c.sort_order,
      c.deleted_at,

      c.server_revision::text
        as server_revision,

      c.created_at,
      c.updated_at,

      c.server_revision
        as revision_sort

    from public.categories c

    where
      (
        c.user_id is null
        or c.user_id =
          v_user_id
      )

      and c.server_revision >
        v_category_after

    order by
      c.server_revision

    limit v_limit
  ) q;


  -- ----------------------------------------------------------
  -- Transactions
  -- ----------------------------------------------------------

  select
    coalesce(
      jsonb_agg(
        (
          to_jsonb(q)
          - 'revision_sort'
        )
        order by q.revision_sort
      ),
      '[]'::jsonb
    ),

    coalesce(
      max(q.revision_sort),
      v_transaction_after
    )

  into
    v_transactions,
    v_transaction_next

  from (
    select
      t.id,
      t.account_id,
      t.category_id,

      t.type::text
        as type,

      t.amount_minor::text
        as amount_minor,

      t.currency_code,

      source_currency.minor_unit
        as currency_minor_unit,

      t.transaction_date,
      t.merchant,
      t.description,
      t.notes,

      transfer.to_account_id
        as destination_account_id,

      transfer.destination_amount_minor::text
        as destination_amount_minor,

      transfer.destination_currency_code,

      destination_currency.minor_unit
        as destination_currency_minor_unit,

      t.version,

      t.server_revision::text
        as server_revision,

      t.deleted_at,
      t.created_at,
      t.updated_at,

      t.server_revision
        as revision_sort

    from public.transactions t

    join public.currencies source_currency
      on source_currency.code =
        t.currency_code

    left join public.transaction_transfers transfer
      on transfer.transaction_id =
        t.id

      and transfer.user_id =
        t.user_id

    left join public.currencies destination_currency
      on destination_currency.code =
        transfer.destination_currency_code

    where
      t.user_id =
        v_user_id

      and t.server_revision >
        v_transaction_after

    order by
      t.server_revision

    limit v_limit
  ) q;


  -- ----------------------------------------------------------
  -- More-data flags
  -- ----------------------------------------------------------

  select exists (
    select 1
    from public.accounts a
    where
      a.user_id =
        v_user_id

      and a.server_revision >
        v_account_next
  )
  into v_accounts_more;


  select exists (
    select 1
    from public.categories c
    where
      (
        c.user_id is null
        or c.user_id =
          v_user_id
      )

      and c.server_revision >
        v_category_next
  )
  into v_categories_more;


  select exists (
    select 1
    from public.transactions t
    where
      t.user_id =
        v_user_id

      and t.server_revision >
        v_transaction_next
  )
  into v_transactions_more;


  return jsonb_build_object(
    'accounts',
    v_accounts,

    'categories',
    v_categories,

    'transactions',
    v_transactions,

    'next',
    jsonb_build_object(
      'accounts',
      v_account_next::text,

      'categories',
      v_category_next::text,

      'transactions',
      v_transaction_next::text
    ),

    'has_more',
    jsonb_build_object(
      'accounts',
      v_accounts_more,

      'categories',
      v_categories_more,

      'transactions',
      v_transactions_more
    )
  );
end;
$$;


revoke execute
on function public.get_sync_delta(
  text,
  text,
  text,
  integer
)
from public, anon;

grant execute
on function public.get_sync_delta(
  text,
  text,
  text,
  integer
)
to authenticated;