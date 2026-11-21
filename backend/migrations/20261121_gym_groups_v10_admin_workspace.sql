-- Admin operations, closed joining, checkout and event registration metadata. Apply after v9.
begin;
alter table public.gym_groups drop constraint if exists gym_groups_join_mode_check;
alter table public.gym_groups add constraint gym_groups_join_mode_check check(join_mode in ('open','approval','invite','closed'));
alter table public.gym_daily_checkins add column if not exists checked_out_at timestamptz;
alter table public.gym_membership_plans add column if not exists created_at timestamptz;
alter table public.gym_membership_plans alter column created_at set default now();
alter table public.gym_bans add column if not exists banned_at timestamptz;
alter table public.gym_bans alter column banned_at set default now();
alter table public.gym_session_attendees add column if not exists registered_at timestamptz;
alter table public.gym_session_attendees alter column registered_at set default now();
alter table public.gym_announcements add column if not exists session_id uuid references public.gym_sessions on delete set null;
create unique index if not exists gym_announcement_session on public.gym_announcements(session_id) where session_id is not null;
create table if not exists public.gym_payment_batches(
 gym_id uuid references public.gym_groups on delete cascade,request_id uuid not null,payload jsonb not null,primary key(gym_id,request_id)
);
alter table public.gym_payment_batches enable row level security;
revoke all on public.gym_payment_batches from public,anon,authenticated;
create or replace function public.clear_gym_payment_batches() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if tg_op='DELETE' then delete from public.gym_payment_batches where payload->>'userId'=old.id::text;return old;end if;
 if old.raw_user_meta_data ? 'fitsync_onboarding' and not(coalesce(new.raw_user_meta_data,'{}'::jsonb) ? 'fitsync_onboarding') then delete from public.gym_payment_batches where payload->>'userId'=new.id::text;end if;
 return new;
end$$;
revoke all on function public.clear_gym_payment_batches() from public,anon,authenticated;
drop trigger if exists gym_batch_reset on auth.users;
create trigger gym_batch_reset after update of raw_user_meta_data on auth.users for each row execute function public.clear_gym_payment_batches();
drop trigger if exists gym_batch_delete on auth.users;
create trigger gym_batch_delete before delete on auth.users for each row execute function public.clear_gym_payment_batches();
create or replace function public.guard_closed_gym() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if exists(select 1 from public.gym_groups where id=new.gym_id and join_mode='closed' and owner_id<>new.user_id) then raise exception 'This gym is closed to new memberships';end if;
 return new;
end$$;
revoke all on function public.guard_closed_gym() from public,anon,authenticated;
drop trigger if exists gym_closed_members_guard on public.gym_group_members;
create trigger gym_closed_members_guard before insert on public.gym_group_members for each row execute function public.guard_closed_gym();
drop trigger if exists gym_closed_requests_guard on public.gym_join_requests;
create trigger gym_closed_requests_guard before insert on public.gym_join_requests for each row execute function public.guard_closed_gym();
create or replace function public.guard_open_gym_visit() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if exists(select 1 from public.gym_daily_checkins where gym_id=new.gym_id and user_id=new.user_id and checked_on<>new.checked_on and checked_out_at is null) then raise exception 'Check out your previous visit before checking in again';end if;
 return new;
end$$;
revoke all on function public.guard_open_gym_visit() from public,anon,authenticated;
drop trigger if exists gym_open_visit_guard on public.gym_daily_checkins;
create trigger gym_open_visit_guard before insert on public.gym_daily_checkins for each row execute function public.guard_open_gym_visit();

