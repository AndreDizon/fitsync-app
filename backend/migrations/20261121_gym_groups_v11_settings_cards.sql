-- Independent settings cards and atomic ownership transfer + departure. Apply after v10.
begin;
create or replace function public.gym_group_action_v11(action text,doc jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid();g public.gym_groups;result jsonb;
begin
 if uid is null then raise exception 'Authentication required';end if;
 if doc is null or jsonb_typeof(doc)<>'object' then raise exception 'Invalid gym action';end if;
 if action is null or action not in ('rename_gym','save_gym_guidance','transfer_leave') then raise exception 'Invalid settings action';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,631));
 select gg.* into g from public.gym_groups gg join public.gym_group_members m on m.gym_id=gg.id where m.user_id=uid for update of gg;
 if g.id is null or g.owner_id<>uid then raise exception 'Only the gym admin can manage gym settings and ownership';end if;
 if action='transfer_leave' then
  -- Both changes commit together. A failed departure cannot leave ownership half-changed.
  perform public.gym_group_action_v10('transfer',jsonb_build_object('userId',doc->>'userId'));
  return public.gym_group_action_v10('leave','{}');
 end if;
 -- Preserve the other card's current server values, not an unsaved client draft.
 if action='rename_gym' then
  return public.gym_group_action_v10('admin_settings',jsonb_build_object('name',doc->>'name','welcomeMessage',g.welcome_message,'rules',g.rules,'joinMode',g.join_mode,'timeZone',g.time_zone));
 end if;
 return public.gym_group_action_v10('admin_settings',jsonb_build_object('name',g.name,'welcomeMessage',doc->>'welcomeMessage','rules',doc->>'rules','joinMode',doc->>'joinMode','timeZone',doc->>'timeZone'));
end$$;
revoke all on function public.gym_group_action_v11(text,jsonb) from public,anon;
grant execute on function public.gym_group_action_v11(text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
