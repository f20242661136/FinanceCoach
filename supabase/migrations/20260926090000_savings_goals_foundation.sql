-- Finance Coach
-- Savings goals foundation
--
-- Principles:
-- - PostgreSQL is authoritative.
-- - Goal progress is derived from immutable contribution history.
-- - No mutable current_amount column exists.
-- - Money uses BIGINT minor units.
-- - Client-generated UUIDs make create operations idempotent.

create table if not exists public.savings_goals (
  id uuid primary key,
  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  name text not null,

  goal_type text not null
    check (
      goal_type in (
        'general',
        'emergency_fund',
        'retirement',
        'education',
        'vehicle',
        'home',
        'travel',
        'custom'
      )
    ),

  currency_code text not null
    references public.currencies(code),

  target_amount_minor bigint not null
    check (target_amount_minor > 0),

  target_date date null,

  status text not null default 'active'
    check (
      status in (
        'active',
        'paused',
        'completed',
        'archived'
      )
    ),

  notes text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);


create table if not exists public.savings_contributions (
  id uuid primary key,

  goal_id uuid not null
    references public.savings_goals(id)
    on delete cascade,

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  amount_minor bigint not null
    check (amount_minor > 0),

  contribution_date date not null,

  note text null,

  created_at timestamptz not null default now(),
  deleted_at timestamptz null
);


create index if not exists savings_goals_user_status_idx
  on public.savings_goals (
    user_id,
    status
  )
  where deleted_at is null;


create index if not exists savings_goals_user_target_date_idx
  on public.savings_goals (
    user_id,
    target_date
  )
  where deleted_at is null;


create index if not exists savings_contributions_goal_date_idx
  on public.savings_contributions (
    goal_id,
    contribution_date,
    created_at
  )
  where deleted_at is null;


create index if not exists savings_contributions_user_idx
  on public.savings_contributions (
    user_id,
    created_at
  )
  where deleted_at is null;


alter table public.savings_goals
  enable row level security;

alter table public.savings_contributions
  enable row level security;


drop policy if exists savings_goals_select_own
  on public.savings_goals;

create policy savings_goals_select_own
  on public.savings_goals
  for select
  to authenticated
  using (
    user_id = auth.uid()
  );


drop policy if exists savings_goals_insert_own
  on public.savings_goals;

create policy savings_goals_insert_own
  on public.savings_goals
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
  );


drop policy if exists savings_goals_update_own
  on public.savings_goals;

create policy savings_goals_update_own
  on public.savings_goals
  for update
  to authenticated
  using (
    user_id = auth.uid()
  )
  with check (
    user_id = auth.uid()
  );


drop policy if exists savings_goals_delete_own
  on public.savings_goals;

create policy savings_goals_delete_own
  on public.savings_goals
  for delete
  to authenticated
  using (
    user_id = auth.uid()
  );


drop policy if exists savings_contributions_select_own
  on public.savings_contributions;

create policy savings_contributions_select_own
  on public.savings_contributions
  for select
  to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from public.savings_goals g
      where
        g.id = savings_contributions.goal_id
        and g.user_id = auth.uid()
    )
  );


drop policy if exists savings_contributions_insert_own
  on public.savings_contributions;

create policy savings_contributions_insert_own
  on public.savings_contributions
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.savings_goals g
      where
        g.id = savings_contributions.goal_id
        and g.user_id = auth.uid()
    )
  );


drop policy if exists savings_contributions_update_own
  on public.savings_contributions;

create policy savings_contributions_update_own
  on public.savings_contributions
  for update
  to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from public.savings_goals g
      where
        g.id = savings_contributions.goal_id
        and g.user_id = auth.uid()
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.savings_goals g
      where
        g.id = savings_contributions.goal_id
        and g.user_id = auth.uid()
    )
  );


drop policy if exists savings_contributions_delete_own
  on public.savings_contributions;

create policy savings_contributions_delete_own
  on public.savings_contributions
  for delete
  to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from public.savings_goals g
      where
        g.id = savings_contributions.goal_id
        and g.user_id = auth.uid()
    )
  );


revoke all on public.savings_goals
  from anon;

revoke all on public.savings_contributions
  from anon;

grant select, insert, update, delete
  on public.savings_goals
  to authenticated;

grant select, insert, update, delete
  on public.savings_contributions
  to authenticated;


