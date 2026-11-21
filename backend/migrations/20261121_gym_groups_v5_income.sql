-- Apply after 20261121_gym_groups_v4.sql. No existing fees are treated as paid.
begin;
create table if not exists public.gym_income_entries(
 id uuid primary key default gen_random_uuid(),gym_id uuid not null references public.gym_groups on delete cascade,
 request_id uuid not null,period_id uuid references public.gym_membership_periods on delete set null,
 member_id uuid references auth.users on delete set null,plan_name text not null,
 kind text not null check(kind in ('payment','refund')),
 payment_id uuid references public.gym_income_entries on delete cascade,
 amount numeric(10,2) not null check(amount>0 and amount<=999999),currency text not null check(currency~'^[A-Z]{3}$'),
 received_on date not null,method text not null check(method in ('cash','bank','ewallet','card','other')),
 notes text not null default '' check(length(notes)<=240),recorded_by uuid references auth.users on delete set null,
 recorded_at timestamptz not null default now(),voided boolean not null default false,
 void_reason text check(length(void_reason) between 3 and 240),voided_by uuid references auth.users on delete set null,voided_at timestamptz,
 unique(gym_id,request_id),check((kind='payment' and payment_id is null) or (kind='refund' and payment_id is not null)),
 check(not voided or (void_reason is not null and voided_at is not null))
);
create index if not exists gym_income_month on public.gym_income_entries(gym_id,received_on desc,id);
create index if not exists gym_income_period on public.gym_income_entries(gym_id,period_id);
create index if not exists gym_income_refunds on public.gym_income_entries(payment_id) where not voided;
alter table public.gym_income_entries enable row level security;
revoke all on public.gym_income_entries from public,anon,authenticated;

