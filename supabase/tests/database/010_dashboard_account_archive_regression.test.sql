begin;

select plan(5);

select ok(
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'accounts'
      and column_name = 'archived_at'
  ),
  'accounts exposes archived_at'
);

select ok(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'accounts'
      and column_name = 'deleted_at'
  ),
  'accounts does not expose deleted_at'
);

select ok(
  position(
    'a.deleted_at'
    in lower(
      pg_get_functiondef(
        'public.get_financial_dashboard_summary(date)'::regprocedure
      )
    )
  ) = 0,
  'dashboard function does not reference accounts.deleted_at'
);

select ok(
  position(
    'a.archived_at is null'
    in lower(
      pg_get_functiondef(
        'public.get_financial_dashboard_summary(date)'::regprocedure
      )
    )
  ) > 0,
  'dashboard function uses accounts.archived_at'
);

select lives_ok(
  $dashboard$
    select set_config(
      'request.jwt.claim.sub',
      '00000000-0000-0000-0000-000000000123',
      true
    );
    select public.get_financial_dashboard_summary(date '2026-09-26');
  $dashboard$,
  'dashboard executes for an empty authenticated identity'
);

select * from finish();

rollback;