-- Finance Coach
-- Six-Jar planning foundation
--
-- Principles:
-- - Six Jars is a planning/allocation system, not a bank.
-- - Percentages are configurable and must total exactly 100%.
-- - Suggested allocation amounts are deterministic server calculations.
-- - No account balance or ledger row is changed by this domain.
-- - Money uses BIGINT minor units.
-- - Percentages use basis points: 10000 = 100%.

create table if not exists public.six_jar_profiles (
  id uuid primary key,

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  name text not null,

  currency_code text not null
    references public.currencies(code),

  status text not null default 'active'
    check (
      status in (
        'active',
        'archived'
      )
    ),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);


create table if not exists public.six_jar_categories (
  id uuid primary key,

  profile_id uuid not null
    references public.six_jar_profiles(id)
    on delete cascade,

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  name text not null,

  code text not null,

  percentage_basis_points integer not null
    check (
      percentage_basis_points > 0
      and percentage_basis_points <= 10000
    ),

  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,

  unique (
    profile_id,
    code
  )
);


create table if not exists public.six_jar_allocations (
  id uuid primary key,

  profile_id uuid not null
    references public.six_jar_profiles(id)
    on delete cascade,

  jar_category_id uuid not null
    references public.six_jar_categories(id)
    on delete cascade,

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  source_income_minor bigint not null
    check (source_income_minor > 0),

  suggested_amount_minor bigint not null
    check (suggested_amount_minor >= 0),

  allocation_date date not null,

  source_label text null,

  created_at timestamptz not null default now(),
  deleted_at timestamptz null
);


create index if not exists six_jar_profiles_user_idx
  on public.six_jar_profiles (
    user_id,
    status
  )
  where deleted_at is null;


create index if not exists six_jar_categories_profile_idx
  on public.six_jar_categories (
    profile_id,
    sort_order,
    name
  )
  where deleted_at is null;


create index if not exists six_jar_allocations_profile_date_idx
  on public.six_jar_allocations (
    profile_id,
    allocation_date desc,
    created_at desc
  )
  where deleted_at is null;


alter table public.six_jar_profiles
  enable row level security;

alter table public.six_jar_categories
  enable row level security;

alter table public.six_jar_allocations
  enable row level security;


drop policy if exists six_jar_profiles_select_own
  on public.six_jar_profiles;

create policy six_jar_profiles_select_own
  on public.six_jar_profiles
  for select
  to authenticated
  using (
    user_id = auth.uid()
  );


drop policy if exists six_jar_profiles_insert_own
  on public.six_jar_profiles;

create policy six_jar_profiles_insert_own
  on public.six_jar_profiles
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
  );


drop policy if exists six_jar_profiles_update_own
  on public.six_jar_profiles;

create policy six_jar_profiles_update_own
  on public.six_jar_profiles
  for update
  to authenticated
  using (
    user_id = auth.uid()
  )
  with check (
    user_id = auth.uid()
  );


drop policy if exists six_jar_categories_select_own
  on public.six_jar_categories;

create policy six_jar_categories_select_own
  on public.six_jar_categories
  for select
  to authenticated
  using (
    user_id = auth.uid()
  );


drop policy if exists six_jar_categories_insert_own
  on public.six_jar_categories;

create policy six_jar_categories_insert_own
  on public.six_jar_categories
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.six_jar_profiles p
      where
        p.id = six_jar_categories.profile_id
        and p.user_id = auth.uid()
        and p.deleted_at is null
    )
  );


drop policy if exists six_jar_categories_update_own
  on public.six_jar_categories;

create policy six_jar_categories_update_own
  on public.six_jar_categories
  for update
  to authenticated
  using (
    user_id = auth.uid()
  )
  with check (
    user_id = auth.uid()
  );


drop policy if exists six_jar_allocations_select_own
  on public.six_jar_allocations;

create policy six_jar_allocations_select_own
  on public.six_jar_allocations
  for select
  to authenticated
  using (
    user_id = auth.uid()
  );


drop policy if exists six_jar_allocations_insert_own
  on public.six_jar_allocations;