create or replace function public.gym_group_action_v5(action text,doc jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare
 uid uuid:=auth.uid();gid uuid;g public.gym_groups;p public.gym_membership_periods;
 original public.gym_income_entries;prior public.gym_income_entries;request_key uuid;source_id uuid;
 amount_value numeric;paid_date date;payment_method text;memo text;reason text;net_paid numeric;refunded numeric;
 year_no integer;month_no integer;page_no integer;first_day date;last_day date;today date;
 rows jsonb;summary jsonb;periods jsonb;years jsonb;currencies jsonb;total integer;limit_rows integer;snapshot timestamptz;
begin
 if uid is null then raise exception 'Authentication required';end if;
 if doc is null or jsonb_typeof(doc)<>'object' then raise exception 'Invalid gym action';end if;
 if action is null or action not in ('income','income_export','record_payment','record_refund','void_income') then return public.gym_group_action_v4(action,doc);end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,631));
 select gym_id into gid from public.gym_group_members where user_id=uid;
 select * into g from public.gym_groups where id=gid for update;
 if g.id is null or g.owner_id<>uid or not exists(select 1 from public.gym_group_members where gym_id=g.id and user_id=uid) then raise exception 'Only the gym owner can view or manage income';end if;
 today:=(now() at time zone g.time_zone)::date;
 if action in ('record_payment','record_refund') then
  if coalesce(doc->>'amount','') !~ '^\d{1,6}(\.\d{1,2})?$' then raise exception 'Enter an amount greater than zero with up to two decimal places';end if;
  amount_value:=(doc->>'amount')::numeric;
  if amount_value<=0 or amount_value>999999 then raise exception 'Enter an amount greater than zero, up to 999,999';end if;
  if coalesce(doc->>'receivedOn','') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Choose the date money was received or refunded';end if;
  paid_date:=(doc->>'receivedOn')::date;
  if paid_date<date '2000-01-01' or paid_date>today then raise exception 'Payment dates must be from 2000 through today in the gym time zone';end if;
  payment_method:=doc->>'method';memo:=btrim(coalesce(doc->>'notes',''));request_key:=(doc->>'requestId')::uuid;
  if request_key is null or payment_method is null or payment_method not in ('cash','bank','ewallet','card','other') or length(memo)>240 then raise exception 'Choose a payment method and keep the note within 240 characters';end if;
  source_id:=case when action='record_payment' then (doc->>'periodId')::uuid else (doc->>'paymentId')::uuid end;
  select * into prior from public.gym_income_entries where gym_id=gid and request_id=request_key;
  if prior.id is not null then
   if prior.kind<>(case when action='record_payment' then 'payment' else 'refund' end) or prior.amount<>amount_value or prior.received_on<>paid_date or prior.method<>payment_method or prior.notes<>memo or (action='record_payment' and prior.period_id is distinct from source_id) or (action='record_refund' and prior.payment_id is distinct from source_id) then raise exception 'This save request was already used for different details. Refresh before saving again';end if;
   -- Retrying an identical request cannot double-count income.
  else
   if (select count(*) from public.gym_income_entries where gym_id=gid and received_on>=date_trunc('month',paid_date)::date and received_on<(date_trunc('month',paid_date)+interval '1 month')::date)>=5000 then raise exception 'This month has reached its 5,000-record limit';end if;
   if action='record_payment' then
    select * into p from public.gym_membership_periods where gym_id=gid and id=source_id;
    if p.id is null then raise exception 'Choose a membership record from your gym';end if;
    select coalesce(sum(case when kind='payment' then amount else -amount end),0) into net_paid from public.gym_income_entries where gym_id=gid and period_id=p.id and not voided;
    if amount_value>p.price-net_paid then raise exception 'This payment exceeds the membership fee still outstanding';end if;
    insert into public.gym_income_entries(gym_id,request_id,period_id,member_id,plan_name,kind,amount,currency,received_on,method,notes,recorded_by)
    values(gid,request_key,p.id,p.user_id,p.plan_name,'payment',amount_value,p.currency,paid_date,payment_method,memo,uid);
   else
    select * into original from public.gym_income_entries where gym_id=gid and id=source_id and kind='payment' and not voided;
    if original.id is null then raise exception 'Choose a valid payment from your gym';end if;
    if paid_date<original.received_on then raise exception 'A refund cannot be dated before its payment';end if;
    select coalesce(sum(amount),0) into refunded from public.gym_income_entries where payment_id=original.id and not voided;
    if amount_value>original.amount-refunded then raise exception 'This refund exceeds the unrefunded payment amount';end if;
    insert into public.gym_income_entries(gym_id,request_id,period_id,member_id,plan_name,kind,payment_id,amount,currency,received_on,method,notes,recorded_by)
    values(gid,request_key,original.period_id,original.member_id,original.plan_name,'refund',original.id,amount_value,original.currency,paid_date,payment_method,memo,uid);
   end if;
  end if;
 elsif action='void_income' then
  select * into original from public.gym_income_entries where gym_id=gid and id=(doc->>'id')::uuid;
  if original.id is null then raise exception 'Income record not found in your gym';end if;
  reason:=btrim(coalesce(doc->>'reason',''));
  if length(reason) not between 3 and 240 then raise exception 'Give a reason of 3-240 characters to void a record';end if;
  if original.kind='payment' and exists(select 1 from public.gym_income_entries where payment_id=original.id and not voided) then raise exception 'Void this payment''s refund records first';end if;
  update public.gym_income_entries set voided=true,void_reason=reason,voided_by=uid,voided_at=now() where id=original.id and not voided;
 end if;
 year_no:=coalesce(nullif(doc->>'year','')::integer,extract(year from today)::integer);
 month_no:=coalesce(nullif(doc->>'month','')::integer,extract(month from today)::integer);
 page_no:=greatest(0,coalesce(nullif(doc->>'page','')::integer,0));
 if year_no not between 2000 and 2100 or month_no not between 1 and 12 or page_no>1000 then raise exception 'Choose a valid income year, month and page';end if;
 first_day:=make_date(year_no,month_no,1);last_day:=(first_day+interval '1 month')::date;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.month,x.currency),'[]'::jsonb) into summary from (
  select to_char(received_on,'YYYY-MM') as month,currency,
   coalesce(sum(amount) filter(where kind='payment'),0)::text as received,
   coalesce(sum(amount) filter(where kind='refund'),0)::text as refunds,
   sum(case when kind='payment' then amount else -amount end)::text as net,count(*)::integer as records
  from public.gym_income_entries where gym_id=gid and not voided and received_on>=make_date(year_no,1,1) and received_on<make_date(year_no+1,1,1) group by to_char(received_on,'YYYY-MM'),currency
 )x;
 select count(*) into total from public.gym_income_entries where gym_id=gid and received_on>=first_day and received_on<last_day;
 limit_rows:=case when action='income_export' then 500 else 25 end;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.received_on desc,x.recorded_at desc,x.id),'[]'::jsonb) into rows from (
  select e.id,e.kind,e.payment_id,e.period_id,e.plan_name,e.amount::text,e.currency,e.received_on,e.method,e.notes,e.voided,e.void_reason,e.recorded_at,
   coalesce(nullif(u.raw_user_meta_data->>'username',''),nullif(u.raw_user_meta_data->>'display_name',''),'Former member') as member_name,
   coalesce(nullif(a.raw_user_meta_data->>'username',''),nullif(a.raw_user_meta_data->>'display_name',''),'Former admin') as recorded_by,
   case when e.kind='payment' and not e.voided then (e.amount-coalesce((select sum(r.amount) from public.gym_income_entries r where r.payment_id=e.id and not r.voided),0))::text else '0' end as refundable
  from public.gym_income_entries e left join auth.users u on u.id=e.member_id left join auth.users a on a.id=e.recorded_by
  where e.gym_id=gid and e.received_on>=first_day and e.received_on<last_day
  order by e.received_on desc,e.recorded_at desc,e.id limit limit_rows offset page_no*limit_rows
 )x;
 if action='income_export' then
  select max(greatest(recorded_at,coalesce(voided_at,recorded_at))) into snapshot from public.gym_income_entries where gym_id=gid and received_on>=first_day and received_on<last_day;
  return jsonb_build_object('year',year_no,'month',month_no,'page',page_no,'entries',rows,'total',total,'snapshot',snapshot);
 end if;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.starts_on desc,x.id),'[]'::jsonb) into periods from (
  select mp.id,mp.plan_name,mp.price::text,mp.currency,mp.starts_on,mp.ends_on,mp.cancelled,
   coalesce(nullif(u.raw_user_meta_data->>'username',''),nullif(u.raw_user_meta_data->>'display_name',''),'Former member') as member_name,
   greatest(0,mp.price-coalesce((select sum(case when e.kind='payment' then e.amount else -e.amount end) from public.gym_income_entries e where e.period_id=mp.id and not e.voided),0))::text as outstanding
  from public.gym_membership_periods mp join auth.users u on u.id=mp.user_id where mp.gym_id=gid
 )x;
 select jsonb_agg(y order by y desc) into years from (select distinct extract(year from received_on)::integer as y from public.gym_income_entries where gym_id=gid union select extract(year from today)::integer union select year_no)x;
 select coalesce(jsonb_agg(c order by c),'["PHP"]'::jsonb) into currencies from (select currency as c from public.gym_income_entries where gym_id=gid union select currency from public.gym_membership_periods where gym_id=gid)x;
 return jsonb_build_object('year',year_no,'month',month_no,'page',page_no,'summary',summary,'entries',rows,'total',total,'periods',periods,'years',years,'currencies',currencies,'timeZone',g.time_zone);
