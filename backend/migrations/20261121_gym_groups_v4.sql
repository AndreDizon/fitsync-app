-- Apply after 20261121_gym_groups_time_zone.sql.
begin;
alter table public.gym_groups add column if not exists welcome_message text not null default '' check(length(welcome_message)<=1000);
alter table public.gym_groups add column if not exists rules text not null default '' check(length(rules)<=4000);
create table if not exists public.gym_membership_plans(
 id uuid primary key default gen_random_uuid(),gym_id uuid not null references public.gym_groups on delete cascade,
 name text not null check(length(btrim(name)) between 3 and 80),description text not null default '' check(length(description)<=500),
 duration_days integer not null check(duration_days between 1 and 730),price numeric(10,2) not null default 0 check(price between 0 and 999999),
 currency text not null default 'PHP' check(currency~'^[A-Z]{3}$'),archived boolean not null default false
);
create table if not exists public.gym_membership_periods(
 id uuid primary key default gen_random_uuid(),gym_id uuid not null references public.gym_groups on delete cascade,
 user_id uuid not null references auth.users on delete cascade,plan_id uuid references public.gym_membership_plans on delete set null,
 plan_name text not null,price numeric(10,2) not null,currency text not null,
 starts_on date not null,ends_on date not null,cancelled boolean not null default false,
 created_at timestamptz not null default now(),check(ends_on>=starts_on and ends_on<=starts_on+729)
);
create table if not exists public.gym_attendance(
 session_id uuid not null references public.gym_sessions on delete cascade,user_id uuid not null references auth.users on delete cascade,
 status text not null check(status in ('attended','absent','excused')),marked_by uuid references auth.users on delete set null,
 updated_at timestamptz not null default now(),primary key(session_id,user_id)
);
create table if not exists public.gym_notifications(
 id uuid primary key default gen_random_uuid(),gym_id uuid not null references public.gym_groups on delete cascade,
 user_id uuid not null references auth.users on delete cascade,event_key text not null,
 feature text not null check(feature in ('gym','gymRenewal')),title text not null,body text not null,
 gym_tab text not null,created_at timestamptz not null default now(),unique(user_id,event_key)
);
create index if not exists gym_plans_group on public.gym_membership_plans(gym_id,archived);
create index if not exists gym_periods_member on public.gym_membership_periods(gym_id,user_id,starts_on desc);
create index if not exists gym_notices_recipient on public.gym_notifications(user_id,created_at desc);
create index if not exists gym_attendance_member on public.gym_attendance(user_id);
do $$declare t text;begin
 foreach t in array array['gym_membership_plans','gym_membership_periods','gym_attendance','gym_notifications'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
 end loop;
end$$;

-- Database triggers cover current and older clients. Only plain, scoped summaries
-- enter notifications; never health records or another member's plan details.
create or replace function public.notify_gym_event() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
declare g public.gym_groups;gid uuid;recipient uuid;event text;heading text;message text;section text;source text;
begin
 if tg_table_name='gym_groups' then gid:=new.id;
 elsif tg_op='DELETE' then gid:=old.gym_id;else gid:=new.gym_id;end if;
 select * into g from public.gym_groups where id=gid;
 if g.id is null then if tg_op='DELETE' then return old;else return new;end if;end if;
 if tg_table_name='gym_group_members' then
  if tg_op='INSERT' then
   insert into public.gym_notifications(gym_id,user_id,event_key,feature,title,body,gym_tab)
   values(gid,new.user_id,'joined:'||gid||':'||new.joined_at,'gym','Welcome to '||g.name,'Your gym membership is ready. Read the welcome message and gym rules.','announcements') on conflict do nothing;
  elsif tg_op='DELETE' then
   update public.gym_membership_periods set cancelled=true where gym_id=gid and user_id=old.user_id and not cancelled and ends_on>=(now() at time zone g.time_zone)::date;
   delete from public.gym_notifications where user_id=old.user_id and gym_id=gid;
   if auth.uid() is distinct from old.user_id then
    insert into public.gym_notifications(gym_id,user_id,event_key,feature,title,body,gym_tab) values(gid,old.user_id,'removed:'||gid||':'||clock_timestamp(),'gym','Your gym membership changed','You are no longer a community member of '||g.name||'.','team') on conflict do nothing;
   end if;
  elsif old.role<>new.role then
   insert into public.gym_notifications(gym_id,user_id,event_key,feature,title,body,gym_tab) values(gid,new.user_id,'role:'||new.user_id||':'||clock_timestamp(),'gym','Your gym role changed','Your role in '||g.name||' has been updated. Open the team to review it.','team') on conflict do nothing;
  end if;
 elsif tg_table_name='gym_join_requests' then
  if tg_op='INSERT' then
   insert into public.gym_notifications(gym_id,user_id,event_key,feature,title,body,gym_tab)
   select gid,m.user_id,'request:'||new.user_id||':'||new.created_at,'gym','A gym join request is waiting','Review the new request for '||g.name||'.','team'
   from public.gym_group_members m where m.gym_id=gid and (m.user_id=g.owner_id or m.role='staff') on conflict do nothing;
  elsif auth.uid() is distinct from old.user_id and not exists(select 1 from public.gym_group_members where user_id=old.user_id and gym_id=gid) then
   insert into public.gym_notifications(gym_id,user_id,event_key,feature,title,body,gym_tab) values(gid,old.user_id,'request-ended:'||old.created_at||':'||gid,'gym','Your gym request has ended','Your request to join '||g.name||' is no longer pending. It may have been declined or the joining policy changed.','team') on conflict do nothing;
  end if;
 elsif tg_table_name='gym_announcements' then
  if tg_op='UPDATE' and old.title=new.title and old.body=new.body then return new;end if;
  heading:=case when tg_op='INSERT' then 'New gym announcement' else 'Gym announcement updated' end;
  insert into public.gym_notifications(gym_id,user_id,event_key,feature,title,body,gym_tab)
  select gid,m.user_id,'announcement:'||new.id||':'||new.updated_at,'gym',heading,g.name||': '||new.title,'announcements'
  from public.gym_group_members m where m.gym_id=gid and m.user_id is distinct from auth.uid() on conflict do nothing;
 elsif tg_table_name='gym_sessions' then
  if tg_op='INSERT' then
   insert into public.gym_notifications(gym_id,user_id,event_key,feature,title,body,gym_tab)
   select gid,m.user_id,'session:'||new.id,'gym','New gym session',g.name||': '||new.title||' — '||to_char(new.starts_at at time zone g.time_zone,'Mon DD, HH24:MI')||' ('||g.time_zone||').','sessions'
   from public.gym_group_members m where m.gym_id=gid and m.user_id is distinct from auth.uid() on conflict do nothing;
  else
   insert into public.gym_notifications(gym_id,user_id,event_key,feature,title,body,gym_tab)
   select gid,a.user_id,'cancelled:'||old.id,'gym','Gym session cancelled',g.name||': '||old.title||' has been cancelled.','sessions'
   from public.gym_session_attendees a join public.gym_group_members m on m.user_id=a.user_id and m.gym_id=gid where a.session_id=old.id on conflict do nothing;
  end if;
 elsif tg_table_name='gym_groups' then
  if old.owner_id<>new.owner_id then
   insert into public.gym_notifications(gym_id,user_id,event_key,feature,title,body,gym_tab) values(gid,new.owner_id,'owner:'||clock_timestamp(),'gym','You are the gym admin','Ownership of '||g.name||' has been transferred to you.','team') on conflict do nothing;
  end if;
  if old.rules<>new.rules or old.welcome_message<>new.welcome_message then
   insert into public.gym_notifications(gym_id,user_id,event_key,feature,title,body,gym_tab)
   select gid,m.user_id,'guidance:'||gid||':'||clock_timestamp(),'gym','Gym guidance updated','Read the latest welcome message and rules for '||g.name||'.','announcements'
   from public.gym_group_members m where m.gym_id=gid and m.user_id is distinct from auth.uid() on conflict do nothing;
  end if;
 end if;
 if tg_op='DELETE' then return old;else return new;end if;
end$$;
revoke all on function public.notify_gym_event() from public,anon,authenticated;
drop trigger if exists gym_member_notices on public.gym_group_members;
create trigger gym_member_notices after insert or update or delete on public.gym_group_members for each row execute function public.notify_gym_event();
drop trigger if exists gym_request_notices on public.gym_join_requests;
create trigger gym_request_notices after insert or delete on public.gym_join_requests for each row execute function public.notify_gym_event();
drop trigger if exists gym_announcement_notices on public.gym_announcements;
create trigger gym_announcement_notices after insert or update on public.gym_announcements for each row execute function public.notify_gym_event();
drop trigger if exists gym_session_created_notice on public.gym_sessions;
create trigger gym_session_created_notice after insert on public.gym_sessions for each row execute function public.notify_gym_event();
drop trigger if exists gym_session_cancelled_notice on public.gym_sessions;
create trigger gym_session_cancelled_notice before delete on public.gym_sessions for each row execute function public.notify_gym_event();
drop trigger if exists gym_guidance_notices on public.gym_groups;
create trigger gym_guidance_notices after update on public.gym_groups for each row execute function public.notify_gym_event();

create or replace function public.queue_gym_reminders(recipient uuid default null) returns integer
language plpgsql security definer set search_path=pg_catalog,public as $$
declare p record;days_left integer;stage text;n integer:=0;added integer;
begin
 -- Withdraw reminders that became stale after cancellation or a covering renewal.
 delete from public.gym_notifications n using public.gym_membership_periods prior
 where n.feature='gymRenewal' and n.user_id=prior.user_id and n.event_key like 'renewal:'||prior.id||':%'
  and (recipient is null or n.user_id=recipient)
  and (prior.cancelled or exists(select 1 from public.gym_membership_periods newer join public.gym_groups gg on gg.id=newer.gym_id
    where newer.user_id=prior.user_id and newer.gym_id=prior.gym_id and not newer.cancelled and newer.starts_on>prior.starts_on
    and (newer.starts_on<=(now() at time zone gg.time_zone)::date or newer.starts_on<=prior.ends_on+1) and newer.ends_on>prior.ends_on));
 for p in
  select mp.*,g.name as gym_name,g.time_zone from public.gym_membership_periods mp
  join public.gym_groups g on g.id=mp.gym_id join public.gym_group_members m on m.gym_id=mp.gym_id and m.user_id=mp.user_id
  where not mp.cancelled and (recipient is null or mp.user_id=recipient) and mp.starts_on<=(now() at time zone g.time_zone)::date and mp.ends_on>=(now() at time zone g.time_zone)::date-30
   and not exists(select 1 from public.gym_membership_periods newer where newer.user_id=mp.user_id and newer.gym_id=mp.gym_id and not newer.cancelled and newer.starts_on>mp.starts_on and (newer.starts_on<=(now() at time zone g.time_zone)::date or newer.starts_on<=mp.ends_on+1) and newer.ends_on>mp.ends_on)
 loop
  days_left:=p.ends_on-(now() at time zone p.time_zone)::date;
  stage:=case when days_left<0 then 'expired' when days_left=0 then 'today' when days_left=1 then 'tomorrow' when days_left<=7 then 'week' else null end;
  if stage is not null then
   insert into public.gym_notifications(gym_id,user_id,event_key,feature,title,body,gym_tab)
   values(p.gym_id,p.user_id,'renewal:'||p.id||':'||stage,'gymRenewal',case when days_left<0 then 'Gym plan expired' else 'Gym renewal reminder' end,
    p.gym_name||': '||p.plan_name||case when days_left<0 then ' expired on '||p.ends_on||'.' when days_left=0 then ' expires today.' when days_left=1 then ' expires tomorrow.' else ' expires in '||days_left||' days.' end||' Contact your gym team to renew.','membership') on conflict do nothing;
   get diagnostics added=row_count;n:=n+added;
  end if;
 end loop;
 insert into public.gym_notifications(gym_id,user_id,event_key,feature,title,body,gym_tab)
 select s.gym_id,a.user_id,'session-reminder:'||s.id,'gym','Your gym session is coming up',g.name||': '||s.title||' starts at '||to_char(s.starts_at at time zone g.time_zone,'Mon DD, HH24:MI')||' ('||g.time_zone||').','sessions'
 from public.gym_sessions s join public.gym_groups g on g.id=s.gym_id join public.gym_session_attendees a on a.session_id=s.id
 join public.gym_group_members m on m.user_id=a.user_id and m.gym_id=s.gym_id
 where s.starts_at>now() and s.starts_at<=now()+interval '24 hours' and (recipient is null or a.user_id=recipient) on conflict do nothing;
 get diagnostics added=row_count;n:=n+added;
 delete from public.gym_notifications where created_at<now()-interval '30 days' and (recipient is null or user_id=recipient);
 return n;
end$$;
revoke all on function public.queue_gym_reminders(uuid) from public,anon,authenticated;
grant execute on function public.queue_gym_reminders(uuid) to service_role;

create or replace function public.gym_group_action_v4(action text,doc jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare
 uid uuid:=auth.uid();gid uuid;g public.gym_groups;m public.gym_group_members;s public.gym_sessions;
 plan public.gym_membership_plans;period public.gym_membership_periods;target uuid;object_id uuid;manager boolean;admin boolean;
 result jsonb;plans jsonb;periods jsonb;rows jsonb;total integer;page_no integer;start_date date;end_date date;today date;
 event text;heading text;duration integer;amount numeric;currency_code text;plan_title text;
begin
 if uid is null then raise exception 'Authentication required';end if;
 if doc is null or jsonb_typeof(doc)<>'object' then raise exception 'Invalid gym action';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,631));
 if action='notifications' then
  perform public.queue_gym_reminders(uid);
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id),'[]'::jsonb) into rows from (
   select id,gym_id,feature,title,body,gym_tab,created_at from public.gym_notifications where user_id=uid order by created_at desc,id limit 200
  )x;
  return jsonb_build_object('notifications',rows,'userId',uid);
 end if;
 select gym_id into gid from public.gym_group_members where user_id=uid;
 if gid is not null then
  select * into g from public.gym_groups where id=gid for update;
  select * into m from public.gym_group_members where user_id=uid and gym_id=g.id;
 end if;
 admin:=coalesce(g.owner_id=uid,false);manager:=admin or coalesce(m.role='staff',false);
 target:=nullif(doc->>'userId','')::uuid;object_id:=nullif(doc->>'id','')::uuid;
 if action in ('guidance','save_plan','archive_plan','assign_plan','cancel_period','attendance','mark_attendance') then
  if m.user_id is null then raise exception 'Join a gym first';end if;
  today:=(now() at time zone g.time_zone)::date;
  if action in ('guidance','save_plan','archive_plan') and not admin then raise exception 'Only the gym admin can edit rules and membership plans';end if;
  if action in ('assign_plan','cancel_period','mark_attendance') and not manager then raise exception 'Only gym staff and the admin can manage membership records and attendance';end if;
  if action='guidance' then
   if length(coalesce(doc->>'welcomeMessage',''))>1000 or length(coalesce(doc->>'rules',''))>4000 then raise exception 'Keep the welcome message within 1,000 characters and rules within 4,000';end if;
   update public.gym_groups set welcome_message=btrim(coalesce(doc->>'welcomeMessage','')),rules=btrim(coalesce(doc->>'rules','')) where id=gid;event:='guidance';
  elsif action='save_plan' then
   plan_title:=btrim(coalesce(doc->>'name',''));duration:=(doc->>'durationDays')::integer;amount:=(doc->>'price')::numeric;currency_code:=doc->>'currency';
   if length(plan_title) not between 3 and 80 or length(coalesce(doc->>'description',''))>500 or duration is null or duration not between 1 and 730 or amount is null or amount<0 or amount>999999 or amount<>round(amount,2) or currency_code is null or currency_code !~ '^[A-Z]{3}$' then raise exception 'Use a plan name, 1–730 days, a nonnegative price with up to two decimals and a three-letter currency';end if;
   if object_id is null then
    if (select count(*) from public.gym_membership_plans where gym_id=gid)>=50 then raise exception 'This gym has reached its 50-plan limit';end if;
    insert into public.gym_membership_plans(gym_id,name,description,duration_days,price,currency) values(gid,plan_title,btrim(coalesce(doc->>'description','')),duration,amount,currency_code);
   else
    update public.gym_membership_plans set name=plan_title,description=btrim(coalesce(doc->>'description','')),duration_days=duration,price=amount,currency=currency_code where id=object_id and gym_id=gid;
    if not found then raise exception 'Plan not found in your gym';end if;
   end if;event:='save_plan';
  elsif action='archive_plan' then
   update public.gym_membership_plans set archived=coalesce((doc->>'archived')::boolean,true) where id=object_id and gym_id=gid;
   if not found then raise exception 'Plan not found in your gym';end if;event:='archive_plan';
  elsif action='assign_plan' then
   if not exists(select 1 from public.gym_group_members where gym_id=gid and user_id=target) then raise exception 'Member not found in your gym';end if;
   select * into plan from public.gym_membership_plans where id=(doc->>'planId')::uuid and gym_id=gid and not archived;
   if plan.id is null then raise exception 'Choose an active plan from your gym';end if;
   if coalesce(doc->>'startsOn','') !~ '^\d{4}-\d{2}-\d{2}$' or coalesce(doc->>'endsOn','') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Choose valid start and expiry dates';end if;
   start_date:=(doc->>'startsOn')::date;end_date:=(doc->>'endsOn')::date;
   if end_date<start_date or end_date>start_date+729 or start_date<today-366 or start_date>today+730 then raise exception 'Use an expiry on or after the start, up to 730 days; start within the past year or next two years';end if;
   if exists(select 1 from public.gym_membership_periods where gym_id=gid and user_id=target and not cancelled and daterange(starts_on,ends_on,'[]')&&daterange(start_date,end_date,'[]')) then raise exception 'These dates overlap an existing membership. Start the renewal after its expiry or cancel the incorrect record first';end if;
   if (select count(*) from public.gym_membership_periods where gym_id=gid and user_id=target)>=100 then raise exception 'This member has reached the 100-record history limit';end if;
   insert into public.gym_membership_periods(gym_id,user_id,plan_id,plan_name,price,currency,starts_on,ends_on) values(gid,target,plan.id,plan.name,plan.price,plan.currency,start_date,end_date) returning * into period;
   insert into public.gym_notifications(gym_id,user_id,event_key,feature,title,body,gym_tab) values(gid,target,'plan:'||period.id,'gym','Your gym plan was recorded',g.name||': '||plan.name||', '||start_date||' to '||end_date||' ('||g.time_zone||'). No payment was processed.','membership');
   event:='assign_plan';
  elsif action='cancel_period' then
   update public.gym_membership_periods set cancelled=true where id=object_id and gym_id=gid and not cancelled returning * into period;
   if period.id is null then raise exception 'Membership record not found or already cancelled';end if;
   target:=period.user_id;event:='cancel_period';
   insert into public.gym_notifications(gym_id,user_id,event_key,feature,title,body,gym_tab) values(gid,target,'plan-cancelled:'||period.id,'gym','Gym plan record cancelled',g.name||': your '||period.plan_name||' record was cancelled. Contact the gym team if this is unexpected.','membership');
  elsif action='mark_attendance' then
   select * into s from public.gym_sessions where id=object_id and gym_id=gid for update;
   if s.id is null then raise exception 'Session not found in your gym';end if;
   if s.starts_at>now() then raise exception 'Attendance can be marked only after the session starts';end if;
   if not exists(select 1 from public.gym_group_members where user_id=target and gym_id=gid) and not exists(select 1 from public.gym_attendance where session_id=s.id and user_id=target) then raise exception 'Member not found in your gym';end if;
   if coalesce(doc->>'status','') not in ('attended','absent','excused','unmarked') then raise exception 'Choose attended, absent, excused or unmarked';end if;
   if doc->>'status'='unmarked' then delete from public.gym_attendance where session_id=s.id and user_id=target;
   else insert into public.gym_attendance(session_id,user_id,status,marked_by) values(s.id,target,doc->>'status',uid) on conflict(session_id,user_id) do update set status=excluded.status,marked_by=uid,updated_at=now();end if;
   insert into public.gym_notifications(gym_id,user_id,event_key,feature,title,body,gym_tab) values(gid,target,'attendance:'||s.id||':'||target||':'||clock_timestamp(),'gym','Gym attendance updated',g.name||': '||s.title||' — '||(doc->>'status')||'.','attendance');event:='mark_attendance';
  elsif action='attendance' then
   page_no:=greatest(0,least(1000,coalesce((doc->>'page')::integer,0)));
   if object_id is not null then
    if not manager then raise exception 'Only gym staff and the admin can view the session roster';end if;
    select * into s from public.gym_sessions where id=object_id and gym_id=gid;
    if s.id is null then raise exception 'Session not found in your gym';end if;
    select coalesce(jsonb_agg(to_jsonb(x) order by x.username,x.user_id),'[]'::jsonb) into rows from (
     select u.id as user_id,coalesce(nullif(u.raw_user_meta_data->>'username',''),nullif(u.raw_user_meta_data->>'display_name',''),'FitSync member') as username,
      coalesce(a.status,'unmarked') as status,exists(select 1 from public.gym_session_attendees r where r.session_id=s.id and r.user_id=u.id) as reserved
     from auth.users u left join public.gym_attendance a on a.user_id=u.id and a.session_id=s.id
     where exists(select 1 from public.gym_group_members mm where mm.user_id=u.id and mm.gym_id=gid) or a.session_id is not null
    )x;
    return jsonb_build_object('session',to_jsonb(s),'roster',rows,'timeZone',g.time_zone);
   end if;
   select count(*) into total from public.gym_sessions where gym_id=gid;
   select coalesce(jsonb_agg(to_jsonb(x) order by x.started desc,x.starts_at desc,x.id),'[]'::jsonb) into rows from (
    select ss.id,ss.title,ss.starts_at,ss.ends_at,ss.starts_at<=now() as started,(select count(*) from public.gym_attendance a where a.session_id=ss.id and a.status='attended') as attended,
     (select a.status from public.gym_attendance a where a.session_id=ss.id and a.user_id=uid) as my_status
    from public.gym_sessions ss where ss.gym_id=gid order by (ss.starts_at<=now()) desc,ss.starts_at desc,ss.id limit 20 offset page_no*20
   )x;
   return jsonb_build_object('sessions',rows,'total',total,'page',page_no,'timeZone',g.time_zone);
  end if;
  if event is not null then
   insert into public.gym_activity(gym_id,actor_id,target_id,action) values(gid,uid,target,event);
   delete from public.gym_activity where gym_id=gid and id in(select id from public.gym_activity where gym_id=gid order by created_at desc,id offset 200);
  end if;
  result:=public.gym_group_action_v3('mine','{}'::jsonb);
 else
  if action='cancel_session' and exists(select 1 from public.gym_sessions where id=object_id and gym_id=gid and starts_at<=now()) then raise exception 'Started sessions stay in attendance history and cannot be cancelled';end if;
  result:=public.gym_group_action_v3(action,doc);
 end if;
 -- Enrich every membership response; never expose another member's plan dates to ordinary members.
 if result->'gym' is null or result->'gym'='null'::jsonb then return result;end if;
 gid:=(result->'gym'->>'id')::uuid;manager:=result->>'role' in ('admin','staff');
 select coalesce(jsonb_agg(to_jsonb(x) order by x.archived,x.name,x.id),'[]'::jsonb) into plans from (
  select id,name,description,duration_days,price,currency,archived from public.gym_membership_plans where gym_id=gid and (manager or not archived)
 )x;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.starts_on desc,x.id),'[]'::jsonb) into periods from (
  select p.id,p.user_id,p.plan_id,p.plan_name,p.price,p.currency,p.starts_on,p.ends_on,p.cancelled,
   case when p.cancelled then 'cancelled' when p.starts_on>(now() at time zone (result->'gym'->>'time_zone'))::date then 'upcoming' when p.ends_on<(now() at time zone (result->'gym'->>'time_zone'))::date then 'expired' else 'active' end as status
  from public.gym_membership_periods p where p.gym_id=gid and (manager or p.user_id=uid)
 )x;
 return result||jsonb_build_object('plans',plans,'membershipPeriods',periods);
