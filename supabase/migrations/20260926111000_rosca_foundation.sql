-- Finance Coach
-- ROSCA foundation
--
-- ROSCA = rotating savings and credit association.
--
-- Financial safety:
-- - ROSCA records are a separate domain.
-- - Planned contributions, paid contributions and payouts are explicit.
-- - No ROSCA action automatically mutates the normal account ledger.
-- - Money uses BIGINT minor units.
-- - A group's member order is also its payout order.
-- - The group becomes active only when all member slots are filled.

create table if not exists public.rosca_groups (
  id uuid primary key,

  creator_user_id uuid not null
    references auth.users(id)
    on delete cascade,

  name text not null,

  currency_code text not null
    references public.currencies(code),

  contribution_amount_minor bigint not null
    check (contribution_amount_minor > 0),

  contribution_frequency text not null
    check (
      contribution_frequency in (
        'weekly',
        'monthly'
      )
    ),

  cycle_count integer not null
    check (
      cycle_count >= 2
      and cycle_count <= 100
    ),

  start_date date not null,

  join_code text not null unique,

  status text not null default 'forming'
    check (
      status in (
        'forming',
        'active',
        'completed',
        'archived'
      )
    ),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);


create table if not exists public.rosca_members (
  id uuid primary key,

  group_id uuid not null
    references public.rosca_groups(id)
    on delete cascade,

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  display_name text not null,

  member_order integer not null
    check (member_order > 0),

  role text not null default 'member'
    check (
      role in (
        'owner',
        'member'
      )
    ),

  status text not null default 'active'
    check (
      status in (
        'active',
        'left'
      )
    ),

  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create unique index if not exists rosca_members_active_group_user_uidx
  on public.rosca_members (
    group_id,
    user_id
  )
  where status = 'active';


create unique index if not exists rosca_members_active_group_order_uidx
  on public.rosca_members (
    group_id,
    member_order
  )
  where status = 'active';


create index if not exists rosca_members_user_idx
  on public.rosca_members (
    user_id,
    joined_at desc
  )
  where status = 'active';


create table if not exists public.rosca_cycles (
  id uuid primary key default gen_random_uuid(),

  group_id uuid not null
    references public.rosca_groups(id)
    on delete cascade,

  cycle_number integer not null
    check (cycle_number > 0),

  due_date date not null,

  payout_member_id uuid not null
    references public.rosca_members(id),

  status text not null default 'scheduled'
    check (
      status in (
        'scheduled',
        'open',
        'closed'
      )
    ),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (
    group_id,
    cycle_number
  )
);


create index if not exists rosca_cycles_group_due_idx
  on public.rosca_cycles (
    group_id,
    due_date,
    cycle_number
  );


create table if not exists public.rosca_contributions (
  id uuid primary key default gen_random_uuid(),

  group_id uuid not null
    references public.rosca_groups(id)
    on delete cascade,

  cycle_id uuid not null
    references public.rosca_cycles(id)
    on delete cascade,

  member_id uuid not null
    references public.rosca_members(id),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  planned_amount_minor bigint not null
    check (planned_amount_minor > 0),

  paid_amount_minor bigint null
    check (
      paid_amount_minor is null
      or paid_amount_minor > 0
    ),

  status text not null default 'planned'
    check (
      status in (
        'planned',
        'paid',
        'missed'
      )
    ),

  paid_date date null,

  note text null,

  linked_transaction_id uuid null
    references public.transactions(id),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (
    cycle_id,
    member_id
  ),

  check (
    (
      status = 'paid'
      and paid_amount_minor is not null
      and paid_date is not null
    )
    or
    (
      status <> 'paid'
      and paid_amount_minor is null
      and paid_date is null
    )
  )
);


create index if not exists rosca_contributions_group_status_idx
  on public.rosca_contributions (
    group_id,
    status,
    cycle_id
  );


create index if not exists rosca_contributions_user_idx
  on public.rosca_contributions (
    user_id,
    status,
    created_at desc
  );


create table if not exists public.rosca_payouts (
  id uuid primary key default gen_random_uuid(),

  group_id uuid not null
    references public.rosca_groups(id)
    on delete cascade,

  cycle_id uuid not null unique
    references public.rosca_cycles(id)
    on delete cascade,

  recipient_member_id uuid not null
    references public.rosca_members(id),

  planned_amount_minor bigint not null
    check (planned_amount_minor > 0),

  paid_amount_minor bigint null
    check (
      paid_amount_minor is null
      or paid_amount_minor > 0
    ),

  status text not null default 'planned'
    check (
      status in (
        'planned',
        'paid'
      )
    ),

  paid_date date null,

  note text null,

  linked_transaction_id uuid null
    references public.transactions(id),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (
    (
      status = 'paid'
      and paid_amount_minor is not null
      and paid_date is not null
    )
    or
    (
      status = 'planned'
      and paid_amount_minor is null
      and paid_date is null
    )
  )
);


create index if not exists rosca_payouts_group_status_idx
  on public.rosca_payouts (
    group_id,
    status,
    created_at
  );


-- -------------------------------------------------------------------------
-- Security helper functions.
-- They expose only whether the CURRENT authenticated user belongs to/owns a
-- group, avoiding RLS recursion between groups and members.
-- -------------------------------------------------------------------------

create or replace function public.is_rosca_member(
  p_group_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.rosca_members m
    where
      m.group_id = p_group_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  );
$$;


create or replace function public.is_rosca_owner(
  p_group_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.rosca_groups g
    where
      g.id = p_group_id
      and g.creator_user_id = auth.uid()
      and g.deleted_at is null
  );
$$;


revoke all on function public.is_rosca_member(uuid)
  from public;

revoke all on function public.is_rosca_owner(uuid)
  from public;

grant execute on function public.is_rosca_member(uuid)
  to authenticated;

grant execute on function public.is_rosca_owner(uuid)
  to authenticated;


-- -------------------------------------------------------------------------
-- RLS: direct client access is read-only. All mutations go through validated
-- RPC functions below.
-- -------------------------------------------------------------------------

alter table public.rosca_groups
  enable row level security;

alter table public.rosca_members
  enable row level security;

alter table public.rosca_cycles
  enable row level security;

alter table public.rosca_contributions
  enable row level security;

alter table public.rosca_payouts
  enable row level security;


drop policy if exists rosca_groups_select_member
  on public.rosca_groups;

create policy rosca_groups_select_member
  on public.rosca_groups
  for select
  to authenticated
  using (
    public.is_rosca_member(id)
  );


drop policy if exists rosca_members_select_group_member
  on public.rosca_members;

create policy rosca_members_select_group_member
  on public.rosca_members
  for select
  to authenticated
  using (
    public.is_rosca_member(group_id)
  );


drop policy if exists rosca_cycles_select_group_member
  on public.rosca_cycles;

create policy rosca_cycles_select_group_member
  on public.rosca_cycles
  for select
  to authenticated
  using (
    public.is_rosca_member(group_id)
  );


drop policy if exists rosca_contributions_select_group_member
  on public.rosca_contributions;

create policy rosca_contributions_select_group_member
  on public.rosca_contributions
  for select
  to authenticated
  using (
    public.is_rosca_member(group_id)
  );


drop policy if exists rosca_payouts_select_group_member
  on public.rosca_payouts;

create policy rosca_payouts_select_group_member
  on public.rosca_payouts
  for select
  to authenticated
  using (
    public.is_rosca_member(group_id)
  );


revoke all on public.rosca_groups
  from anon;

revoke all on public.rosca_members
  from anon;

revoke all on public.rosca_cycles
  from anon;

revoke all on public.rosca_contributions
  from anon;

revoke all on public.rosca_payouts
  from anon;


grant select
  on public.rosca_groups
  to authenticated;

grant select
  on public.rosca_members
  to authenticated;

grant select
  on public.rosca_cycles
  to authenticated;

grant select
  on public.rosca_contributions
  to authenticated;

grant select
  on public.rosca_payouts
  to authenticated;


-- -------------------------------------------------------------------------
-- Date helper with end-of-month clamping.
-- Example: Jan 31 monthly cycles become Feb 28/29, Mar 31, Apr 30...
-- -------------------------------------------------------------------------

create or replace function public.rosca_cycle_date(
  p_start_date date,
  p_frequency text,
  p_offset integer
)
returns date
language plpgsql
immutable
set search_path = public
as $$
declare
  v_target_month date;
  v_last_day date;
  v_day integer;
begin
  if p_offset < 0 then
    raise exception 'Cycle offset cannot be negative'
      using errcode = '22023';
  end if;


  if p_frequency = 'weekly' then
    return
      p_start_date
      + (p_offset * 7);
  end if;


  if p_frequency <> 'monthly' then
    raise exception 'Unsupported ROSCA frequency'
      using errcode = '22023';
  end if;


  v_target_month :=
    (
      date_trunc(
        'month',
        p_start_date
      )
      + make_interval(
          months => p_offset
        )
    )::date;


  v_last_day :=
    (
      v_target_month
      + interval '1 month'
      - interval '1 day'
    )::date;


  v_day :=
    least(
      extract(
        day
        from p_start_date
      )::integer,
      extract(
        day
        from v_last_day
      )::integer
    );


  return
    v_target_month
    + (v_day - 1);
end;
$$;


revoke all on function public.rosca_cycle_date(
  date,
  text,
  integer
)
from public;


-- -------------------------------------------------------------------------
-- Create group + creator membership.
-- Returns { group_id, join_code }.
-- -------------------------------------------------------------------------

create or replace function public.create_rosca_group(
  p_group_id uuid,
  p_member_id uuid,
  p_name text,
  p_currency_code text,
  p_contribution_amount_minor text,
  p_contribution_frequency text,
  p_cycle_count integer,
  p_start_date date,
  p_creator_display_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_amount_minor bigint;
  v_join_code text;
  v_existing public.rosca_groups%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;


  if p_group_id is null
     or p_member_id is null then
    raise exception 'Group and member IDs are required'
      using errcode = '22023';
  end if;


  if nullif(
    btrim(
      p_name
    ),
    ''
  ) is null then
    raise exception 'Group name is required'
      using errcode = '22023';
  end if;


  if nullif(
    btrim(
      p_creator_display_name
    ),
    ''
  ) is null then
    raise exception 'Display name is required'
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


  begin
    v_amount_minor :=
      p_contribution_amount_minor::bigint;
  exception
    when others then
      raise exception 'Contribution amount must be an integer minor-unit string'
        using errcode = '22023';
  end;


  if v_amount_minor <= 0 then
    raise exception 'Contribution amount must be greater than zero'
      using errcode = '22023';
  end if;


  if p_contribution_frequency not in (
    'weekly',
    'monthly'
  ) then
    raise exception 'Contribution frequency must be weekly or monthly'
      using errcode = '22023';
  end if;


  if p_cycle_count < 2
     or p_cycle_count > 100 then
    raise exception 'Cycle count must be between 2 and 100'
      using errcode = '22023';
  end if;


  if p_start_date is null then
    raise exception 'Start date is required'
      using errcode = '22023';
  end if;


  select *
  into v_existing
  from public.rosca_groups g
  where g.id = p_group_id;


  if found then
    if v_existing.creator_user_id <> v_user_id then
      raise exception 'Group ID is already in use'
        using errcode = '42501';
    end if;


    if v_existing.name <> btrim(p_name)
       or v_existing.currency_code <> p_currency_code
       or v_existing.contribution_amount_minor <> v_amount_minor
       or v_existing.contribution_frequency <> p_contribution_frequency
       or v_existing.cycle_count <> p_cycle_count
       or v_existing.start_date <> p_start_date
       or v_existing.deleted_at is not null then
      raise exception 'Group ID was already used with different data'
        using errcode = '23505';
    end if;


    return jsonb_build_object(
      'group_id',
      v_existing.id,

      'join_code',
      v_existing.join_code
    );
  end if;


  loop
    v_join_code :=
      upper(
        substr(
          replace(
            gen_random_uuid()::text,
            '-',
            ''
          ),
          1,
          10
        )
      );

    exit when not exists (
      select 1
      from public.rosca_groups g
      where g.join_code = v_join_code
    );
  end loop;


  insert into public.rosca_groups (
    id,
    creator_user_id,
    name,
    currency_code,
    contribution_amount_minor,
    contribution_frequency,
    cycle_count,
    start_date,
    join_code,
    status
  )
  values (
    p_group_id,
    v_user_id,
    btrim(
      p_name
    ),
    p_currency_code,
    v_amount_minor,
    p_contribution_frequency,
    p_cycle_count,
    p_start_date,
    v_join_code,
    'forming'
  );


  insert into public.rosca_members (
    id,
    group_id,
    user_id,
    display_name,
    member_order,
    role,
    status
  )
  values (
    p_member_id,
    p_group_id,
    v_user_id,
    btrim(
      p_creator_display_name
    ),
    1,
    'owner',
    'active'
  );


  return jsonb_build_object(
    'group_id',
    p_group_id,

    'join_code',
    v_join_code
  );
end;
$$;


revoke all on function public.create_rosca_group(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  integer,
  date,
  text
)
from public;

grant execute on function public.create_rosca_group(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  integer,
  date,
  text
)
to authenticated;


-- -------------------------------------------------------------------------
-- Join via code.
-- Member order is the payout order.
-- When the final slot is filled the complete cycle/contribution/payout plan
-- is materialized atomically.
-- -------------------------------------------------------------------------

create or replace function public.join_rosca_group(
  p_member_id uuid,
  p_join_code text,
  p_display_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_group public.rosca_groups%rowtype;
  v_existing public.rosca_members%rowtype;
  v_member_count integer;
  v_member_order integer;
  v_cycle_number integer;
  v_cycle_id uuid;
  v_recipient_member_id uuid;
  v_member record;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;


  if p_member_id is null then
    raise exception 'Member ID is required'
      using errcode = '22023';
  end if;


  if nullif(
    btrim(
      p_join_code
    ),
    ''
  ) is null then
    raise exception 'Join code is required'
      using errcode = '22023';
  end if;


  if nullif(
    btrim(
      p_display_name
    ),
    ''
  ) is null then
    raise exception 'Display name is required'
      using errcode = '22023';
  end if;


  select *
  into v_group
  from public.rosca_groups g
  where
    g.join_code = upper(
      btrim(
        p_join_code
      )
    )
    and g.deleted_at is null
  for update;


  if not found then
    raise exception 'ROSCA group not found'
      using errcode = '22023';
  end if;


  select *
  into v_existing
  from public.rosca_members m
  where
    m.group_id = v_group.id
    and m.user_id = v_user_id
    and m.status = 'active';


  if found then
    if v_existing.id <> p_member_id
       or v_existing.display_name <> btrim(p_display_name) then
      raise exception 'Membership already exists with different data'
        using errcode = '23505';
    end if;


    return v_existing.id;
  end if;


  if v_group.status <> 'forming' then
    raise exception 'ROSCA group is no longer accepting members'
      using errcode = '22023';
  end if;


  select count(*)::integer
  into v_member_count
  from public.rosca_members m
  where
    m.group_id = v_group.id
    and m.status = 'active';


  if v_member_count >= v_group.cycle_count then
    raise exception 'ROSCA group is full'
      using errcode = '22023';
  end if;


  v_member_order :=
    v_member_count
    + 1;


  insert into public.rosca_members (
    id,
    group_id,
    user_id,
    display_name,
    member_order,
    role,
    status
  )
  values (
    p_member_id,
    v_group.id,
    v_user_id,
    btrim(
      p_display_name
    ),
    v_member_order,
    'member',
    'active'
  );


  v_member_count :=
    v_member_count
    + 1;


  if v_member_count = v_group.cycle_count then
    for v_cycle_number in
      1..v_group.cycle_count
    loop
      select m.id
      into v_recipient_member_id
      from public.rosca_members m
      where
        m.group_id = v_group.id
        and m.status = 'active'
        and m.member_order = v_cycle_number;


      if v_recipient_member_id is null then
        raise exception 'ROSCA payout order is incomplete'
          using errcode = 'P0001';
      end if;


      v_cycle_id :=
        gen_random_uuid();


      insert into public.rosca_cycles (
        id,
        group_id,
        cycle_number,
        due_date,
        payout_member_id,
        status
      )
      values (
        v_cycle_id,
        v_group.id,
        v_cycle_number,
        public.rosca_cycle_date(
          v_group.start_date,
          v_group.contribution_frequency,
          v_cycle_number - 1
        ),
        v_recipient_member_id,
        'scheduled'
      );


      for v_member in
        select
          m.id,
          m.user_id
        from public.rosca_members m
        where
          m.group_id = v_group.id
          and m.status = 'active'
        order by
          m.member_order
      loop
        insert into public.rosca_contributions (
          group_id,
          cycle_id,
          member_id,
          user_id,
          planned_amount_minor,
          status
        )
        values (
          v_group.id,
          v_cycle_id,
          v_member.id,
          v_member.user_id,
          v_group.contribution_amount_minor,
          'planned'
        );
      end loop;


      insert into public.rosca_payouts (
        group_id,
        cycle_id,
        recipient_member_id,
        planned_amount_minor,
        status
      )
      values (
        v_group.id,
        v_cycle_id,
        v_recipient_member_id,
        v_group.contribution_amount_minor
          * v_group.cycle_count,
        'planned'
      );
    end loop;


    update public.rosca_groups
    set
      status = 'active',
      updated_at = now()
    where id = v_group.id;
  end if;


  return p_member_id;
end;
$$;


revoke all on function public.join_rosca_group(
  uuid,
  text,
  text
)
from public;

grant execute on function public.join_rosca_group(
  uuid,
  text,
  text
)
to authenticated;


-- -------------------------------------------------------------------------
-- Mark contribution paid.
-- A member may mark their own payment.
-- The owner may also record a member's payment.
-- This does NOT create a normal transaction.
-- -------------------------------------------------------------------------

create or replace function public.mark_rosca_contribution_paid(
  p_contribution_id uuid,
  p_paid_date date default current_date,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_contribution public.rosca_contributions%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;


  if p_paid_date is null then
    raise exception 'Paid date is required'
      using errcode = '22023';
  end if;


  select *
  into v_contribution
  from public.rosca_contributions c
  where c.id = p_contribution_id
  for update;


  if not found then
    raise exception 'ROSCA contribution not found'
      using errcode = '22023';
  end if;


  if v_contribution.user_id <> v_user_id
     and not public.is_rosca_owner(
       v_contribution.group_id
     ) then
    raise exception 'Not authorized to record this contribution'
      using errcode = '42501';
  end if;


  if v_contribution.status = 'paid' then
    return p_contribution_id;
  end if;


  update public.rosca_contributions
  set
    status = 'paid',
    paid_amount_minor = planned_amount_minor,
    paid_date = p_paid_date,
    note = nullif(
      btrim(
        p_note
      ),
      ''
    ),
    updated_at = now()
  where id = p_contribution_id;


  return p_contribution_id;
end;
$$;


revoke all on function public.mark_rosca_contribution_paid(
  uuid,
  date,
  text
)
from public;

grant execute on function public.mark_rosca_contribution_paid(
  uuid,
  date,
  text
)
to authenticated;


-- -------------------------------------------------------------------------
-- Mark payout paid. Only the group owner may record the payout.
-- This does NOT create a normal account transaction.
-- -------------------------------------------------------------------------

create or replace function public.mark_rosca_payout_paid(
  p_payout_id uuid,
  p_paid_date date default current_date,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_payout public.rosca_payouts%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;


  if p_paid_date is null then
    raise exception 'Paid date is required'
      using errcode = '22023';
  end if;


  select *
  into v_payout
  from public.rosca_payouts p
  where p.id = p_payout_id
  for update;


  if not found then
    raise exception 'ROSCA payout not found'
      using errcode = '22023';
  end if;


  if not public.is_rosca_owner(
    v_payout.group_id
  ) then
    raise exception 'Only the group owner can record payouts'
      using errcode = '42501';
  end if;


  if v_payout.status = 'paid' then
    return p_payout_id;
  end if;


  update public.rosca_payouts
  set
    status = 'paid',
    paid_amount_minor = planned_amount_minor,
    paid_date = p_paid_date,
    note = nullif(
      btrim(
        p_note
      ),
      ''
    ),
    updated_at = now()
  where id = p_payout_id;


  return p_payout_id;
end;
$$;


revoke all on function public.mark_rosca_payout_paid(
  uuid,
  date,
  text
)
from public;

grant execute on function public.mark_rosca_payout_paid(
  uuid,
  date,
  text
)
to authenticated;


-- -------------------------------------------------------------------------
-- User's ROSCA group list.
-- -------------------------------------------------------------------------

create or replace function public.get_rosca_groups()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;


  return (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id',
          rows.id,

          'name',
          rows.name,

          'currency_code',
          rows.currency_code,

          'contribution_amount_minor',
          rows.contribution_amount_minor::text,

          'contribution_frequency',
          rows.contribution_frequency,

          'cycle_count',
          rows.cycle_count,

          'start_date',
          rows.start_date,

          'join_code',
          rows.join_code,

          'status',
          rows.status,

          'member_count',
          rows.member_count::text,

          'my_member_order',
          rows.my_member_order,

          'my_role',
          rows.my_role,

          'next_due_date',
          rows.next_due_date
        )
        order by
          case rows.status
            when 'active' then 0
            when 'forming' then 1
            when 'completed' then 2
            else 3
          end,
          rows.next_due_date asc nulls last,
          rows.name asc
      ),
      '[]'::jsonb
    )

    from (
      select
        g.id,
        g.name,
        g.currency_code,
        g.contribution_amount_minor,
        g.contribution_frequency,
        g.cycle_count,
        g.start_date,
        g.join_code,
        g.status,

        (
          select count(*)::bigint
          from public.rosca_members m2
          where
            m2.group_id = g.id
            and m2.status = 'active'
        ) as member_count,

        m.member_order as my_member_order,

        m.role as my_role,

        (
          select min(c.due_date)
          from public.rosca_cycles c
          where
            c.group_id = g.id
            and c.status <> 'closed'
        ) as next_due_date

      from public.rosca_groups g

      join public.rosca_members m
        on m.group_id = g.id
        and m.user_id = v_user_id
        and m.status = 'active'

      where
        g.deleted_at is null
        and g.status <> 'archived'
    ) rows
  );
end;
$$;


revoke all on function public.get_rosca_groups()
  from public;

grant execute on function public.get_rosca_groups()
  to authenticated;


-- -------------------------------------------------------------------------
-- Detailed group view with members, cycles, contribution states and payouts.
-- -------------------------------------------------------------------------

create or replace function public.get_rosca_group_detail(
  p_group_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;


  if not public.is_rosca_member(
    p_group_id
  ) then
    raise exception 'ROSCA group not found'
      using errcode = '42501';
  end if;


  return (
    select jsonb_build_object(
      'id',
      g.id,

      'name',
      g.name,

      'currency_code',
      g.currency_code,

      'contribution_amount_minor',
      g.contribution_amount_minor::text,

      'contribution_frequency',
      g.contribution_frequency,

      'cycle_count',
      g.cycle_count,

      'start_date',
      g.start_date,

      'join_code',
      g.join_code,

      'status',
      g.status,

      'members',
      (
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'id',
              m.id,

              'user_id',
              m.user_id,

              'display_name',
              m.display_name,

              'member_order',
              m.member_order,

              'role',
              m.role,

              'is_me',
              m.user_id = v_user_id
            )
            order by
              m.member_order
          ),
          '[]'::jsonb
        )

        from public.rosca_members m

        where
          m.group_id = g.id
          and m.status = 'active'
      ),

      'cycles',
      (
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'id',
              c.id,

              'cycle_number',
              c.cycle_number,

              'due_date',
              c.due_date,

              'status',
              c.status,

              'payout_member_id',
              c.payout_member_id,

              'contributions',
              (
                select coalesce(
                  jsonb_agg(
                    jsonb_build_object(
                      'id',
                      rc.id,

                      'member_id',
                      rc.member_id,

                      'user_id',
                      rc.user_id,

                      'display_name',
                      rm.display_name,

                      'planned_amount_minor',
                      rc.planned_amount_minor::text,

                      'paid_amount_minor',
                      case
                        when rc.paid_amount_minor is null
                          then null
                        else rc.paid_amount_minor::text
                      end,

                      'status',
                      rc.status,

                      'paid_date',
                      rc.paid_date,

                      'is_mine',
                      rc.user_id = v_user_id
                    )
                    order by
                      rm.member_order
                  ),
                  '[]'::jsonb
                )

                from public.rosca_contributions rc

                join public.rosca_members rm
                  on rm.id = rc.member_id

                where rc.cycle_id = c.id
              ),

              'payout',
              (
                select jsonb_build_object(
                  'id',
                  rp.id,

                  'recipient_member_id',
                  rp.recipient_member_id,

                  'recipient_display_name',
                  recipient.display_name,

                  'planned_amount_minor',
                  rp.planned_amount_minor::text,

                  'paid_amount_minor',
                  case
                    when rp.paid_amount_minor is null
                      then null
                    else rp.paid_amount_minor::text
                  end,

                  'status',
                  rp.status,

                  'paid_date',
                  rp.paid_date
                )

                from public.rosca_payouts rp

                join public.rosca_members recipient
                  on recipient.id = rp.recipient_member_id

                where rp.cycle_id = c.id
              )
            )
            order by
              c.cycle_number
          ),
          '[]'::jsonb
        )

        from public.rosca_cycles c

        where c.group_id = g.id
      )
    )

    from public.rosca_groups g

    where
      g.id = p_group_id
      and g.deleted_at is null
  );
end;
$$;


revoke all on function public.get_rosca_group_detail(uuid)
  from public;

grant execute on function public.get_rosca_group_detail(uuid)
  to authenticated;