create or replace function public.create_savings_goal(
  p_goal_id uuid,
  p_name text,
  p_goal_type text,
  p_currency_code text,
  p_target_amount_minor text,
  p_target_date date default null,
  p_notes text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid;
  v_target_amount_minor bigint;
  v_existing public.savings_goals%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;


  if p_goal_id is null then
    raise exception 'Goal ID is required'
      using errcode = '22023';
  end if;


  if nullif(btrim(p_name), '') is null then
    raise exception 'Goal name is required'
      using errcode = '22023';
  end if;


  if p_goal_type not in (
    'general',
    'emergency_fund',
    'retirement',
    'education',
    'vehicle',
    'home',
    'travel',
    'custom'
  ) then
    raise exception 'Invalid savings goal type'
      using errcode = '22023';
  end if;


  if p_currency_code is null
     or p_currency_code !~ '^[A-Z]{3}$' then
    raise exception 'Invalid currency code'
      using errcode = '22023';
  end if;


  if not exists (
    select 1
    from public.currencies c
    where c.code = p_currency_code
  ) then
    raise exception 'Unsupported currency'
      using errcode = '22023';
  end if;


  begin
    v_target_amount_minor :=
      p_target_amount_minor::bigint;
  exception
    when others then
      raise exception 'Target amount must be an integer minor-unit string'
        using errcode = '22023';
  end;


  if v_target_amount_minor <= 0 then
    raise exception 'Target amount must be greater than zero'
      using errcode = '22023';
  end if;


  select *
  into v_existing
  from public.savings_goals g
  where g.id = p_goal_id;


  if found then
    if v_existing.user_id <> v_user_id then
      raise exception 'Goal ID is already in use'
        using errcode = '42501';
    end if;


    if v_existing.name <> btrim(p_name)
       or v_existing.goal_type <> p_goal_type
       or v_existing.currency_code <> p_currency_code
       or v_existing.target_amount_minor <> v_target_amount_minor
       or v_existing.target_date is distinct from p_target_date
       or coalesce(v_existing.notes, '')
          <> coalesce(nullif(btrim(p_notes), ''), '')
       or v_existing.deleted_at is not null then
      raise exception 'Goal ID was already used with different data'
        using errcode = '23505';
    end if;


    return p_goal_id;
  end if;


  insert into public.savings_goals (
    id,
    user_id,
    name,
    goal_type,
    currency_code,
    target_amount_minor,
    target_date,
    status,
    notes
  )
  values (
    p_goal_id,
    v_user_id,
    btrim(p_name),
    p_goal_type,
    p_currency_code,
    v_target_amount_minor,
    p_target_date,
    'active',
    nullif(
      btrim(p_notes),
      ''
    )
  );


  return p_goal_id;
end;
$$;


revoke all on function public.create_savings_goal(
  uuid,
  text,
  text,
  text,
  text,
  date,
  text
)
from public;

grant execute on function public.create_savings_goal(
  uuid,
  text,
  text,
  text,
  text,
  date,
  text
)
to authenticated;


create or replace function public.add_savings_contribution(
  p_contribution_id uuid,
  p_goal_id uuid,
  p_amount_minor text,
  p_contribution_date date default current_date,
  p_note text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid;
  v_amount_minor bigint;
  v_goal public.savings_goals%rowtype;
  v_existing public.savings_contributions%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;


  if p_contribution_id is null then
    raise exception 'Contribution ID is required'
      using errcode = '22023';
  end if;


  select *
  into v_goal
  from public.savings_goals g
  where
    g.id = p_goal_id
    and g.user_id = v_user_id
    and g.deleted_at is null;


  if not found then
    raise exception 'Savings goal not found'
      using errcode = '42501';
  end if;


  if v_goal.status not in (
    'active',
    'paused'
  ) then
    raise exception 'Savings goal does not accept contributions'
      using errcode = '22023';
  end if;


  begin
    v_amount_minor :=
      p_amount_minor::bigint;
  exception
    when others then
      raise exception 'Contribution amount must be an integer minor-unit string'
        using errcode = '22023';
  end;


  if v_amount_minor <= 0 then
    raise exception 'Contribution amount must be greater than zero'
      using errcode = '22023';
  end if;


  if p_contribution_date is null then
    raise exception 'Contribution date is required'
      using errcode = '22023';
  end if;


  select *
  into v_existing
  from public.savings_contributions c
  where c.id = p_contribution_id;


  if found then
    if v_existing.user_id <> v_user_id then
      raise exception 'Contribution ID is already in use'
        using errcode = '42501';
    end if;


    if v_existing.goal_id <> p_goal_id
       or v_existing.amount_minor <> v_amount_minor
       or v_existing.contribution_date <> p_contribution_date
       or coalesce(v_existing.note, '')
          <> coalesce(nullif(btrim(p_note), ''), '')
       or v_existing.deleted_at is not null then
      raise exception 'Contribution ID was already used with different data'
        using errcode = '23505';
    end if;


    return p_contribution_id;
  end if;


  insert into public.savings_contributions (
    id,
    goal_id,
    user_id,
    amount_minor,
    contribution_date,
    note
  )
  values (
    p_contribution_id,
    p_goal_id,
    v_user_id,
    v_amount_minor,
    p_contribution_date,
    nullif(
      btrim(p_note),
      ''
    )
  );


  return p_contribution_id;
end;
$$;


revoke all on function public.add_savings_contribution(
  uuid,
  uuid,
  text,
  date,
  text
)
from public;

grant execute on function public.add_savings_contribution(
  uuid,
  uuid,
  text,
  date,
  text
)
to authenticated;


create or replace function public.get_savings_goal_status()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with contribution_totals as (
    select
      c.goal_id,
      coalesce(
        sum(c.amount_minor),
        0
      )::bigint as contributed_minor,
      count(*)::bigint as contribution_count,
      max(c.contribution_date) as last_contribution_date

    from public.savings_contributions c

    where
      c.user_id = auth.uid()
      and c.deleted_at is null

    group by
      c.goal_id
  ),

  goal_rows as (
    select
      g.id,
      g.name,
      g.goal_type,
      g.currency_code,
      g.target_amount_minor,
      g.target_date,
      g.status,
      g.notes,

      coalesce(
        ct.contributed_minor,
        0
      )::bigint as contributed_minor,

      greatest(
        g.target_amount_minor
        - coalesce(
            ct.contributed_minor,
            0
          ),
        0
      )::bigint as remaining_minor,

      case
        when g.target_amount_minor <= 0
          then 0::bigint
        else
          (
            coalesce(
              ct.contributed_minor,
              0
            )
            * 10000
          )
          / g.target_amount_minor
      end::bigint as progress_basis_points,

      (
        coalesce(
          ct.contributed_minor,
          0
        )
        >= g.target_amount_minor
      ) as is_target_reached,

      coalesce(
        ct.contribution_count,
        0
      )::bigint as contribution_count,

      ct.last_contribution_date,

      case
        when g.target_date is null
          then null
        else
          (g.target_date - current_date)
      end as days_to_target

    from public.savings_goals g

    left join contribution_totals ct
      on ct.goal_id = g.id

    where
      g.user_id = auth.uid()
      and g.deleted_at is null
      and g.status <> 'archived'
  )

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',
        id,

        'name',
        name,

        'goal_type',
        goal_type,

        'currency_code',
        currency_code,

        'target_amount_minor',
        target_amount_minor::text,

        'contributed_minor',
        contributed_minor::text,

        'remaining_minor',
        remaining_minor::text,

        'progress_basis_points',
        progress_basis_points::text,

        'target_date',
        target_date,

        'status',
        status,

        'notes',
        notes,

        'is_target_reached',
        is_target_reached,

        'contribution_count',
        contribution_count::text,

        'last_contribution_date',
        last_contribution_date,

        'days_to_target',
        days_to_target
      )
      order by
        is_target_reached asc,
        target_date asc nulls last,
        name asc
    ),
    '[]'::jsonb
  )
  from goal_rows;