create policy six_jar_allocations_insert_own
  on public.six_jar_allocations
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
  );


revoke all on public.six_jar_profiles
  from anon;

revoke all on public.six_jar_categories
  from anon;

revoke all on public.six_jar_allocations
  from anon;

grant select, insert, update
  on public.six_jar_profiles
  to authenticated;

grant select, insert, update
  on public.six_jar_categories
  to authenticated;

grant select, insert
  on public.six_jar_allocations
  to authenticated;


create or replace function public.save_six_jar_profile(
  p_profile_id uuid,
  p_name text,
  p_currency_code text,
  p_jars jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid;
  v_total integer;
  v_count integer;
  v_item jsonb;
  v_jar_id uuid;
  v_name text;
  v_code text;
  v_percentage integer;
  v_sort integer;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;


  if p_profile_id is null then
    raise exception 'Profile ID is required'
      using errcode = '22023';
  end if;


  if nullif(btrim(p_name), '') is null then
    raise exception 'Profile name is required'
      using errcode = '22023';
  end if;


  if p_currency_code is null
     or p_currency_code !~ '^[A-Z]{3}$'
     or not exists (
       select 1
       from public.currencies c
       where c.code = p_currency_code
     ) then
    raise exception 'Unsupported currency'
      using errcode = '22023';
  end if;


  if jsonb_typeof(p_jars) <> 'array' then
    raise exception 'Jars must be a JSON array'
      using errcode = '22023';
  end if;


  v_count :=
    jsonb_array_length(
      p_jars
    );


  if v_count < 2
     or v_count > 12 then
    raise exception 'Use between 2 and 12 jars'
      using errcode = '22023';
  end if;


  select
    coalesce(
      sum(
        (item ->> 'percentage_basis_points')::integer
      ),
      0
    )
  into v_total
  from jsonb_array_elements(
    p_jars
  ) item;


  if v_total <> 10000 then
    raise exception 'Jar percentages must total exactly 100 percent'
      using errcode = '22023';
  end if;


  if exists (
    select 1
    from (
      select
        lower(
          btrim(
            item ->> 'code'
          )
        ) as code,
        count(*) as item_count

      from jsonb_array_elements(
        p_jars
      ) item

      group by
        lower(
          btrim(
            item ->> 'code'
          )
        )

      having count(*) > 1
    ) duplicates
  ) then
    raise exception 'Jar codes must be unique'
      using errcode = '22023';
  end if;


  insert into public.six_jar_profiles (
    id,
    user_id,
    name,
    currency_code,
    status
  )
  values (
    p_profile_id,
    v_user_id,
    btrim(p_name),
    p_currency_code,
    'active'
  )
  on conflict (id)
  do update set
    name =
      excluded.name,

    currency_code =
      excluded.currency_code,

    status =
      'active',

    deleted_at =
      null,

    updated_at =
      now()
  where
    public.six_jar_profiles.user_id
      = v_user_id;


  if not found then
    raise exception 'Profile ID belongs to another user'
      using errcode = '42501';
  end if;


  update public.six_jar_categories
  set
    deleted_at = now(),
    updated_at = now()
  where
    profile_id = p_profile_id
    and user_id = v_user_id
    and deleted_at is null;


  for v_item in
    select *
    from jsonb_array_elements(
      p_jars
    )
  loop
    begin
      v_jar_id :=
        (
          v_item
          ->> 'id'
        )::uuid;

      v_name :=
        nullif(
          btrim(
            v_item
            ->> 'name'
          ),
          ''
        );

      v_code :=
        lower(
          nullif(
            btrim(
              v_item
              ->> 'code'
            ),
            ''
          )
        );

      v_percentage :=
        (
          v_item
          ->> 'percentage_basis_points'
        )::integer;

      v_sort :=
        coalesce(
          (
            v_item
            ->> 'sort_order'
          )::integer,
          0
        );
    exception
      when others then
        raise exception 'Invalid jar definition'
          using errcode = '22023';
    end;


    if v_name is null
       or v_code is null
       or v_code !~ '^[a-z0-9_]+$'
       or v_percentage <= 0
       or v_percentage > 10000 then
      raise exception 'Invalid jar definition'
        using errcode = '22023';
    end if;


    insert into public.six_jar_categories (
      id,
      profile_id,
      user_id,
      name,
      code,
      percentage_basis_points,
      sort_order,
      deleted_at
    )
    values (
      v_jar_id,
      p_profile_id,
      v_user_id,
      v_name,
      v_code,
      v_percentage,
      v_sort,
      null
    )
    on conflict (id)
    do update set
      profile_id =
        excluded.profile_id,

      name =
        excluded.name,

      code =
        excluded.code,

      percentage_basis_points =
        excluded.percentage_basis_points,

      sort_order =
        excluded.sort_order,

      deleted_at =
        null,

      updated_at =
        now()
    where
      public.six_jar_categories.user_id
        = v_user_id;


    if not found then
      raise exception 'Jar ID belongs to another user'
        using errcode = '42501';
    end if;
  end loop;


  return p_profile_id;
end;
$$;


revoke all on function public.save_six_jar_profile(
  uuid,
  text,
  text,
  jsonb
)
from public;

grant execute on function public.save_six_jar_profile(
  uuid,
  text,
  text,
  jsonb
)
to authenticated;


create or replace function public.get_six_jar_profile()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(
    (
      select jsonb_build_object(
        'id',
        p.id,

        'name',
        p.name,

        'currency_code',
        p.currency_code,

        'jars',
        coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'id',
                c.id,

                'name',
                c.name,

                'code',
                c.code,

                'percentage_basis_points',
                c.percentage_basis_points::text,

                'sort_order',
                c.sort_order
              )
              order by
                c.sort_order,
                c.name
            )

            from public.six_jar_categories c

            where
              c.profile_id = p.id
              and c.user_id = auth.uid()
              and c.deleted_at is null
          ),
          '[]'::jsonb
        )
      )

      from public.six_jar_profiles p

      where
        p.user_id = auth.uid()
        and p.status = 'active'
        and p.deleted_at is null

      order by
        p.updated_at desc

      limit 1
    ),
    'null'::jsonb
  );
