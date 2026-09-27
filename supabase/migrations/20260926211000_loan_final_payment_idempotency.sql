begin;

-- Exact retries must be resolved before rejecting a newly-settled loan.
-- This preserves exactly-once semantics for the final payment while keeping
-- loan ownership, payload equality, positive amount, and overpayment checks.

create or replace function public.add_loan_payment(
  p_payment_id uuid,
  p_loan_id uuid,
  p_amount_minor text,
  p_payment_date date default current_date,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_amount_minor bigint;
  v_loan public.loans%rowtype;
  v_existing public.loan_payments%rowtype;
  v_paid_minor bigint;
  v_remaining_minor bigint;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;


  if p_payment_id is null then
    raise exception 'Payment ID is required'
      using errcode = '22023';
  end if;


  select *
  into v_loan
  from public.loans l
  where
    l.id = p_loan_id
    and l.user_id = v_user_id
    and l.deleted_at is null;


  if not found then
    raise exception 'Loan not found'
      using errcode = '42501';
  end if;



  begin
    v_amount_minor :=
      p_amount_minor::bigint;
  exception
    when others then
      raise exception 'Payment amount must be an integer minor-unit string'
        using errcode = '22023';
  end;


  if v_amount_minor <= 0 then
    raise exception 'Payment amount must be greater than zero'
      using errcode = '22023';
  end if;


  if p_payment_date is null then
    raise exception 'Payment date is required'
      using errcode = '22023';
  end if;


  select *
  into v_existing
  from public.loan_payments lp
  where lp.id = p_payment_id;


  if found then
    if v_existing.user_id <> v_user_id then
      raise exception 'Payment ID is already in use'
        using errcode = '42501';
    end if;


    if v_existing.loan_id <> p_loan_id
       or v_existing.amount_minor <> v_amount_minor
       or v_existing.payment_date <> p_payment_date
       or coalesce(v_existing.note, '') <> coalesce(nullif(btrim(p_note), ''), '')
       or v_existing.deleted_at is not null then
      raise exception 'Payment ID was already used with different data'
        using errcode = '23505';
    end if;


    return p_payment_id;
  end if;

  if v_loan.status not in (
    'active',
    'defaulted'
  ) then
    raise exception 'Loan does not accept payments'
      using errcode = '22023';
  end if;



  select
    coalesce(
      sum(
        lp.amount_minor
      ),
      0
    )::bigint
  into v_paid_minor
  from public.loan_payments lp
  where
    lp.loan_id = p_loan_id
    and lp.user_id = v_user_id
    and lp.deleted_at is null;


  v_remaining_minor :=
    greatest(
      v_loan.principal_minor
      - v_paid_minor,
      0
    );


  if v_amount_minor > v_remaining_minor then
    raise exception 'Payment exceeds remaining principal'
      using errcode = '22023';
  end if;


  insert into public.loan_payments (
    id,
    loan_id,
    user_id,
    amount_minor,
    payment_date,
    note
  )
  values (
    p_payment_id,
    p_loan_id,
    v_user_id,
    v_amount_minor,
    p_payment_date,
    nullif(
      btrim(
        p_note
      ),
      ''
    )
  );


  if v_amount_minor = v_remaining_minor then
    update public.loans
    set
      status = 'settled',
      updated_at = now()
    where
      id = p_loan_id
      and user_id = v_user_id;
  elsif v_loan.status = 'defaulted' then
    update public.loans
    set
      updated_at = now()
    where
      id = p_loan_id
      and user_id = v_user_id;
  end if;


  return p_payment_id;
end;
$$;

revoke all on function public.add_loan_payment(
  uuid,
  uuid,
  text,
  date,
  text
)
from public, anon;

grant execute on function public.add_loan_payment(
  uuid,
  uuid,
  text,
  date,
  text
)
to authenticated, service_role;

commit;
