-- Finance Coach security hardening:
--
-- Newer planning domains originally relied on RLS plus broad authenticated
-- table grants. Their intended mutation path is RPC -> validation -> table.
--
-- This migration:
--   1. verifies each approved mutation RPC derives the caller from auth.uid(),
--   2. promotes those RPCs to SECURITY DEFINER so table DML can be removed
--      from the mobile role without breaking approved mutations,
--   3. removes direct authenticated DML from protected domains,
--   4. preserves SELECT only where the mobile app legitimately reads rows.
--
-- The search_path remains explicitly pinned to public,pg_catalog for these
-- existing functions because their bodies contain unqualified public objects.
-- Client roles cannot CREATE in public, and the previous security migration
-- changed future ACLs to deny-by-default.

begin;

-- ---------------------------------------------------------------------------
-- Approved client mutation RPCs for planning domains.
--
-- Fail the migration instead of silently hardening an unexpected function
-- shape. Each function must exist exactly once and explicitly use auth.uid().
-- ---------------------------------------------------------------------------

do $$
declare
  v_name text;
  v_count integer;
  v_oid oid;
  v_source text;
  v_identity text;
  v_functions constant text[] := array[
    'create_budget',
    'create_savings_goal',
    'add_savings_contribution',
    'save_six_jar_profile',
    'calculate_six_jar_allocation',
    'create_loan',
    'add_loan_payment'
  ];
begin
  foreach v_name in array v_functions loop
    select
      count(*),
      min(p.oid)::oid
    into
      v_count,
      v_oid
    from pg_proc p
    join pg_namespace n
      on n.oid = p.pronamespace
    where
      n.nspname = 'public'
      and p.proname = v_name;

    if v_count <> 1 then
      raise exception
        'Expected exactly one public.%() overload, found %',
        v_name,
        v_count
        using errcode = '42501';
    end if;

    select
      p.prosrc,
      p.oid::regprocedure::text
    into
      v_source,
      v_identity
    from pg_proc p
    where p.oid = v_oid;

    if position('auth.uid' in lower(v_source)) = 0 then
      raise exception
        'Refusing to make % SECURITY DEFINER because it does not explicitly derive caller identity from auth.uid()',
        v_identity
        using errcode = '42501';
    end if;

    execute format(
      'alter function %s security definer',
      v_identity
    );

    execute format(
      'alter function %s set search_path to public, pg_catalog',
      v_identity
    );

    execute format(
      'revoke execute on function %s from public',
      v_identity
    );

    execute format(
      'revoke execute on function %s from anon',
      v_identity
    );

    execute format(
      'grant execute on function %s to authenticated',
      v_identity
    );

    execute format(
      'grant execute on function %s to service_role',
      v_identity
    );
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- Planning domains: direct writes are no longer part of the mobile boundary.
-- Approved SECURITY DEFINER RPCs above perform validated writes.
-- ---------------------------------------------------------------------------

revoke
  insert,
  update,
  delete,
  truncate,
  references,
  trigger
on table
  public.budgets,
  public.budget_categories,
  public.savings_goals,
  public.savings_contributions,
  public.loans,
  public.loan_payments,
  public.six_jar_profiles,
  public.six_jar_categories,
  public.six_jar_allocations
from authenticated;

grant select
on table
  public.budgets,
  public.budget_categories,
  public.savings_goals,
  public.savings_contributions,
  public.loans,
  public.loan_payments,
  public.six_jar_profiles,
  public.six_jar_categories,
  public.six_jar_allocations
to authenticated;

-- ---------------------------------------------------------------------------
-- Server-managed domains: RLS already constrained them, but the mobile role
-- does not need direct mutation privileges at all.
-- ---------------------------------------------------------------------------

revoke
  insert,
  update,
  delete,
  truncate,
  references,
  trigger
on table
  public.rosca_groups,
  public.rosca_members,
  public.rosca_cycles,
  public.rosca_contributions,
  public.rosca_payouts,
  public.gamification_point_rules,
  public.gamification_levels,
  public.point_events,
  public.user_points,
  public.badges,
  public.user_badges,
  public.streaks,
  public.challenges,
  public.user_challenges,
  public.ai_conversations,
  public.ai_messages,
  public.financial_insights,
  public.notification_preferences,
  public.notification_devices,
  public.scheduled_notifications,
  public.notification_events
from authenticated;

-- User-visible server-managed tables retain only SELECT where their RLS policy
-- allows it. notification_devices intentionally remains RPC-only/no SELECT.
grant select
on table
  public.rosca_groups,
  public.rosca_members,
  public.rosca_cycles,
  public.rosca_contributions,
  public.rosca_payouts,
  public.gamification_point_rules,
  public.gamification_levels,
  public.point_events,
  public.user_points,
  public.badges,
  public.user_badges,
  public.streaks,
  public.challenges,
  public.user_challenges,
  public.ai_conversations,
  public.ai_messages,
  public.financial_insights,
  public.notification_preferences,
  public.scheduled_notifications,
  public.notification_events
to authenticated;

revoke all
on table public.notification_devices
from authenticated;

commit;