-- Finance Coach
-- Gamification foundation
--
-- Principles:
-- - Point totals are never mutated by random UI code.
-- - Source-of-truth point events are generated server-side.
-- - user_points is only a cache of the event ledger.
-- - Challenge completion is verified from trusted application data.
-- - Streaks are recomputed from server data and an IANA timezone.
-- - Levels and point awards live in centralized configuration tables.
-- - No private financial amounts are stored in gamification events.

-- -------------------------------------------------------------------------
-- Central configuration
-- -------------------------------------------------------------------------

create table if not exists public.gamification_point_rules (
  event_type text primary key,

  points integer not null
    check (points > 0),

  description text not null,

  is_active boolean not null default true,

  updated_at timestamptz not null default now()
);


create table if not exists public.gamification_levels (
  level integer primary key
    check (level > 0),

  minimum_points bigint not null unique
    check (minimum_points >= 0),

  name text not null,

  created_at timestamptz not null default now()
);


insert into public.gamification_point_rules (
  event_type,
  points,
  description
)
values
  (
    'transaction_logged',
    5,
    'Log a financial transaction'
  ),
  (
    'budget_created',
    20,
    'Create a budget'
  ),
  (
    'goal_created',
    20,
    'Create a savings goal'
  ),
  (
    'savings_contribution_logged',
    10,
    'Record a savings contribution'
  ),
  (
    'goal_completed',
    100,
    'Complete a savings goal'
  ),
  (
    'challenge_completed',
    100,
    'Complete a verified challenge'
  ),
  (
    'logging_streak_7',
    50,
    'Reach a seven-day logging streak'
  ),
  (
    'logging_streak_30',
    200,
    'Reach a thirty-day logging streak'
  ),
  (
    'saving_streak_4',
    50,
    'Reach a four-period saving streak'
  ),
  (
    'challenge_streak_7',
    100,
    'Reach a seven-day challenge streak'
  )
on conflict (event_type)
do update set
  points = excluded.points,
  description = excluded.description,
  is_active = true,
  updated_at = now();


insert into public.gamification_levels (
  level,
  minimum_points,
  name
)
values
  (1, 0, 'Starter'),
  (2, 100, 'Builder'),
  (3, 250, 'Planner'),
  (4, 500, 'Momentum'),
  (5, 1000, 'Consistent'),
  (6, 2000, 'Focused'),
  (7, 4000, 'Strong Habits'),
  (8, 7500, 'Money Mastery')
on conflict (level)
do update set
  minimum_points = excluded.minimum_points,
  name = excluded.name;


-- -------------------------------------------------------------------------
-- Point event ledger + cached total
-- -------------------------------------------------------------------------

create table if not exists public.point_events (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  event_type text not null,

  points integer not null
    check (points > 0),

  source_type text not null,

  source_id uuid null,

  idempotency_key text not null,

  created_at timestamptz not null default now(),

  unique (
    user_id,
    idempotency_key
  )
);


create index if not exists point_events_user_created_idx
  on public.point_events (
    user_id,
    created_at desc
  );


create index if not exists point_events_user_type_idx
  on public.point_events (
    user_id,
    event_type,
    created_at desc
  );


create table if not exists public.user_points (
  user_id uuid primary key
    references auth.users(id)
    on delete cascade,

  total_points bigint not null default 0
    check (total_points >= 0),

  updated_at timestamptz not null default now()
);


-- -------------------------------------------------------------------------
-- Badges
-- -------------------------------------------------------------------------

create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),

  code text not null unique,

  name text not null,

  description text not null,

  criteria_type text not null
    check (
      criteria_type in (
        'point_total',
        'event_count',
        'streak'
      )
    ),

  criteria_key text not null,

  criteria_value integer not null
    check (criteria_value > 0),

  is_active boolean not null default true,

  created_at timestamptz not null default now()
);


create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  badge_id uuid not null
    references public.badges(id)
    on delete cascade,

  awarded_at timestamptz not null default now(),

  unique (
    user_id,
    badge_id
  )
);


create index if not exists user_badges_user_awarded_idx
  on public.user_badges (
    user_id,
    awarded_at desc
  );