end$$;
revoke all on function public.gym_group_action_v4(text,jsonb) from public,anon;
grant execute on function public.gym_group_action_v4(text,jsonb) to authenticated;

-- Close the legacy cancellation path, too: attendance history must survive.
create or replace function public.protect_gym_attendance_history() returns trigger language plpgsql set search_path=pg_catalog,public as $$
begin
 if old.starts_at<=now() and exists(select 1 from public.gym_groups where id=old.gym_id) then raise exception 'Started sessions stay in attendance history and cannot be cancelled';end if;return old;
end$$;
revoke all on function public.protect_gym_attendance_history() from public,anon,authenticated;
drop trigger if exists gym_session_history_guard on public.gym_sessions;
create trigger gym_session_history_guard before delete on public.gym_sessions for each row execute function public.protect_gym_attendance_history();

create or replace function public.cleanup_reset_gym_membership() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if old.raw_user_meta_data ? 'fitsync_onboarding' and not (coalesce(new.raw_user_meta_data,'{}'::jsonb) ? 'fitsync_onboarding') then
  perform pg_advisory_xact_lock(hashtextextended(new.id::text,631));
  delete from public.gym_groups where owner_id=new.id;
  delete from public.gym_group_members where user_id=new.id;
  delete from public.gym_join_requests where user_id=new.id;
  delete from public.gym_session_attendees where user_id=new.id;
  delete from public.gym_messages where author_id=new.id;
  delete from public.gym_announcements where author_id=new.id;
  delete from public.gym_shared_playlists where author_id=new.id;
  delete from public.gym_membership_periods where user_id=new.id;
  delete from public.gym_attendance where user_id=new.id;
  delete from public.gym_notifications where user_id=new.id;
 end if;return new;
end$$;
revoke all on function public.cleanup_reset_gym_membership() from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
