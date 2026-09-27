begin;

select plan(4);

select has_function(
  'public',
  'get_rosca_group_detail',
  array['uuid'],
  'get_rosca_group_detail(uuid) exists'
);

select is(
  (
    select p.provolatile::text
    from pg_proc p
    join pg_namespace n
      on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'get_rosca_group_detail'
      and pg_get_function_identity_arguments(p.oid) = 'p_group_id uuid'
  ),
  'v',
  'ROSCA detail RPC is VOLATILE because it refreshes lifecycle state'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.get_rosca_group_detail(uuid)',
    'EXECUTE'
  ),
  'authenticated can execute ROSCA detail RPC'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.get_rosca_group_detail(uuid)',
    'EXECUTE'
  ),
  'anon cannot execute ROSCA detail RPC'
);

select * from finish();

rollback;