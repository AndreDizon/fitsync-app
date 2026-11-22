-- Staff operational permissions and announcement posting. Apply after v12.
begin;
do $$begin
 if to_regprocedure('public.gym_group_action_v10_impl(text,jsonb)') is null then
  alter function public.gym_group_action_v10(text,jsonb) rename to gym_group_action_v10_impl;
 end if;
end$$;

create or replace function public.gym_group_action_v10(action text,doc jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare role_value text;
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 select role into role_value from public.gym_group_members where user_id=auth.uid();
 if role_value='staff' and (action is null or action not in (
  'mine','list','discussion','read_playlist','notifications','checkins','check_in','check_out',
  'approve','reject','leave','message','delete_message','share_playlist','unshare_playlist',
  'assign_plan','announce','edit_announcement','pin','delete_announcement'
 )) then raise exception 'Only the gym admin can perform this action';end if;
 return public.gym_group_action_v10_impl(action,doc);
end$$;

create or replace function public.gym_group_action_v13(action text,doc jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid();g public.gym_groups;m public.gym_group_members;a public.gym_announcements;
 request_key uuid;title_text text;body_text text;pin_value boolean;
begin
 if uid is null then raise exception 'Authentication required';end if;
 if action is distinct from 'post_announcement' or doc is null or jsonb_typeof(doc)<>'object' then raise exception 'Invalid staff action';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,631));
 select gg.* into g from public.gym_groups gg join public.gym_group_members mm on mm.gym_id=gg.id where mm.user_id=uid for update of gg;
 select * into m from public.gym_group_members where gym_id=g.id and user_id=uid;
 if g.owner_id=uid then return public.gym_group_action_v10(action,doc);end if;
 if g.id is null or m.role is distinct from 'staff' then raise exception 'Only gym staff and the admin can post announcements';end if;
 request_key:=nullif(doc->>'requestId','')::uuid;title_text:=btrim(coalesce(doc->>'title',''));body_text:=btrim(coalesce(doc->>'body',''));pin_value:=coalesce((doc->>'pinned')::boolean,true);
 if request_key is null or length(title_text) not between 3 and 100 or length(body_text) not between 1 and 2000 then raise exception 'Use a title of 3-100 characters and a message of 1-2000 characters';end if;
 select * into a from public.gym_announcements where id=request_key;
 if a.id is not null then
  if a.gym_id<>g.id or a.author_id is distinct from uid or a.title<>title_text or a.body<>body_text or a.pinned<>pin_value or a.session_id is not null then raise exception 'This announcement request was already used';end if;
  return public.gym_group_action_v12('mine','{}');
 end if;
 if (select count(*) from public.gym_announcements where gym_id=g.id)>=50 then raise exception 'This gym already has 50 announcements';end if;
 if pin_value and (select count(*) from public.gym_announcements where gym_id=g.id and pinned)>=3 then raise exception 'Unpin an announcement first (maximum 3)';end if;
 insert into public.gym_announcements(id,gym_id,author_id,title,body,pinned) values(request_key,g.id,uid,title_text,body_text,pin_value);
 insert into public.gym_activity(gym_id,actor_id,action) values(g.id,uid,'announce');
 return public.gym_group_action_v12('mine','{}');
end$$;

-- Legacy RPCs are implementation helpers. Calling an older version must not
-- bypass the staff boundary. Security-definer entry points can still use them.
do $$declare helper record;begin
 for helper in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname ~ '^gym_group_action(_v[0-9]+)?$'
  and p.proname not in ('gym_group_action_v10','gym_group_action_v11','gym_group_action_v12','gym_group_action_v13')
 loop execute format('revoke all on function %s from public,anon,authenticated',helper.oid::regprocedure);end loop;
end$$;
revoke all on function public.gym_group_action_v10_impl(text,jsonb) from public,anon,authenticated;
revoke all on function public.gym_group_action_v10(text,jsonb) from public,anon;
revoke all on function public.gym_group_action_v13(text,jsonb) from public,anon;
grant execute on function public.gym_group_action_v10(text,jsonb) to authenticated;
grant execute on function public.gym_group_action_v13(text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
