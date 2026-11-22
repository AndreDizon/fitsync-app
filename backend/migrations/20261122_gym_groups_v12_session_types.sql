-- Event/group-session types. Apply after v11. Existing reservations and attendance stay intact.
begin;
alter table public.gym_sessions add column if not exists session_kind text not null default 'group_session'
 check (session_kind in ('event','group_session'));
update public.gym_sessions s set session_kind='event'
 where exists(select 1 from public.gym_announcements a where a.session_id=s.id);

create or replace function public.gym_group_action_v12(action text,doc jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid();g public.gym_groups;result jsonb;rows jsonb;s public.gym_sessions;
 request_key uuid;kind text;title_text text;description_text text;start_time timestamptz;end_time timestamptz;places integer;
begin
 if uid is null then raise exception 'Authentication required';end if;
 if doc is null or jsonb_typeof(doc)<>'object' then raise exception 'Invalid gym action';end if;
 if action is null or action not in ('mine','admin_data','create_session') then raise exception 'Invalid session action';end if;
 if action='create_session' then
  perform pg_advisory_xact_lock(hashtextextended(uid::text,631));
  select gg.* into g from public.gym_groups gg join public.gym_group_members m on m.gym_id=gg.id where m.user_id=uid for update of gg;
  if g.id is null or g.owner_id<>uid then raise exception 'Only the gym admin can create events and group sessions';end if;
  kind:=doc->>'sessionKind';title_text:=btrim(coalesce(doc->>'title',''));description_text:=btrim(coalesce(doc->>'description',''));
  request_key:=nullif(doc->>'requestId','')::uuid;
  if request_key is null or kind is null or kind not in ('event','group_session') then raise exception 'Choose Event or Group session';end if;
  start_time:=public.gym_local_instant(doc->>'startsLocal',g.time_zone);end_time:=public.gym_local_instant(doc->>'endsLocal',g.time_zone);
  places:=(doc->>'capacity')::integer;
  select * into s from public.gym_sessions where id=request_key;
  if s.id is not null then
   if s.gym_id<>g.id or s.session_kind<>kind or s.title<>title_text or s.description<>description_text or s.starts_at is distinct from start_time or s.ends_at is distinct from end_time or s.capacity is distinct from places then raise exception 'This scheduling request was already used';end if;
   return public.gym_group_action_v12('admin_data','{}');
  end if;
  if length(title_text) not between 3 and 100 or length(description_text)>1000 or start_time is null or end_time is null or start_time<=now() or start_time>now()+interval '180 days' or end_time<=start_time or end_time>start_time+interval '8 hours' or coalesce(places,0) not between 1 and 100 then raise exception 'Use a future start within 180 days, up to 8 hours long, with 1-100 participants';end if;
  if (select count(*) from public.gym_sessions where gym_id=g.id and ends_at>now())>=50 then raise exception 'This gym already has 50 upcoming sessions';end if;
  insert into public.gym_sessions(id,gym_id,title,description,starts_at,ends_at,capacity,session_kind) values(request_key,g.id,title_text,description_text,start_time,end_time,places,kind);
  insert into public.gym_activity(gym_id,actor_id,action) values(g.id,uid,'schedule');
  return public.gym_group_action_v12('admin_data','{}');
 end if;
 -- The existing RPC applies membership visibility and owner-only admin authorization.
 result:=public.gym_group_action_v10(action,doc);
 if jsonb_typeof(result->'sessions')='array' then
  select coalesce(jsonb_agg(item.value || jsonb_build_object('session_kind',coalesce(stored.session_kind,'group_session')) order by item.ordinality),'[]'::jsonb)
   into rows from jsonb_array_elements(result->'sessions') with ordinality item(value,ordinality)
   left join public.gym_sessions stored on stored.id=(item.value->>'id')::uuid and stored.gym_id=(result->'gym'->>'id')::uuid;
  result:=jsonb_set(result,'{sessions}',rows);
 end if;
 return result;
end$$;
revoke all on function public.gym_group_action_v12(text,jsonb) from public,anon;
grant execute on function public.gym_group_action_v12(text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
