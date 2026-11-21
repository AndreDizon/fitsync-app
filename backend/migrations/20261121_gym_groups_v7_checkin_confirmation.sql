-- Apply after v6. Harden the old RPC too so older clients cannot bypass admin-only review.
begin;
alter table public.gym_daily_checkins add column if not exists confirmed_at timestamptz;
alter table public.gym_daily_checkins add column if not exists confirmed_by uuid references auth.users on delete set null;
create or replace function public.gym_group_action_v7(action text,doc jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid();m public.gym_group_members;g public.gym_groups;today date;
 admin boolean;team boolean;page_no integer;rows jsonb;total integer;mine timestamptz;mine_confirmed timestamptz;pending integer;target uuid;visit_day date;
begin
 if uid is null then raise exception 'Authentication required';end if;
 if action is null or doc is null or jsonb_typeof(doc)<>'object' then raise exception 'Invalid gym action';end if;
 if action not in ('check_in','checkins','confirm_checkin') then return public.gym_group_action_v5(action,doc);end if;
 -- Same lock order as membership changes; a removed member cannot race a check-in.
 perform pg_advisory_xact_lock(hashtextextended(uid::text,631));
 select * into m from public.gym_group_members where user_id=uid;
 if m.user_id is null then raise exception 'Join a gym first';end if;
 select * into g from public.gym_groups where id=m.gym_id for update;
 select * into m from public.gym_group_members where user_id=uid and gym_id=g.id;
 if m.user_id is null then raise exception 'Your gym membership changed. Refresh and try again';end if;
 admin:=g.owner_id=uid;
 if coalesce(doc->>'scope','mine') not in ('mine','gym') then raise exception 'Choose your history or gym history';end if;
 if coalesce(doc->>'scope','mine')='gym' and not admin then raise exception 'Only the gym admin can view gym check-ins';end if;
 team:=admin;
 if coalesce(doc->>'page','0') !~ '^\d{1,5}$' then raise exception 'Invalid history page';end if;
 page_no:=coalesce(doc->>'page','0')::integer;
 today:=(now() at time zone g.time_zone)::date;
 if action='confirm_checkin' then
  if not admin then raise exception 'Only the gym admin can confirm check-ins';end if;
  target:=nullif(doc->>'userId','')::uuid;visit_day:=nullif(doc->>'checkedOn','')::date;
  if target is null or visit_day is null then raise exception 'Choose a check-in to confirm';end if;
  if not exists(select 1 from public.gym_daily_checkins where gym_id=g.id and user_id=target and checked_on=visit_day) then raise exception 'Check-in not found in your gym';end if;
  update public.gym_daily_checkins set confirmed_at=now(),confirmed_by=uid
   where gym_id=g.id and user_id=target and checked_on=visit_day and confirmed_at is null;
 elsif action='check_in' then
  if admin then raise exception 'The gym admin reviews check-ins and cannot check in';end if;
  -- Identity, date and timestamp always come from the server, never the request.
  insert into public.gym_daily_checkins(gym_id,user_id,checked_on,time_zone)
   values(g.id,uid,today,g.time_zone) on conflict(gym_id,user_id,checked_on) do nothing;
 end if;
 select checked_at,confirmed_at into mine,mine_confirmed from public.gym_daily_checkins where gym_id=g.id and user_id=uid and checked_on=today;
 select count(*) into total from public.gym_daily_checkins where gym_id=g.id and (team or user_id=uid);
 select coalesce(jsonb_agg(x order by x.checked_at desc,x.user_id),'[]'::jsonb) into rows from (
  select c.user_id,c.checked_on,c.checked_at,c.time_zone,c.confirmed_at,c.confirmed_by,
   coalesce(nullif(u.raw_user_meta_data->>'username',''),'Gym member') as username
  from public.gym_daily_checkins c join auth.users u on u.id=c.user_id
  where c.gym_id=g.id and (team or c.user_id=uid)
  order by c.checked_at desc,c.user_id limit 20 offset page_no*20
 )x;
 select count(*) into pending from public.gym_daily_checkins where gym_id=g.id and confirmed_at is null and (team or user_id=uid);
 return jsonb_build_object('pending',pending,'checkedInConfirmedAt',mine_confirmed,'today',today,'timeZone',g.time_zone,'checkedInAt',mine,'entries',rows,'total',total,'page',page_no);
end$$;
revoke all on function public.gym_group_action_v7(text,jsonb) from public,anon;
grant execute on function public.gym_group_action_v7(text,jsonb) to authenticated;

create or replace function public.gym_group_action_v6(action text,doc jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
begin return public.gym_group_action_v7(action,doc);end$$;
revoke all on function public.gym_group_action_v6(text,jsonb) from public,anon;
grant execute on function public.gym_group_action_v6(text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
