begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

select ok(
  exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'transaction_transfers'
      and c.conname = 'transaction_transfers_distinct_accounts'
  ),
  'transfer rows require distinct source and destination accounts'
);

select ok(
  exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'transaction_transfers'
      and c.conname = 'transaction_transfers_source_amount_positive'
  ),
  'transfer source amount must be positive'
);

select ok(
  exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'transaction_transfers'
      and c.conname = 'transaction_transfers_destination_amount_positive'
  ),
  'transfer destination amount must be positive'
);

select ok(
  exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'transaction_transfers'
      and c.conname = 'transaction_transfers_same_currency_v1'
  ),
  'current transfer model requires one currency'
);

select ok(
  exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'transaction_transfers'
      and c.conname = 'transaction_transfers_same_currency_amount_conservation_v1'
  ),
  'same-currency transfers must conserve amount'
);

select ok(
  exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'transaction_transfers'
      and c.conname = 'transaction_transfers_distinct_accounts'
      and pg_get_constraintdef(c.oid)
        ilike '%from_account_id <> to_account_id%'
  ),
  'distinct-account constraint has the intended expression'
);

select ok(
  exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'transaction_transfers'
      and c.conname = 'transaction_transfers_same_currency_v1'
      and pg_get_constraintdef(c.oid)
        ilike '%source_currency_code = destination_currency_code%'
  ),
  'same-currency constraint has the intended expression'
);

select ok(
  exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'transaction_transfers'
      and c.conname = 'transaction_transfers_same_currency_amount_conservation_v1'
      and pg_get_constraintdef(c.oid)
        ilike '%source_amount_minor = destination_amount_minor%'
  ),
  'amount-conservation constraint has the intended expression'
);

select ok(
  not exists (
    select 1
    from public.transaction_transfers tt
    where
      tt.from_account_id = tt.to_account_id
      or tt.source_amount_minor <= 0
      or tt.destination_amount_minor <= 0
      or tt.source_currency_code <> tt.destination_currency_code
      or tt.source_amount_minor <> tt.destination_amount_minor
  ),
  'database currently contains no invalid transfer detail rows'
);

select * from finish();

rollback;
