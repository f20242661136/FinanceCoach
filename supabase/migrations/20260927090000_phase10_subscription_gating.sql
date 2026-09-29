-- Finance Coach
-- Phase 10: subscription lifecycle visibility + server-side premium gating
--
-- Principles:
-- - RevenueCat CustomerInfo drives immediate client UX.
-- - Webhook-projected subscription_entitlements remains the server trust source.
-- - Only features explicitly marked premium are gated.
-- - Trial/cancellation/expiration status remains visible without granting
--   access after the entitlement is inactive or expired.

begin;


-- -------------------------------------------------------------------------
-- Persist the RevenueCat period type on the projected entitlement
-- -------------------------------------------------------------------------

alter table public.subscription_entitlements
  add column if not exists period_type text null;


create or replace function
private.set_subscription_entitlement_period_type()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_period_type text;
begin
  select swe.period_type
  into v_event_period_type
  from public.subscription_webhook_events swe
  where swe.revenuecat_event_id = new.last_event_id;

  if v_event_period_type is not null then
    new.period_type :=
      v_event_period_type;
  end if;

  return new;
end;
$$;

revoke all on function
private.set_subscription_entitlement_period_type()
from public, anon, authenticated;


drop trigger if exists
subscription_entitlements_set_period_type
on public.subscription_entitlements;

create trigger
subscription_entitlements_set_period_type
before insert or update of last_event_id
on public.subscription_entitlements
for each row
execute function
private.set_subscription_entitlement_period_type();


update public.subscription_entitlements se
set period_type = swe.period_type
from public.subscription_webhook_events swe
where
  swe.revenuecat_event_id = se.last_event_id
  and se.period_type is distinct from swe.period_type;


-- -------------------------------------------------------------------------
-- Internal premium entitlement predicate
-- -------------------------------------------------------------------------

create or replace function
private.has_active_premium_entitlement(
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.subscription_entitlements se
    where
      se.user_id = p_user_id
      and se.entitlement_id = 'premium'
      and se.is_active = true
      and (
        se.current_period_ends_at is null
        or se.current_period_ends_at > now()
      )
  );
$$;

revoke all on function
private.has_active_premium_entitlement(uuid)
from public, anon, authenticated;


-- -------------------------------------------------------------------------
-- Server-only reconciliation for RevenueCat TRANSFER events
-- -------------------------------------------------------------------------

create or replace function
public.reconcile_revenuecat_premium_entitlement(
  p_user_id uuid,
  p_is_active boolean,
  p_product_id text,
  p_store text,
  p_environment text,
  p_period_type text,
  p_expiration_at timestamptz,
  p_will_renew boolean,
  p_source_event_id text,
  p_source_event_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501';
  end if;

  if
    p_user_id is null
    or p_source_event_id is null
    or btrim(p_source_event_id) = ''
    or p_source_event_at is null
  then
    raise exception 'Invalid subscription reconciliation input'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from auth.users u
    where u.id = p_user_id
  ) then
    return false;
  end if;

  if not exists (
    select 1
    from public.subscription_webhook_events swe
    where swe.revenuecat_event_id = p_source_event_id
  ) then
    raise exception 'Source RevenueCat event not found'
      using errcode = '22023';
  end if;

  insert into public.subscription_entitlements (
    user_id,
    entitlement_id,
    is_active,
    product_id,
    store,
    environment,
    period_type,
    current_period_ends_at,
    will_renew,
    last_event_type,
    last_event_id,
    last_event_at
  )
  values (
    p_user_id,
    'premium',
    coalesce(
      p_is_active,
      false
    ),
    nullif(
      btrim(
        coalesce(
          p_product_id,
          ''
        )
      ),
      ''
    ),
    nullif(
      btrim(
        coalesce(
          p_store,
          ''
        )
      ),
      ''
    ),
    nullif(
      btrim(
        coalesce(
          p_environment,
          ''
        )
      ),
      ''
    ),
    nullif(
      btrim(
        coalesce(
          p_period_type,
          ''
        )
      ),
      ''
    ),
    p_expiration_at,
    p_will_renew,
    'TRANSFER_RECONCILIATION',
    p_source_event_id,
    p_source_event_at
  )
  on conflict (
    user_id,
    entitlement_id
  )
  do update
  set
    is_active =
      excluded.is_active,

    product_id =
      coalesce(
        excluded.product_id,
        subscription_entitlements.product_id
      ),

    store =
      coalesce(
        excluded.store,
        subscription_entitlements.store
      ),

    environment =
      coalesce(
        excluded.environment,
        subscription_entitlements.environment
      ),

    period_type =
      coalesce(
        excluded.period_type,
        subscription_entitlements.period_type
      ),

    current_period_ends_at =
      excluded.current_period_ends_at,

    will_renew =
      excluded.will_renew,

    last_event_type =
      excluded.last_event_type,

    last_event_id =
      excluded.last_event_id,

    last_event_at =
      excluded.last_event_at,

    updated_at =
      now()

  where
    excluded.last_event_at
    >= subscription_entitlements.last_event_at;

  return true;
end;
$$;

revoke all on function
public.reconcile_revenuecat_premium_entitlement(
  uuid,
  boolean,
  text,
  text,
  text,
  text,
  timestamptz,
  boolean,
  text,
  timestamptz
)
from public, anon, authenticated;

grant execute on function
public.reconcile_revenuecat_premium_entitlement(
  uuid,
  boolean,
  text,
  text,
  text,
  text,
  timestamptz,
  boolean,
  text,
  timestamptz
)
to service_role;


-- -------------------------------------------------------------------------
-- Premium gate for premium-marked gamification challenges
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


  if
    v_challenge.is_premium
    and not private.has_active_premium_entitlement(
      v_user_id
    )
  then
    raise exception 'Premium subscription required'
      using errcode = '42501';
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
  from public, anon;

grant execute on function public.start_gamification_challenge(uuid, text)
  to authenticated;


-- -------------------------------------------------------------------------
-- Subscription status RPC now exposes trial/period information
-- -------------------------------------------------------------------------

create or replace function
public.get_my_subscription_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  v_user_id uuid;
  v_entitlement
    public.subscription_entitlements%rowtype;
begin
  v_user_id :=
    auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  select se.*
  into v_entitlement
  from public.subscription_entitlements se
  where
    se.user_id = v_user_id
    and se.entitlement_id = 'premium';

  if not found then
    return jsonb_build_object(
      'entitlement_id',
      'premium',
      'has_premium',
      false,
      'product_id',
      null,
      'store',
      null,
      'environment',
      null,
      'period_type',
      null,
      'current_period_ends_at',
      null,
      'will_renew',
      null,
      'last_event_type',
      null,
      'updated_at',
      null
    );
  end if;

  return jsonb_build_object(
    'entitlement_id',
    v_entitlement.entitlement_id,

    'has_premium',
    (
      v_entitlement.is_active
      and (
        v_entitlement.current_period_ends_at is null
        or v_entitlement.current_period_ends_at > now()
      )
    ),

    'product_id',
    v_entitlement.product_id,

    'store',
    v_entitlement.store,

    'environment',
    v_entitlement.environment,

    'period_type',
    v_entitlement.period_type,

    'current_period_ends_at',
    v_entitlement.current_period_ends_at,

    'will_renew',
    v_entitlement.will_renew,

    'last_event_type',
    v_entitlement.last_event_type,

    'updated_at',
    v_entitlement.updated_at
  );
end;
$$;

revoke all on function
public.get_my_subscription_status()
from public, anon;

grant execute on function
public.get_my_subscription_status()
to authenticated, service_role;


commit;
