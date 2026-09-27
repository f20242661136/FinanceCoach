-- Finance Coach
-- Loans foundation
--
-- Supports:
-- - money borrowed
-- - money given/lent
-- - separate immutable-style payment history
-- - deterministic remaining principal
-- - optional interest-rate and payment-schedule metadata
--
-- This migration deliberately does NOT implement automatic interest accrual.
-- Interest metadata is informational until a dedicated deterministic interest
-- engine is introduced. Loan payments do not mutate the normal account ledger.

create table if not exists public.loans (
  id uuid primary key,

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  direction text not null
    check (
      direction in (
        'borrowed',
        'given'
      )
    ),

  counterparty_name text not null,

  currency_code text not null
    references public.currencies(code),

  principal_minor bigint not null
    check (principal_minor > 0),

  interest_rate_basis_points integer null
    check (
      interest_rate_basis_points is null
      or (
        interest_rate_basis_points >= 0
        and interest_rate_basis_points <= 100000
      )
    ),

  start_date date not null,

  due_date date null,

  payment_frequency text not null default 'none'
    check (
      payment_frequency in (
        'none',
        'weekly',
        'monthly',
        'custom'
      )
    ),

  scheduled_payment_minor bigint null
    check (
      scheduled_payment_minor is null
      or scheduled_payment_minor > 0
    ),

  status text not null default 'active'
    check (
      status in (
        'active',
        'settled',
        'defaulted',
        'archived'
      )
    ),

  notes text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,

  check (
    due_date is null
    or due_date >= start_date
  )
);


create table if not exists public.loan_payments (
  id uuid primary key,

  loan_id uuid not null
    references public.loans(id)
    on delete cascade,

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  amount_minor bigint not null
    check (amount_minor > 0),

  payment_date date not null,

  note text null,

  created_at timestamptz not null default now(),
  deleted_at timestamptz null
);


create index if not exists loans_user_status_idx
  on public.loans (
    user_id,
    status,
    due_date
  )
  where deleted_at is null;


create index if not exists loans_user_direction_idx
  on public.loans (
    user_id,
    direction,
    created_at desc
  )
  where deleted_at is null;


create index if not exists loan_payments_loan_date_idx
  on public.loan_payments (
    loan_id,
    payment_date desc,
    created_at desc
  )
  where deleted_at is null;


create index if not exists loan_payments_user_idx
  on public.loan_payments (
    user_id,
    created_at desc
  )
  where deleted_at is null;


alter table public.loans
  enable row level security;

alter table public.loan_payments
  enable row level security;


drop policy if exists loans_select_own
  on public.loans;

create policy loans_select_own
  on public.loans
  for select
  to authenticated
  using (
    user_id = auth.uid()
  );


drop policy if exists loans_insert_own
  on public.loans;

create policy loans_insert_own
  on public.loans
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
  );


drop policy if exists loans_update_own
  on public.loans;

create policy loans_update_own
  on public.loans
  for update
  to authenticated
  using (
    user_id = auth.uid()
  )
  with check (
    user_id = auth.uid()
  );


drop policy if exists loans_delete_own
  on public.loans;

create policy loans_delete_own
  on public.loans
  for delete
  to authenticated
  using (
    user_id = auth.uid()
  );


drop policy if exists loan_payments_select_own
  on public.loan_payments;

create policy loan_payments_select_own
  on public.loan_payments
  for select
  to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from public.loans l
      where
        l.id = loan_payments.loan_id
        and l.user_id = auth.uid()
    )
  );


drop policy if exists loan_payments_insert_own
  on public.loan_payments;

create policy loan_payments_insert_own
  on public.loan_payments
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.loans l
      where
        l.id = loan_payments.loan_id
        and l.user_id = auth.uid()
        and l.deleted_at is null
    )
  );


drop policy if exists loan_payments_update_own
  on public.loan_payments;

create policy loan_payments_update_own
  on public.loan_payments
  for update
  to authenticated
  using (
    user_id = auth.uid()
  )
  with check (
    user_id = auth.uid()
  );


drop policy if exists loan_payments_delete_own
  on public.loan_payments;

create policy loan_payments_delete_own
  on public.loan_payments
  for delete
  to authenticated
  using (
    user_id = auth.uid()
  );


revoke all on public.loans
  from anon;

revoke all on public.loan_payments
  from anon;

grant select, insert, update, delete
  on public.loans
  to authenticated;

grant select, insert, update, delete
  on public.loan_payments
  to authenticated;


