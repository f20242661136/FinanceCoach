-- Finance Coach
-- Subscription entitlement foundation
--
-- Architecture:
-- - RevenueCat webhooks are authenticated in the Edge Function.
-- - RevenueCat event.id is the durable idempotency key.
-- - Raw webhook payloads are server-only audit data.
-- - Entitlements are projected server-side from ordered webhook events.
-- - CANCELLATION and BILLING_ISSUE do not immediately revoke access.
-- - EXPIRATION revokes access.
-- - Client roles cannot directly mutate subscription state.
-- - Existing financial records and accounting RPCs are not gated here.

begin;

create table if not exists public.subscription_webhook_events (
  revenuecat_event_id text primary key
    check (
      char_length(revenuecat_event_id)
      between 1 and 200
    ),

  event_type text not null
    check (
      char_length(event_type)
      between 1 and 80
    ),

  app_user_id text null,

  user_id uuid null
    references auth.users(id)
    on delete set null,

  entitlement_ids text[] not null
    default '{}'::text[],

  product_id text null,
  store text null,
  environment text null,

  transaction_id text null,
  original_transaction_id text null,

  period_type text null,
  cancel_reason text null,
  expiration_reason text null,

  event_timestamp timestamptz not null,
  purchased_at timestamptz null,
  expiration_at timestamptz null,

  payload jsonb not null,

  received_at timestamptz not null
    default now()
);


create index if not exists
subscription_webhook_events_user_event_idx
  on public.subscription_webhook_events (
    user_id,
    event_timestamp desc
  );


create index if not exists
subscription_webhook_events_type_event_idx
  on public.subscription_webhook_events (
    event_type,
    event_timestamp desc
  );


create table if not exists public.subscription_entitlements (
  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  entitlement_id text not null
    check (
      char_length(entitlement_id)
      between 1 and 120
    ),

  is_active boolean not null
    default false,

  product_id text null,
  store text null,
  environment text null,

  current_period_ends_at timestamptz null,

  will_renew boolean null,

  last_event_type text not null,
  last_event_id text not null
    references public.subscription_webhook_events(
      revenuecat_event_id
    )
    on delete restrict,

  last_event_at timestamptz not null,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  primary key (
    user_id,
    entitlement_id
  )
);


create index if not exists
subscription_entitlements_active_idx
  on public.subscription_entitlements (
    entitlement_id,
    is_active,
    current_period_ends_at
  );


alter table public.subscription_webhook_events
  enable row level security;

alter table public.subscription_entitlements
  enable row level security;


revoke all
on table
  public.subscription_webhook_events,
  public.subscription_entitlements
from public;

revoke all
on table
  public.subscription_webhook_events,
  public.subscription_entitlements
from anon;

revoke all
on table
  public.subscription_webhook_events,
  public.subscription_entitlements
from authenticated;


grant
  select,
  insert,
  update,
  delete
on table
  public.subscription_webhook_events,
  public.subscription_entitlements
to service_role;