insert into public.badges (
  code,
  name,
  description,
  criteria_type,
  criteria_key,
  criteria_value
)
values
  (
    'first_transaction',
    'First Step',
    'Log your first transaction.',
    'event_count',
    'transaction_logged',
    1
  ),
  (
    'points_100',
    'Century',
    'Earn 100 points.',
    'point_total',
    'total_points',
    100
  ),
  (
    'logging_streak_7',
    'Seven-Day Rhythm',
    'Maintain a seven-day logging streak.',
    'streak',
    'daily_logging',
    7
  ),
  (
    'challenge_first',
    'Challenge Started',
    'Complete your first verified challenge.',
    'event_count',
    'challenge_completed',
    1
  ),
  (
    'goal_finisher',
    'Goal Finisher',
    'Complete a savings goal.',
    'event_count',
    'goal_completed',
    1
  )
on conflict (code)
do update set
  name = excluded.name,
  description = excluded.description,
  criteria_type = excluded.criteria_type,
  criteria_key = excluded.criteria_key,
  criteria_value = excluded.criteria_value,
  is_active = true;


-- -------------------------------------------------------------------------
-- Streaks
-- -------------------------------------------------------------------------

create table if not exists public.streaks (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  streak_type text not null
    check (
      streak_type in (
        'daily_logging',
        'saving',
        'challenge'
      )
    ),

  timezone text not null default 'UTC',

  current_count integer not null default 0
    check (current_count >= 0),

  best_count integer not null default 0
    check (best_count >= 0),

  last_activity_date date null,

  updated_at timestamptz not null default now(),

  unique (
    user_id,
    streak_type
  )
);


create index if not exists streaks_user_idx
  on public.streaks (
    user_id,
    streak_type
  );


-- -------------------------------------------------------------------------
-- Configurable challenges
-- -------------------------------------------------------------------------

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),

  code text not null unique,

  title text not null,

  description text not null,

  cadence text not null
    check (
      cadence in (
        'daily',
        'weekly'
      )
    ),

  verification_type text not null
    check (
      verification_type in (
        'transaction_count',
        'budget_created_count',
        'goal_created_count',
        'savings_contribution_count'
      )
    ),

  target_count integer not null default 1
    check (target_count > 0),

  points_reward integer not null
    check (points_reward > 0),

  is_premium boolean not null default false,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create table if not exists public.user_challenges (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  challenge_id uuid not null
    references public.challenges(id)
    on delete cascade,

  timezone text not null,

  period_start date not null,

  period_end date not null,

  status text not null default 'active'
    check (
      status in (
        'active',
        'completed',
        'expired'
      )
    ),

  progress_count integer not null default 0
    check (progress_count >= 0),

  completed_at timestamptz null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (
    user_id,
    challenge_id,
    period_start
  ),

  check (
    period_end >= period_start
  )
);


create index if not exists user_challenges_user_status_idx
  on public.user_challenges (
    user_id,
    status,
    period_start desc
  );


insert into public.challenges (
  code,
  title,
  description,
  cadence,
  verification_type,
  target_count,
  points_reward,
  is_premium
)
values
  (
    'daily_log_transaction',
    'Log a transaction today',
    'Record at least one income or expense transaction today.',
    'daily',
    'transaction_count',
    1,
    100,
    false
  ),
  (
    'weekly_log_5_transactions',
    'Log five transactions this week',
    'Build awareness by recording five transactions during the week.',
    'weekly',
    'transaction_count',
    5,
    100,
    false
  ),
  (
    'weekly_create_budget',
    'Create a budget this week',
    'Create at least one budget during the week.',
    'weekly',
    'budget_created_count',
    1,
    100,
    false
  ),
  (
    'weekly_add_goal',
    'Add a savings goal this week',
    'Create at least one savings goal during the week.',
    'weekly',
    'goal_created_count',
    1,
    100,
    false
  ),
  (
    'weekly_save_once',
    'Record a savings contribution',
    'Add at least one contribution to a savings goal this week.',
    'weekly',
    'savings_contribution_count',
    1,
    100,
    false
  )
on conflict (code)
do update set
  title = excluded.title,
  description = excluded.description,
  cadence = excluded.cadence,
  verification_type = excluded.verification_type,
  target_count = excluded.target_count,
  points_reward = excluded.points_reward,
  is_premium = excluded.is_premium,
  is_active = true,
  updated_at = now();


-- -------------------------------------------------------------------------
-- RLS
-- -------------------------------------------------------------------------

alter table public.gamification_point_rules
  enable row level security;

alter table public.gamification_levels
  enable row level security;

alter table public.point_events
  enable row level security;

alter table public.user_points
  enable row level security;

alter table public.badges
  enable row level security;

