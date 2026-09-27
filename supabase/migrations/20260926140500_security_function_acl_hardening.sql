begin;

alter default privileges
  for role postgres
  in schema public
  revoke execute on functions from public;

alter default privileges
  for role postgres
  in schema public
  revoke execute on functions from anon;

alter default privileges
  for role postgres
  in schema public
  revoke execute on functions from authenticated;

alter default privileges
  for role postgres
  in schema public
  revoke all on tables from anon;

alter default privileges
  for role postgres
  in schema public
  revoke all on tables from authenticated;

alter default privileges
  for role postgres
  in schema public
  revoke all on sequences from anon;

alter default privileges
  for role postgres
  in schema public
  revoke all on sequences from authenticated;

revoke execute
on all functions in schema public
from public;

revoke execute
on all functions in schema public
from anon;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

revoke execute
on all functions in schema private
from public;

revoke execute
on all functions in schema private
from anon;

revoke execute
on all functions in schema private
from authenticated;

revoke execute on function
  public.award_gamification_points(
    uuid,
    text,
    text,
    uuid,
    text,
    integer
  )
from authenticated;

revoke execute on function
  public.gamification_budget_insert_trigger()
from authenticated;

revoke execute on function
  public.gamification_goal_completed_trigger()
from authenticated;

revoke execute on function
  public.gamification_goal_insert_trigger()
from authenticated;

revoke execute on function
  public.gamification_savings_contribution_insert_trigger()
from authenticated;

revoke execute on function
  public.gamification_transaction_insert_trigger()
from authenticated;

revoke execute on function
  public.ensure_notification_preferences(
    uuid,
    text
  )
from authenticated;

revoke execute on function
  public.schedule_notification_if_enabled(
    uuid,
    text,
    text,
    uuid,
    text,
    text,
    text,
    date,
    time without time zone,
    text
  )
from authenticated;

revoke execute on function
  public.refresh_notification_schedule_for_user(
    uuid,
    text,
    integer
  )
from authenticated;

revoke execute on function
  public.refresh_all_notification_schedules(
    integer
  )
from authenticated;

revoke execute on function
  public.claim_due_notifications(
    integer
  )
from authenticated;

revoke execute on function
  public.release_notification_for_retry(
    uuid,
    text
  )
from authenticated;

revoke execute on function
  public.refresh_rosca_progress(
    uuid
  )
from authenticated;

commit;