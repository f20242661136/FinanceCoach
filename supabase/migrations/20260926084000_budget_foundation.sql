-- Finance Coach budget foundation
-- PostgreSQL remains authoritative for budget calculations.
-- Money uses BIGINT minor units. Transfers are excluded because spend only
-- includes transactions whose type is expense.

create table if not exists public.budgets (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  currency_code text not null references public.currencies(code),
  period_type text not null check (period_type in ('monthly', 'annual', 'custom')),
  period_start date not null,
  period_end date not null,
  limit_minor bigint not null check (limit_minor > 0),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  constraint budgets_period_valid check (period_end >= period_start)
);

create table if not exists public.budget_categories (
  budget_id uuid not null references public.budgets(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (budget_id, category_id)
);

create index if not exists budgets_user_period_idx
  on public.budgets (user_id, period_start, period_end)
  where deleted_at is null;

create index if not exists budgets_user_status_idx
  on public.budgets (user_id, status)
  where deleted_at is null;

create index if not exists budget_categories_category_idx
  on public.budget_categories(category_id);

alter table public.budgets enable row level security;
alter table public.budget_categories enable row level security;

drop policy if exists budgets_select_own on public.budgets;
create policy budgets_select_own
  on public.budgets for select to authenticated
  using (user_id = auth.uid());

drop policy if exists budgets_insert_own on public.budgets;
create policy budgets_insert_own
  on public.budgets for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists budgets_update_own on public.budgets;
create policy budgets_update_own
  on public.budgets for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists budgets_delete_own on public.budgets;
create policy budgets_delete_own
  on public.budgets for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists budget_categories_select_own on public.budget_categories;
create policy budget_categories_select_own
  on public.budget_categories for select to authenticated
  using (
    exists (
      select 1
      from public.budgets b
      where b.id = budget_categories.budget_id
        and b.user_id = auth.uid()
    )
  );

drop policy if exists budget_categories_insert_own on public.budget_categories;
create policy budget_categories_insert_own
  on public.budget_categories for insert to authenticated
  with check (
    exists (
      select 1
      from public.budgets b
      where b.id = budget_categories.budget_id
        and b.user_id = auth.uid()
    )
  );

drop policy if exists budget_categories_delete_own on public.budget_categories;
create policy budget_categories_delete_own
  on public.budget_categories for delete to authenticated
  using (
    exists (
      select 1
      from public.budgets b
      where b.id = budget_categories.budget_id
        and b.user_id = auth.uid()
    )
  );

revoke all on public.budgets from anon;
revoke all on public.budget_categories from anon;
grant select, insert, update, delete on public.budgets to authenticated;
grant select, insert, delete on public.budget_categories to authenticated;

create or replace function public.create_budget(
  p_budget_id uuid,
  p_name text,
  p_currency_code text,
  p_period_type text,
  p_period_start date,
  p_period_end date,
  p_limit_minor text,
  p_category_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid;
  v_limit_minor bigint;
  v_existing public.budgets%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_budget_id is null then
    raise exception 'Budget ID is required' using errcode = '22023';
  end if;

  if nullif(btrim(p_name), '') is null then
    raise exception 'Budget name is required' using errcode = '22023';
  end if;

  if p_currency_code is null or p_currency_code !~ '^[A-Z]{3}$' then
    raise exception 'Invalid currency code' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.currencies c where c.code = p_currency_code
  ) then
    raise exception 'Unsupported currency' using errcode = '22023';
  end if;

  if p_period_type not in ('monthly', 'annual', 'custom') then
    raise exception 'Invalid budget period type' using errcode = '22023';
  end if;

  if p_period_start is null or p_period_end is null or p_period_end < p_period_start then
    raise exception 'Invalid budget period' using errcode = '22023';
  end if;

  if p_period_type = 'monthly'
     and (
       p_period_start <> date_trunc('month', p_period_start)::date
       or p_period_end <> (
         date_trunc('month', p_period_start)
         + interval '1 month'
         - interval '1 day'
       )::date
     ) then
    raise exception 'Monthly budget must cover one calendar month' using errcode = '22023';
  end if;

  if p_period_type = 'annual'
     and (
       extract(month from p_period_start) <> 1
       or extract(day from p_period_start) <> 1
       or p_period_end <> make_date(extract(year from p_period_start)::int, 12, 31)
     ) then
    raise exception 'Annual budget must cover one calendar year' using errcode = '22023';
  end if;

  begin
    v_limit_minor := p_limit_minor::bigint;
  exception when others then
    raise exception 'Budget limit must be an integer minor-unit string' using errcode = '22023';
  end;

  if v_limit_minor <= 0 then
    raise exception 'Budget limit must be greater than zero' using errcode = '22023';
  end if;

  if p_category_id is not null
     and not exists (
       select 1
       from public.categories c
       where c.id = p_category_id
         and c.deleted_at is null
         and (c.user_id is null or c.user_id = v_user_id)
     ) then
    raise exception 'Category is unavailable' using errcode = '42501';
  end if;

  select *
  into v_existing
  from public.budgets b
  where b.id = p_budget_id;

  if found then
    if v_existing.user_id <> v_user_id then
      raise exception 'Budget ID is already in use' using errcode = '42501';
    end if;

    if v_existing.name <> btrim(p_name)
       or v_existing.currency_code <> p_currency_code
       or v_existing.period_type <> p_period_type
       or v_existing.period_start <> p_period_start
       or v_existing.period_end <> p_period_end
       or v_existing.limit_minor <> v_limit_minor
       or v_existing.deleted_at is not null then
      raise exception 'Budget ID was already used with different data' using errcode = '23505';
    end if;

    if p_category_id is null then
      if exists (
        select 1 from public.budget_categories bc where bc.budget_id = p_budget_id
      ) then
        raise exception 'Budget ID was already used with different category data' using errcode = '23505';
      end if;
    else
      if not exists (
        select 1
        from public.budget_categories bc
        where bc.budget_id = p_budget_id
          and bc.category_id = p_category_id
      ) then
        raise exception 'Budget ID was already used with different category data' using errcode = '23505';
      end if;
    end if;

    return p_budget_id;
  end if;

  insert into public.budgets (
    id,
    user_id,
    name,
    currency_code,
    period_type,
    period_start,
    period_end,
    limit_minor,
    status
  )
  values (
    p_budget_id,
    v_user_id,
    btrim(p_name),
    p_currency_code,
    p_period_type,
    p_period_start,
    p_period_end,
    v_limit_minor,
    'active'
  );

  if p_category_id is not null then
    insert into public.budget_categories (budget_id, category_id)
    values (p_budget_id, p_category_id);
  end if;

  return p_budget_id;
end;
$$;

revoke all on function public.create_budget(uuid, text, text, text, date, date, text, uuid) from public;
grant execute on function public.create_budget(uuid, text, text, text, date, date, text, uuid) to authenticated;

create or replace function public.get_budget_status(
  p_as_of date default current_date
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with owned_budgets as (
    select
      b.id,
      b.name,
      b.currency_code,
      b.period_type,
      b.period_start,
      b.period_end,
      b.limit_minor,
      bc.category_id,
      c.default_name as category_name,
      greatest(1, (b.period_end - b.period_start) + 1)::bigint as total_days,
      greatest(
        1,
        (least(p_as_of, b.period_end) - b.period_start) + 1
      )::bigint as elapsed_days
    from public.budgets b
    left join public.budget_categories bc
      on bc.budget_id = b.id
    left join public.categories c
      on c.id = bc.category_id
    where b.user_id = auth.uid()
      and b.status = 'active'
      and b.deleted_at is null
      and p_as_of between b.period_start and b.period_end
  ),
  spend as (
    select
      b.id as budget_id,
      coalesce(sum(t.amount_minor), 0)::bigint as spent_minor
    from owned_budgets b
    left join public.transactions t
      on t.user_id = auth.uid()
      and t.deleted_at is null
      and t.type = 'expense'
      and t.currency_code = b.currency_code
      and t.transaction_date between b.period_start and least(p_as_of, b.period_end)
      and (b.category_id is null or t.category_id = b.category_id)
    group by b.id
  ),
  status_rows as (
    select
      b.id,
      b.name,
      b.currency_code,
      b.period_type,
      b.period_start,
      b.period_end,
      b.limit_minor,
      b.category_id,
      b.category_name,
      s.spent_minor,
      (b.limit_minor - s.spent_minor)::bigint as remaining_minor,
      case
        when b.limit_minor <= 0 then 0
        else least(
          2147483647::bigint,
          (s.spent_minor * 10000) / b.limit_minor
        )
      end::bigint as usage_basis_points,
      case
        when s.spent_minor <= 0 then 0::bigint
        when b.elapsed_days >= b.total_days then s.spent_minor
        else ((s.spent_minor * b.total_days) + b.elapsed_days - 1) / b.elapsed_days
      end::bigint as projected_spend_minor,
      (s.spent_minor > b.limit_minor) as is_over_budget
    from owned_budgets b
    join spend s on s.budget_id = b.id
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'name', name,
        'currency_code', currency_code,
        'period_type', period_type,
        'period_start', period_start,
        'period_end', period_end,
        'limit_minor', limit_minor::text,
        'spent_minor', spent_minor::text,
        'remaining_minor', remaining_minor::text,
        'usage_basis_points', usage_basis_points::text,
        'projected_spend_minor', projected_spend_minor::text,
        'is_over_budget', is_over_budget,
        'category_id', category_id,
        'category_name', category_name
      )
      order by is_over_budget desc, usage_basis_points desc, name asc
    ),
    '[]'::jsonb
  )
  from status_rows;
$$;

revoke all on function public.get_budget_status(date) from public;
grant execute on function public.get_budget_status(date) to authenticated;