alter table public.user_badges
  enable row level security;

alter table public.streaks
  enable row level security;

alter table public.challenges
  enable row level security;

alter table public.user_challenges
  enable row level security;


drop policy if exists gamification_point_rules_read
  on public.gamification_point_rules;

create policy gamification_point_rules_read
  on public.gamification_point_rules
  for select
  to authenticated
  using (true);


drop policy if exists gamification_levels_read
  on public.gamification_levels;

create policy gamification_levels_read
  on public.gamification_levels
  for select
  to authenticated
  using (true);


drop policy if exists point_events_read_own
  on public.point_events;

create policy point_events_read_own
  on public.point_events
  for select
  to authenticated
  using (
    user_id = auth.uid()
  );


drop policy if exists user_points_read_own
  on public.user_points;

create policy user_points_read_own
  on public.user_points
  for select
  to authenticated
  using (
    user_id = auth.uid()
  );


drop policy if exists badges_read
  on public.badges;

create policy badges_read
  on public.badges
  for select
  to authenticated
  using (
    is_active = true
  );


drop policy if exists user_badges_read_own
  on public.user_badges;

create policy user_badges_read_own
  on public.user_badges
  for select
  to authenticated
  using (
    user_id = auth.uid()
  );


drop policy if exists streaks_read_own
  on public.streaks;

create policy streaks_read_own
  on public.streaks
  for select
  to authenticated
  using (
    user_id = auth.uid()
  );


drop policy if exists challenges_read
  on public.challenges;

create policy challenges_read
  on public.challenges
  for select
  to authenticated
  using (
    is_active = true
  );


drop policy if exists user_challenges_read_own
  on public.user_challenges;

create policy user_challenges_read_own
  on public.user_challenges
  for select
  to authenticated
  using (
    user_id = auth.uid()
  );


revoke all on public.gamification_point_rules
  from anon;

revoke all on public.gamification_levels
  from anon;

revoke all on public.point_events
  from anon;

revoke all on public.user_points
  from anon;

revoke all on public.badges
  from anon;

revoke all on public.user_badges
  from anon;

revoke all on public.streaks
  from anon;

revoke all on public.challenges
  from anon;

revoke all on public.user_challenges
  from anon;


grant select
  on public.gamification_point_rules,
     public.gamification_levels,
     public.badges,
     public.challenges
  to authenticated;

grant select
  on public.point_events,
     public.user_points,
     public.user_badges,
     public.streaks,
     public.user_challenges
  to authenticated;


-- -------------------------------------------------------------------------
-- Timezone validation
-- -------------------------------------------------------------------------

create or replace function public.is_valid_timezone(
  p_timezone text
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1
    from pg_catalog.pg_timezone_names tz
    where tz.name = p_timezone
  );
$$;


revoke all on function public.is_valid_timezone(text)
  from public;


-- -------------------------------------------------------------------------
-- Private point award helper
-- -------------------------------------------------------------------------

