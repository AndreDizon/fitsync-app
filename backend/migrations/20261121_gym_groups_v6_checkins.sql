-- Daily member check-ins, separate from staff-marked session attendance. Apply after v5.
begin;
create table if not exists public.gym_daily_checkins(
 gym_id uuid not null references public.gym_groups on delete cascade,
 user_id uuid not null references auth.users on delete cascade,
 checked_on date not null,checked_at timestamptz not null default now(),time_zone text not null,
 primary key(gym_id,user_id,checked_on)
);
create index if not exists gym_daily_checkins_history on public.gym_daily_checkins(gym_id,checked_at desc,user_id);
alter table public.gym_daily_checkins enable row level security;
revoke all on public.gym_daily_checkins from public,anon,authenticated;

create or replace function public.gym_group_action_v6(action text,doc jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid();m public.gym_group_members;g public.gym_groups;today date;
 manager boolean;team boolean;page_no integer;rows jsonb;total integer;mine timestamptz;
begin
 if uid is null then raise exception 'Authentication required';end if;
 if action is null or doc is null or jsonb_typeof(doc)<>'object' then raise exception 'Invalid gym action';end if;
 if action not in ('check_in','checkins') then return public.gym_group_action_v5(action,doc);end if;
 -- Same lock order as membership changes; a removed member cannot race a check-in.
 perform pg_advisory_xact_lock(hashtextextended(uid::text,631));
 select * into m from public.gym_group_members where user_id=uid;
 if m.user_id is null then raise exception 'Join a gym first';end if;
 select * into g from public.gym_groups where id=m.gym_id for update;
 select * into m from public.gym_group_members where user_id=uid and gym_id=g.id;
 if m.user_id is null then raise exception 'Your gym membership changed. Refresh and try again';end if;
 manager:=g.owner_id=uid or m.role='staff';
 if coalesce(doc->>'scope','mine') not in ('mine','gym') then raise exception 'Choose your history or gym history';end if;
 team:=coalesce(doc->>'scope','mine')='gym';
 if team and not manager then raise exception 'Only gym staff and the admin can view gym check-ins';end if;
 if coalesce(doc->>'page','0') !~ '^\d{1,5}$' then raise exception 'Invalid history page';end if;
 page_no:=coalesce(doc->>'page','0')::integer;
 today:=(now() at time zone g.time_zone)::date;
 if action='check_in' then
  -- Identity, date and timestamp always come from the server, never the request.
  insert into public.gym_daily_checkins(gym_id,user_id,checked_on,time_zone)
   values(g.id,uid,today,g.time_zone) on conflict(gym_id,user_id,checked_on) do nothing;
 end if;
 select checked_at into mine from public.gym_daily_checkins where gym_id=g.id and user_id=uid and checked_on=today;
 select count(*) into total from public.gym_daily_checkins where gym_id=g.id and (team or user_id=uid);
 select coalesce(jsonb_agg(x order by x.checked_at desc,x.user_id),'[]'::jsonb) into rows from (
  select c.user_id,c.checked_on,c.checked_at,c.time_zone,
   coalesce(nullif(u.raw_user_meta_data->>'username',''),'Gym member') as username
  from public.gym_daily_checkins c join auth.users u on u.id=c.user_id
  where c.gym_id=g.id and (team or c.user_id=uid)
  order by c.checked_at desc,c.user_id limit 20 offset page_no*20
 )x;
 return jsonb_build_object('today',today,'timeZone',g.time_zone,'checkedInAt',mine,'entries',rows,'total',total,'page',page_no);
end$$;
revoke all on function public.gym_group_action_v6(text,jsonb) from public,anon;
grant execute on function public.gym_group_action_v6(text,jsonb) to authenticated;

create or replace function public.cleanup_reset_gym_checkins() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if old.raw_user_meta_data ? 'fitsync_onboarding' and not(coalesce(new.raw_user_meta_data,'{}'::jsonb) ? 'fitsync_onboarding') then
  delete from public.gym_daily_checkins where user_id=new.id;
 end if;return new;
end$$;
revoke all on function public.cleanup_reset_gym_checkins() from public,anon,authenticated;
drop trigger if exists gym_daily_checkins_reset on auth.users;
create trigger gym_daily_checkins_reset after update of raw_user_meta_data on auth.users for each row execute function public.cleanup_reset_gym_checkins();
notify pgrst,'reload schema';
commit;
