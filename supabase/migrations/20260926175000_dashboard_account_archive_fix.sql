-- Finance Coach
-- Dashboard account archive schema correction
--
-- accounts uses archived_at, not deleted_at.
-- Preserve the dashboard accounting logic and change only the account
-- lifecycle predicate that currently raises PostgreSQL 42703.

create or replace function public.get_financial_dashboard_summary(
  p_as_of date default current_date
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_user_id uuid;
  v_month_start date;
  v_month_end date;
  v_currency_summary jsonb;
  v_account_summary jsonb;
  v_budget_summary jsonb;
  v_goal_summary jsonb;
  v_activity_summary jsonb;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;


  if p_as_of is null then
    raise exception 'Dashboard date is required'
      using errcode = '22023';
  end if;


  v_month_start :=
    date_trunc(
      'month',
      p_as_of
    )::date;

  v_month_end :=
    (
      date_trunc(
        'month',
        p_as_of
      )
      + interval '1 month'
      - interval '1 day'
    )::date;


  with monthly as (
    select
      t.currency_code,

      coalesce(
        sum(
          case
            when t.type = 'income'
              then t.amount_minor
            else 0
          end
        ),
        0
      )::bigint as income_minor,

      coalesce(
        sum(
          case
            when t.type = 'expense'
              then t.amount_minor
            else 0
          end
        ),
        0
      )::bigint as expense_minor

    from public.transactions t

    where
      t.user_id = v_user_id
      and t.deleted_at is null
      and t.transaction_date between
        v_month_start
        and least(
          p_as_of,
          v_month_end
        )
      and t.type in (
        'income',
        'expense'
      )

    group by
      t.currency_code
  )

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'currency_code',
        currency_code,

        'income_minor',
        income_minor::text,

        'expense_minor',
        expense_minor::text,

        'net_minor',
        (
          income_minor
          - expense_minor
        )::text,

        'savings_rate_basis_points',
        case
          when income_minor <= 0
            then null
          else
            (
              (
                income_minor
                - expense_minor
              )
              * 10000
            )
            / income_minor
        end
      )
      order by
        currency_code
    ),
    '[]'::jsonb
  )
  into v_currency_summary
  from monthly;


  with owned_accounts as (
    select
      a.id,
      a.currency_code,
      public.get_account_balance_minor(
        a.id
      ) as balance_minor

    from public.accounts a

    where
      a.user_id = v_user_id
      and a.archived_at is null
      and a.status = 'active'
  ),

  balance_groups as (
    select
      currency_code,

      count(*)::bigint as account_count,

      coalesce(
        sum(
          balance_minor
        ),
        0
      )::bigint as total_balance_minor

    from owned_accounts

    group by
      currency_code
  )

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'currency_code',
        currency_code,

        'account_count',
        account_count::text,

        'total_balance_minor',
        total_balance_minor::text
      )
      order by
        currency_code
    ),
    '[]'::jsonb
  )
  into v_account_summary
  from balance_groups;


  with current_budgets as (
    select
      b.id,
      b.limit_minor,
      b.currency_code,
      b.period_start,
      b.period_end,
      bc.category_id

    from public.budgets b

    left join public.budget_categories bc
      on bc.budget_id = b.id

    where
      b.user_id = v_user_id
      and b.deleted_at is null
      and b.status = 'active'
      and p_as_of between
        b.period_start
        and b.period_end
  ),

  budget_spend as (
    select
      b.id,
      b.limit_minor,

      coalesce(
        sum(
          t.amount_minor
        ),
        0
      )::bigint as spent_minor

    from current_budgets b

    left join public.transactions t
      on t.user_id = v_user_id
      and t.deleted_at is null
      and t.type = 'expense'
      and t.currency_code = b.currency_code
      and t.transaction_date between
        b.period_start
        and least(
          p_as_of,
          b.period_end
        )
      and (
        b.category_id is null
        or t.category_id = b.category_id
      )

    group by
      b.id,
      b.limit_minor
  )

  select jsonb_build_object(
    'active_count',
    count(*)::text,

    'over_budget_count',
    count(*) filter (
      where spent_minor > limit_minor
    )::text,

    'near_limit_count',
    count(*) filter (
      where
        spent_minor <= limit_minor
        and spent_minor * 100 >= limit_minor * 80
    )::text
  )
  into v_budget_summary
  from budget_spend;


  with goal_progress as (
    select
      g.id,
      g.target_amount_minor,

      coalesce(
        sum(
          c.amount_minor
        ) filter (
          where c.deleted_at is null
        ),
        0
      )::bigint as contributed_minor

    from public.savings_goals g

    left join public.savings_contributions c
      on c.goal_id = g.id
      and c.user_id = v_user_id

    where
      g.user_id = v_user_id
      and g.deleted_at is null
      and g.status <> 'archived'

    group by
      g.id,
      g.target_amount_minor
  )

  select jsonb_build_object(
    'active_count',
    count(*) filter (
      where
        contributed_minor
        < target_amount_minor
    )::text,

    'target_reached_count',
    count(*) filter (
      where
        contributed_minor
        >= target_amount_minor
    )::text
  )
  into v_goal_summary
  from goal_progress;


  select jsonb_build_object(
    'transaction_count_this_month',
    (
      select count(*)::text

      from public.transactions t

      where
        t.user_id = v_user_id
        and t.deleted_at is null
        and t.transaction_date between
          v_month_start
          and p_as_of
    ),

    'last_transaction_date',
    (
      select max(
        t.transaction_date
      )

      from public.transactions t

      where
        t.user_id = v_user_id
        and t.deleted_at is null
    )
  )
  into v_activity_summary;


  return jsonb_build_object(
    'as_of',
    p_as_of,

    'month_start',
    v_month_start,

    'month_end',
    v_month_end,

    'cash_flow_by_currency',
    v_currency_summary,

    'account_balances_by_currency',
    v_account_summary,

    'budgets',
    v_budget_summary,

    'goals',
    v_goal_summary,

    'activity',
    v_activity_summary
  );
end;
$$;

revoke all
on function public.get_financial_dashboard_summary(date)
from public, anon;

grant execute
on function public.get_financial_dashboard_summary(date)
to authenticated;