create or replace function public.award_gamification_points(
  p_user_id uuid,
  p_event_type text,
  p_source_type text,
  p_source_id uuid,
  p_idempotency_key text,
  p_points_override integer default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_points integer;
  v_inserted boolean;
begin
  if p_user_id is null
     or nullif(
       btrim(
         p_idempotency_key
       ),
       ''
     ) is null then
    return false;
  end if;


  if p_points_override is not null then
    v_points :=
      p_points_override;
  else
    select r.points
    into v_points
    from public.gamification_point_rules r
    where
      r.event_type = p_event_type
      and r.is_active = true;
  end if;


  if v_points is null
     or v_points <= 0 then
    return false;
  end if;


  insert into public.point_events (
    user_id,
    event_type,
    points,
    source_type,
    source_id,
    idempotency_key
  )
  values (
    p_user_id,
    p_event_type,
    v_points,
    p_source_type,
    p_source_id,
    btrim(
      p_idempotency_key
    )
  )
  on conflict (
    user_id,
    idempotency_key
  )
  do nothing;


  v_inserted :=
    found;


  if v_inserted then
    insert into public.user_points (
      user_id,
      total_points,
      updated_at
    )
    values (
      p_user_id,
      v_points,
      now()
    )
    on conflict (user_id)
    do update set
      total_points =
        public.user_points.total_points
        + excluded.total_points,

      updated_at =
        now();
  end if;


  return v_inserted;
end;
$$;


revoke all on function public.award_gamification_points(
  uuid,
  text,
  text,
  uuid,
  text,
  integer
)
from public;


-- -------------------------------------------------------------------------
-- Data-driven point triggers
-- -------------------------------------------------------------------------

create or replace function public.gamification_transaction_insert_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.award_gamification_points(
    new.user_id,
    'transaction_logged',
    'transaction',
    new.id,
    'transaction_logged:' || new.id::text,
    null
  );

  return new;
end;
$$;


create or replace function public.gamification_budget_insert_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.award_gamification_points(
    new.user_id,
    'budget_created',
    'budget',
    new.id,
    'budget_created:' || new.id::text,
    null
  );

  return new;
end;
$$;


create or replace function public.gamification_goal_insert_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.award_gamification_points(
    new.user_id,
    'goal_created',
    'savings_goal',
    new.id,
    'goal_created:' || new.id::text,
    null
  );

  return new;
end;
$$;


create or replace function public.gamification_savings_contribution_insert_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.award_gamification_points(
    new.user_id,
    'savings_contribution_logged',
    'savings_contribution',
    new.id,
    'savings_contribution_logged:' || new.id::text,
    null
  );

  return new;
end;
$$;


create or replace function public.gamification_goal_completed_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed'
     and old.status is distinct from 'completed' then
    perform public.award_gamification_points(
      new.user_id,
      'goal_completed',
      'savings_goal',
      new.id,
      'goal_completed:' || new.id::text,
      null
    );
  end if;

  return new;
end;
$$;


drop trigger if exists gamification_transactions_after_insert
  on public.transactions;

create trigger gamification_transactions_after_insert
after insert on public.transactions
for each row
execute function public.gamification_transaction_insert_trigger();


drop trigger if exists gamification_budgets_after_insert
  on public.budgets;

create trigger gamification_budgets_after_insert
after insert on public.budgets
for each row
execute function public.gamification_budget_insert_trigger();


drop trigger if exists gamification_goals_after_insert
  on public.savings_goals;

create trigger gamification_goals_after_insert
after insert on public.savings_goals
for each row
execute function public.gamification_goal_insert_trigger();


drop trigger if exists gamification_savings_contributions_after_insert
  on public.savings_contributions;

create trigger gamification_savings_contributions_after_insert
after insert on public.savings_contributions
for each row
execute function public.gamification_savings_contribution_insert_trigger();


drop trigger if exists gamification_goals_after_status_update
  on public.savings_goals;

create trigger gamification_goals_after_status_update
after update of status on public.savings_goals
for each row
execute function public.gamification_goal_completed_trigger();


-- -------------------------------------------------------------------------
-- Streak calculation helper
--
-- daily_logging:
--   distinct transaction_date values
--
-- saving:
--   distinct savings contribution dates
--
-- challenge:
--   distinct local completion dates based on the configured timezone
-- -------------------------------------------------------------------------

create or replace function public.refresh_gamification_streaks(
  p_timezone text default 'UTC'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_timezone text;
  v_type text;
  v_current integer;
  v_best integer;
  v_last date;
  v_today date;
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


  if not public.is_valid_timezone(
    v_timezone
  ) then
    raise exception 'Invalid timezone'
      using errcode = '22023';
  end if;


  v_today :=
    (
      now()
      at time zone v_timezone
    )::date;


  foreach v_type in array array[
    'daily_logging',
    'saving',
    'challenge'
  ]
  loop
    if v_type = 'daily_logging' then
      with activity as (
        select distinct
          t.transaction_date::date as activity_date
        from public.transactions t
        where
          t.user_id = v_user_id
          and t.deleted_at is null
          and t.transaction_date <= v_today
      ),

      ordered as (
        select
          activity_date,

          activity_date
          - (
              row_number() over (
                order by activity_date
              )
            )::integer as grp
        from activity
      ),

      runs as (
        select
          min(activity_date) as run_start,
          max(activity_date) as run_end,
          count(*)::integer as run_count
        from ordered
        group by grp
      )

      select
        coalesce(
          max(run_count),
          0
        ),

        coalesce(
          max(
            case
              when run_end in (
                v_today,
                v_today - 1
              )
                then run_count
              else 0
            end
          ),
          0
        ),

        (
          select max(activity_date)
          from activity
        )

      into
        v_best,
        v_current,
        v_last

      from runs;


    elsif v_type = 'saving' then
      with activity as (
        select distinct
          sc.contribution_date::date as activity_date
        from public.savings_contributions sc
        where
          sc.user_id = v_user_id
          and sc.contribution_date <= v_today
      ),

      ordered as (
        select
          activity_date,

          activity_date
          - (
              row_number() over (
                order by activity_date
              )
            )::integer as grp
        from activity
      ),

      runs as (
        select
          min(activity_date) as run_start,
          max(activity_date) as run_end,
          count(*)::integer as run_count
        from ordered
        group by grp
      )

      select
        coalesce(
          max(run_count),
          0
        ),

        coalesce(
          max(
            case
              when run_end in (
                v_today,
                v_today - 1
              )
                then run_count
              else 0
            end
          ),
          0
        ),

        (
          select max(activity_date)
          from activity
        )

      into
        v_best,
        v_current,
        v_last

      from runs;


    else
      with activity as (
        select distinct
          (
            uc.completed_at
            at time zone uc.timezone
          )::date as activity_date
        from public.user_challenges uc
        where
          uc.user_id = v_user_id
          and uc.status = 'completed'
          and uc.completed_at is not null
          and (
            uc.completed_at
            at time zone uc.timezone
          )::date <= v_today
      ),

      ordered as (
        select
          activity_date,

          activity_date
          - (
              row_number() over (
                order by activity_date
              )
            )::integer as grp
        from activity
      ),

      runs as (
        select
          min(activity_date) as run_start,
          max(activity_date) as run_end,
          count(*)::integer as run_count
        from ordered
        group by grp
      )

      select
        coalesce(
          max(run_count),
          0
        ),

        coalesce(
          max(
            case
              when run_end in (
                v_today,
                v_today - 1
              )
                then run_count
              else 0
            end
          ),
          0
        ),

        (
          select max(activity_date)
          from activity
        )

      into
        v_best,
        v_current,
        v_last

      from runs;
    end if;


    insert into public.streaks (
      user_id,
      streak_type,
      timezone,
      current_count,
      best_count,
      last_activity_date,
      updated_at
    )
    values (
      v_user_id,
      v_type,
      v_timezone,
      v_current,
      v_best,
      v_last,
      now()
    )
    on conflict (
      user_id,
      streak_type
    )
    do update set
      timezone =
        excluded.timezone,

      current_count =
        excluded.current_count,

      best_count =
        greatest(
          public.streaks.best_count,
          excluded.best_count
        ),

      last_activity_date =
        excluded.last_activity_date,

      updated_at =
        now();


    if v_type = 'daily_logging'
       and v_best >= 7 then
      perform public.award_gamification_points(
        v_user_id,
        'logging_streak_7',
        'streak',
        null,
        'logging_streak_7',
        null
      );
    end if;


    if v_type = 'daily_logging'
       and v_best >= 30 then
      perform public.award_gamification_points(
        v_user_id,
        'logging_streak_30',
        'streak',
        null,
        'logging_streak_30',
        null
      );
    end if;


    if v_type = 'saving'
       and v_best >= 4 then
      perform public.award_gamification_points(
        v_user_id,
        'saving_streak_4',
        'streak',
        null,
        'saving_streak_4',
        null
      );
    end if;


    if v_type = 'challenge'
       and v_best >= 7 then
      perform public.award_gamification_points(
        v_user_id,
        'challenge_streak_7',
        'streak',
        null,
        'challenge_streak_7',
        null
      );
    end if;
  end loop;


  return (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'streak_type',
          s.streak_type,

          'timezone',
          s.timezone,

          'current_count',
          s.current_count,

          'best_count',
          s.best_count,

          'last_activity_date',
          s.last_activity_date
        )
        order by
          s.streak_type
      ),
      '[]'::jsonb
    )

    from public.streaks s

    where
      s.user_id = v_user_id
  );