create or replace function public.create_loan(
  p_loan_id uuid,
  p_direction text,
  p_counterparty_name text,
  p_currency_code text,
  p_principal_minor text,
  p_start_date date,
  p_due_date date default null,
  p_interest_rate_basis_points integer default null,
  p_payment_frequency text default 'none',
  p_scheduled_payment_minor text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid;
  v_principal_minor bigint;
  v_scheduled_payment_minor bigint;
  v_existing public.loans%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;


  if p_loan_id is null then
    raise exception 'Loan ID is required'
      using errcode = '22023';
  end if;


  if p_direction not in (
    'borrowed',
    'given'
  ) then
    raise exception 'Invalid loan direction'
      using errcode = '22023';
  end if;


  if nullif(
    btrim(
      p_counterparty_name
    ),
    ''
  ) is null then
    raise exception 'Counterparty is required'
      using errcode = '22023';
  end if;


  if p_currency_code is null
     or p_currency_code !~ '^[A-Z]{3}$'
     or not exists (
       select 1
       from public.currencies c
       where c.code = p_currency_code
     ) then
    raise exception 'Unsupported currency'
      using errcode = '22023';
  end if;


  begin
    v_principal_minor :=
      p_principal_minor::bigint;
  exception
    when others then
      raise exception 'Principal must be an integer minor-unit string'
        using errcode = '22023';
  end;


  if v_principal_minor <= 0 then
    raise exception 'Principal must be greater than zero'
      using errcode = '22023';
  end if;


  if p_start_date is null then
    raise exception 'Start date is required'
      using errcode = '22023';
  end if;


  if p_due_date is not null
     and p_due_date < p_start_date then
    raise exception 'Due date cannot be before start date'
      using errcode = '22023';
  end if;


  if p_interest_rate_basis_points is not null
     and (
       p_interest_rate_basis_points < 0
       or p_interest_rate_basis_points > 100000
     ) then
    raise exception 'Interest rate is out of range'
      using errcode = '22023';
  end if;


  if p_payment_frequency not in (
    'none',
    'weekly',
    'monthly',
    'custom'
  ) then
    raise exception 'Invalid payment frequency'
      using errcode = '22023';
  end if;


  if p_scheduled_payment_minor is not null then
    begin
      v_scheduled_payment_minor :=
        p_scheduled_payment_minor::bigint;
    exception
      when others then
        raise exception 'Scheduled payment must be an integer minor-unit string'
          using errcode = '22023';
    end;


    if v_scheduled_payment_minor <= 0 then
      raise exception 'Scheduled payment must be greater than zero'
        using errcode = '22023';
    end if;
  else
    v_scheduled_payment_minor :=
      null;
  end if;


  if p_payment_frequency = 'none'
     and v_scheduled_payment_minor is not null then
    raise exception 'Scheduled payment requires a payment frequency'
      using errcode = '22023';
  end if;


  select *
  into v_existing
  from public.loans l
  where l.id = p_loan_id;


  if found then
    if v_existing.user_id <> v_user_id then
      raise exception 'Loan ID is already in use'
        using errcode = '42501';
    end if;


    if v_existing.direction <> p_direction
       or v_existing.counterparty_name <> btrim(p_counterparty_name)
       or v_existing.currency_code <> p_currency_code
       or v_existing.principal_minor <> v_principal_minor
       or v_existing.start_date <> p_start_date
       or v_existing.due_date is distinct from p_due_date
       or v_existing.interest_rate_basis_points is distinct from p_interest_rate_basis_points
       or v_existing.payment_frequency <> p_payment_frequency
       or v_existing.scheduled_payment_minor is distinct from v_scheduled_payment_minor
       or coalesce(v_existing.notes, '') <> coalesce(nullif(btrim(p_notes), ''), '')
       or v_existing.deleted_at is not null then
      raise exception 'Loan ID was already used with different data'
        using errcode = '23505';
    end if;


    return p_loan_id;
  end if;


  insert into public.loans (
    id,
    user_id,
    direction,
    counterparty_name,
    currency_code,
    principal_minor,
    interest_rate_basis_points,
    start_date,
    due_date,
    payment_frequency,
    scheduled_payment_minor,
    status,
    notes
  )
  values (
    p_loan_id,
    v_user_id,
    p_direction,
    btrim(
      p_counterparty_name
    ),
    p_currency_code,
    v_principal_minor,
    p_interest_rate_basis_points,
    p_start_date,
    p_due_date,
    p_payment_frequency,
    v_scheduled_payment_minor,
    'active',
    nullif(
      btrim(
        p_notes
      ),
      ''
    )
  );


  return p_loan_id;
end;
$$;


revoke all on function public.create_loan(
  uuid,
  text,
  text,
  text,
  text,
  date,
  date,
  integer,
  text,
  text,
  text
)
from public;

grant execute on function public.create_loan(
  uuid,
  text,
  text,
  text,
  text,
  date,
  date,
  integer,
  text,
  text,
  text
)
to authenticated;


create or replace function public.add_loan_payment(
  p_payment_id uuid,
  p_loan_id uuid,
  p_amount_minor text,
  p_payment_date date default current_date,
  p_note text default null
)
returns uuid
language plpgsql
security invoker
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


  if v_loan.status not in (
    'active',
    'defaulted'
  ) then
    raise exception 'Loan does not accept payments'
      using errcode = '22023';
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
from public;

grant execute on function public.add_loan_payment(
  uuid,
  uuid,
  text,
  date,
  text
)
to authenticated;


create or replace function public.get_loan_status()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with payment_totals as (
    select
      lp.loan_id,

      coalesce(
        sum(
          lp.amount_minor
        ),
        0
      )::bigint as paid_minor,

      count(*)::bigint as payment_count,

      max(
        lp.payment_date
      ) as last_payment_date

    from public.loan_payments lp

    where
      lp.user_id = auth.uid()
      and lp.deleted_at is null

    group by
      lp.loan_id
  ),

  loan_rows as (
    select
      l.id,
      l.direction,
      l.counterparty_name,
      l.currency_code,
      l.principal_minor,
      l.interest_rate_basis_points,
      l.start_date,
      l.due_date,
      l.payment_frequency,
      l.scheduled_payment_minor,
      l.status,
      l.notes,

      coalesce(
        p.paid_minor,
        0
      )::bigint as paid_minor,

      greatest(
        l.principal_minor
        - coalesce(
            p.paid_minor,
            0
          ),
        0
      )::bigint as remaining_minor,

      coalesce(
        p.payment_count,
        0
      )::bigint as payment_count,

      p.last_payment_date,

      case
        when l.due_date is null
          then null
        else
          l.due_date
          - current_date
      end as days_to_due,

      (
        l.status in (
          'active',
          'defaulted'
        )
        and l.due_date is not null
        and l.due_date < current_date
        and greatest(
          l.principal_minor
          - coalesce(
              p.paid_minor,
              0
            ),
          0
        ) > 0
      ) as is_overdue

    from public.loans l

    left join payment_totals p
      on p.loan_id = l.id

    where
      l.user_id = auth.uid()
      and l.deleted_at is null
      and l.status <> 'archived'
  )

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',
        id,

        'direction',
        direction,

        'counterparty_name',
        counterparty_name,

        'currency_code',
        currency_code,

        'principal_minor',
        principal_minor::text,

        'paid_minor',
        paid_minor::text,

        'remaining_minor',
        remaining_minor::text,

        'interest_rate_basis_points',
        interest_rate_basis_points,

        'start_date',
        start_date,

        'due_date',
        due_date,

        'payment_frequency',
        payment_frequency,

        'scheduled_payment_minor',
        case
          when scheduled_payment_minor is null
            then null
          else scheduled_payment_minor::text
        end,

        'status',
        status,

        'notes',
        notes,

        'payment_count',
        payment_count::text,

        'last_payment_date',
        last_payment_date,

        'days_to_due',
        days_to_due,

        'is_overdue',
        is_overdue
      )
      order by
        case
          when is_overdue then 0
          when due_date is not null then 1
          else 2
        end,
        due_date asc nulls last,
        counterparty_name asc
    ),
    '[]'::jsonb
  )
  from loan_rows;
