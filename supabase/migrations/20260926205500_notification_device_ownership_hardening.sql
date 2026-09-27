begin;

create or replace function public.register_notification_device(
  p_device_id uuid,
  p_expo_push_token text,
  p_platform text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_user_id uuid;
  v_token text;
  v_existing_token public.notification_devices%rowtype;
  v_existing_device public.notification_devices%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if p_device_id is null then
    raise exception 'Device ID is required'
      using errcode = '22023';
  end if;

  v_token := btrim(coalesce(p_expo_push_token, ''));

  if (
    v_token !~ '^ExponentPushToken\[[^\]]+\]$'
    and
    v_token !~ '^ExpoPushToken\[[^\]]+\]$'
  ) then
    raise exception 'Invalid Expo push token'
      using errcode = '22023';
  end if;

  if p_platform not in ('android', 'ios') then
    raise exception 'Unsupported notification platform'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_token, 0)
  );

  select *
  into v_existing_token
  from public.notification_devices d
  where d.expo_push_token = v_token
  for update;

  if found then
    if v_existing_token.user_id = v_user_id then
      update public.notification_devices
      set
        platform = p_platform,
        active = true,
        last_seen_at = now(),
        updated_at = now()
      where id = v_existing_token.id;

      return v_existing_token.id;
    end if;

    if v_existing_token.active then
      raise exception 'Expo push token is already registered to another user'
        using errcode = '42501';
    end if;

    if v_existing_token.id <> p_device_id then
      raise exception 'Expo push token belongs to another device'
        using errcode = '42501';
    end if;

    update public.notification_devices
    set
      user_id = v_user_id,
      platform = p_platform,
      active = true,
      last_seen_at = now(),
      updated_at = now()
    where id = v_existing_token.id;

    return v_existing_token.id;
  end if;

  select *
  into v_existing_device
  from public.notification_devices d
  where d.id = p_device_id
  for update;

  if found then
    if v_existing_device.user_id <> v_user_id then
      raise exception 'Device ID is already registered to another user'
        using errcode = '42501';
    end if;

    update public.notification_devices
    set
      expo_push_token = v_token,
      platform = p_platform,
      active = true,
      last_seen_at = now(),
      updated_at = now()
    where id = p_device_id;

    return p_device_id;
  end if;

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
  );

  return p_device_id;
end;
$function$;

revoke all on function public.register_notification_device(uuid, text, text)
  from public, anon;

grant execute on function public.register_notification_device(uuid, text, text)
  to authenticated, service_role;

commit;