end;
$$;


revoke all on function public.refresh_gamification_streaks(text)
  from public;

grant execute on function public.refresh_gamification_streaks(text)
  to authenticated;


-- -------------------------------------------------------------------------
-- Challenge period helper
-- -------------------------------------------------------------------------

create or replace function public.gamification_period(
  p_cadence text,
  p_timezone text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_local_date date;
  v_start date;
  v_end date;
begin
  if not public.is_valid_timezone(
    p_timezone
  ) then
    raise exception 'Invalid timezone'
      using errcode = '22023';
  end if;


  v_local_date :=
    (
      now()
      at time zone p_timezone
    )::date;


  if p_cadence = 'daily' then
    v_start :=
      v_local_date;

    v_end :=
      v_local_date;

  elsif p_cadence = 'weekly' then
    v_start :=
      (
        date_trunc(
          'week',
          v_local_date::timestamp
        )
      )::date;

    v_end :=
      v_start
      + 6;

  else
    raise exception 'Unsupported challenge cadence'
      using errcode = '22023';
  end if;


  return jsonb_build_object(
    'period_start',
    v_start,

    'period_end',
    v_end
  );
end;
$$;


revoke all on function public.gamification_period(text, text)
  from public;


-- -------------------------------------------------------------------------
-- Start a challenge
-- -------------------------------------------------------------------------

create or replace function public.start_gamification_challenge(
  p_challenge_id uuid,
  p_timezone text default 'UTC'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_challenge public.challenges%rowtype;
  v_period jsonb;
  v_period_start date;
  v_period_end date;
  v_id uuid;
begin
  v_user_id :=
    auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;


  if not public.is_valid_timezone(
    p_timezone
  ) then
    raise exception 'Invalid timezone'
      using errcode = '22023';
  end if;


  select *
  into v_challenge
  from public.challenges c
  where
    c.id = p_challenge_id
    and c.is_active = true;


  if not found then
    raise exception 'Challenge not found'
      using errcode = '22023';
  end if;


  v_period :=
    public.gamification_period(
      v_challenge.cadence,
      p_timezone
    );


  v_period_start :=
    (
      v_period
      ->> 'period_start'
    )::date;

  v_period_end :=
    (
      v_period
      ->> 'period_end'
    )::date;


  insert into public.user_challenges (
    user_id,
    challenge_id,
    timezone,
    period_start,
    period_end,
    status,
    progress_count
  )
  values (
    v_user_id,
    v_challenge.id,
    p_timezone,
    v_period_start,
    v_period_end,
    'active',
    0
  )
  on conflict (
    user_id,
    challenge_id,
    period_start
  )
  do update set
    timezone =
      excluded.timezone,

    updated_at =
      now()

  returning id
  into v_id;


  return v_id;
end;
$$;


revoke all on function public.start_gamification_challenge(uuid, text)
  from public;

grant execute on function public.start_gamification_challenge(uuid, text)
  to authenticated;


-- -------------------------------------------------------------------------
-- Verify one active challenge against real application data
-- -------------------------------------------------------------------------

create or replace function public.refresh_gamification_challenge(
  p_user_challenge_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_user_challenge public.user_challenges%rowtype;
  v_challenge public.challenges%rowtype;
  v_progress integer;
  v_now_local date;
  v_completed_now boolean;
begin
  v_user_id :=
    auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;


  select *
  into v_user_challenge
  from public.user_challenges uc
  where
    uc.id = p_user_challenge_id
    and uc.user_id = v_user_id
  for update;


  if not found then
    raise exception 'User challenge not found'
      using errcode = '42501';
  end if;


  select *
  into v_challenge
  from public.challenges c
  where c.id = v_user_challenge.challenge_id;


  v_now_local :=
    (
      now()
      at time zone v_user_challenge.timezone
    )::date;


  if v_challenge.verification_type = 'transaction_count' then
    select count(*)::integer
    into v_progress
    from public.transactions t
    where
      t.user_id = v_user_id
      and t.deleted_at is null
      and t.transaction_date between
        v_user_challenge.period_start
        and v_user_challenge.period_end
      and t.type in (
        'income',
        'expense'
      );


  elsif v_challenge.verification_type = 'budget_created_count' then
    select count(*)::integer
    into v_progress
    from public.budgets b
    where
      b.user_id = v_user_id
      and b.deleted_at is null
      and (
        b.created_at
        at time zone v_user_challenge.timezone
      )::date between
        v_user_challenge.period_start
        and v_user_challenge.period_end;


  elsif v_challenge.verification_type = 'goal_created_count' then
    select count(*)::integer
    into v_progress
    from public.savings_goals g
    where
      g.user_id = v_user_id
      and g.deleted_at is null
      and (
        g.created_at
        at time zone v_user_challenge.timezone
      )::date between
        v_user_challenge.period_start
        and v_user_challenge.period_end;


  elsif v_challenge.verification_type = 'savings_contribution_count' then
    select count(*)::integer
    into v_progress
    from public.savings_contributions sc
    where
      sc.user_id = v_user_id
      and sc.contribution_date between
        v_user_challenge.period_start
        and v_user_challenge.period_end;


  else
    raise exception 'Unsupported challenge verification type'
      using errcode = 'P0001';
  end if;


  v_completed_now :=
    (
      v_user_challenge.status <> 'completed'
      and v_progress >= v_challenge.target_count
    );


  update public.user_challenges
  set
    progress_count =
      v_progress,

    status =
      case
        when
          v_progress >= v_challenge.target_count
          then 'completed'

        when
          v_now_local > period_end
          then 'expired'

        else 'active'
      end,

    completed_at =
      case
        when
          v_progress >= v_challenge.target_count
          then coalesce(
            completed_at,
            now()
          )

        else completed_at
      end,

    updated_at =
      now()

  where
    id = v_user_challenge.id;


  if v_completed_now then
    perform public.award_gamification_points(
      v_user_id,
      'challenge_completed',
      'user_challenge',
      v_user_challenge.id,
      'challenge_completed:' || v_user_challenge.id::text,
      v_challenge.points_reward
    );
  end if;


  perform public.refresh_gamification_streaks(
    v_user_challenge.timezone
  );


  return (
    select jsonb_build_object(
      'id',
      uc.id,

      'challenge_id',
      uc.challenge_id,

      'status',
      uc.status,

      'progress_count',
      uc.progress_count,

      'target_count',
      v_challenge.target_count,

      'period_start',
      uc.period_start,

      'period_end',
      uc.period_end,

      'completed_at',
      uc.completed_at
    )

    from public.user_challenges uc

    where uc.id = v_user_challenge.id
  );
end;
$$;


revoke all on function public.refresh_gamification_challenge(uuid)
  from public;

grant execute on function public.refresh_gamification_challenge(uuid)
  to authenticated;


-- -------------------------------------------------------------------------
-- Refresh all active/expired-window challenges for the current user
-- -------------------------------------------------------------------------

create or replace function public.refresh_my_gamification_challenges()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_row record;
  v_count integer := 0;
begin
  v_user_id :=
    auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;


  for v_row in
    select uc.id
    from public.user_challenges uc
    where
      uc.user_id = v_user_id
      and uc.status in (
        'active',
        'expired'
      )
  loop
    perform public.refresh_gamification_challenge(
      v_row.id
    );

    v_count :=
      v_count
      + 1;
  end loop;


  return v_count;
end;
$$;


revoke all on function public.refresh_my_gamification_challenges()
  from public;

grant execute on function public.refresh_my_gamification_challenges()
  to authenticated;


-- -------------------------------------------------------------------------
-- Award badges based on current point/event/streak state
-- -------------------------------------------------------------------------

create or replace function public.refresh_gamification_badges()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_badge public.badges%rowtype;
  v_met boolean;
  v_total bigint;
  v_count integer;
  v_awarded integer := 0;
begin
  v_user_id :=
    auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;


  select coalesce(
    up.total_points,
    0
  )
  into v_total
  from (
    select v_user_id as user_id
  ) base
  left join public.user_points up
    on up.user_id = base.user_id;


  for v_badge in
    select *
    from public.badges b
    where b.is_active = true
  loop
    v_met :=
      false;


    if v_badge.criteria_type = 'point_total' then
      v_met :=
        v_total >=
        v_badge.criteria_value;


    elsif v_badge.criteria_type = 'event_count' then
      select count(*)::integer
      into v_count
      from public.point_events pe
      where
        pe.user_id = v_user_id
        and pe.event_type =
          v_badge.criteria_key;


      v_met :=
        v_count >=
        v_badge.criteria_value;


    elsif v_badge.criteria_type = 'streak' then
      select coalesce(
        max(
          s.best_count
        ),
        0
      )
      into v_count
      from public.streaks s
      where
        s.user_id = v_user_id
        and s.streak_type =
          v_badge.criteria_key;


      v_met :=
        v_count >=
        v_badge.criteria_value;
    end if;


    if v_met then
      insert into public.user_badges (
        user_id,
        badge_id
      )
      values (
        v_user_id,
        v_badge.id
      )
      on conflict (
        user_id,
        badge_id
      )
      do nothing;


      if found then
        v_awarded :=
          v_awarded
          + 1;
      end if;
    end if;
  end loop;


  return v_awarded;
end;
$$;


revoke all on function public.refresh_gamification_badges()
  from public;

grant execute on function public.refresh_gamification_badges()
  to authenticated;


-- -------------------------------------------------------------------------
-- Read model for the Gamification UI/dashboard.
-- Refreshes streaks/challenges/badges first so UI receives trusted state.
-- -------------------------------------------------------------------------

create or replace function public.get_gamification_summary(
  p_timezone text default 'UTC'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_total bigint;
  v_level integer;
  v_level_name text;
  v_level_min bigint;
  v_next_level integer;
  v_next_level_name text;
  v_next_level_min bigint;
begin
  v_user_id :=
    auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;


  perform public.refresh_my_gamification_challenges();

  perform public.refresh_gamification_streaks(
    p_timezone
  );

  perform public.refresh_gamification_badges();


  select coalesce(
    up.total_points,
    0
  )
  into v_total
  from (
    select v_user_id as user_id
  ) base
  left join public.user_points up
    on up.user_id = base.user_id;


  select
    l.level,
    l.name,
    l.minimum_points
  into
    v_level,
    v_level_name,
    v_level_min
  from public.gamification_levels l
  where l.minimum_points <= v_total
  order by
    l.minimum_points desc
  limit 1;


  select
    l.level,
    l.name,
    l.minimum_points
  into
    v_next_level,
    v_next_level_name,
    v_next_level_min
  from public.gamification_levels l
  where l.minimum_points > v_total
  order by
    l.minimum_points asc
  limit 1;


  return jsonb_build_object(
    'total_points',
    v_total::text,

    'level',
    v_level,

    'level_name',
    v_level_name,

    'level_minimum_points',
    v_level_min::text,

    'next_level',
    v_next_level,

    'next_level_name',
    v_next_level_name,

    'next_level_minimum_points',
    case
      when v_next_level_min is null
        then null
      else v_next_level_min::text
    end,

    'streaks',
    (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'streak_type',
            s.streak_type,

            'current_count',
            s.current_count,

            'best_count',
            s.best_count,

            'last_activity_date',
            s.last_activity_date,

            'timezone',
            s.timezone
          )
          order by
            s.streak_type
        ),
        '[]'::jsonb
      )
      from public.streaks s
      where s.user_id = v_user_id
    ),

    'badges',
    (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id',
            b.id,

            'code',
            b.code,

            'name',
            b.name,

            'description',
            b.description,

            'awarded_at',
            ub.awarded_at
          )
          order by
            ub.awarded_at desc
        ),
        '[]'::jsonb
      )
      from public.user_badges ub
      join public.badges b
        on b.id = ub.badge_id
      where ub.user_id = v_user_id
    ),

    'available_challenges',
    (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id',
            c.id,

            'code',
            c.code,

            'title',
            c.title,

            'description',
            c.description,

            'cadence',
            c.cadence,

            'target_count',
            c.target_count,

            'points_reward',
            c.points_reward,

            'is_premium',
            c.is_premium
          )
          order by
            case c.cadence
              when 'daily' then 0
              else 1
            end,
            c.title
        ),
        '[]'::jsonb
      )
      from public.challenges c
      where c.is_active = true
    ),

    'my_challenges',
    (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id',
            uc.id,

            'challenge_id',
            uc.challenge_id,

            'title',
            c.title,

            'description',
            c.description,

            'cadence',
            c.cadence,

            'status',
            uc.status,

            'progress_count',
            uc.progress_count,

            'target_count',
            c.target_count,

            'points_reward',
            c.points_reward,

            'period_start',
            uc.period_start,

            'period_end',
            uc.period_end,

            'completed_at',
            uc.completed_at
          )
          order by
            case uc.status
              when 'active' then 0
              when 'completed' then 1
              else 2
            end,
            uc.period_end desc,
            c.title
        ),
        '[]'::jsonb
      )
      from public.user_challenges uc
      join public.challenges c
        on c.id = uc.challenge_id
      where uc.user_id = v_user_id
    ),

    'recent_point_events',
    (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id',
            rows.id,

            'event_type',
            rows.event_type,

            'points',
            rows.points,

            'source_type',
            rows.source_type,

            'created_at',
            rows.created_at
          )
          order by
            rows.created_at desc
        ),
        '[]'::jsonb
      )
      from (
        select
          pe.id,
          pe.event_type,
          pe.points,
          pe.source_type,
          pe.created_at
        from public.point_events pe
        where pe.user_id = v_user_id
        order by
          pe.created_at desc
        limit 20
      ) rows
    )
  );
end;
$$;


revoke all on function public.get_gamification_summary(text)
  from public;

grant execute on function public.get_gamification_summary(text)
  to authenticated;