begin;

-- Corrections require an expected version and a durable operation receipt.
-- Revoke column privileges as well as table privileges (both can authorize UPDATE).
revoke update, delete on public.transactions, public.transaction_transfers from authenticated;
revoke update (account_id, category_id, type, balance_effect, amount_minor, currency_code,
  description, merchant, transaction_date, notes, metadata, deleted_at)
  on public.transactions from authenticated;
revoke update (from_account_id, to_account_id, source_currency_code, destination_currency_code,
  source_amount_minor, destination_amount_minor) on public.transaction_transfers from authenticated;

create table private.transaction_correction_receipts (
  user_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid not null,
  transaction_id uuid not null,
  request jsonb not null,
  result_status text not null check (result_status in ('applied', 'conflict', 'blocked', 'missing')),
  reason text,
  affected_account_ids uuid[] not null default '{}',
  before_value jsonb,
  after_value jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, operation_id)
);
revoke all on private.transaction_correction_receipts from public, anon, authenticated;

create function private.transaction_correction_block_reason(p_id uuid, p_user uuid)
returns text language sql stable set search_path = '' as $$
  select case
    when t.deleted_at is not null then 'This entry has already been deleted.'
    when t.type = 'adjustment' then 'Correct adjustments through their original feature.'
    when t.metadata <> '{}'::jsonb then 'This entry contains linked feature data. Correct it through its original feature.'
    when exists (select 1 from public.rosca_contributions r where r.linked_transaction_id = t.id)
      or exists (select 1 from public.rosca_payouts r where r.linked_transaction_id = t.id)
      then 'This entry is linked to a ROSCA record. Correct it through ROSCA.'
    else null end
  from public.transactions t where t.id = p_id and t.user_id = p_user
$$;
revoke all on function private.transaction_correction_block_reason(uuid, uuid) from public, anon, authenticated;

