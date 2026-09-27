-- Finance Coach
-- AI Coach foundation
--
-- Trust boundary:
-- - PostgreSQL remains the financial source of truth.
-- - The LLM is never an accounting engine.
-- - The LLM receives summarized, deterministic context instead of raw tables.
-- - Monetary values cross the AI boundary as integer minor-unit strings.
-- - Currencies are never combined into one total.
-- - Mobile clients cannot insert assistant messages or generated insights directly.

-- -------------------------------------------------------------------------
-- Conversation domain
-- -------------------------------------------------------------------------

create table if not exists public.ai_conversations (
  id uuid primary key,

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  title text not null default 'Finance Coach',

  status text not null default 'active'
    check (
      status in (
        'active',
        'archived'
      )
    ),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create index if not exists ai_conversations_user_updated_idx
  on public.ai_conversations (
    user_id,
    updated_at desc
  );


create table if not exists public.ai_messages (
  id uuid primary key,

  conversation_id uuid not null
    references public.ai_conversations(id)
    on delete cascade,

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  role text not null
    check (
      role in (
        'user',
        'assistant'
      )
    ),

  content text not null
    check (
      char_length(content) between 1 and 12000
    ),

  response_json jsonb null,

  context_version text null,

  provider text null,
  model text null,

  created_at timestamptz not null default now()
);


create index if not exists ai_messages_conversation_created_idx
  on public.ai_messages (
    conversation_id,
    created_at asc
  );


create index if not exists ai_messages_user_created_idx
  on public.ai_messages (
    user_id,
    created_at desc
  );


create table if not exists public.financial_insights (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  insight_type text not null
    check (
      insight_type in (
        'monthly_summary',
        'spending_pattern',
        'budget',
        'saving',
        'goal',
        'loan',
        'six_jar',
        'income_growth',
        'motivation'
      )
    ),

  title text not null
    check (
      char_length(title) between 1 and 160
    ),

  body text not null
    check (
      char_length(body) between 1 and 6000
    ),

  status text not null default 'unread'
    check (
      status in (
        'unread',
        'read',
        'dismissed'
      )
    ),

  source_period_start date null,
  source_period_end date null,

  context_version text not null default 'ai-context-v1',

  generated_at timestamptz not null default now(),
  expires_at timestamptz null,

  check (
    source_period_end is null
    or source_period_start is null
    or source_period_end >= source_period_start
  )
);


create index if not exists financial_insights_user_generated_idx
  on public.financial_insights (
    user_id,
    generated_at desc
  );


create index if not exists financial_insights_user_status_idx
  on public.financial_insights (
    user_id,
    status,
    generated_at desc
  );


-- -------------------------------------------------------------------------
-- RLS
-- -------------------------------------------------------------------------

alter table public.ai_conversations
  enable row level security;

alter table public.ai_messages
  enable row level security;

alter table public.financial_insights
  enable row level security;


drop policy if exists ai_conversations_read_own
  on public.ai_conversations;

create policy ai_conversations_read_own
  on public.ai_conversations
  for select
  to authenticated
  using (
    user_id = auth.uid()
  );


drop policy if exists ai_messages_read_own
  on public.ai_messages;

create policy ai_messages_read_own
  on public.ai_messages
  for select
  to authenticated
  using (
    user_id = auth.uid()
  );


drop policy if exists financial_insights_read_own
  on public.financial_insights;

create policy financial_insights_read_own
  on public.financial_insights
  for select
  to authenticated
  using (
    user_id = auth.uid()
  );


revoke all on public.ai_conversations
  from anon;

revoke all on public.ai_messages
  from anon;

revoke all on public.financial_insights
  from anon;


grant select
  on public.ai_conversations,
     public.ai_messages,
     public.financial_insights
  to authenticated;


-- -------------------------------------------------------------------------
-- Safe conversation mutation RPCs.
-- The mobile client may create/archive its own conversation shell.
-- Messages themselves are written by the server-side AI pipeline.
-- -------------------------------------------------------------------------

create or replace function public.create_ai_conversation(
  p_conversation_id uuid,
  p_title text default 'Finance Coach'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_existing public.ai_conversations%rowtype;
  v_title text;
begin
  v_user_id :=
    auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;


  if p_conversation_id is null then
    raise exception 'Conversation ID is required'
      using errcode = '22023';
  end if;


  v_title :=
    left(
      coalesce(
        nullif(
          btrim(
            p_title
          ),
          ''
        ),
        'Finance Coach'
      ),
      160
    );


  select *
  into v_existing
  from public.ai_conversations c
  where c.id = p_conversation_id;


  if found then
    if v_existing.user_id <> v_user_id then
      raise exception 'Conversation ID is already in use'
        using errcode = '42501';
    end if;

    return v_existing.id;
  end if;


  insert into public.ai_conversations (
    id,
    user_id,
    title,
    status
  )
  values (
    p_conversation_id,
    v_user_id,
    v_title,
    'active'
  );


  return p_conversation_id;
end;
$$;


revoke all on function public.create_ai_conversation(uuid, text)
  from public;

grant execute on function public.create_ai_conversation(uuid, text)
  to authenticated;


create or replace function public.archive_ai_conversation(
  p_conversation_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  v_user_id :=
    auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;


  update public.ai_conversations
  set
    status = 'archived',
    updated_at = now()
  where
    id = p_conversation_id
    and user_id = v_user_id;


  if not found then
    raise exception 'Conversation not found'
      using errcode = '42501';
  end if;


  return p_conversation_id;
end;
$$;


revoke all on function public.archive_ai_conversation(uuid)
  from public;

grant execute on function public.archive_ai_conversation(uuid)
  to authenticated;


-- -------------------------------------------------------------------------
-- Read RPCs
-- -------------------------------------------------------------------------

create or replace function public.get_ai_conversations(
  p_limit integer default 30
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_limit integer;
begin
  v_user_id :=
    auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;


  v_limit :=
    least(
      greatest(
        coalesce(
          p_limit,
          30
        ),
        1
      ),
      100
    );


  return (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id',
          rows.id,

          'title',
          rows.title,

          'status',
          rows.status,

          'created_at',
          rows.created_at,

          'updated_at',
          rows.updated_at,

          'last_message_preview',
          rows.last_message_preview,

          'last_message_at',
          rows.last_message_at
        )
        order by
          rows.updated_at desc
      ),
      '[]'::jsonb
    )

    from (
      select
        c.id,
        c.title,
        c.status,
        c.created_at,
        c.updated_at,

        (
          select left(
            m.content,
            140
          )
          from public.ai_messages m
          where
            m.conversation_id = c.id
            and m.user_id = v_user_id
          order by
            m.created_at desc
          limit 1
        ) as last_message_preview,

        (
          select m.created_at
          from public.ai_messages m
          where
            m.conversation_id = c.id
            and m.user_id = v_user_id
          order by
            m.created_at desc
          limit 1
        ) as last_message_at

      from public.ai_conversations c

      where
        c.user_id = v_user_id
        and c.status = 'active'

      order by
        c.updated_at desc

      limit v_limit
    ) rows
  );
end;
$$;


revoke all on function public.get_ai_conversations(integer)
  from public;

grant execute on function public.get_ai_conversations(integer)
  to authenticated;


create or replace function public.get_ai_messages(
  p_conversation_id uuid,
  p_limit integer default 100
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_limit integer;
begin
  v_user_id :=
    auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;


  if not exists (
    select 1
    from public.ai_conversations c
    where
      c.id = p_conversation_id
      and c.user_id = v_user_id
  ) then
    raise exception 'Conversation not found'
      using errcode = '42501';
  end if;


  v_limit :=
    least(
      greatest(
        coalesce(
          p_limit,
          100
        ),
        1
      ),
      200
    );


  return (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id',
          rows.id,

          'conversation_id',
          rows.conversation_id,

          'role',
          rows.role,

          'content',
          rows.content,

          'response_json',
          rows.response_json,

          'context_version',
          rows.context_version,

          'created_at',
          rows.created_at
        )
        order by
          rows.created_at asc
      ),
      '[]'::jsonb
    )

    from (
      select
        m.id,
        m.conversation_id,
        m.role,
        m.content,
        m.response_json,
        m.context_version,
        m.created_at

      from public.ai_messages m

      where
        m.conversation_id = p_conversation_id
        and m.user_id = v_user_id

      order by
        m.created_at desc

      limit v_limit
    ) rows
  );
