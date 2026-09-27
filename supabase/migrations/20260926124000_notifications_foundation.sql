-- Finance Coach
-- Notifications foundation
--
-- Architecture:
-- - PostgreSQL determines which notifications are valid.
-- - Scheduled notifications are deduplicated server-side.
-- - Quiet hours and category preferences are enforced before delivery.
-- - Push tokens are registered through validated RPCs.
-- - Notification bodies intentionally avoid sensitive financial amounts.
-- - Delivery itself is handled by the server-side dispatch function added
--   in Notifications Development 02.

-- -------------------------------------------------------------------------
-- Preferences
-- -------------------------------------------------------------------------

create table if not exists public.notification_preferences (
  user_id uuid primary key
    references auth.users(id)
    on delete cascade,

  master_enabled boolean not null default true,

  push_enabled boolean not null default true,
  in_app_enabled boolean not null default true,

  timezone text not null default 'UTC',

  quiet_hours_enabled boolean not null default false,
  quiet_hours_start time not null default time '22:00',
  quiet_hours_end time not null default time '07:00',

  reminder_time_local time not null default time '09:00',
  streak_reminder_time_local time not null default time '19:00',

  budget_warning_threshold_basis_points integer not null default 8000
    check (
      budget_warning_threshold_basis_points
      between 5000 and 10000
    ),

  bill_reminders_enabled boolean not null default true,
  budget_warnings_enabled boolean not null default true,
  savings_reminders_enabled boolean not null default true,
  loan_payment_reminders_enabled boolean not null default true,
  rosca_contribution_reminders_enabled boolean not null default true,
  challenge_reminders_enabled boolean not null default true,
  streak_reminders_enabled boolean not null default true,
  ai_insights_enabled boolean not null default true,
  motivational_messages_enabled boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- -------------------------------------------------------------------------
-- Push devices
-- -------------------------------------------------------------------------

create table if not exists public.notification_devices (
  id uuid primary key,

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  expo_push_token text not null,

  platform text not null
    check (
      platform in (
        'android',
        'ios'
      )
    ),

  active boolean not null default true,

  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (
    expo_push_token
  )
);


create index if not exists notification_devices_user_active_idx
  on public.notification_devices (
    user_id,
    active,
    last_seen_at desc
  );


-- -------------------------------------------------------------------------
-- Scheduled notification queue
-- -------------------------------------------------------------------------

create table if not exists public.scheduled_notifications (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  notification_type text not null
    check (
      notification_type in (
        'bill_reminder',
        'budget_warning',
        'savings_reminder',
        'loan_payment_reminder',
        'rosca_contribution_reminder',
        'challenge_reminder',
        'streak_reminder',
        'ai_insight',
        'motivational_message'
      )
    ),

  source_type text null,
  source_id uuid null,

  title text not null
    check (
      char_length(title)
      between 1 and 120
    ),

  body text not null
    check (
      char_length(body)
      between 1 and 500
    ),

  deep_link text null,

  scheduled_for timestamptz not null,

  status text not null default 'pending'
    check (
      status in (
        'pending',
        'processing',
        'sent',
        'cancelled',
        'failed'
      )
    ),

  dedupe_key text not null,

  attempt_count integer not null default 0
    check (
      attempt_count >= 0
    ),

  last_error text null,

  sent_at timestamptz null,
  cancelled_at timestamptz null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (
    user_id,
    dedupe_key
  )
);


create index if not exists scheduled_notifications_dispatch_idx
  on public.scheduled_notifications (
    status,
    scheduled_for
  )
  where status = 'pending';


create index if not exists scheduled_notifications_user_idx
  on public.scheduled_notifications (
    user_id,
    scheduled_for desc
  );


-- -------------------------------------------------------------------------
-- Delivery/open audit trail
-- -------------------------------------------------------------------------

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  scheduled_notification_id uuid null
    references public.scheduled_notifications(id)
    on delete set null,

  device_id uuid null
    references public.notification_devices(id)
    on delete set null,

  event_type text not null
    check (
      event_type in (
        'queued',
        'processing',
        'sent',
        'failed',
        'opened',
        'dismissed'
      )
    ),

  provider text null,

  provider_receipt_id text null,

  error_code text null,

  created_at timestamptz not null default now()
);


create index if not exists notification_events_user_created_idx
  on public.notification_events (
    user_id,
    created_at desc
  );


create index if not exists notification_events_notification_idx
  on public.notification_events (
    scheduled_notification_id,
    created_at
  );


-- -------------------------------------------------------------------------
-- RLS
-- -------------------------------------------------------------------------

alter table public.notification_preferences
  enable row level security;

alter table public.notification_devices
  enable row level security;

alter table public.scheduled_notifications
  enable row level security;

alter table public.notification_events
  enable row level security;


drop policy if exists notification_preferences_read_own
  on public.notification_preferences;

