-- Finance Coach
-- Notification delivery hardening

alter table public.notification_events
  add column if not exists receipt_checked_at timestamptz null;


create index if not exists notification_events_receipt_pending_idx
  on public.notification_events (
    created_at
  )
  where
    provider = 'expo'
    and provider_receipt_id is not null
    and receipt_checked_at is null;


-- Service-only claim helper prevents two dispatch workers from claiming the
-- same notification concurrently.

create or replace function public.claim_due_notifications(
  p_limit integer default 50
)
returns setof public.scheduled_notifications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required'
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


  return query
  with candidates as (
    select sn.id
    from public.scheduled_notifications sn
    where
      sn.status = 'pending'
      and sn.scheduled_for <= now()
    order by
      sn.scheduled_for asc
    for update skip locked
    limit v_limit
  )

  update public.scheduled_notifications sn
  set
    status = 'processing',
    attempt_count =
      sn.attempt_count + 1,
    updated_at = now()
  from candidates c
  where sn.id = c.id
  returning sn.*;
end;
$$;


revoke all on function public.claim_due_notifications(integer)
  from public;

grant execute on function public.claim_due_notifications(integer)
  to service_role;


create or replace function public.release_notification_for_retry(
  p_notification_id uuid,
  p_error text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501';
  end if;


  update public.scheduled_notifications
  set
    status =
      case
        when attempt_count >= 5
          then 'failed'
        else 'pending'
      end,

    last_error =
      left(
        coalesce(
          p_error,
          'Notification delivery failed'
        ),
        1000
      ),

    updated_at =
      now()

  where id = p_notification_id;
end;
$$;


revoke all on function public.release_notification_for_retry(uuid, text)
  from public;

grant execute on function public.release_notification_for_retry(uuid, text)
  to service_role;