end;
$$;


revoke all on function public.get_ai_messages(uuid, integer)
  from public;

grant execute on function public.get_ai_messages(uuid, integer)
  to authenticated;


create or replace function public.get_financial_insights(
  p_limit integer default 20
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_limit integer;
begin
  v_user_id :=
    auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;


  v_limit :=
    least(
      greatest(
        coalesce(
          p_limit,
          20
        ),
        1
      ),
      100
    );


  return (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id',
          i.id,

          'insight_type',
          i.insight_type,

          'title',
          i.title,

          'body',
          i.body,

          'status',
          i.status,

          'source_period_start',
          i.source_period_start,

          'source_period_end',
          i.source_period_end,

          'generated_at',
          i.generated_at
        )
        order by
          i.generated_at desc
      ),
      '[]'::jsonb
    )

    from (
      select *
      from public.financial_insights fi
      where
        fi.user_id = v_user_id
        and (
          fi.expires_at is null
          or fi.expires_at > now()
        )
      order by
        fi.generated_at desc
      limit v_limit
    ) i
  );
end;
$$;


revoke all on function public.get_financial_insights(integer)
  from public;

grant execute on function public.get_financial_insights(integer)
  to authenticated;


-- -------------------------------------------------------------------------
-- Trusted AI context
--
-- The result intentionally excludes:
-- - raw transaction descriptions
-- - merchant names
-- - transaction notes
-- - account numbers
-- - ROSCA member identities
-- - loan counterparty names
-- - raw conversation history
--
-- All monetary values are strings containing integer minor units.
-- Currencies remain separated.
-- -------------------------------------------------------------------------

