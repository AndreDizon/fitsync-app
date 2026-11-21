-- Apply after 20261121_gym_groups_community.sql.
begin;
alter table public.gym_groups add column if not exists time_zone text not null default 'Asia/Manila'
 check(length(time_zone) between 1 and 80);

-- Resolve wall-clock input on the server, independent of the member's device.
create or replace function public.gym_local_instant(local_text text,zone text)
returns timestamptz language plpgsql set search_path=pg_catalog,public as $$
declare wall_time timestamp;instant timestamptz;matches integer;
begin
 if local_text is null or local_text !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$' then raise exception 'Choose a valid session date and time';end if;
 if not exists(select 1 from pg_timezone_names where name=zone) then raise exception 'Choose a valid gym time zone';end if;
 wall_time:=local_text::timestamp;
 instant:=wall_time at time zone zone;
 if instant at time zone zone<>wall_time then raise exception 'This local time does not exist because the clocks change. Choose a different time';end if;
 -- Nearby offsets identify repeated DST times without assuming a one-hour change.
 select count(distinct candidate) into matches from (
  select (wall_time at time zone 'UTC')-((probe at time zone zone)-(probe at time zone 'UTC')) as candidate
  from generate_series(instant-interval '36 hours',instant+interval '36 hours',interval '6 hours') probe
 )x where candidate at time zone zone=wall_time;
 if matches>1 then raise exception 'This local time occurs twice because the clocks change. Choose a time outside the repeated period';end if;
 return instant;
end$$;
revoke all on function public.gym_local_instant(text,text) from public,anon,authenticated;

create or replace function public.gym_group_action_v3(action text,doc jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid();gid uuid;zone text;result jsonb;start_time timestamptz;end_time timestamptz;
begin
 if uid is null then raise exception 'Authentication required';end if;
 if doc is null or jsonb_typeof(doc)<>'object' then raise exception 'Invalid gym action';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,631));
 if action in ('update','schedule') then
  select gym_id into gid from public.gym_group_members where user_id=uid;
  select time_zone into zone from public.gym_groups where id=gid for update;
  if zone is null then raise exception 'Join a gym first or refresh your membership';end if;
 end if;
 if action in ('create','update') then
  if doc ? 'timeZone' then zone:=doc->>'timeZone';else zone:=coalesce(zone,'Asia/Manila');end if;
  if zone is null or length(zone)>80 or not (zone='UTC' or zone~'^(Africa|America|Antarctica|Arctic|Asia|Atlantic|Australia|Europe|Indian|Pacific|Etc)/[A-Za-z0-9_+/-]+$') or not exists(select 1 from pg_timezone_names where name=zone) then raise exception 'Choose a valid gym time zone';end if;
 elsif action='schedule' and (doc ? 'startsLocal' or doc ? 'endsLocal') then
  if doc->>'timeZone' is distinct from zone then raise exception 'The gym time zone changed. Refresh before scheduling';end if;
  start_time:=public.gym_local_instant(doc->>'startsLocal',zone);
  end_time:=public.gym_local_instant(doc->>'endsLocal',zone);
  doc:=doc||jsonb_build_object('startsAt',start_time,'endsAt',end_time);
 end if;
 result:=public.gym_group_action_v2(action,doc);
 if action in ('create','update') then
  update public.gym_groups set time_zone=zone where id=(result->'gym'->>'id')::uuid and owner_id=uid;
  result:=public.gym_group_action_v2('mine','{}'::jsonb);
 end if;
 return result;
end$$;
revoke all on function public.gym_group_action_v3(text,jsonb) from public,anon;
grant execute on function public.gym_group_action_v3(text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