create function public.get_transaction_correction_rules(p_transaction_ids uuid[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if coalesce(cardinality(p_transaction_ids), 0) > 200 then
    raise exception 'Too many entries' using errcode = '22023';
  end if;
  return coalesce((select jsonb_agg(jsonb_build_object('transaction_id', t.id, 'version', t.version,
    'block_reason', private.transaction_correction_block_reason(t.id, v_user)))
    from public.transactions t where t.user_id = v_user and t.id = any(p_transaction_ids)), '[]'::jsonb);
end $$;
revoke all on function public.get_transaction_correction_rules(uuid[]) from public, anon;
grant execute on function public.get_transaction_correction_rules(uuid[]) to authenticated;

create function private.transaction_correction_snapshot(p_id uuid, p_user uuid, p_accounts uuid[])
returns jsonb language sql stable set search_path = '' as $$
select jsonb_build_object(
  'transactions', coalesce((select jsonb_agg(to_jsonb(t) || jsonb_build_object(
    'amount_minor', t.amount_minor::text, 'server_revision', t.server_revision::text,
    'currency_minor_unit', c.minor_unit, 'destination_account_id', d.to_account_id,
    'destination_amount_minor', d.destination_amount_minor::text,
    'destination_currency_code', d.destination_currency_code,
    'destination_currency_minor_unit', dc.minor_unit))
    from public.transactions t join public.currencies c on c.code = t.currency_code
    left join public.transaction_transfers d on d.transaction_id = t.id and d.user_id = p_user
    left join public.currencies dc on dc.code = d.destination_currency_code
    where t.id = p_id and t.user_id = p_user), '[]'::jsonb),
  'accounts', coalesce((select jsonb_agg(to_jsonb(a) || jsonb_build_object(
    'opening_balance_minor', a.opening_balance_minor::text,
    'current_balance_minor', public.get_account_balance_minor(a.id)::text,
    'server_revision', a.server_revision::text, 'currency_minor_unit', c.minor_unit,
    'balance_class', k.balance_class))
    from public.accounts a join public.currencies c on c.code = a.currency_code
    join public.account_types k on k.code = a.account_type_code
    where a.user_id = p_user and (a.id = any(p_accounts)
      or a.id in (select t.account_id from public.transactions t where t.id=p_id and t.user_id=p_user)
      or a.id in (select d.to_account_id from public.transaction_transfers d where d.transaction_id=p_id and d.user_id=p_user))), '[]'::jsonb))
$$;
revoke all on function private.transaction_correction_snapshot(uuid, uuid, uuid[]) from public, anon, authenticated;

create function public.correct_financial_transaction(p_operation_id uuid, p_transaction_id uuid,
  p_expected_version integer, p_action text, p_changes jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_request jsonb;
  v_receipt private.transaction_correction_receipts%rowtype;
  v_tx public.transactions%rowtype;
  v_transfer public.transaction_transfers%rowtype;
  v_source uuid;
  v_destination uuid;
  v_category uuid;
  v_amount bigint;
  v_type public.transaction_type;
  v_date date;
  v_reason text;
  v_status text := 'applied';
  v_accounts uuid[] := '{}';
  v_before jsonb;
  v_after jsonb;
begin
  if v_user is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_operation_id is null or p_transaction_id is null or p_expected_version is null
    or p_expected_version < 1 or p_action not in ('update', 'delete') or p_action is null
    or p_changes is null or jsonb_typeof(p_changes) <> 'object' then
    raise exception 'Invalid correction request' using errcode = '22023';
  end if;
  v_request := jsonb_build_object('transaction_id', p_transaction_id, 'expected_version', p_expected_version,
    'action', p_action, 'changes', p_changes);
  perform pg_advisory_xact_lock(hashtextextended(v_user::text || ':' || p_operation_id::text, 0));
  select * into v_receipt from private.transaction_correction_receipts
    where user_id = v_user and operation_id = p_operation_id;
  if found then
    if v_receipt.request <> v_request then
      raise exception 'Operation ID has already been used for another request' using errcode = '22023';
    end if;
    return jsonb_build_object('status', v_receipt.result_status, 'reason', v_receipt.reason,
      'replayed', true, 'snapshot', private.transaction_correction_snapshot(p_transaction_id, v_user,
        v_receipt.affected_account_ids));
  end if;

  select * into v_tx from public.transactions where id = p_transaction_id and user_id = v_user for update;
  if not found then
    v_status := 'missing'; v_reason := 'This entry is unavailable for your account.';
  else
    select * into v_transfer from public.transaction_transfers
      where transaction_id = p_transaction_id and user_id = v_user for update;
    v_accounts := array_remove(array[v_tx.account_id, v_transfer.to_account_id], null);
    v_before := to_jsonb(v_tx);
    if v_tx.version <> p_expected_version or v_tx.deleted_at is not null then
      v_status := 'conflict'; v_reason := 'This entry changed on the server. Review the latest version before saving again.';
    else
      v_reason := private.transaction_correction_block_reason(p_transaction_id, v_user);
      if v_reason is not null then v_status := 'blocked'; end if;
    end if;
  end if;

  if v_status = 'applied' then
    if p_action = 'update' then
      -- Full desired editable state. Currency and feature metadata cannot be changed here.
      if not (p_changes ?& array['account_id','category_id','type','amount_minor','transaction_date',
        'merchant','description','notes','destination_account_id'])
        or exists (select 1 from jsonb_object_keys(p_changes) k where k <> all(array[
          'account_id','category_id','type','amount_minor','transaction_date','merchant','description',
          'notes','destination_account_id']))
        or jsonb_typeof(p_changes->'amount_minor') <> 'string'
        or (p_changes->>'amount_minor') !~ '^[1-9][0-9]*$'
        or length(p_changes->>'amount_minor') > 19
        or jsonb_typeof(p_changes->'transaction_date') <> 'string'
        or (p_changes->>'transaction_date') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        or length(coalesce(p_changes->>'merchant','')) > 120
        or length(coalesce(p_changes->>'description','')) > 160
        or length(coalesce(p_changes->>'notes','')) > 2000 then
        raise exception 'Invalid editable fields' using errcode = '22023';
      end if;
      v_source := (p_changes->>'account_id')::uuid;
      v_destination := (p_changes->>'destination_account_id')::uuid;
      v_category := (p_changes->>'category_id')::uuid;
      v_type := (p_changes->>'type')::public.transaction_type;
      v_amount := (p_changes->>'amount_minor')::bigint;
      v_date := (p_changes->>'transaction_date')::date;
      if v_source is null or v_type is null or v_date is null or v_amount is null then
        raise exception 'Required fields are missing' using errcode = '22023';
      end if;
      if (v_tx.type = 'transfer' and (v_type <> 'transfer' or v_destination is null or v_source = v_destination
          or v_category is not null))
        or (v_tx.type <> 'transfer' and (v_type not in ('income','expense') or v_destination is not null)) then
        raise exception 'Unsupported correction type' using errcode = '22023';
      end if;
      v_accounts := array_remove(v_accounts || array[v_source, v_destination], null);
    elsif p_changes <> '{}'::jsonb then
      raise exception 'Deletion cannot carry editable fields' using errcode = '22023';
    end if;

    -- Account status checks and balance snapshots share a deterministic lock order.
    perform a.id from public.accounts a where a.user_id = v_user and a.id = any(v_accounts) order by a.id for update;
    if p_action = 'update' then
      if not exists (select 1 from public.accounts a where a.user_id = v_user and a.id = v_source
        and a.currency_code = v_tx.currency_code and a.status = 'active')
        or (v_tx.type = 'transfer' and not exists (select 1 from public.accounts a where a.user_id = v_user
          and a.id = v_destination and a.currency_code = v_tx.currency_code and a.status = 'active')) then
        raise exception 'Select active accounts in the original currency' using errcode = '22023';
      end if;
      update public.transactions set account_id = v_source, category_id = v_category, type = v_type,
        balance_effect = case v_type when 'income' then 'credit'::public.balance_effect
          when 'expense' then 'debit'::public.balance_effect else 'neutral'::public.balance_effect end,
        amount_minor = v_amount, transaction_date = v_date, merchant = p_changes->>'merchant',
        description = p_changes->>'description', notes = p_changes->>'notes'
        where id = p_transaction_id and user_id = v_user;
      if v_tx.type = 'transfer' then
        update public.transaction_transfers set from_account_id = v_source, to_account_id = v_destination,
          source_amount_minor = v_amount, destination_amount_minor = v_amount, updated_at = now()
          where transaction_id = p_transaction_id and user_id = v_user;
      end if;
    else
      update public.transactions set deleted_at = now() where id = p_transaction_id and user_id = v_user;
      -- The existing transaction trigger touches the source; soft deletion must also touch the destination.
      if v_tx.type = 'transfer' then
        update public.accounts set server_revision = nextval('private.account_sync_revision_seq'), updated_at = now()
          where id = v_transfer.to_account_id and user_id = v_user;
      end if;
    end if;
    select to_jsonb(t) into v_after from public.transactions t where t.id = p_transaction_id and t.user_id = v_user;
  end if;

  insert into private.transaction_correction_receipts(user_id, operation_id, transaction_id, request,
    result_status, reason, affected_account_ids, before_value, after_value)
    values(v_user, p_operation_id, p_transaction_id, v_request, v_status, v_reason, v_accounts, v_before, v_after);
  return jsonb_build_object('status', v_status, 'reason', v_reason, 'replayed', false,
    'snapshot', private.transaction_correction_snapshot(p_transaction_id, v_user, v_accounts));
end $$;
revoke all on function public.correct_financial_transaction(uuid, uuid, integer, text, jsonb) from public, anon;
grant execute on function public.correct_financial_transaction(uuid, uuid, integer, text, jsonb) to authenticated;

create or replace function private.prepare_transaction_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_category_kind public.category_kind;
    v_category_user_id uuid;
    v_category_is_system boolean;
    v_category_deleted_at timestamptz;
    v_account_status public.account_status;
begin

    -- --------------------------------------------------------
    -- Account validation
    -- --------------------------------------------------------

    if
        tg_op = 'INSERT'
        or new.account_id is distinct from old.account_id
        or new.currency_code is distinct from old.currency_code
    then

        select a.status
        into v_account_status
        from public.accounts a
        where
            a.id = new.account_id
            and a.user_id = new.user_id
            and a.currency_code = new.currency_code;

        if not found then
            raise exception
                'Account ownership or currency validation failed';
        end if;

        if v_account_status <> 'active' then
            raise exception
                'New financial activity requires an active account';
        end if;

    end if;


    -- --------------------------------------------------------
    -- Category validation
    -- --------------------------------------------------------

    if new.category_id is not null and new.deleted_at is null then

        select
            c.kind,
            c.user_id,
            c.is_system,
            c.deleted_at
        into
            v_category_kind,
            v_category_user_id,
            v_category_is_system,
            v_category_deleted_at
        from public.categories c
        where c.id = new.category_id;

        if not found then
            raise exception
                'Category does not exist';
        end if;

        if v_category_deleted_at is not null then
            raise exception
                'Deleted category cannot be used';
        end if;

        if
            v_category_is_system = false
            and v_category_user_id <> new.user_id
        then
            raise exception
                'Category does not belong to this user';
        end if;

        if
            new.type = 'income'
            and v_category_kind <> 'income'
        then
            raise exception
                'Income transaction requires an income category';
        end if;

        if
            new.type = 'expense'
            and v_category_kind <> 'expense'
        then
            raise exception
                'Expense transaction requires an expense category';
        end if;

    end if;


    -- --------------------------------------------------------
    -- Revisioning
    -- --------------------------------------------------------

    if tg_op = 'INSERT' then
        new.version = 1;
    else
        new.version = old.version + 1;
    end if;

    new.server_revision =
        nextval('private.ledger_revision_seq');

    new.updated_at = now();

    return new;
end;
$$;



commit;
