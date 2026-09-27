-- Finance Coach
-- ROSCA lifecycle + privacy hardening
--
-- - Do not expose member auth UUIDs in ROSCA detail payloads.
-- - Cycle closes automatically after every contribution + payout is paid.
-- - Group completes automatically after every cycle is closed.
-- - Joining is retry-safe for an already-active membership when the display
--   name matches, even when the client generated a fresh member UUID.

create or replace function public.refresh_rosca_progress(
  p_group_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.rosca_cycles c
  set
    status =
      case
        when
          exists (
            select 1
            from public.rosca_payouts p
            where
              p.cycle_id = c.id
              and p.status = 'paid'
          )
          and not exists (
            select 1
            from public.rosca_contributions rc
            where
              rc.cycle_id = c.id
              and rc.status <> 'paid'
          )
          then 'closed'

        when c.due_date <= current_date
          then 'open'

        else 'scheduled'
      end,

    updated_at = now()

  where
    c.group_id = p_group_id
    and c.status <> 'closed';


  update public.rosca_groups g
  set
    status =
      case
        when
          g.status = 'active'
          and not exists (
            select 1
            from public.rosca_cycles c
            where
              c.group_id = g.id
              and c.status <> 'closed'
          )
          then 'completed'

        else g.status
      end,

    updated_at = now()

  where
    g.id = p_group_id
    and g.deleted_at is null;
end;
$$;


revoke all on function public.refresh_rosca_progress(uuid)
  from public;


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
    if v_existing.display_name <> btrim(p_display_name) then
      raise exception 'Membership already exists with a different display name'
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
        case
          when public.rosca_cycle_date(
            v_group.start_date,
            v_group.contribution_frequency,
            v_cycle_number - 1
          ) <= current_date
            then 'open'
          else 'scheduled'
        end
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


  perform public.refresh_rosca_progress(
    v_contribution.group_id
  );


  return p_contribution_id;
end;
$$;


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


  perform public.refresh_rosca_progress(
    v_payout.group_id
  );


  return p_payout_id;
end;
$$;


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
  v_my_member public.rosca_members%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;


  select *
  into v_my_member
  from public.rosca_members m
  where
    m.group_id = p_group_id
    and m.user_id = v_user_id
    and m.status = 'active';


  if not found then
    raise exception 'ROSCA group not found'
      using errcode = '42501';
  end if;


  perform public.refresh_rosca_progress(
    p_group_id
  );


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

      'my_role',
      v_my_member.role,

      'members',
      (
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'id',
              m.id,

              'display_name',
              m.display_name,

              'member_order',
              m.member_order,

              'role',
              m.role,

              'is_me',
              m.id = v_my_member.id
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
                      rc.member_id = v_my_member.id
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