create or replace function public.get_ai_financial_context(
  p_timezone text default 'UTC',
  p_as_of_date date default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  v_user_id uuid;
  v_timezone text;
  v_as_of date;
  v_month_start date;
  v_month_end date;
  v_previous_month_start date;
  v_context jsonb;
begin
  v_user_id :=
    auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;


  v_timezone :=
    coalesce(
      nullif(
        btrim(
          p_timezone
        ),
        ''
      ),
      'UTC'
    );


  if not exists (
    select 1
    from pg_catalog.pg_timezone_names tz
    where tz.name = v_timezone
  ) then
    raise exception 'Invalid timezone'
      using errcode = '22023';
  end if;


  v_as_of :=
    coalesce(
      p_as_of_date,
      (
        now()
        at time zone v_timezone
      )::date
    );


  v_month_start :=
    date_trunc(
      'month',
      v_as_of::timestamp
    )::date;


  v_month_end :=
    (
      date_trunc(
        'month',
        v_as_of::timestamp
      )
      + interval '1 month'
      - interval '1 day'
    )::date;


  v_previous_month_start :=
    (
      v_month_start
      - interval '1 month'
    )::date;


  with transaction_rows as (
    select
      t.id,
      t.type,
      t.transaction_date::date as transaction_date,

      coalesce(
        nullif(
          to_jsonb(t)
          ->> 'currency_code',
          ''
        ),
        nullif(
          to_jsonb(t)
          ->> 'currency',
          ''
        ),
        'UNKNOWN'
      ) as currency_code,

      coalesce(
        nullif(
          to_jsonb(t)
          ->> 'amount_minor',
          ''
        ),
        '0'
      )::bigint as amount_minor,

      nullif(
        to_jsonb(t)
        ->> 'category_id',
        ''
      ) as category_id

    from public.transactions t

    where
      t.user_id = v_user_id
      and t.deleted_at is null
      and t.transaction_date <= v_as_of
  ),

  current_month_currency as (
    select
      tr.currency_code,

      coalesce(
        sum(
          case
            when tr.type = 'income'
              then tr.amount_minor
            else 0
          end
        ),
        0
      )::bigint as income_minor,

      coalesce(
        sum(
          case
            when tr.type = 'expense'
              then tr.amount_minor
            else 0
          end
        ),
        0
      )::bigint as expense_minor

    from transaction_rows tr

    where tr.transaction_date between
      v_month_start
      and least(
        v_month_end,
        v_as_of
      )

    group by
      tr.currency_code
  ),

  previous_month_currency as (
    select
      tr.currency_code,

      coalesce(
        sum(
          case
            when tr.type = 'income'
              then tr.amount_minor
            else 0
          end
        ),
        0
      )::bigint as income_minor,

      coalesce(
        sum(
          case
            when tr.type = 'expense'
              then tr.amount_minor
            else 0
          end
        ),
        0
      )::bigint as expense_minor

    from transaction_rows tr

    where tr.transaction_date between
      v_previous_month_start
      and (
        v_month_start
        - 1
      )

    group by
      tr.currency_code
  ),

  currency_codes as (
    select currency_code
    from current_month_currency

    union

    select currency_code
    from previous_month_currency
  ),

  currency_summary as (
    select
      cc.currency_code,

      coalesce(
        cm.income_minor,
        0
      )::bigint as current_income_minor,

      coalesce(
        cm.expense_minor,
        0
      )::bigint as current_expense_minor,

      coalesce(
        pm.income_minor,
        0
      )::bigint as previous_income_minor,

      coalesce(
        pm.expense_minor,
        0
      )::bigint as previous_expense_minor

    from currency_codes cc

    left join current_month_currency cm
      on cm.currency_code = cc.currency_code

    left join previous_month_currency pm
      on pm.currency_code = cc.currency_code
  ),

  category_current as (
    select
      tr.currency_code,
      tr.category_id,

      coalesce(
        (
          select
            coalesce(
              nullif(
                to_jsonb(c)
                ->> 'name',
                ''
              ),
              'Uncategorized'
            )
          from public.categories c
          where c.id::text = tr.category_id
          limit 1
        ),
        'Uncategorized'
      ) as category_name,

      sum(
        tr.amount_minor
      )::bigint as current_expense_minor

    from transaction_rows tr

    where
      tr.type = 'expense'
      and tr.transaction_date between
        v_month_start
        and least(
          v_month_end,
          v_as_of
        )

    group by
      tr.currency_code,
      tr.category_id
  ),

  category_previous as (
    select
      tr.currency_code,
      tr.category_id,

      sum(
        tr.amount_minor
      )::bigint as previous_expense_minor

    from transaction_rows tr

    where
      tr.type = 'expense'
      and tr.transaction_date between
        v_previous_month_start
        and (
          v_month_start
          - 1
        )

    group by
      tr.currency_code,
      tr.category_id
  ),

  budget_base as (
    select
      b.id,
      to_jsonb(b) as row_json

    from public.budgets b

    where b.user_id = v_user_id
  ),

  budget_normalized as (
    select
      bb.id,

      coalesce(
        nullif(
          bb.row_json
          ->> 'currency_code',
          ''
        ),
        nullif(
          bb.row_json
          ->> 'currency',
          ''
        ),
        'UNKNOWN'
      ) as currency_code,

      nullif(
        coalesce(
          bb.row_json
          ->> 'limit_minor',
          bb.row_json
          ->> 'amount_minor'
        ),
        ''
      )::bigint as limit_minor,

      nullif(
        coalesce(
          bb.row_json
          ->> 'period_start',
          bb.row_json
          ->> 'start_date'
        ),
        ''
      )::date as period_start,

      nullif(
        coalesce(
          bb.row_json
          ->> 'period_end',
          bb.row_json
          ->> 'end_date'
        ),
        ''
      )::date as period_end,

      nullif(
        bb.row_json
        ->> 'category_id',
        ''
      ) as category_id,

      bb.row_json

    from budget_base bb

    where coalesce(
      bb.row_json
      ->> 'deleted_at',
      ''
    ) = ''
  ),

  goal_base as (
    select
      g.id,
      to_jsonb(g) as row_json

    from public.savings_goals g

    where g.user_id = v_user_id
  ),

  goal_normalized as (
    select
      gb.id,

      coalesce(
        nullif(
          gb.row_json
          ->> 'name',
          ''
        ),
        nullif(
          gb.row_json
          ->> 'title',
          ''
        ),
        'Savings goal'
      ) as goal_name,

      coalesce(
        nullif(
          gb.row_json
          ->> 'currency_code',
          ''
        ),
        nullif(
          gb.row_json
          ->> 'currency',
          ''
        ),
        'UNKNOWN'
      ) as currency_code,

      nullif(
        coalesce(
          gb.row_json
          ->> 'target_amount_minor',
          gb.row_json
          ->> 'target_minor'
        ),
        ''
      )::bigint as target_minor,

      coalesce(
        nullif(
          gb.row_json
          ->> 'status',
          ''
        ),
        'active'
      ) as status,

      nullif(
        gb.row_json
        ->> 'target_date',
        ''
      )::date as target_date,

      gb.row_json

    from goal_base gb

    where coalesce(
      gb.row_json
      ->> 'deleted_at',
      ''
    ) = ''
  ),

  goal_progress as (
    select
      gn.id,
      gn.goal_name,
      gn.currency_code,
      gn.target_minor,
      gn.status,
      gn.target_date,

      coalesce(
        (
          select sum(
            coalesce(
              nullif(
                to_jsonb(sc)
                ->> 'amount_minor',
                ''
              ),
              '0'
            )::bigint
          )
          from public.savings_contributions sc
          where
            sc.user_id = v_user_id
            and (
              to_jsonb(sc)
              ->> 'goal_id'
            ) = gn.id::text
            and coalesce(
              to_jsonb(sc)
              ->> 'deleted_at',
              ''
            ) = ''
        ),
        0
      )::bigint as contributed_minor

    from goal_normalized gn
  ),

  loan_progress as (
    select
      l.currency_code,
      l.direction,

      count(*)::integer as loan_count,

      sum(
        greatest(
          l.principal_minor
          -
          coalesce(
            (
              select sum(
                lp.amount_minor
              )
              from public.loan_payments lp
              where
                lp.loan_id = l.id
                and lp.deleted_at is null
            ),
            0
          ),
          0
        )
      )::bigint as remaining_minor

    from public.loans l

    where
      l.user_id = v_user_id
      and l.deleted_at is null
      and l.status in (
        'active',
        'defaulted'
      )

    group by
      l.currency_code,
      l.direction
  ),

  recent_behavior as (
    select
      (
        select count(*)::integer
        from transaction_rows tr
        where
          tr.transaction_date between
            greatest(
              v_as_of - 6,
              date '1900-01-01'
            )
            and v_as_of
      ) as transactions_last_7_days,

      (
        select count(*)::integer
        from transaction_rows tr
        where
          tr.transaction_date between
            greatest(
              v_as_of - 29,
              date '1900-01-01'
            )
            and v_as_of
      ) as transactions_last_30_days,

      (
        select count(*)::integer
        from public.budgets b
        where
          b.user_id = v_user_id
          and (
            b.created_at
            at time zone v_timezone
          )::date between
            v_as_of - 29
            and v_as_of
      ) as budgets_created_last_30_days,

      (
        select count(*)::integer
        from public.savings_goals g
        where
          g.user_id = v_user_id
          and (
            g.created_at
            at time zone v_timezone
          )::date between
            v_as_of - 29
            and v_as_of
      ) as goals_created_last_30_days,

      (
        select count(*)::integer
        from public.savings_contributions sc
        where
          sc.user_id = v_user_id
          and sc.contribution_date between
            v_as_of - 29
            and v_as_of
      ) as savings_contributions_last_30_days
  )

  select jsonb_build_object(
    'context_version',
    'ai-context-v1',

    'as_of_date',
    v_as_of,

    'timezone',
    v_timezone,

    'period',
    jsonb_build_object(
      'current_month_start',
      v_month_start,

      'current_month_end',
      least(
        v_month_end,
        v_as_of
      ),

      'previous_month_start',
      v_previous_month_start,

      'previous_month_end',
      v_month_start - 1
    ),

    'currency_summaries',
    (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'currency_code',
            cs.currency_code,

            'monthly_income_minor',
            cs.current_income_minor::text,

            'monthly_expenses_minor',
            cs.current_expense_minor::text,

            'monthly_net_minor',
            (
              cs.current_income_minor
              - cs.current_expense_minor
            )::text,

            'savings_rate_basis_points',
            case
              when cs.current_income_minor > 0 then
                (
                  (
                    (
                      cs.current_income_minor
                      - cs.current_expense_minor
                    )
                    * 10000
                  )
                  / cs.current_income_minor
                )::text
              else null
            end,

            'previous_month_income_minor',
            cs.previous_income_minor::text,

            'previous_month_expenses_minor',
            cs.previous_expense_minor::text,

            'expense_change_basis_points',
            case
              when cs.previous_expense_minor > 0 then
                (
                  (
                    (
                      cs.current_expense_minor
                      - cs.previous_expense_minor
                    )
                    * 10000
                  )
                  / cs.previous_expense_minor
                )::text
              else null
            end
          )
          order by
            cs.currency_code
        ),
        '[]'::jsonb
      )
      from currency_summary cs
    ),

    'category_breakdown',
    (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'currency_code',
            rows.currency_code,

            'category_name',
            rows.category_name,

            'current_month_expense_minor',
            rows.current_expense_minor::text,

            'previous_month_expense_minor',
            rows.previous_expense_minor::text,

            'change_basis_points',
            case
              when rows.previous_expense_minor > 0 then
                (
                  (
                    (
                      rows.current_expense_minor
                      - rows.previous_expense_minor
                    )
                    * 10000
                  )
                  / rows.previous_expense_minor
                )::text
              else null
            end
          )
          order by
            rows.current_expense_minor desc
        ),
        '[]'::jsonb
      )

      from (
        select
          cc.currency_code,
          cc.category_name,
          cc.current_expense_minor,

          coalesce(
            cp.previous_expense_minor,
            0
          )::bigint as previous_expense_minor

        from category_current cc

        left join category_previous cp
          on cp.currency_code = cc.currency_code
          and cp.category_id is not distinct from cc.category_id

        order by
          cc.current_expense_minor desc

        limit 20
      ) rows
    ),

    'budget_status',
    (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'budget_id',
            rows.id,

            'currency_code',
            rows.currency_code,

            'category_name',
            rows.category_name,

            'period_start',
            rows.period_start,

            'period_end',
            rows.period_end,

            'limit_minor',
            rows.limit_minor::text,

            'spent_minor',
            rows.spent_minor::text,

            'remaining_minor',
            (
              rows.limit_minor
              - rows.spent_minor
            )::text,

            'over_budget',
            rows.spent_minor
              > rows.limit_minor
          )
          order by
            rows.period_end asc,
            rows.currency_code
        ),
        '[]'::jsonb
      )

      from (
        select
          bn.id,
          bn.currency_code,
          bn.period_start,
          bn.period_end,
          coalesce(
            bn.limit_minor,
            0
          )::bigint as limit_minor,

          case
            when bn.category_id is null then
              'Overall'
            else
              coalesce(
                (
                  select
                    coalesce(
                      nullif(
                        to_jsonb(c)
                        ->> 'name',
                        ''
                      ),
                      'Category'
                    )
                  from public.categories c
                  where c.id::text = bn.category_id
                  limit 1
                ),
                'Category'
              )
          end as category_name,

          coalesce(
            (
              select sum(
                tr.amount_minor
              )
              from transaction_rows tr
              where
                tr.type = 'expense'
                and tr.currency_code =
                  bn.currency_code
                and tr.transaction_date between
                  bn.period_start
                  and least(
                    bn.period_end,
                    v_as_of
                  )
                and (
                  bn.category_id is null
                  or tr.category_id =
                    bn.category_id
                )
            ),
            0
          )::bigint as spent_minor

        from budget_normalized bn

        where
          bn.period_start is not null
          and bn.period_end is not null
          and bn.limit_minor is not null
          and v_as_of between
            bn.period_start
            and bn.period_end

        limit 20
      ) rows
    ),

    'goal_progress',
    (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'goal_id',
            gp.id,

            'name',
            gp.goal_name,

            'currency_code',
            gp.currency_code,

            'target_minor',
            gp.target_minor::text,

            'contributed_minor',
            gp.contributed_minor::text,

            'remaining_minor',
            greatest(
              coalesce(
                gp.target_minor,
                0
              )
              - gp.contributed_minor,
              0
            )::text,

            'progress_basis_points',
            case
              when coalesce(
                gp.target_minor,
                0
              ) > 0 then
                least(
                  (
                    gp.contributed_minor
                    * 10000
                  )
                  / gp.target_minor,
                  10000
                )::text
              else null
            end,

            'target_date',
            gp.target_date,

            'status',
            gp.status
          )
          order by
            gp.target_date asc nulls last,
            gp.goal_name
        ),
        '[]'::jsonb
      )

      from (
        select *
        from goal_progress
        where status <> 'archived'
        order by
          target_date asc nulls last
        limit 12
      ) gp
    ),

    'loan_summary',
    (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'currency_code',
            lp.currency_code,

            'direction',
            lp.direction,

            'loan_count',
            lp.loan_count,

            'remaining_minor',
            lp.remaining_minor::text
          )
          order by
            lp.currency_code,
            lp.direction
        ),
        '[]'::jsonb
      )
      from loan_progress lp
    ),

    'recent_behavior',
    (
      select jsonb_build_object(
        'transactions_last_7_days',
        rb.transactions_last_7_days,

        'transactions_last_30_days',
        rb.transactions_last_30_days,

        'budgets_created_last_30_days',
        rb.budgets_created_last_30_days,

        'goals_created_last_30_days',
        rb.goals_created_last_30_days,

        'savings_contributions_last_30_days',
        rb.savings_contributions_last_30_days
      )
      from recent_behavior rb
    ),

    'privacy',
    jsonb_build_object(
      'contains_raw_transactions',
      false,

      'contains_merchants',
      false,

      'contains_account_numbers',
      false,

      'contains_loan_counterparties',
      false,

      'currency_totals_combined',
      false
    )
  )
  into v_context;


  return v_context;
end;
$$;


revoke all on function public.get_ai_financial_context(text, date)
  from public;

grant execute on function public.get_ai_financial_context(text, date)
  to authenticated;