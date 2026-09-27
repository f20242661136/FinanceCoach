begin;

do $$
declare
  v_invalid_count bigint;
begin
  select count(*)
  into v_invalid_count
  from public.transaction_transfers tt
  where
    tt.from_account_id = tt.to_account_id
    or tt.source_amount_minor <= 0
    or tt.destination_amount_minor <= 0
    or tt.source_currency_code <> tt.destination_currency_code
    or (
      tt.source_currency_code = tt.destination_currency_code
      and tt.source_amount_minor <> tt.destination_amount_minor
    );

  if v_invalid_count > 0 then
    raise exception
      'Transfer conservation hardening found % existing invalid transfer row(s). Refusing to modify financial history automatically.',
      v_invalid_count
      using errcode = '23514';
  end if;
end
$$;

alter table public.transaction_transfers
  add constraint transaction_transfers_distinct_accounts
  check (from_account_id <> to_account_id);

alter table public.transaction_transfers
  add constraint transaction_transfers_source_amount_positive
  check (source_amount_minor > 0);

alter table public.transaction_transfers
  add constraint transaction_transfers_destination_amount_positive
  check (destination_amount_minor > 0);

alter table public.transaction_transfers
  add constraint transaction_transfers_same_currency_v1
  check (source_currency_code = destination_currency_code);

alter table public.transaction_transfers
  add constraint transaction_transfers_same_currency_amount_conservation_v1
  check (source_amount_minor = destination_amount_minor);

commit;