$$;


revoke all on function public.get_loan_status()
  from public;

grant execute on function public.get_loan_status()
  to authenticated;


create or replace function public.get_loan_payment_history(
  p_loan_id uuid,
  p_limit integer default 100
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_user_id uuid;
  v_limit integer;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;


  if not exists (
    select 1
    from public.loans l
    where
      l.id = p_loan_id
      and l.user_id = v_user_id
      and l.deleted_at is null
  ) then
    raise exception 'Loan not found'
      using errcode = '42501';
  end if;


  v_limit :=
    greatest(
      1,
      least(
        coalesce(
          p_limit,
          100
        ),
        500
      )
    );


  return (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id',
          rows.id,

          'amount_minor',
          rows.amount_minor::text,

          'payment_date',
          rows.payment_date,

          'note',
          rows.note,

          'created_at',
          rows.created_at
        )
        order by
          rows.payment_date desc,
          rows.created_at desc
      ),
      '[]'::jsonb
    )

    from (
      select
        lp.id,
        lp.amount_minor,
        lp.payment_date,
        lp.note,
        lp.created_at

      from public.loan_payments lp

      where
        lp.loan_id = p_loan_id
        and lp.user_id = v_user_id
        and lp.deleted_at is null

      order by
        lp.payment_date desc,
        lp.created_at desc

      limit v_limit
    ) rows
  );
end;
$$;


revoke all on function public.get_loan_payment_history(
  uuid,
  integer
)
from public;

grant execute on function public.get_loan_payment_history(
  uuid,
  integer
)
to authenticated;