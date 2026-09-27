begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

select ok(
  not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and has_function_privilege('anon', p.oid, 'EXECUTE')
  ),
  'anon cannot execute public application functions'
);

select ok(
  not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and (
        has_function_privilege('anon', p.oid, 'EXECUTE')
        or has_function_privilege('authenticated', p.oid, 'EXECUTE')
      )
  ),
  'client roles cannot execute private-schema helpers'
);

select ok(
  not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'award_gamification_points',
        'gamification_budget_insert_trigger',
        'gamification_goal_completed_trigger',
        'gamification_goal_insert_trigger',
        'gamification_savings_contribution_insert_trigger',
        'gamification_transaction_insert_trigger',
        'ensure_notification_preferences',
        'schedule_notification_if_enabled',
        'refresh_notification_schedule_for_user',
        'refresh_all_notification_schedules',
        'claim_due_notifications',
        'release_notification_for_retry',
        'refresh_rosca_progress'
      )
      and has_function_privilege('authenticated', p.oid, 'EXECUTE')
  ),
  'authenticated cannot execute internal privileged helpers'
);

select ok(
  not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'create_ai_conversation',
        'create_rosca_group',
        'get_notification_preferences',
        'update_notification_preferences',
        'register_notification_device',
        'refresh_my_notification_schedule'
      )
      and not has_function_privilege('authenticated', p.oid, 'EXECUTE')
  ),
  'approved authenticated RPCs remain executable'
);

select ok(
  not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'award_gamification_points',
        'ensure_notification_preferences',
        'schedule_notification_if_enabled',
        'refresh_notification_schedule_for_user',
        'refresh_all_notification_schedules',
        'claim_due_notifications',
        'release_notification_for_retry'
      )
      and not has_function_privilege('service_role', p.oid, 'EXECUTE')
  ),
  'service role retains internal helper execution'
);

select ok(
  not exists (
    select 1
    from pg_default_acl d
    left join pg_namespace n on n.oid = d.defaclnamespace
    cross join lateral aclexplode(d.defaclacl) a
    left join pg_roles r on r.oid = a.grantee
    where pg_get_userbyid(d.defaclrole) = 'postgres'
      and n.nspname = 'public'
      and d.defaclobjtype = 'f'
      and a.privilege_type = 'EXECUTE'
      and (
        a.grantee = 0
        or r.rolname in ('anon', 'authenticated')
      )
  ),
  'future postgres public functions are not client-executable by default'
);

select ok(
  not exists (
    select 1
    from pg_default_acl d
    left join pg_namespace n on n.oid = d.defaclnamespace
    cross join lateral aclexplode(d.defaclacl) a
    left join pg_roles r on r.oid = a.grantee
    where pg_get_userbyid(d.defaclrole) = 'postgres'
      and n.nspname = 'public'
      and d.defaclobjtype = 'r'
      and r.rolname in ('anon', 'authenticated')
  ),
  'future postgres public tables are not client-granted by default'
);

select ok(
  not exists (
    select 1
    from pg_default_acl d
    left join pg_namespace n on n.oid = d.defaclnamespace
    cross join lateral aclexplode(d.defaclacl) a
    left join pg_roles r on r.oid = a.grantee
    where pg_get_userbyid(d.defaclrole) = 'postgres'
      and n.nspname = 'public'
      and d.defaclobjtype = 'S'
      and r.rolname in ('anon', 'authenticated')
  ),
  'future postgres public sequences are not client-granted by default'
);

select * from finish();

rollback;