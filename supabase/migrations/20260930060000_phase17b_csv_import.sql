begin;
create table private.csv_import_receipts (
  user_id uuid not null references auth.users(id) on delete cascade,
  import_key text not null check (import_key ~ '^[a-f0-9]{64}$'),
  request jsonb not null, transaction_id uuid not null,
  outcome text not null check (outcome in ('imported','duplicate')),
  created_at timestamptz not null default now(), primary key (user_id, import_key)
);
revoke all on private.csv_import_receipts from public, anon, authenticated;
create function public.import_csv_transaction(p_import_key text, p_transaction_id uuid,
  p_operation_id uuid, p_payload jsonb, p_skip_matching boolean, p_source_id uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid(); v_account uuid; v_category uuid; v_type public.transaction_type;
  v_amount text; v_date date; v_currency text; v_merchant text; v_description text; v_notes text;
  v_request jsonb; v_receipt private.csv_import_receipts%rowtype; v_id uuid; v_outcome text;
begin
  if v_user is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_import_key is null or p_import_key !~ '^[a-f0-9]{64}$' or p_transaction_id is null or p_operation_id is null
    or p_skip_matching is null or jsonb_typeof(p_payload) is distinct from 'object' then
    raise exception 'Invalid CSV import request' using errcode='22023'; end if;
  if pg_catalog.octet_length(p_payload::text)>16000 then raise exception 'CSV row is too large' using errcode='22023'; end if;
  v_account := (p_payload->>'accountId')::uuid; v_category := (p_payload->>'categoryId')::uuid;
  if p_payload->>'type' is null or p_payload->>'type' not in ('income','expense') then
    raise exception 'Only income and expense can be imported' using errcode='22023'; end if;
  v_type := (p_payload->>'type')::public.transaction_type; v_amount := p_payload->>'amountMinor';
  if v_amount is null or v_amount !~ '^[1-9][0-9]*$' or length(v_amount)>19 then raise exception 'Invalid amount' using errcode='22023'; end if;
  if v_amount::bigint<=0 then raise exception 'Invalid amount' using errcode='22023'; end if;
  if p_payload->>'transactionDate' is null or p_payload->>'transactionDate' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    raise exception 'Invalid transaction date' using errcode='22023'; end if;
  v_date := (p_payload->>'transactionDate')::date; v_currency := p_payload->>'currency';
  v_merchant := nullif(btrim(p_payload->>'merchant'),'');
  v_description := nullif(btrim(p_payload->>'description'),''); v_notes := nullif(btrim(p_payload->>'notes'),'');
  if length(v_merchant)>120 or length(v_description)>160 or length(v_notes)>2000 then
    raise exception 'CSV text exceeds supported length' using errcode='22023'; end if;
  v_request := jsonb_build_object('accountId',v_account,'categoryId',v_category,'type',v_type,
    'amountMinor',v_amount,'transactionDate',v_date,'currency',v_currency,'merchant',v_merchant,
    'description',v_description,'notes',v_notes,'skipMatching',p_skip_matching,'sourceId',p_source_id);
  -- Serializes receipts across devices and retries after a lost response.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text||':csv-key:'||p_import_key,0));
  select * into v_receipt from private.csv_import_receipts where user_id=v_user and import_key=p_import_key;
  if found then
    if v_receipt.request is distinct from v_request then raise exception 'CSV reference was already used with different data' using errcode='22023'; end if;
    return jsonb_build_object('status',v_receipt.outcome,'transaction_id',v_receipt.transaction_id,'replayed',true,
      'snapshot',private.transaction_correction_snapshot(v_receipt.transaction_id,v_user,array[v_account]));
  end if;
  if v_account is null or not exists(select 1 from public.accounts a join public.currencies c on c.code=a.currency_code
      where a.id=v_account and a.user_id=v_user and a.status='active' and a.currency_code=v_currency
      and c.minor_unit=(p_payload->>'unit')::integer) then
    raise exception 'Account or currency is unavailable' using errcode='22023'; end if;
  if v_category is null or not exists(select 1 from public.categories c where c.id=v_category and (c.user_id=v_user or c.user_id is null)
    and c.deleted_at is null and c.kind::text=v_type::text) then
    raise exception 'Category is unavailable or has the wrong type' using errcode='22023'; end if;
  if p_skip_matching then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text||':csv-content:'||
      (v_request-'skipMatching'-'sourceId')::text,0));
  end if;
  if p_source_id is not null then select id into v_id from public.transactions where user_id=v_user and id=p_source_id; end if;
  if v_id is null and p_skip_matching then
    select t.id into v_id from public.transactions t where t.user_id=v_user and t.deleted_at is null
      and t.account_id=v_account and t.category_id=v_category and t.type=v_type and t.amount_minor=v_amount::bigint
      and t.transaction_date=v_date and t.merchant is not distinct from v_merchant
      and t.description is not distinct from v_description and t.notes is not distinct from v_notes
      order by t.created_at,t.id limit 1;
  end if;
  if v_id is null then
    if exists(select 1 from public.transactions where user_id=v_user and client_operation_id=p_operation_id) then
      raise exception 'Operation identifier was already used' using errcode='22023'; end if;
    v_id := public.create_financial_transaction(v_account,v_category,v_type,v_amount,v_date,v_description,v_merchant,v_notes,p_transaction_id,p_operation_id);
    v_outcome := 'imported';
  else v_outcome := 'duplicate'; end if;
  insert into private.csv_import_receipts(user_id,import_key,request,transaction_id,outcome)
    values(v_user,p_import_key,v_request,v_id,v_outcome);
  return jsonb_build_object('status',v_outcome,'transaction_id',v_id,'replayed',false,
    'snapshot',private.transaction_correction_snapshot(v_id,v_user,array[v_account]));
end $$;
revoke all on function public.import_csv_transaction(text,uuid,uuid,jsonb,boolean,uuid) from public,anon;
grant execute on function public.import_csv_transaction(text,uuid,uuid,jsonb,boolean,uuid) to authenticated;
commit;
