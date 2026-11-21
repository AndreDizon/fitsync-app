-- Community gyms: one group per account, owner-controlled staff roles.
begin;
create table if not exists public.gym_groups(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null unique references auth.users(id) on delete cascade,
 name text not null check(length(btrim(name)) between 3 and 60),
 description text not null default '' check(length(description)<=400),
 join_code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)),
 created_at timestamptz not null default now()
);
create table if not exists public.gym_group_members(
 user_id uuid primary key references auth.users(id) on delete cascade,
 gym_id uuid not null references public.gym_groups(id) on delete cascade,
 role text not null default 'member' check(role in ('member','staff')),
 joined_at timestamptz not null default now()
);
create index if not exists gym_group_roster on public.gym_group_members(gym_id,joined_at);
alter table public.gym_groups enable row level security;
alter table public.gym_group_members enable row level security;
-- All reads and mutations pass through the authenticated RPC. No roster emails,
-- health data or auth metadata are returned to other members.
revoke all on public.gym_groups,public.gym_group_members from anon,authenticated;
create or replace function public.gym_group_action(action text,doc jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare
 uid uuid:=auth.uid(); gid uuid; target uuid; g public.gym_groups; membership public.gym_group_members;
 roster jsonb; results jsonb; total integer; page_no integer; search_term text;
begin
 if uid is null then raise exception 'Authentication required';end if;
 if jsonb_typeof(doc)<>'object' or action not in ('list','mine','create','join','leave','role','remove','update','disband') then raise exception 'Invalid gym action';end if;
 -- Serialize all membership changes for the caller, then lock the group row.
 -- Join/leave and admin actions use the same group lock for capacity/roles.
 perform pg_advisory_xact_lock(hashtextextended(uid::text,631));
 if action='create' then
   if exists(select 1 from public.gym_group_members where user_id=uid) then raise exception 'Leave your current gym before creating another';end if;
   if length(btrim(coalesce(doc->>'name',''))) not between 3 and 60 or length(coalesce(doc->>'description',''))>400 then raise exception 'Use a gym name of 3–60 characters and a description up to 400 characters';end if;
   insert into public.gym_groups(owner_id,name,description) values(uid,btrim(doc->>'name'),btrim(coalesce(doc->>'description',''))) returning id into gid;
   insert into public.gym_group_members(user_id,gym_id) values(uid,gid);
 elsif action='join' then
   if exists(select 1 from public.gym_group_members where user_id=uid) then raise exception 'You already belong to a gym';end if;
   if doc ? 'code' then
     select * into g from public.gym_groups where join_code=upper(btrim(doc->>'code')) for update;
   else
     select * into g from public.gym_groups where id=(doc->>'gymId')::uuid for update;
   end if;
   if g.id is null then raise exception 'Gym not found. Check the join code or refresh the list';end if;
   if (select count(*) from public.gym_group_members where gym_id=g.id)>=100 then raise exception 'This gym has reached its 100-member limit';end if;
   insert into public.gym_group_members(user_id,gym_id) values(uid,g.id);
 elsif action in ('leave','role','remove','update','disband') then
   select * into membership from public.gym_group_members where user_id=uid;
   if membership.user_id is null then raise exception 'Join a gym first';end if;
   select * into g from public.gym_groups where id=membership.gym_id for update;
   -- Recheck after acquiring the lock: the admin may have removed the caller.
   if not exists(select 1 from public.gym_group_members where user_id=uid and gym_id=g.id) then raise exception 'Your gym membership changed. Refresh and try again';end if;
   if action='leave' then
     if g.owner_id=uid then raise exception 'The gym admin must delete the gym before leaving';end if;
     delete from public.gym_group_members where user_id=uid;
   else
     if g.owner_id<>uid then raise exception 'Only the gym admin can manage members and gym settings';end if;
     if action in ('role','remove') then
       target:=(doc->>'userId')::uuid;
       if target is null or target=g.owner_id then raise exception 'The gym admin role cannot be changed or removed';end if;
       if not exists(select 1 from public.gym_group_members where user_id=target and gym_id=g.id) then raise exception 'Member not found in your gym';end if;
       if action='role' then
         if coalesce(doc->>'role','') not in ('member','staff') then raise exception 'Choose staff or member';end if;
         update public.gym_group_members set role=doc->>'role' where user_id=target and gym_id=g.id;
       else delete from public.gym_group_members where user_id=target and gym_id=g.id;end if;
     elsif action='update' then
       if length(btrim(coalesce(doc->>'name',''))) not between 3 and 60 or length(coalesce(doc->>'description',''))>400 then raise exception 'Use a gym name of 3–60 characters and a description up to 400 characters';end if;
       update public.gym_groups set name=btrim(doc->>'name'),description=btrim(coalesce(doc->>'description','')) where id=g.id;
     else delete from public.gym_groups where id=g.id;end if;
   end if;
 end if;
 if action='list' then
   search_term:=left(btrim(coalesce(doc->>'q','')),100);
   page_no:=greatest(0,least(1000,coalesce((doc->>'page')::integer,0)));
   select count(*) into total from public.gym_groups where search_term='' or strpos(lower(name),lower(search_term))>0;
   select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into results from (
     select gg.id,gg.name,gg.description,gg.created_at,(select count(*) from public.gym_group_members m where m.gym_id=gg.id) as member_count
     from public.gym_groups gg where search_term='' or strpos(lower(gg.name),lower(search_term))>0 order by gg.created_at desc,gg.id limit 6 offset page_no*6
   )x;
   return jsonb_build_object('gyms',results,'total',total,'page',page_no);
 end if;
 select * into membership from public.gym_group_members where user_id=uid;
 if membership.user_id is null then return jsonb_build_object('gym',null,'members','[]'::jsonb);end if;
 select * into g from public.gym_groups where id=membership.gym_id;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.role='admin' desc,x.joined_at,x.user_id),'[]'::jsonb) into roster from (
   select m.user_id,coalesce(nullif(u.raw_user_meta_data->>'username',''),nullif(u.raw_user_meta_data->>'display_name',''),'FitSync member') as username,
    case when m.user_id=g.owner_id then 'admin' else m.role end as role,m.joined_at
   from public.gym_group_members m join auth.users u on u.id=m.user_id where m.gym_id=g.id
 )x;
 return jsonb_build_object('gym',to_jsonb(g),'role',case when g.owner_id=uid then 'admin' else membership.role end,'members',roster);
end$$;
revoke all on function public.gym_group_action(text,jsonb) from public,anon;
grant execute on function public.gym_group_action(text,jsonb) to authenticated;
-- Existing data reset removes fitsync_onboarding from auth metadata. Clean gym
-- participation in the same transaction, without replacing the reset RPC.
create or replace function public.cleanup_reset_gym_membership() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if old.raw_user_meta_data ? 'fitsync_onboarding' and not (coalesce(new.raw_user_meta_data,'{}'::jsonb) ? 'fitsync_onboarding') then
   perform pg_advisory_xact_lock(hashtextextended(new.id::text,631));
   delete from public.gym_groups where owner_id=new.id;
   delete from public.gym_group_members where user_id=new.id;
 end if;
 return new;
end$$;
revoke all on function public.cleanup_reset_gym_membership() from public,anon,authenticated;
drop trigger if exists cleanup_reset_gym_membership on auth.users;
create trigger cleanup_reset_gym_membership after update of raw_user_meta_data on auth.users
for each row execute function public.cleanup_reset_gym_membership();
commit;
