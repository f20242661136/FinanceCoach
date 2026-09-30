begin;

create index if not exists loan_payments_user_payment_date_id_idx
  on public.loan_payments(user_id, payment_date desc, id desc) where deleted_at is null;

create function public.get_debt_dashboard(p_as_of date default current_date)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare v_user uuid := auth.uid(); v_result jsonb;
begin
  if v_user is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_as_of is null or p_as_of < date '1900-01-01' or p_as_of > date '9998-12-31' then
    raise exception 'Invalid dashboard date' using errcode='22023';
  end if;
  with owned_loans as materialized (
    select l.*, c.minor_unit as currency_minor_unit from public.loans l
    join public.currencies c on c.code=l.currency_code
    where l.user_id=v_user and l.deleted_at is null and l.status <> 'archived'
  ), owned_payments as materialized (
    select p.* from public.loan_payments p join owned_loans l on l.id=p.loan_id
    where p.user_id=v_user and p.deleted_at is null
  ), totals as (
    select loan_id, sum(amount_minor) as paid, count(*) as payment_count, max(payment_date) as last_payment_date
    from owned_payments group by loan_id
  ), loan_rows as (
    select l.*, coalesce(t.paid,0) as paid_minor,
      greatest(l.principal_minor-coalesce(t.paid,0),0) as remaining_minor,
      coalesce(t.payment_count,0) as payment_count, t.last_payment_date,
      l.due_date-p_as_of as days_to_due,
      (l.status in ('active','defaulted') and l.due_date is not null and l.due_date<p_as_of
        and greatest(l.principal_minor-coalesce(t.paid,0),0)>0) as is_overdue
    from owned_loans l left join totals t on t.loan_id=l.id
  ), months as (
    select m::date as month_start,
      least((m+interval '1 month'-interval '1 day')::date,p_as_of) as cutoff
    from generate_series(date_trunc('month',p_as_of)::date-interval '5 months',
      date_trunc('month',p_as_of)::date, interval '1 month') m
  ), loan_months as (
    select l.id,l.direction,l.currency_code,l.currency_minor_unit,m.month_start,
      case when l.start_date between m.month_start and m.cutoff then l.principal_minor else 0 end as principal_added,
      coalesce(sum(p.amount_minor) filter(where p.payment_date between m.month_start and m.cutoff),0) as paid,
      case when l.start_date<=m.cutoff then greatest(l.principal_minor-coalesce(sum(p.amount_minor),0),0) else 0 end as outstanding
    from owned_loans l cross join months m
    left join owned_payments p on p.loan_id=l.id and p.payment_date<=m.cutoff
    group by l.id,l.direction,l.currency_code,l.currency_minor_unit,l.start_date,l.principal_minor,m.month_start,m.cutoff
  ), trend_rows as (
    select direction,currency_code,currency_minor_unit,to_char(month_start,'YYYY-MM') as month,
      sum(principal_added)::text as principal_added_minor,sum(paid)::text as paid_minor,
      sum(outstanding)::text as outstanding_minor
    from loan_months group by direction,currency_code,currency_minor_unit,month_start
  )
  select jsonb_build_object('as_of',p_as_of,'generated_at',now(),
    'loans',coalesce((select jsonb_agg((to_jsonb(l)-'user_id'-'deleted_at') || jsonb_build_object(
      'principal_minor',l.principal_minor::text,'paid_minor',l.paid_minor::text,'remaining_minor',l.remaining_minor::text,
      'scheduled_payment_minor',l.scheduled_payment_minor::text,'payment_count',l.payment_count::text)
      order by l.start_date,l.id) from loan_rows l),'[]'::jsonb),
    'trends',coalesce((select jsonb_agg(to_jsonb(t) order by t.direction,t.currency_code,t.month) from trend_rows t),'[]'::jsonb))
  into v_result;
  return v_result;
end $$;
revoke all on function public.get_debt_dashboard(date) from public,anon;
grant execute on function public.get_debt_dashboard(date) to authenticated;

create function public.get_debt_repayment_page(p_direction text default 'borrowed',
  p_after_date date default null, p_after_id uuid default null, p_limit integer default 40)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare v_user uuid := auth.uid(); v_result jsonb;
begin
  if v_user is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_direction is null or p_direction not in ('borrowed','given') or p_limit is null or p_limit<1 or p_limit>100
    or ((p_after_date is null) <> (p_after_id is null)) then
    raise exception 'Invalid repayment page request' using errcode='22023';
  end if;
  with candidates as materialized (
    select p.id,p.loan_id,p.amount_minor::text as amount_minor,p.payment_date,p.note,p.created_at,
      l.counterparty_name,l.currency_code,c.minor_unit as currency_minor_unit
    from public.loan_payments p join public.loans l on l.id=p.loan_id and l.user_id=v_user
    join public.currencies c on c.code=l.currency_code
    where p.user_id=v_user and p.deleted_at is null and l.deleted_at is null and l.status<>'archived'
      and l.direction=p_direction and (p_after_date is null or (p.payment_date,p.id)<(p_after_date,p_after_id))
    order by p.payment_date desc,p.id desc limit p_limit+1
  ), items as materialized (
    select * from candidates order by payment_date desc,id desc limit p_limit
  )
  select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(i) order by i.payment_date desc,i.id desc) from items i),'[]'::jsonb),
    'next',case when (select count(*) from candidates)>p_limit then
      (select jsonb_build_object('date',payment_date,'id',id) from items order by payment_date,id limit 1)
      else null end) into v_result;
  return v_result;
end $$;
revoke all on function public.get_debt_repayment_page(text,date,uuid,integer) from public,anon;
grant execute on function public.get_debt_repayment_page(text,date,uuid,integer) to authenticated;

commit;
