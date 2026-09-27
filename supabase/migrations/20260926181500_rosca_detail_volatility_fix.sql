-- Finance Coach
-- ROSCA detail RPC transaction-mode correction
--
-- get_rosca_group_detail(uuid) calls refresh_rosca_progress(uuid), which
-- performs UPDATE statements to advance cycle/group lifecycle state.
--
-- PostgREST treats STABLE RPC functions as read-only transactions. Marking
-- this function VOLATILE is therefore required for the existing lifecycle
-- refresh logic to execute through /rest/v1/rpc/get_rosca_group_detail.
--
-- This migration changes only the function volatility contract. It does not
-- change ownership checks, returned data, financial amounts, or lifecycle
-- rules.

alter function public.get_rosca_group_detail(uuid)
  volatile;

revoke all
on function public.get_rosca_group_detail(uuid)
from public, anon;

grant execute
on function public.get_rosca_group_detail(uuid)
to authenticated;