$$;


revoke all on function public.get_savings_goal_status()
  from public;

grant execute on function public.get_savings_goal_status()
  to authenticated;


create or replace function public.get_savings_contribution_history(
  p_goal_id uuid,
  p_limit integer default 100
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_user_id uuid;
  v_limit integer;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;


  if not exists (
    select 1
    from public.savings_goals g
    where
      g.id = p_goal_id
      and g.user_id = v_user_id
      and g.deleted_at is null
  ) then
    raise exception 'Savings goal not found'
      using errcode = '42501';
  end if;


  v_limit :=
    greatest(
      1,
      least(
        coalesce(
          p_limit,
          100
        ),
        500
      )
    );


  return (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id',
          rows.id,

          'amount_minor',
          rows.amount_minor::text,

          'contribution_date',
          rows.contribution_date,

          'note',
          rows.note,

          'created_at',
          rows.created_at
        )
        order by
          rows.contribution_date desc,
          rows.created_at desc
      ),
      '[]'::jsonb
    )

    from (
      select
        c.id,
        c.amount_minor,
        c.contribution_date,
        c.note,
        c.created_at

      from public.savings_contributions c

      where
        c.goal_id = p_goal_id
        and c.user_id = v_user_id
        and c.deleted_at is null

      order by
        c.contribution_date desc,
        c.created_at desc

      limit v_limit
    ) rows
  );
end;
$$;


revoke all on function public.get_savings_contribution_history(
  uuid,
  integer
)
from public;

grant execute on function public.get_savings_contribution_history(
  uuid,
  integer
)
to authenticated;