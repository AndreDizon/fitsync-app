-- Save gym settings, welcome message and rules together. Apply after v8.
begin;
create or replace function public.gym_group_settings(doc jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid();g public.gym_groups;
begin
 if uid is null then raise exception 'Authentication required';end if;
 if doc is null or jsonb_typeof(doc)<>'object' then raise exception 'Invalid gym settings';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,631));
 select gg.* into g from public.gym_groups gg join public.gym_group_members m on m.gym_id=gg.id where m.user_id=uid for update of gg;
 if g.id is null or g.owner_id<>uid then raise exception 'Only the gym admin can edit gym settings';end if;
 if not exists(select 1 from public.gym_group_members where user_id=uid and gym_id=g.id) then raise exception 'Your gym membership changed. Refresh and try again';end if;
 -- Both existing operations execute in this transaction. Any validation failure
 -- rolls back settings, guidance and their notifications together.
 perform public.gym_group_action_v5('guidance',jsonb_build_object('welcomeMessage',doc->>'welcomeMessage','rules',doc->>'rules'));
 return public.gym_group_action_v5('update',jsonb_build_object('name',doc->>'name','description',g.description,'joinMode',doc->>'joinMode','timeZone',doc->>'timeZone'));
end$$;
revoke all on function public.gym_group_settings(jsonb) from public,anon;
grant execute on function public.gym_group_settings(jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