create or replace function
public.process_revenuecat_webhook_event(
  p_revenuecat_event_id text,
  p_event_type text,
  p_app_user_id text,
  p_user_id uuid,
  p_entitlement_ids text[],
  p_product_id text,
  p_store text,
  p_environment text,
  p_transaction_id text,
  p_original_transaction_id text,
  p_period_type text,
  p_cancel_reason text,
  p_expiration_reason text,
  p_event_timestamp timestamptz,
  p_purchased_at timestamptz,
  p_expiration_at timestamptz,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_user_id uuid;
  v_inserted integer;
  v_entitlement_updated integer;
  v_has_premium boolean;
  v_event_active boolean;
  v_initial_active boolean;
  v_will_renew boolean;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501';
  end if;

  if
    p_revenuecat_event_id is null
    or btrim(p_revenuecat_event_id) = ''
    or p_event_type is null
    or btrim(p_event_type) = ''
    or p_event_timestamp is null
    or p_payload is null
  then
    raise exception
      'Invalid RevenueCat webhook event'
      using errcode = '22023';
  end if;

  v_user_id :=
    case
      when
        p_user_id is not null
        and exists (
          select 1
          from auth.users u
          where u.id = p_user_id
        )
      then p_user_id
      else null
    end;

  insert into public.subscription_webhook_events (
    revenuecat_event_id,
    event_type,
    app_user_id,
    user_id,
    entitlement_ids,
    product_id,
    store,
    environment,
    transaction_id,
    original_transaction_id,
    period_type,
    cancel_reason,
    expiration_reason,
    event_timestamp,
    purchased_at,
    expiration_at,
    payload
  )
  values (
    p_revenuecat_event_id,
    p_event_type,
    nullif(
      btrim(
        coalesce(
          p_app_user_id,
          ''
        )
      ),
      ''
    ),
    v_user_id,
    coalesce(
      p_entitlement_ids,
      '{}'::text[]
    ),
    p_product_id,
    p_store,
    p_environment,
    p_transaction_id,
    p_original_transaction_id,
    p_period_type,
    p_cancel_reason,
    p_expiration_reason,
    p_event_timestamp,
    p_purchased_at,
    p_expiration_at,
    p_payload
  )
  on conflict (
    revenuecat_event_id
  )
  do nothing;

  get diagnostics
    v_inserted = row_count;

  if v_inserted = 0 then
    return jsonb_build_object(
      'duplicate',
      true,
      'entitlement_updated',
      false,
      'requires_reconciliation',
      false
    );
  end if;

  if p_event_type = 'TRANSFER' then
    return jsonb_build_object(
      'duplicate',
      false,
      'entitlement_updated',
      false,
      'requires_reconciliation',
      true
    );
  end if;

  v_has_premium :=
    'premium' = any(
      coalesce(
        p_entitlement_ids,
        '{}'::text[]
      )
    );

  if
    v_user_id is null
    or not v_has_premium
  then
    return jsonb_build_object(
      'duplicate',
      false,
      'entitlement_updated',
      false,
      'requires_reconciliation',
      false
    );
  end if;

  v_event_active :=
    case
      when p_event_type in (
        'INITIAL_PURCHASE',
        'RENEWAL',
        'UNCANCELLATION',
        'NON_RENEWING_PURCHASE',
        'SUBSCRIPTION_EXTENDED',
        'TEMPORARY_ENTITLEMENT_GRANT'
      )
        then true

      when p_event_type = 'EXPIRATION'
        then false

      else null
    end;

  v_will_renew :=
    case
      when p_event_type in (
        'CANCELLATION',
        'SUBSCRIPTION_PAUSED',
        'NON_RENEWING_PURCHASE',
        'EXPIRATION'
      )
        then false

      when p_event_type in (
        'INITIAL_PURCHASE',
        'RENEWAL',
        'UNCANCELLATION'
      )
        then true

      else null
    end;

  v_initial_active :=
    coalesce(
      v_event_active,

      case
        when p_expiration_at is null
          then false

        else
          p_expiration_at
          > now()
      end
    );

  insert into public.subscription_entitlements (
    user_id,
    entitlement_id,
    is_active,
    product_id,
    store,
    environment,
    current_period_ends_at,
    will_renew,
    last_event_type,
    last_event_id,
    last_event_at
  )
  values (
    v_user_id,
    'premium',
    v_initial_active,
    p_product_id,
    p_store,
    p_environment,
    p_expiration_at,
    v_will_renew,
    p_event_type,
    p_revenuecat_event_id,
    p_event_timestamp
  )
  on conflict (
    user_id,
    entitlement_id
  )
  do update
  set
    is_active =
      coalesce(
        v_event_active,
        subscription_entitlements.is_active
      ),

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

    current_period_ends_at =
      coalesce(
        excluded.current_period_ends_at,
        subscription_entitlements.current_period_ends_at
      ),

    will_renew =
      coalesce(
        v_will_renew,
        subscription_entitlements.will_renew
      ),

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

  get diagnostics
    v_entitlement_updated = row_count;

  return jsonb_build_object(
    'duplicate',
    false,
    'entitlement_updated',
    v_entitlement_updated > 0,
    'requires_reconciliation',
    false
  );
end;
$$;


revoke all on function
public.process_revenuecat_webhook_event(
  text,
  text,
  text,
  uuid,
  text[],
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  timestamptz,
  jsonb
)
from public;

revoke all on function
public.process_revenuecat_webhook_event(
  text,
  text,
  text,
  uuid,
  text[],
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  timestamptz,
  jsonb
)
from anon;

revoke all on function
public.process_revenuecat_webhook_event(
  text,
  text,
  text,
  uuid,
  text[],
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  timestamptz,
  jsonb
)
from authenticated;

grant execute on function
public.process_revenuecat_webhook_event(
  text,
  text,
  text,
  uuid,
  text[],
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  timestamptz,
  jsonb
)
to service_role;


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
from public;

revoke all on function
public.get_my_subscription_status()
from anon;

grant execute on function
public.get_my_subscription_status()
to authenticated;

grant execute on function
public.get_my_subscription_status()
to service_role;

commit;
