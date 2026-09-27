begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

select ok(
  not exists (
    select 1
    from information_schema.role_table_grants g
    where
      g.table_schema = 'public'
      and g.grantee = 'authenticated'
      and g.table_name in (
        'budgets',
        'budget_categories',
        'savings_goals',
        'savings_contributions',
        'loans',
        'loan_payments',
        'six_jar_profiles',
        'six_jar_categories',
        'six_jar_allocations'
      )
      and g.privilege_type in (
        'INSERT',
        'UPDATE',
        'DELETE',
        'TRUNCATE',
        'REFERENCES',
        'TRIGGER'
      )
  ),
  'authenticated has no direct planning-domain mutation privileges'
);

select ok(
  not exists (
    select 1
    from information_schema.role_table_grants g
    where
      g.table_schema = 'public'
      and g.grantee = 'authenticated'
      and g.table_name in (
        'rosca_groups',
        'rosca_members',
        'rosca_cycles',
        'rosca_contributions',
        'rosca_payouts',
        'gamification_point_rules',
        'gamification_levels',
        'point_events',
        'user_points',
        'badges',
        'user_badges',
        'streaks',
        'challenges',
        'user_challenges',
        'ai_conversations',
        'ai_messages',
        'financial_insights',
        'notification_preferences',
        'notification_devices',
        'scheduled_notifications',
        'notification_events'
      )
      and g.privilege_type in (
        'INSERT',
        'UPDATE',
        'DELETE',
        'TRUNCATE',
        'REFERENCES',
        'TRIGGER'
      )
  ),
  'authenticated has no direct server-managed domain mutation privileges'
);

select ok(
  not exists (
    select 1
    from information_schema.role_table_grants g
    where
      g.table_schema = 'public'
      and g.grantee = 'authenticated'
      and g.table_name = 'notification_devices'
  ),
  'notification devices remain RPC-only'
);

select ok(
  (
    select count(*)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where
      n.nspname = 'public'
      and p.proname in (
        'create_budget',
        'create_savings_goal',
        'add_savings_contribution',
        'save_six_jar_profile',
        'calculate_six_jar_allocation',
        'create_loan',
        'add_loan_payment'
      )
      and p.prosecdef
  ) = 7,
  'all approved planning mutation RPCs are SECURITY DEFINER'
);

select ok(
  not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where
      n.nspname = 'public'
      and p.proname in (
        'create_budget',
        'create_savings_goal',
        'add_savings_contribution',
        'save_six_jar_profile',
        'calculate_six_jar_allocation',
        'create_loan',
        'add_loan_payment'
      )
      and position('auth.uid' in lower(p.prosrc)) = 0
  ),
  'all approved planning mutation RPCs derive caller identity from auth.uid()'
);

select ok(
  not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where
      n.nspname = 'public'
      and p.proname in (
        'create_budget',
        'create_savings_goal',
        'add_savings_contribution',
        'save_six_jar_profile',
        'calculate_six_jar_allocation',
        'create_loan',
        'add_loan_payment'
      )
      and has_function_privilege('anon', p.oid, 'EXECUTE')
  ),
  'anon cannot execute planning mutation RPCs'
);

select ok(
  not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where
      n.nspname = 'public'
      and p.proname in (
        'create_budget',
        'create_savings_goal',
        'add_savings_contribution',
        'save_six_jar_profile',
        'calculate_six_jar_allocation',
        'create_loan',
        'add_loan_payment'
      )
      and not has_function_privilege('authenticated', p.oid, 'EXECUTE')
  ),
  'authenticated can execute approved planning mutation RPCs'
);

select ok(
  not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where
      n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname in (
        'budgets',
        'budget_categories',
        'savings_goals',
        'savings_contributions',
        'loans',
        'loan_payments',
        'six_jar_profiles',
        'six_jar_categories',
        'six_jar_allocations',
        'rosca_groups',
        'rosca_members',
        'rosca_cycles',
        'rosca_contributions',
        'rosca_payouts',
        'point_events',
        'user_points',
        'ai_conversations',
        'ai_messages',
        'financial_insights',
        'notification_preferences',
        'notification_devices',
        'scheduled_notifications',
        'notification_events'
      )
      and not c.relrowsecurity
  ),
  'protected domain tables keep RLS enabled'
);

select ok(
  has_table_privilege(
    'authenticated',
    'public.budgets',
    'SELECT'
  )
  and has_table_privilege(
    'authenticated',
    'public.savings_goals',
    'SELECT'
  )
  and has_table_privilege(
    'authenticated',
    'public.loans',
    'SELECT'
  )
  and has_table_privilege(
    'authenticated',
    'public.six_jar_profiles',
    'SELECT'
  ),
  'authenticated keeps read access to planning data'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.get_budget_status(date)',
    'EXECUTE'
  )
  and has_function_privilege(
    'authenticated',
    'public.get_savings_goal_status()',
    'EXECUTE'
  )
  and has_function_privilege(
    'authenticated',
    'public.get_loan_status()',
    'EXECUTE'
  )
  and has_function_privilege(
    'authenticated',
    'public.get_six_jar_profile()',
    'EXECUTE'
  ),
  'approved planning read RPCs remain executable'
);

select * from finish();

rollback;