end$$;
revoke all on function public.gym_group_action_v5(text,jsonb) from public,anon;
grant execute on function public.gym_group_action_v5(text,jsonb) to authenticated;

-- Preserve monetary history without retaining a reset/deleted member's identity.
create or replace function public.anonymize_gym_income_identity() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
declare person uuid;
begin
 if tg_op='UPDATE' then
  if not (old.raw_user_meta_data ? 'fitsync_onboarding' and not(coalesce(new.raw_user_meta_data,'{}'::jsonb) ? 'fitsync_onboarding')) then return new;end if;
  person:=new.id;
 else
  person:=old.id;
  -- Detach before deleting the auth row so legacy removal notices still have
  -- a valid recipient; those notices then cascade with account deletion.
  delete from public.gym_group_members where user_id=person;
 end if;
 update public.gym_income_entries set member_id=null,period_id=null,notes='',void_reason=case when voided then 'Account data removed' else null end where member_id=person;
 update public.gym_income_entries set recorded_by=null where recorded_by=person;
 update public.gym_income_entries set voided_by=null where voided_by=person;
 if tg_op='DELETE' then return old;else return new;end if;
end$$;
revoke all on function public.anonymize_gym_income_identity() from public,anon,authenticated;
drop trigger if exists gym_income_reset_identity on auth.users;
create trigger gym_income_reset_identity after update of raw_user_meta_data on auth.users for each row execute function public.anonymize_gym_income_identity();
drop trigger if exists gym_income_delete_identity on auth.users;
create trigger gym_income_delete_identity before delete on auth.users for each row execute function public.anonymize_gym_income_identity();
notify pgrst,'reload schema';
commit;