create policy notification_preferences_read_own
  on public.notification_preferences
  for select
  to authenticated
  using (
    user_id = auth.uid()
  );


drop policy if exists scheduled_notifications_read_own
  on public.scheduled_notifications;

create policy scheduled_notifications_read_own
  on public.scheduled_notifications
  for select
  to authenticated
  using (
    user_id = auth.uid()
  );


drop policy if exists notification_events_read_own
  on public.notification_events;

create policy notification_events_read_own
  on public.notification_events
  for select
  to authenticated
  using (
    user_id = auth.uid()
  );


revoke all on public.notification_preferences
  from anon;

revoke all on public.notification_devices
  from anon;

revoke all on public.scheduled_notifications
  from anon;

revoke all on public.notification_events
  from anon;


grant select
  on public.notification_preferences,
     public.scheduled_notifications,
     public.notification_events
  to authenticated;


-- -------------------------------------------------------------------------
-- Shared validation helpers
-- -------------------------------------------------------------------------

create or replace function public.notification_timezone_is_valid(
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


revoke all on function public.notification_timezone_is_valid(text)
  from public;


create or replace function public.notification_type_is_enabled(
  p_preferences public.notification_preferences,
  p_notification_type text
)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
begin
  if not p_preferences.master_enabled then
    return false;
  end if;


  return case p_notification_type
    when 'bill_reminder'
      then p_preferences.bill_reminders_enabled

    when 'budget_warning'
      then p_preferences.budget_warnings_enabled

    when 'savings_reminder'
      then p_preferences.savings_reminders_enabled

    when 'loan_payment_reminder'
      then p_preferences.loan_payment_reminders_enabled

    when 'rosca_contribution_reminder'
      then p_preferences.rosca_contribution_reminders_enabled

    when 'challenge_reminder'
      then p_preferences.challenge_reminders_enabled

    when 'streak_reminder'
      then p_preferences.streak_reminders_enabled

    when 'ai_insight'
      then p_preferences.ai_insights_enabled

    when 'motivational_message'
      then p_preferences.motivational_messages_enabled

    else false
  end;
end;
$$;


revoke all on function public.notification_type_is_enabled(
  public.notification_preferences,
  text
)
from public;


-- -------------------------------------------------------------------------
-- Convert a local date/time into an allowed UTC delivery instant while
-- respecting quiet hours.
-- -------------------------------------------------------------------------

create or replace function public.notification_allowed_at(
  p_preferences public.notification_preferences,
  p_local_date date,
  p_local_time time
)
returns timestamptz
language plpgsql
stable
set search_path = public
as $$
declare
  v_candidate_local timestamp;
  v_candidate_time time;
  v_adjusted_local timestamp;
begin
  v_candidate_local :=
    p_local_date
    + p_local_time;


  if not p_preferences.quiet_hours_enabled then
    return
      v_candidate_local
      at time zone
        p_preferences.timezone;
  end if;


  v_candidate_time :=
    v_candidate_local::time;


  if (
    p_preferences.quiet_hours_start
    <
    p_preferences.quiet_hours_end
  ) then
    if (
      v_candidate_time
      >= p_preferences.quiet_hours_start
      and v_candidate_time
      < p_preferences.quiet_hours_end
    ) then
      v_adjusted_local :=
        p_local_date
        + p_preferences.quiet_hours_end;

      return
        v_adjusted_local
        at time zone
          p_preferences.timezone;
    end if;

  else
    if (
      v_candidate_time
      >= p_preferences.quiet_hours_start
    ) then
      v_adjusted_local :=
        (
          p_local_date
          + 1
        )
        + p_preferences.quiet_hours_end;

      return
        v_adjusted_local
        at time zone
          p_preferences.timezone;
    end if;


    if (
      v_candidate_time
      < p_preferences.quiet_hours_end
    ) then
      v_adjusted_local :=
        p_local_date
        + p_preferences.quiet_hours_end;

      return
        v_adjusted_local
        at time zone
          p_preferences.timezone;
    end if;
  end if;


  return
    v_candidate_local
    at time zone
      p_preferences.timezone;
end;
$$;


revoke all on function public.notification_allowed_at(
  public.notification_preferences,
  date,
  time
)
from public;


-- -------------------------------------------------------------------------
-- Ensure preferences exist for a user.
-- -------------------------------------------------------------------------

create or replace function public.ensure_notification_preferences(
  p_user_id uuid,
  p_timezone text
)
returns public.notification_preferences
language plpgsql
security definer
set search_path = public
as $$
declare
  v_timezone text;
  v_row public.notification_preferences%rowtype;
begin
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


  if not public.notification_timezone_is_valid(
    v_timezone
  ) then
    raise exception 'Invalid timezone'
      using errcode = '22023';
  end if;


  insert into public.notification_preferences (
    user_id,
    timezone
  )
  values (
    p_user_id,
    v_timezone
  )
  on conflict (user_id)
  do update set
    timezone =
      excluded.timezone,

    updated_at =
      now();


  select *
  into v_row
  from public.notification_preferences p
  where p.user_id = p_user_id;


  return v_row;
end;
$$;


revoke all on function public.ensure_notification_preferences(uuid, text)
  from public;


-- -------------------------------------------------------------------------
-- User preference RPCs
-- -------------------------------------------------------------------------

create or replace function public.get_notification_preferences(
  p_timezone text default 'UTC'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_preferences public.notification_preferences%rowtype;
begin
  v_user_id :=
    auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;


  v_preferences :=
    public.ensure_notification_preferences(
      v_user_id,
      p_timezone
    );


  return jsonb_build_object(
    'master_enabled',
    v_preferences.master_enabled,

    'push_enabled',
    v_preferences.push_enabled,

    'in_app_enabled',
    v_preferences.in_app_enabled,

    'timezone',
    v_preferences.timezone,

    'quiet_hours_enabled',
    v_preferences.quiet_hours_enabled,

    'quiet_hours_start',
    to_char(
      v_preferences.quiet_hours_start,
      'HH24:MI'
    ),

    'quiet_hours_end',
    to_char(
      v_preferences.quiet_hours_end,
      'HH24:MI'
    ),

    'reminder_time_local',
    to_char(
      v_preferences.reminder_time_local,
      'HH24:MI'
    ),

    'streak_reminder_time_local',
    to_char(
      v_preferences.streak_reminder_time_local,
      'HH24:MI'
    ),

    'budget_warning_threshold_basis_points',
    v_preferences.budget_warning_threshold_basis_points,

    'bill_reminders_enabled',
    v_preferences.bill_reminders_enabled,

    'budget_warnings_enabled',
    v_preferences.budget_warnings_enabled,

    'savings_reminders_enabled',
    v_preferences.savings_reminders_enabled,

    'loan_payment_reminders_enabled',
    v_preferences.loan_payment_reminders_enabled,

    'rosca_contribution_reminders_enabled',
    v_preferences.rosca_contribution_reminders_enabled,

    'challenge_reminders_enabled',
    v_preferences.challenge_reminders_enabled,

    'streak_reminders_enabled',
    v_preferences.streak_reminders_enabled,

    'ai_insights_enabled',
    v_preferences.ai_insights_enabled,

    'motivational_messages_enabled',
    v_preferences.motivational_messages_enabled
  );
end;
$$;


revoke all on function public.get_notification_preferences(text)
  from public;

grant execute on function public.get_notification_preferences(text)
  to authenticated;


create or replace function public.update_notification_preferences(
  p_master_enabled boolean,
  p_push_enabled boolean,
  p_in_app_enabled boolean,
  p_timezone text,
  p_quiet_hours_enabled boolean,
  p_quiet_hours_start text,
  p_quiet_hours_end text,
  p_reminder_time_local text,
  p_streak_reminder_time_local text,
  p_budget_warning_threshold_basis_points integer,
  p_bill_reminders_enabled boolean,
  p_budget_warnings_enabled boolean,
  p_savings_reminders_enabled boolean,
  p_loan_payment_reminders_enabled boolean,
  p_rosca_contribution_reminders_enabled boolean,
  p_challenge_reminders_enabled boolean,
  p_streak_reminders_enabled boolean,
  p_ai_insights_enabled boolean,
  p_motivational_messages_enabled boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_timezone text;
  v_quiet_start time;
  v_quiet_end time;
  v_reminder_time time;
  v_streak_time time;
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


  if not public.notification_timezone_is_valid(
    v_timezone
  ) then
    raise exception 'Invalid timezone'
      using errcode = '22023';
  end if;


  begin
    v_quiet_start :=
      p_quiet_hours_start::time;

    v_quiet_end :=
      p_quiet_hours_end::time;

    v_reminder_time :=
      p_reminder_time_local::time;

    v_streak_time :=
      p_streak_reminder_time_local::time;
  exception
    when others then
      raise exception 'Notification times must use HH:MM format'
        using errcode = '22023';
  end;


  if p_budget_warning_threshold_basis_points
     not between 5000 and 10000 then
    raise exception 'Budget warning threshold must be between 5000 and 10000 basis points'
      using errcode = '22023';
  end if;


  insert into public.notification_preferences (
    user_id,
    master_enabled,
    push_enabled,
    in_app_enabled,
    timezone,
    quiet_hours_enabled,
    quiet_hours_start,
    quiet_hours_end,
    reminder_time_local,
    streak_reminder_time_local,
    budget_warning_threshold_basis_points,
    bill_reminders_enabled,
    budget_warnings_enabled,
    savings_reminders_enabled,
    loan_payment_reminders_enabled,
    rosca_contribution_reminders_enabled,
    challenge_reminders_enabled,
    streak_reminders_enabled,
    ai_insights_enabled,
    motivational_messages_enabled
  )
  values (
    v_user_id,
    coalesce(
      p_master_enabled,
      true
    ),
    coalesce(
      p_push_enabled,
      true
    ),
    coalesce(
      p_in_app_enabled,
      true
    ),
    v_timezone,
    coalesce(
      p_quiet_hours_enabled,
      false
    ),
    v_quiet_start,
    v_quiet_end,
    v_reminder_time,
    v_streak_time,
    p_budget_warning_threshold_basis_points,
    coalesce(
      p_bill_reminders_enabled,
      true
    ),
    coalesce(
      p_budget_warnings_enabled,
      true
    ),
    coalesce(
      p_savings_reminders_enabled,
      true
    ),
    coalesce(
      p_loan_payment_reminders_enabled,
      true
    ),
    coalesce(
      p_rosca_contribution_reminders_enabled,
      true
    ),
    coalesce(
      p_challenge_reminders_enabled,
      true
    ),
    coalesce(
      p_streak_reminders_enabled,
      true
    ),
    coalesce(
      p_ai_insights_enabled,
      true
    ),
    coalesce(
      p_motivational_messages_enabled,
      false
    )
  )
  on conflict (user_id)
  do update set
    master_enabled =
      excluded.master_enabled,

    push_enabled =
      excluded.push_enabled,

    in_app_enabled =
      excluded.in_app_enabled,

    timezone =
      excluded.timezone,

    quiet_hours_enabled =
      excluded.quiet_hours_enabled,

    quiet_hours_start =
      excluded.quiet_hours_start,

    quiet_hours_end =
      excluded.quiet_hours_end,

    reminder_time_local =
      excluded.reminder_time_local,

    streak_reminder_time_local =
      excluded.streak_reminder_time_local,

    budget_warning_threshold_basis_points =
      excluded.budget_warning_threshold_basis_points,

    bill_reminders_enabled =
      excluded.bill_reminders_enabled,

    budget_warnings_enabled =
      excluded.budget_warnings_enabled,

    savings_reminders_enabled =
      excluded.savings_reminders_enabled,

    loan_payment_reminders_enabled =
      excluded.loan_payment_reminders_enabled,

    rosca_contribution_reminders_enabled =
      excluded.rosca_contribution_reminders_enabled,

    challenge_reminders_enabled =
      excluded.challenge_reminders_enabled,

    streak_reminders_enabled =
      excluded.streak_reminders_enabled,

    ai_insights_enabled =
      excluded.ai_insights_enabled,

    motivational_messages_enabled =
      excluded.motivational_messages_enabled,

    updated_at =
      now();


  return public.get_notification_preferences(
    v_timezone
  );
end;
$$;


revoke all on function public.update_notification_preferences(
  boolean,
  boolean,
  boolean,
  text,
  boolean,
  text,
  text,
  text,
  text,
  integer,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean
)
from public;

grant execute on function public.update_notification_preferences(
  boolean,
  boolean,
  boolean,
  text,
  boolean,
  text,
  text,
  text,
  text,
  integer,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean
)
to authenticated;


-- -------------------------------------------------------------------------
-- Push device registration
-- -------------------------------------------------------------------------

create or replace function public.register_notification_device(
  p_device_id uuid,
  p_expo_push_token text,
  p_platform text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_token text;
begin
  v_user_id :=
    auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;


  if p_device_id is null then
    raise exception 'Device ID is required'
      using errcode = '22023';
  end if;


  v_token :=
    btrim(
      coalesce(
        p_expo_push_token,
        ''
      )
    );


  if (
    v_token !~ '^ExponentPushToken\[[^\]]+\]$'
    and
    v_token !~ '^ExpoPushToken\[[^\]]+\]$'
  ) then
    raise exception 'Invalid Expo push token'
      using errcode = '22023';
  end if;


  if p_platform not in (
    'android',
    'ios'
  ) then
    raise exception 'Unsupported notification platform'
      using errcode = '22023';
  end if;


  update public.notification_devices
  set
    active = false,
    updated_at = now()
  where
    expo_push_token = v_token
    and user_id <> v_user_id;


  insert into public.notification_devices (
    id,
    user_id,
    expo_push_token,
    platform,
    active,
    last_seen_at
  )
  values (
    p_device_id,
    v_user_id,
    v_token,
    p_platform,
    true,
    now()
  )
  on conflict (expo_push_token)
  do update set
    user_id =
      excluded.user_id,

    platform =
      excluded.platform,

    active =
      true,

    last_seen_at =
      now(),

    updated_at =
      now();


  return (
    select d.id
    from public.notification_devices d
    where d.expo_push_token = v_token
    limit 1
  );
end;
$$;


revoke all on function public.register_notification_device(
  uuid,
  text,
  text
)
from public;

grant execute on function public.register_notification_device(
  uuid,
  text,
  text
)
to authenticated;


create or replace function public.unregister_notification_device(
  p_device_id uuid
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


  update public.notification_devices
  set
    active = false,
    updated_at = now()
  where
    id = p_device_id
    and user_id = v_user_id;


  if not found then
    raise exception 'Notification device not found'
      using errcode = '42501';
  end if;


  return p_device_id;
end;
$$;


revoke all on function public.unregister_notification_device(uuid)
  from public;

grant execute on function public.unregister_notification_device(uuid)
  to authenticated;


-- -------------------------------------------------------------------------
-- Private schedule insertion helper
-- -------------------------------------------------------------------------

create or replace function public.schedule_notification_if_enabled(
  p_user_id uuid,
  p_notification_type text,
  p_source_type text,
  p_source_id uuid,
  p_title text,
  p_body text,
  p_deep_link text,
  p_local_date date,
  p_local_time time,
  p_dedupe_key text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_preferences public.notification_preferences%rowtype;
  v_scheduled_for timestamptz;
  v_id uuid;
begin
  select *
  into v_preferences
  from public.notification_preferences p
  where p.user_id = p_user_id;


  if not found then
    return null;
  end if;


  if not public.notification_type_is_enabled(
    v_preferences,
    p_notification_type
  ) then
    return null;
  end if;


  if not v_preferences.push_enabled
     and not v_preferences.in_app_enabled then
    return null;
  end if;


  v_scheduled_for :=
    public.notification_allowed_at(
      v_preferences,
      p_local_date,
      p_local_time
    );


  if v_scheduled_for < now() then
    v_scheduled_for :=
      public.notification_allowed_at(
        v_preferences,
        (
          now()
          at time zone
            v_preferences.timezone
        )::date,
        (
          now()
          at time zone
            v_preferences.timezone
          + interval '2 minutes'
        )::time
      );
  end if;


  insert into public.scheduled_notifications (
    user_id,
    notification_type,
    source_type,
    source_id,
    title,
    body,
    deep_link,
    scheduled_for,
    status,
    dedupe_key
  )
  values (
    p_user_id,
    p_notification_type,
    nullif(
      btrim(
        p_source_type
      ),
      ''
    ),
    p_source_id,
    left(
      btrim(
        p_title
      ),
      120
    ),
    left(
      btrim(
        p_body
      ),
      500
    ),
    nullif(
      btrim(
        p_deep_link
      ),
      ''
    ),
    v_scheduled_for,
    'pending',
    left(
      btrim(
        p_dedupe_key
      ),
      240
    )
  )
  on conflict (
    user_id,
    dedupe_key
  )
  do nothing
  returning id
  into v_id;


  if v_id is not null then
    insert into public.notification_events (
      user_id,
      scheduled_notification_id,
      event_type
    )
    values (
      p_user_id,
      v_id,
      'queued'
    );
  end if;


  return v_id;
end;
$$;


revoke all on function public.schedule_notification_if_enabled(
  uuid,
  text,
  text,
  uuid,
  text,
  text,
  text,
  date,
  time,
  text
)
from public;


-- -------------------------------------------------------------------------
-- Deterministic schedule generation for one user.
-- Notification copy is deliberately generic: sensitive financial amounts are
-- not placed on a lock screen by default.
-- -------------------------------------------------------------------------

create or replace function public.refresh_notification_schedule_for_user(
  p_user_id uuid,
  p_timezone text,
  p_horizon_days integer default 14
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_preferences public.notification_preferences%rowtype;
  v_today date;
  v_horizon date;
  v_count integer := 0;
  v_id uuid;
  v_row record;
  v_row_json jsonb;
  v_due_text text;
  v_due_date date;
  v_status text;
  v_next_monday date;
  v_week_key text;
begin
  if p_horizon_days
     not between 1 and 60 then
    raise exception 'Notification horizon must be between 1 and 60 days'
      using errcode = '22023';
  end if;


  v_preferences :=
    public.ensure_notification_preferences(
      p_user_id,
      p_timezone
    );


  v_today :=
    (
      now()
      at time zone
        v_preferences.timezone
    )::date;


  v_horizon :=
    v_today
    + p_horizon_days;


  update public.scheduled_notifications
  set
    status = 'cancelled',
    cancelled_at = now(),
    updated_at = now()
  where
    user_id = p_user_id
    and status = 'pending'
    and scheduled_for < (
      now()
      - interval '1 day'
    );


  -- Loan payment reminders: 7 days before / through due date.
  for v_row in
    select
      l.id,
      l.due_date
    from public.loans l
    where
      l.user_id = p_user_id
      and l.deleted_at is null
      and l.status in (
        'active',
        'defaulted'
      )
      and l.due_date is not null
      and l.due_date between
        v_today
        and least(
          v_horizon,
          v_today + 7
        )
  loop
    v_id :=
      public.schedule_notification_if_enabled(
        p_user_id,
        'loan_payment_reminder',
        'loan',
        v_row.id,
        'Loan payment reminder',
        'A loan payment or due date is coming up. Open Finance Coach to review it.',
        '/loans',
        greatest(
          v_today,
          v_row.due_date - 1
        ),
        v_preferences.reminder_time_local,
        'loan-due:'
          || v_row.id::text
          || ':'
          || v_row.due_date::text
      );

    if v_id is not null then
      v_count :=
        v_count + 1;
    end if;
  end loop;


  -- ROSCA contribution reminders.
  for v_row in
    select
      rc.id,
      c.due_date
    from public.rosca_contributions rc

    join public.rosca_cycles c
      on c.id = rc.cycle_id

    join public.rosca_groups g
      on g.id = rc.group_id

    where
      rc.user_id = p_user_id
      and rc.status <> 'paid'
      and g.deleted_at is null
      and g.status = 'active'
      and c.due_date between
        v_today
        and least(
          v_horizon,
          v_today + 3
        )
  loop
    v_id :=
      public.schedule_notification_if_enabled(
        p_user_id,
        'rosca_contribution_reminder',
        'rosca_contribution',
        v_row.id,
        'ROSCA contribution reminder',
        'A ROSCA contribution is due soon. Open Finance Coach to review the cycle.',
        '/rosca',
        greatest(
          v_today,
          v_row.due_date - 1
        ),
        v_preferences.reminder_time_local,
        'rosca-contribution:'
          || v_row.id::text
          || ':'
          || v_row.due_date::text
      );

    if v_id is not null then
      v_count :=
        v_count + 1;
    end if;
  end loop;


  -- Active challenge reminders near their period end.
  for v_row in
    select
      uc.id,
      uc.period_end
    from public.user_challenges uc
    where
      uc.user_id = p_user_id
      and uc.status = 'active'
      and uc.period_end between
        v_today
        and least(
          v_horizon,
          v_today + 2
        )
  loop
    v_id :=
      public.schedule_notification_if_enabled(
        p_user_id,
        'challenge_reminder',
        'user_challenge',
        v_row.id,
        'Challenge reminder',
        'You have an active financial challenge ending soon.',
        '/gamification',
        greatest(
          v_today,
          v_row.period_end - 1
        ),
        v_preferences.reminder_time_local,
        'challenge-end:'
          || v_row.id::text
          || ':'
          || v_row.period_end::text
      );

    if v_id is not null then
      v_count :=
        v_count + 1;
    end if;
  end loop;


  -- Streak reminder if the logging streak was alive yesterday but has not
  -- been continued today.
  for v_row in
    select
      s.id,
      s.streak_type,
      s.current_count,
      s.last_activity_date
    from public.streaks s
    where
      s.user_id = p_user_id
      and s.current_count > 0
      and s.last_activity_date = (
        v_today - 1
      )
  loop
    v_id :=
      public.schedule_notification_if_enabled(
        p_user_id,
        'streak_reminder',
        'streak',
        v_row.id,
        'Keep your financial habit going',
        'A quick check-in today can keep your current Finance Coach streak active.',
        '/gamification',
        v_today,
        v_preferences.streak_reminder_time_local,
        'streak:'
          || v_row.streak_type
          || ':'
          || v_today::text
      );

    if v_id is not null then
      v_count :=
        v_count + 1;
    end if;
  end loop;


  -- Unread AI insight notification.
  for v_row in
    select
      fi.id,
      fi.generated_at
    from public.financial_insights fi
    where
      fi.user_id = p_user_id
      and fi.status = 'unread'
      and fi.generated_at >= (
        now()
        - interval '24 hours'
      )
    order by
      fi.generated_at desc
    limit 1
  loop
    v_id :=
      public.schedule_notification_if_enabled(
        p_user_id,
        'ai_insight',
        'financial_insight',
        v_row.id,
        'New Finance Coach insight',
        'A new financial insight is ready for you to review.',
        '/ai-coach',
        v_today,
        (
          (
            now()
            at time zone
              v_preferences.timezone
          )
          + interval '5 minutes'
        )::time,
        'ai-insight:'
          || v_row.id::text
      );

    if v_id is not null then
      v_count :=
        v_count + 1;
    end if;
  end loop;


  -- Savings reminder when there is at least one active goal and no savings
  -- contribution has been recorded in the previous 7 days.
  if exists (
    select 1
    from public.savings_goals g
    where
      g.user_id = p_user_id
      and coalesce(
        to_jsonb(g)
        ->> 'deleted_at',
        ''
      ) = ''
      and coalesce(
        nullif(
          to_jsonb(g)
          ->> 'status',
          ''
        ),
        'active'
      ) not in (
        'completed',
        'archived'
      )
  )
  and not exists (
    select 1
    from public.savings_contributions sc
    where
      sc.user_id = p_user_id
      and sc.contribution_date between
        v_today - 6
        and v_today
  ) then
    v_week_key :=
      to_char(
        v_today,
        'IYYY-IW'
      );

    v_id :=
      public.schedule_notification_if_enabled(
        p_user_id,
        'savings_reminder',
        'savings',
        null,
        'Savings check-in',
        'You have an active savings goal. Review your progress when it is convenient.',
        null,
        v_today,
        v_preferences.reminder_time_local,
        'savings-week:'
          || v_week_key
      );

    if v_id is not null then
      v_count :=
        v_count + 1;
    end if;
  end if;


  -- Budget warnings. The query adapts to the existing budget JSON shape and
  -- compares trusted transaction sums using minor units.
  for v_row in
    with budget_rows as (
      select
        b.id,
        to_jsonb(b) as row_json
      from public.budgets b
      where b.user_id = p_user_id
    ),

    normalized as (
      select
        br.id,

        coalesce(
          nullif(
            br.row_json
            ->> 'currency_code',
            ''
          ),
          nullif(
            br.row_json
            ->> 'currency',
            ''
          ),
          'UNKNOWN'
        ) as currency_code,

        nullif(
          coalesce(
            br.row_json
            ->> 'limit_minor',
            br.row_json
            ->> 'amount_minor'
          ),
          ''
        )::bigint as limit_minor,

        nullif(
          coalesce(
            br.row_json
            ->> 'period_start',
            br.row_json
            ->> 'start_date'
          ),
          ''
        )::date as period_start,

        nullif(
          coalesce(
            br.row_json
            ->> 'period_end',
            br.row_json
            ->> 'end_date'
          ),
          ''
        )::date as period_end,

        nullif(
          br.row_json
          ->> 'category_id',
          ''
        ) as category_id,

        br.row_json

      from budget_rows br

      where coalesce(
        br.row_json
        ->> 'deleted_at',
        ''
      ) = ''
    )

    select
      n.id,
      n.limit_minor,

      coalesce(
        (
          select sum(
            coalesce(
              nullif(
                to_jsonb(t)
                ->> 'amount_minor',
                ''
              ),
              '0'
            )::bigint
          )
          from public.transactions t
          where
            t.user_id = p_user_id
            and t.deleted_at is null
            and t.type = 'expense'
            and t.transaction_date between
              n.period_start
              and least(
                n.period_end,
                v_today
              )
            and coalesce(
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
            ) = n.currency_code
            and (
              n.category_id is null
              or (
                to_jsonb(t)
                ->> 'category_id'
              ) = n.category_id
            )
        ),
        0
      )::bigint as spent_minor

    from normalized n

    where
      n.limit_minor is not null
      and n.limit_minor > 0
      and n.period_start is not null
      and n.period_end is not null
      and v_today between
        n.period_start
        and n.period_end
  loop
    if (
      v_row.spent_minor
      * 10000
    )
    >= (
      v_row.limit_minor
      * v_preferences.budget_warning_threshold_basis_points
    ) then
      v_id :=
        public.schedule_notification_if_enabled(
          p_user_id,
          'budget_warning',
          'budget',
          v_row.id,
          'Budget check-in',
          'One of your budgets is near or above its warning threshold.',
          null,
          v_today,
          v_preferences.reminder_time_local,
          'budget-warning:'
            || v_row.id::text
            || ':'
            || v_today::text
        );

      if v_id is not null then
        v_count :=
          v_count + 1;
      end if;
    end if;
  end loop;


  -- Bill reminders are generated only if recurring_transactions exists.
  -- The dynamic query adapts to common next-date field names without forcing
  -- a specific recurring-transaction schema on this migration.
  if to_regclass(
    'public.recurring_transactions'
  ) is not null then
    for v_row in
      execute $query$
        select
          r.id,
          to_jsonb(r) as row_json
        from public.recurring_transactions r
        where r.user_id = $1
      $query$
      using p_user_id
    loop
      v_row_json :=
        v_row.row_json;


      v_status :=
        coalesce(
          nullif(
            v_row_json
            ->> 'status',
            ''
          ),
          case
            when coalesce(
              v_row_json
              ->> 'active',
              'true'
            ) = 'false'
              then 'inactive'
            else 'active'
          end
        );


      v_due_text :=
        coalesce(
          nullif(
            v_row_json
            ->> 'next_occurrence_date',
            ''
          ),
          nullif(
            v_row_json
            ->> 'next_date',
            ''
          ),
          nullif(
            v_row_json
            ->> 'due_date',
            ''
          )
        );


      if v_status in (
        'active',
        'enabled'
      )
      and v_due_text is not null
      and v_due_text ~ '^\d{4}-\d{2}-\d{2}$' then
        v_due_date :=
          v_due_text::date;


        if v_due_date between
          v_today
          and least(
            v_horizon,
            v_today + 7
          ) then
          v_id :=
            public.schedule_notification_if_enabled(
              p_user_id,
              'bill_reminder',
              'recurring_transaction',
              v_row.id,
              'Upcoming bill reminder',
              'A recurring payment is coming up. Open Finance Coach to review it.',
              null,
              greatest(
                v_today,
                v_due_date - 1
              ),
              v_preferences.reminder_time_local,
              'bill:'
                || v_row.id::text
                || ':'
                || v_due_date::text
            );

          if v_id is not null then
            v_count :=
              v_count + 1;
          end if;
        end if;
      end if;
    end loop;
  end if;


  -- Optional weekly motivational message. It is disabled by default.
  v_next_monday :=
    (
      date_trunc(
        'week',
        v_today::timestamp
      )::date
      + 7
    );


  if v_next_monday <= v_horizon then
    v_id :=
      public.schedule_notification_if_enabled(
        p_user_id,
        'motivational_message',
        'system',
        null,
        'Your weekly money check-in',
        'A few minutes reviewing your finances can help keep your plans current.',
        '/home',
        v_next_monday,
        v_preferences.reminder_time_local,
        'motivation-week:'
          || to_char(
            v_next_monday,
            'IYYY-IW'
          )
      );

    if v_id is not null then
      v_count :=
        v_count + 1;
    end if;
  end if;


  return v_count;
end;
$$;


revoke all on function public.refresh_notification_schedule_for_user(
  uuid,
  text,
  integer
)
from public;


-- -------------------------------------------------------------------------
-- Authenticated wrapper.
-- -------------------------------------------------------------------------

create or replace function public.refresh_my_notification_schedule(
  p_timezone text default 'UTC',
  p_horizon_days integer default 14
)
returns integer
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


  return public.refresh_notification_schedule_for_user(
    v_user_id,
    p_timezone,
    p_horizon_days
  );
end;
$$;


revoke all on function public.refresh_my_notification_schedule(
  text,
  integer
)
from public;

grant execute on function public.refresh_my_notification_schedule(
  text,
  integer
)
to authenticated;


-- -------------------------------------------------------------------------
-- Service-role scheduler used by the dispatch worker / Supabase Cron.
-- -------------------------------------------------------------------------

create or replace function public.refresh_all_notification_schedules(
  p_horizon_days integer default 14
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_count integer := 0;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501';
  end if;


  for v_row in
    select
      u.id,

      coalesce(
        p.timezone,
        'UTC'
      ) as timezone

    from auth.users u

    left join public.notification_preferences p
      on p.user_id = u.id
  loop
    v_count :=
      v_count
      +
      public.refresh_notification_schedule_for_user(
        v_row.id,
        v_row.timezone,
        p_horizon_days
      );
  end loop;


  return v_count;
end;
$$;


revoke all on function public.refresh_all_notification_schedules(integer)
  from public;

grant execute on function public.refresh_all_notification_schedules(integer)
  to service_role;


-- -------------------------------------------------------------------------
-- Notification center read model
-- -------------------------------------------------------------------------

create or replace function public.get_notification_center(
  p_limit integer default 50
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
          50
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

          'notification_type',
          rows.notification_type,

          'title',
          rows.title,

          'body',
          rows.body,

          'deep_link',
          rows.deep_link,

          'scheduled_for',
          rows.scheduled_for,

          'status',
          rows.status,

          'sent_at',
          rows.sent_at,

          'opened',
          rows.opened
        )
        order by
          rows.scheduled_for desc
      ),
      '[]'::jsonb
    )

    from (
      select
        sn.id,
        sn.notification_type,
        sn.title,
        sn.body,
        sn.deep_link,
        sn.scheduled_for,
        sn.status,
        sn.sent_at,

        exists (
          select 1
          from public.notification_events ne
          where
            ne.scheduled_notification_id = sn.id
            and ne.user_id = v_user_id
            and ne.event_type = 'opened'
        ) as opened

      from public.scheduled_notifications sn

      where
        sn.user_id = v_user_id
        and sn.status in (
          'pending',
          'sent',
          'failed'
        )

      order by
        sn.scheduled_for desc

      limit v_limit
    ) rows
  );
end;
$$;


revoke all on function public.get_notification_center(integer)
  from public;

grant execute on function public.get_notification_center(integer)
  to authenticated;


create or replace function public.mark_notification_opened(
  p_notification_id uuid
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


  if not exists (
    select 1
    from public.scheduled_notifications sn
    where
      sn.id = p_notification_id
      and sn.user_id = v_user_id
  ) then
    raise exception 'Notification not found'
      using errcode = '42501';
  end if;


  insert into public.notification_events (
    user_id,
    scheduled_notification_id,
    event_type
  )
  select
    v_user_id,
    p_notification_id,
    'opened'
  where not exists (
    select 1
    from public.notification_events ne
    where
      ne.user_id = v_user_id
      and ne.scheduled_notification_id = p_notification_id
      and ne.event_type = 'opened'
  );


  return p_notification_id;
end;
$$;


revoke all on function public.mark_notification_opened(uuid)
  from public;

grant execute on function public.mark_notification_opened(uuid)
  to authenticated;