create or replace function public.gym_group_action_v10(action text,doc jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid();g public.gym_groups;m public.gym_group_members;result jsonb;rows jsonb;balances jsonb;
 period_row public.gym_membership_periods;plan public.gym_membership_plans;r record;s public.gym_sessions;
 target uuid;object_id uuid;request_key uuid;mode text;scope text;kind text;search text;
 from_day date;to_day date;today date;start_day date;end_day date;visit_day date;page_no integer;total integer;
 amount_value numeric;remaining numeric;outstanding numeric;net_paid numeric;part numeric;payload jsonb;prior jsonb;
 start_time timestamptz;end_time timestamptz;zone text;paid_date date;
begin
 if uid is null then raise exception 'Authentication required';end if;
 if action is null or doc is null or jsonb_typeof(doc)<>'object' then raise exception 'Invalid gym action';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,631));
 select gg.* into g from public.gym_groups gg join public.gym_group_members mm on mm.gym_id=gg.id where mm.user_id=uid for update of gg;
 if g.id is not null then select * into m from public.gym_group_members where gym_id=g.id and user_id=uid;end if;
 if action in ('admin_data','admin_report','delete_plan','edit_member_plan','pay_member','post_announcement','post_event','session_registrations','admin_settings') then
  if g.id is null or m.user_id is null or g.owner_id<>uid then raise exception 'Only the gym admin can manage this workspace';end if;
 end if;
 today:=(now() at time zone coalesce(g.time_zone,'Asia/Manila'))::date;
 if nullif(doc->>'from','') is not null then from_day:=(doc->>'from')::date;end if;
 if nullif(doc->>'to','') is not null then to_day:=(doc->>'to')::date;end if;
 if from_day>to_day then raise exception 'From date must be on or before To date';end if;
 if coalesce(doc->>'page','0') !~ '^\d{1,5}$' then raise exception 'Invalid page';end if;
 page_no:=coalesce(doc->>'page','0')::integer;search:=lower(btrim(coalesce(doc->>'q','')));
 target:=nullif(doc->>'userId','')::uuid;object_id:=nullif(doc->>'id','')::uuid;
 if action='admin_settings' then
  mode:=doc->>'joinMode';if mode is null or mode not in ('open','approval','invite','closed') then raise exception 'Choose a joining status';end if;
  perform public.gym_group_settings(doc||jsonb_build_object('joinMode',case when mode='closed' then 'invite' else mode end));
  if mode='closed' then update public.gym_groups set join_mode='closed' where id=g.id;delete from public.gym_join_requests where gym_id=g.id;end if;
  return public.gym_group_action_v10('admin_data','{}');
 elsif action='delete_plan' then
  delete from public.gym_membership_plans where id=object_id and gym_id=g.id;
  if not found then raise exception 'Plan not found in your gym';end if;
  insert into public.gym_activity(gym_id,actor_id,action) values(g.id,uid,'delete_plan');
  return public.gym_group_action_v10('admin_data','{}');
 elsif action='edit_member_plan' then
  if not exists(select 1 from public.gym_group_members where gym_id=g.id and user_id=target) then raise exception 'Member not found in your gym';end if;
  select * into plan from public.gym_membership_plans where gym_id=g.id and id=(doc->>'planId')::uuid and not archived;
  if plan.id is null then raise exception 'Choose an available plan';end if;
  start_day:=(doc->>'startsOn')::date;end_day:=(doc->>'endsOn')::date;
  if start_day is null or end_day is null or end_day<start_day or end_day>start_day+729 or start_day<today-365 or start_day>today+730 then raise exception 'Choose valid coverage dates within the supported range';end if;
  if object_id is null then
   perform public.gym_group_action_v5('assign_plan',jsonb_build_object('userId',target,'planId',plan.id,'startsOn',start_day,'endsOn',end_day));
  else
   select * into period_row from public.gym_membership_periods where id=object_id and gym_id=g.id and user_id=target and not cancelled;
   if period_row.id is null then raise exception 'Active membership record not found';end if;
   if exists(select 1 from public.gym_membership_periods where gym_id=g.id and user_id=target and id<>period_row.id and not cancelled and starts_on<=end_day and ends_on>=start_day) then raise exception 'Membership dates cannot overlap';end if;
   select coalesce(sum(case when e.kind='payment' then e.amount else -e.amount end),0) into net_paid from public.gym_income_entries e where e.period_id=period_row.id and not e.voided;
   if plan.price<net_paid then raise exception 'The plan fee cannot be lower than money already paid';end if;
   if plan.currency<>period_row.currency and exists(select 1 from public.gym_income_entries where period_id=period_row.id and not voided) then raise exception 'Keep the currency of a membership with payment history';end if;
   update public.gym_membership_periods set plan_id=plan.id,plan_name=plan.name,price=plan.price,currency=plan.currency,starts_on=start_day,ends_on=end_day where id=period_row.id;
   insert into public.gym_activity(gym_id,actor_id,target_id,action) values(g.id,uid,target,'edit_member_plan');
  end if;
  return public.gym_group_action_v10('admin_data','{}');
 elsif action='pay_member' then
  if not exists(select 1 from public.gym_group_members where gym_id=g.id and user_id=target) then raise exception 'Member not found in your gym';end if;
  if coalesce(doc->>'amount','') !~ '^\d{1,6}(\.\d{1,2})?$' then raise exception 'Enter an amount with up to two decimal places';end if;
  amount_value:=(doc->>'amount')::numeric;request_key:=(doc->>'requestId')::uuid;
  if request_key is null or amount_value<=0 or amount_value>999999 then raise exception 'Enter a positive payment up to 999999';end if;
  payload:=jsonb_build_object('userId',target,'currency',doc->>'currency','amount',amount_value,'receivedOn',doc->>'receivedOn','method',doc->>'method','notes',coalesce(doc->>'notes',''));
  select b.payload into prior from public.gym_payment_batches b where b.gym_id=g.id and b.request_id=request_key;
  if prior is not null then
   if prior<>payload then raise exception 'This payment request was already used for different details';end if;
  else
   select coalesce(sum(p.price-coalesce((select sum(case when e.kind='payment' then e.amount else -e.amount end) from public.gym_income_entries e where e.period_id=p.id and not e.voided),0)),0) into outstanding from public.gym_membership_periods p where p.gym_id=g.id and p.user_id=target and p.currency=doc->>'currency';
   if amount_value>outstanding then raise exception 'Payment cannot exceed the outstanding balance';end if;
   remaining:=amount_value;
   for r in select p.id,p.price-coalesce((select sum(case when e.kind='payment' then e.amount else -e.amount end) from public.gym_income_entries e where e.period_id=p.id and not e.voided),0) as due from public.gym_membership_periods p where p.gym_id=g.id and p.user_id=target and p.currency=doc->>'currency' order by p.starts_on,p.created_at,p.id loop
    if remaining<=0 then exit;end if;
    part:=least(remaining,r.due);
    if part>0 then perform public.gym_group_action_v5('record_payment',jsonb_build_object('periodId',r.id,'amount',part::text,'receivedOn',doc->>'receivedOn','method',doc->>'method','notes',coalesce(doc->>'notes',''),'requestId',gen_random_uuid()));remaining:=remaining-part;end if;
   end loop;
   if remaining<>0 then raise exception 'Unable to allocate this payment. Refresh and try again';end if;
   insert into public.gym_payment_batches values(g.id,request_key,payload);
  end if;
  return public.gym_group_action_v10('admin_data','{}');
 elsif action in ('post_announcement','post_event') then
  request_key:=(doc->>'requestId')::uuid;
  if request_key is null or length(btrim(coalesce(doc->>'title',''))) not between 3 and 100 or length(btrim(coalesce(doc->>'body',''))) not between 1 and 2000 then raise exception 'Use a title of 3-100 characters and a message up to 2000';end if;
  if exists(select 1 from public.gym_announcements where id=request_key and gym_id=g.id) then
   if not exists(select 1 from public.gym_announcements a where a.id=request_key and a.title=btrim(doc->>'title') and a.body=btrim(doc->>'body') and a.pinned=coalesce((doc->>'pinned')::boolean,true) and ((action='post_announcement' and a.session_id is null) or (action='post_event' and a.session_id=request_key and exists(select 1 from public.gym_sessions ss where ss.id=request_key and ss.starts_at=public.gym_local_instant(doc->>'startsLocal',g.time_zone) and ss.ends_at=public.gym_local_instant(doc->>'endsLocal',g.time_zone) and ss.capacity=(doc->>'capacity')::integer)))) then raise exception 'This post request was already used';end if;
   return public.gym_group_action_v10('admin_data','{}');
  end if;
  if (select count(*) from public.gym_announcements where gym_id=g.id)>=50 then raise exception 'This gym has reached its 50-announcement limit';end if;
  if coalesce((doc->>'pinned')::boolean,true) and (select count(*) from public.gym_announcements where gym_id=g.id and pinned)>=3 then raise exception 'Unpin an announcement before pinning another (maximum 3)';end if;
  if action='post_event' then
   if doc->>'timeZone' is distinct from g.time_zone then raise exception 'Gym time zone changed. Refresh before scheduling';end if;
   start_time:=public.gym_local_instant(doc->>'startsLocal',g.time_zone);end_time:=public.gym_local_instant(doc->>'endsLocal',g.time_zone);
   if start_time<=now() or start_time>now()+interval '180 days' or end_time<=start_time or end_time>start_time+interval '8 hours' or coalesce((doc->>'capacity')::integer,0) not between 1 and 100 then raise exception 'Choose a future session within 180 days, up to 8 hours and 1-100 places';end if;
   if (select count(*) from public.gym_sessions where gym_id=g.id and starts_at>now())>=50 then raise exception 'This gym has reached its upcoming session limit';end if;
   insert into public.gym_sessions(id,gym_id,title,description,starts_at,ends_at,capacity) values(request_key,g.id,btrim(doc->>'title'),left(btrim(doc->>'body'),1000),start_time,end_time,(doc->>'capacity')::integer);
  end if;
  insert into public.gym_announcements(id,gym_id,author_id,title,body,pinned,session_id) values(request_key,g.id,uid,btrim(doc->>'title'),btrim(doc->>'body'),coalesce((doc->>'pinned')::boolean,true),case when action='post_event' then request_key else null end);
  insert into public.gym_activity(gym_id,actor_id,action) values(g.id,uid,case when action='post_event' then 'schedule' else 'announce' end);
  return public.gym_group_action_v10('admin_data','{}');
 elsif action='session_registrations' then
  if not exists(select 1 from public.gym_sessions where gym_id=g.id and id=object_id) then raise exception 'Session not found';end if;
  select coalesce(jsonb_agg(jsonb_build_object('user_id',u.id,'username',coalesce(u.raw_user_meta_data->>'username','Gym member'),'registered_at',a.registered_at) order by a.registered_at nulls last,u.id),'[]') into rows from public.gym_session_attendees a join auth.users u on u.id=a.user_id where a.session_id=object_id;
  return jsonb_build_object('entries',rows,'timeZone',g.time_zone);
 elsif action='admin_report' then
  kind:=doc->>'kind';
  if kind='visits' then
   select count(*) into total from public.gym_daily_checkins c join auth.users u on u.id=c.user_id where c.gym_id=g.id and (target is null or c.user_id=target) and (from_day is null or c.checked_on>=from_day) and (to_day is null or c.checked_on<=to_day) and (search='' or position(search in lower(coalesce(u.raw_user_meta_data->>'username','Gym member')))>0);
   select coalesce(jsonb_agg(x order by x.checked_at desc,x.user_id),'[]') into rows from (select c.*,coalesce(u.raw_user_meta_data->>'username','Gym member') as username from public.gym_daily_checkins c join auth.users u on u.id=c.user_id where c.gym_id=g.id and (target is null or c.user_id=target) and (from_day is null or c.checked_on>=from_day) and (to_day is null or c.checked_on<=to_day) and (search='' or position(search in lower(coalesce(u.raw_user_meta_data->>'username','Gym member')))>0) order by c.checked_at desc,c.user_id limit 10 offset page_no*10)x;
  elsif kind='payments' then
   select count(*) into total from public.gym_income_entries e where e.gym_id=g.id and (from_day is null or e.received_on>=from_day) and (to_day is null or e.received_on<=to_day) and (search='' or position(search in lower(coalesce((select u.raw_user_meta_data->>'username' from auth.users u where u.id=e.member_id),'Former member')||' '||e.plan_name))>0);
   select coalesce(jsonb_agg(x order by x.received_on desc,x.recorded_at desc,x.id),'[]') into rows from (select e.*,coalesce(u.raw_user_meta_data->>'username','Former member') as member_name,greatest(0,e.amount-coalesce((select sum(rr.amount) from public.gym_income_entries rr where rr.payment_id=e.id and not rr.voided),0)) as refundable from public.gym_income_entries e left join auth.users u on u.id=e.member_id where e.gym_id=g.id and (from_day is null or e.received_on>=from_day) and (to_day is null or e.received_on<=to_day) and (search='' or position(search in lower(coalesce(u.raw_user_meta_data->>'username','Former member')||' '||e.plan_name))>0) order by e.received_on desc,e.recorded_at desc,e.id limit 10 offset page_no*10)x;
  else raise exception 'Choose a supported report';end if;
  return jsonb_build_object('entries',rows,'total',total,'timeZone',g.time_zone,'today',today);
 elsif action='check_out' then
  if g.id is null or m.user_id is null then raise exception 'Join a gym first';end if;
  if g.owner_id=uid then raise exception 'The gym admin reviews attendance';end if;
  visit_day:=(doc->>'visitDate')::date;
  if not exists(select 1 from public.gym_daily_checkins where gym_id=g.id and user_id=uid and checked_on=visit_day) then raise exception 'Your visit was not found';end if;
  update public.gym_daily_checkins set checked_out_at=now() where gym_id=g.id and user_id=uid and checked_on=visit_day and checked_out_at is null and checked_at<=now();
  action:='checkins';
 end if;
 if action='admin_data' then
  result:=public.gym_group_action_v8('mine','{}');
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at nulls last,x.id),'[]') into rows from (select * from public.gym_membership_plans where gym_id=g.id)x;result:=result||jsonb_build_object('plans',rows);
  select coalesce(jsonb_agg(jsonb_build_object('user_id',b.user_id,'username',coalesce(u.raw_user_meta_data->>'username','Gym member'),'banned_at',b.banned_at)),'[]') into rows from public.gym_bans b join auth.users u on u.id=b.user_id where b.gym_id=g.id;result:=result||jsonb_build_object('bans',rows);
  select coalesce(jsonb_agg(x order by x.created_at desc,x.id),'[]') into rows from (select a.*,coalesce(u.raw_user_meta_data->>'username','Former member') as actor,coalesce(t.raw_user_meta_data->>'username','Former member') as target,case when a.actor_id=g.owner_id then 'admin' else coalesce(mm.role,'former') end as actor_role from public.gym_activity a left join auth.users u on u.id=a.actor_id left join auth.users t on t.id=a.target_id left join public.gym_group_members mm on mm.user_id=a.actor_id and mm.gym_id=g.id where a.gym_id=g.id order by a.created_at desc,a.id limit 200)x;result:=result||jsonb_build_object('activity',rows);
  select coalesce(jsonb_agg(x order by x.starts_on desc,x.id),'[]') into balances from (select p.*,coalesce(u.raw_user_meta_data->>'username','Former member') as username,coalesce((select sum(case when e.kind='payment' then e.amount else -e.amount end) from public.gym_income_entries e where e.period_id=p.id and not e.voided),0) as paid,p.price-coalesce((select sum(case when e.kind='payment' then e.amount else -e.amount end) from public.gym_income_entries e where e.period_id=p.id and not e.voided),0) as outstanding from public.gym_membership_periods p left join auth.users u on u.id=p.user_id where p.gym_id=g.id)x;
  result:=result||jsonb_build_object('balances',balances,'today',today);
 elsif action in ('mine','checkins','check_in','confirm_checkin') then result:=public.gym_group_action_v8(action,doc);
 else result:=public.gym_group_action_v8(action,doc);end if;
 if result->'gym' is not null and result->'gym'<>'null'::jsonb then
  select coalesce(jsonb_agg(to_jsonb(a)||jsonb_build_object('username',coalesce(u.raw_user_meta_data->>'username','Gym team')) order by a.pinned desc,a.created_at desc),'[]') into rows from public.gym_announcements a left join auth.users u on u.id=a.author_id where a.gym_id=(result->'gym'->>'id')::uuid;
  result:=result||jsonb_build_object('announcements',rows);
 elsif action in ('checkins','check_in','confirm_checkin') then
  select coalesce(jsonb_agg(value||jsonb_build_object('checked_out_at',(select c.checked_out_at from public.gym_daily_checkins c where c.gym_id=g.id and c.user_id=(value->>'user_id')::uuid and c.checked_on=(value->>'checked_on')::date))),'[]') into rows from jsonb_array_elements(result->'entries');
  select to_jsonb(c) into prior from public.gym_daily_checkins c where c.gym_id=g.id and c.user_id=uid and c.checked_out_at is null order by c.checked_at desc limit 1;
  result:=result||jsonb_build_object('entries',rows,'openVisit',prior,'checkedOutAt',(select checked_out_at from public.gym_daily_checkins where gym_id=g.id and user_id=uid and checked_on=today));
 end if;
 return result;
end$$;
revoke all on function public.gym_group_action_v10(text,jsonb) from public,anon;
grant execute on function public.gym_group_action_v10(text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