$$;


revoke all on function public.get_six_jar_profile()
  from public;

grant execute on function public.get_six_jar_profile()
  to authenticated;


create or replace function public.calculate_six_jar_allocation(
  p_income_minor text
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_user_id uuid;
  v_income_minor bigint;
  v_profile_id uuid;
  v_currency_code text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;


  begin
    v_income_minor :=
      p_income_minor::bigint;
  exception
    when others then
      raise exception 'Income must be an integer minor-unit string'
        using errcode = '22023';
  end;


  if v_income_minor <= 0 then
    raise exception 'Income must be greater than zero'
      using errcode = '22023';
  end if;


  select
    p.id,
    p.currency_code
  into
    v_profile_id,
    v_currency_code
  from public.six_jar_profiles p

  where
    p.user_id = v_user_id
    and p.status = 'active'
    and p.deleted_at is null

  order by
    p.updated_at desc

  limit 1;


  if v_profile_id is null then
    raise exception 'No active Six-Jar profile'
      using errcode = 'P0001';
  end if;


  return jsonb_build_object(
    'profile_id',
    v_profile_id,

    'currency_code',
    v_currency_code,

    'income_minor',
    v_income_minor::text,

    'jars',
    (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id',
            c.id,

            'name',
            c.name,

            'code',
            c.code,

            'percentage_basis_points',
            c.percentage_basis_points::text,

            'suggested_amount_minor',
            (
              (
                v_income_minor
                * c.percentage_basis_points
              )
              / 10000
            )::text,

            'sort_order',
            c.sort_order
          )
          order by
            c.sort_order,
            c.name
        ),
        '[]'::jsonb
      )

      from public.six_jar_categories c

      where
        c.profile_id = v_profile_id
        and c.user_id = v_user_id
        and c.deleted_at is null
    )
  );
end;
$$;


revoke all on function public.calculate_six_jar_allocation(text)
  from public;

grant execute on function public.calculate_six_jar_allocation(text)
  to authenticated;