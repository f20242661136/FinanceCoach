-- Finance Coach
-- Six-Jar hardening
--
-- 1. A soft-deleted jar must not permanently reserve its code.
-- 2. Minor-unit rounding must reconcile exactly to the entered income.
--    Any remainder is deterministically assigned to the final ordered jar.

alter table public.six_jar_categories
  drop constraint if exists six_jar_categories_profile_id_code_key;


create unique index if not exists six_jar_categories_active_profile_code_uidx
  on public.six_jar_categories (
    profile_id,
    code
  )
  where deleted_at is null;


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
  v_jars jsonb;
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
    p.updated_at desc,
    p.id

  limit 1;


  if v_profile_id is null then
    raise exception 'No active Six-Jar profile'
      using errcode = 'P0001';
  end if;


  with base as (
    select
      c.id,
      c.name,
      c.code,
      c.percentage_basis_points,
      c.sort_order,

      (
        (
          v_income_minor
          * c.percentage_basis_points
        )
        / 10000
      )::bigint as base_amount_minor

    from public.six_jar_categories c

    where
      c.profile_id = v_profile_id
      and c.user_id = v_user_id
      and c.deleted_at is null
  ),

  totals as (
    select
      coalesce(
        sum(
          base_amount_minor
        ),
        0
      )::bigint as base_total_minor

    from base
  ),

  ranked as (
    select
      b.*,

      row_number() over (
        order by
          b.sort_order desc,
          b.name desc,
          b.id desc
      ) as reverse_rank

    from base b
  )

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',
        r.id,

        'name',
        r.name,

        'code',
        r.code,

        'percentage_basis_points',
        r.percentage_basis_points::text,

        'suggested_amount_minor',
        (
          r.base_amount_minor
          +
          case
            when r.reverse_rank = 1
              then
                v_income_minor
                - t.base_total_minor
            else 0
          end
        )::text,

        'sort_order',
        r.sort_order
      )
      order by
        r.sort_order,
        r.name,
        r.id
    ),
    '[]'::jsonb
  )
  into v_jars

  from ranked r
  cross join totals t;


  if jsonb_array_length(v_jars) = 0 then
    raise exception 'Six-Jar profile has no active jars'
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
    v_jars
  );
end;
$$;


revoke all on function public.calculate_six_jar_allocation(text)
  from public;

grant execute on function public.calculate_six_jar_allocation(text)
  to authenticated;