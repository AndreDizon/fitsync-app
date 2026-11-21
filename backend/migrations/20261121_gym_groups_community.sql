-- Apply after 20261121_gym_groups.sql and the playlist migrations.
begin;
alter table public.gym_groups add column if not exists join_mode text not null default 'open'
 check(join_mode in ('open','approval','invite'));
create table if not exists public.gym_join_requests(
 user_id uuid primary key references auth.users(id) on delete cascade,
 gym_id uuid not null references public.gym_groups(id) on delete cascade,
 created_at timestamptz not null default now()
);
create table if not exists public.gym_bans(
 gym_id uuid references public.gym_groups(id) on delete cascade,
 user_id uuid references auth.users(id) on delete cascade,
 primary key(gym_id,user_id)
);
create table if not exists public.gym_announcements(
 id uuid primary key default gen_random_uuid(),
 gym_id uuid not null references public.gym_groups(id) on delete cascade,
 author_id uuid references auth.users(id) on delete set null,
 title text not null check(length(btrim(title)) between 3 and 100),
 body text not null check(length(btrim(body)) between 1 and 2000),
 pinned boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.gym_messages(
 id uuid primary key default gen_random_uuid(),
 gym_id uuid not null references public.gym_groups(id) on delete cascade,
 author_id uuid references auth.users(id) on delete set null,
 body text not null check(length(btrim(body)) between 1 and 2000),
 created_at timestamptz not null default now()
);
create table if not exists public.gym_sessions(
 id uuid primary key default gen_random_uuid(),
 gym_id uuid not null references public.gym_groups(id) on delete cascade,
 title text not null check(length(btrim(title)) between 3 and 100),
 description text not null default '' check(length(description)<=1000),
 starts_at timestamptz not null, ends_at timestamptz not null,
 capacity integer not null check(capacity between 1 and 100),
 check(ends_at>starts_at and ends_at<=starts_at+interval '8 hours')
);
create table if not exists public.gym_session_attendees(
 session_id uuid references public.gym_sessions(id) on delete cascade,
 user_id uuid references auth.users(id) on delete cascade,
 primary key(session_id,user_id)
);
create table if not exists public.gym_shared_playlists(
 id uuid primary key default gen_random_uuid(),
 gym_id uuid not null references public.gym_groups(id) on delete cascade,
 author_id uuid references auth.users(id) on delete set null,
 document jsonb not null, created_at timestamptz not null default now()
);
create table if not exists public.gym_activity(
 id uuid primary key default gen_random_uuid(),
 gym_id uuid not null references public.gym_groups(id) on delete cascade,
 actor_id uuid references auth.users(id) on delete set null,
 target_id uuid references auth.users(id) on delete set null,
 action text not null, created_at timestamptz not null default now()
);
create index if not exists gym_requests_group on public.gym_join_requests(gym_id,created_at);
create index if not exists gym_announcements_group on public.gym_announcements(gym_id,pinned desc,created_at desc);
create index if not exists gym_messages_group on public.gym_messages(gym_id,created_at desc,id);
create index if not exists gym_sessions_group on public.gym_sessions(gym_id,starts_at);
create index if not exists gym_playlists_group on public.gym_shared_playlists(gym_id,created_at desc);
create index if not exists gym_activity_group on public.gym_activity(gym_id,created_at desc,id);
do $$declare t text;begin
 foreach t in array array['gym_join_requests','gym_bans','gym_announcements','gym_messages','gym_sessions','gym_session_attendees','gym_shared_playlists','gym_activity'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
 end loop;
end$$;

-- The only access path. Never trust a client role, gym ID, author or owner.
create or replace function public.gym_group_action_v2(action text,doc jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare
 uid uuid:=auth.uid(); gid uuid; target uuid; object_id uuid;
 g public.gym_groups; m public.gym_group_members; s public.gym_sessions;
 manager boolean; owner boolean; mode text; event text; body_text text; title_text text;
 results jsonb; requests jsonb; roster jsonb; announcements jsonb; sessions jsonb; playlists jsonb;
 messages jsonb; bans jsonb; activity jsonb; pending jsonb; snapshot jsonb; entries jsonb;
 total integer; page_no integer; search_term text; start_time timestamptz; end_time timestamptz;
begin
 if uid is null then raise exception 'Authentication required';end if;
 if doc is null or jsonb_typeof(doc)<>'object' or action is null or action not in (
  'list','mine','create','join','cancel_request','approve','reject','leave','role','remove','update','disband',
  'announce','edit_announcement','pin','delete_announcement','message','delete_message','discussion',
  'schedule','cancel_session','rsvp','unrsvp','share_playlist','unshare_playlist','read_playlist','transfer','ban','unban'
 ) then raise exception 'Invalid gym action';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,631));
 if action='create' then
  if exists(select 1 from public.gym_group_members where user_id=uid) then raise exception 'Leave your current gym before creating another';end if;
  mode:=coalesce(doc->>'joinMode','open');
  if mode not in ('open','approval','invite') then raise exception 'Choose a valid joining option';end if;
  if length(btrim(coalesce(doc->>'name',''))) not between 3 and 60 or length(coalesce(doc->>'description',''))>400 then raise exception 'Use a gym name of 3–60 characters and a description up to 400 characters';end if;
  insert into public.gym_groups(owner_id,name,description,join_mode) values(uid,btrim(doc->>'name'),btrim(coalesce(doc->>'description','')),mode) returning id into gid;
  insert into public.gym_group_members(user_id,gym_id) values(uid,gid);
  delete from public.gym_join_requests where user_id=uid;
 elsif action in ('join','cancel_request') then
  if exists(select 1 from public.gym_group_members where user_id=uid) then raise exception 'You already belong to a gym';end if;
  if action='cancel_request' then
   select gym_id into gid from public.gym_join_requests where user_id=uid;
   perform 1 from public.gym_groups where id=gid for update;
   delete from public.gym_join_requests where user_id=uid;
  else
   if doc ? 'code' then select * into g from public.gym_groups where join_code=upper(btrim(doc->>'code')) for update;
   else select * into g from public.gym_groups where id=(doc->>'gymId')::uuid and join_mode<>'invite' for update;end if;
   if g.id is null then raise exception 'Gym not found. Check the join code or refresh the list';end if;
   if exists(select 1 from public.gym_bans where gym_id=g.id and user_id=uid) then raise exception 'You are banned from this gym';end if;
   if (select count(*) from public.gym_group_members where gym_id=g.id)>=100 then raise exception 'This gym has reached its 100-member limit';end if;
   if g.join_mode='approval' then
    if exists(select 1 from public.gym_join_requests where user_id=uid and gym_id<>g.id) then raise exception 'Cancel your pending request before requesting another gym';end if;
    if (select count(*) from public.gym_join_requests where gym_id=g.id)>=100 and not exists(select 1 from public.gym_join_requests where user_id=uid) then raise exception 'This gym has too many pending requests. Try later';end if;
    insert into public.gym_join_requests(user_id,gym_id) values(uid,g.id) on conflict(user_id) do nothing;
   else
    insert into public.gym_group_members(user_id,gym_id) values(uid,g.id);
    delete from public.gym_join_requests where user_id=uid;
   end if;
  end if;
 elsif action not in ('mine','list') then
  select gym_id into gid from public.gym_group_members where user_id=uid;
  select * into g from public.gym_groups where id=gid for update;
  select * into m from public.gym_group_members where user_id=uid and gym_id=g.id;
  if m.user_id is null then raise exception 'Join a gym first or refresh your membership';end if;
  owner:=g.owner_id=uid;manager:=owner or m.role='staff';
  target:=nullif(doc->>'userId','')::uuid;object_id:=nullif(doc->>'id','')::uuid;
  if action in ('role','remove','update','disband','transfer','ban','unban') and not owner then raise exception 'Only the gym admin can manage roles, settings and bans';end if;
  if action in ('approve','reject','announce','edit_announcement','pin','delete_announcement','schedule','cancel_session') and not manager then raise exception 'Only gym staff and the admin can do this';end if;
  if action in ('approve','reject') then
   if not exists(select 1 from public.gym_join_requests where gym_id=g.id and user_id=target) then raise exception 'Join request no longer exists';end if;
   if action='approve' then
    if exists(select 1 from public.gym_bans where gym_id=g.id and user_id=target) then raise exception 'This user is banned';end if;
    if (select count(*) from public.gym_group_members where gym_id=g.id)>=100 then raise exception 'This gym has reached its 100-member limit';end if;
    if exists(select 1 from public.gym_group_members where user_id=target) then raise exception 'This user already belongs to a gym';end if;
    insert into public.gym_group_members(user_id,gym_id) values(target,g.id);
   end if;
   delete from public.gym_join_requests where gym_id=g.id and user_id=target;event:=action;
  elsif action='leave' then
   if owner then raise exception 'Transfer ownership or delete the gym before leaving';end if;
   delete from public.gym_group_members where user_id=uid;
   delete from public.gym_session_attendees where user_id=uid and session_id in(select id from public.gym_sessions where gym_id=g.id);
   target:=uid;event:='leave';
  elsif action in ('role','remove','ban','transfer') then
   if target is null or target=g.owner_id then raise exception 'The gym admin cannot be removed or demoted';end if;
   if not exists(select 1 from public.gym_group_members where gym_id=g.id and user_id=target) then raise exception 'Member not found in your gym';end if;
   if action='role' then
    if coalesce(doc->>'role','') not in ('member','staff') then raise exception 'Choose staff or member';end if;
    update public.gym_group_members set role=doc->>'role' where user_id=target;
    event:='role_'||(doc->>'role');
   elsif action='transfer' then
    update public.gym_groups set owner_id=target where id=g.id;
    update public.gym_group_members set role=case when user_id=uid then 'staff' else 'member' end where user_id in(uid,target) and gym_id=g.id;
    event:='transfer';
   else
    if action='ban' then insert into public.gym_bans values(g.id,target) on conflict do nothing;end if;
    delete from public.gym_group_members where user_id=target and gym_id=g.id;
    delete from public.gym_session_attendees where user_id=target and session_id in(select id from public.gym_sessions where gym_id=g.id);
    delete from public.gym_join_requests where user_id=target and gym_id=g.id;
    event:=action;
   end if;
  elsif action='unban' then
   delete from public.gym_bans where gym_id=g.id and user_id=target;
   if not found then raise exception 'Ban not found';end if;event:='unban';
  elsif action='update' then
   mode:=coalesce(doc->>'joinMode',g.join_mode);
   if mode not in ('open','approval','invite') then raise exception 'Choose a valid joining option';end if;
   if length(btrim(coalesce(doc->>'name',''))) not between 3 and 60 or length(coalesce(doc->>'description',''))>400 then raise exception 'Use a gym name of 3–60 characters and a description up to 400 characters';end if;
   update public.gym_groups set name=btrim(doc->>'name'),description=btrim(coalesce(doc->>'description','')),join_mode=mode where id=g.id;
   -- A policy change never silently approves existing requests.
   if mode<>g.join_mode then delete from public.gym_join_requests where gym_id=g.id;end if;
   event:='update';
  elsif action='disband' then delete from public.gym_groups where id=g.id;
  elsif action in ('announce','edit_announcement') then
   title_text:=btrim(coalesce(doc->>'title',''));body_text:=btrim(coalesce(doc->>'body',''));
   if length(title_text) not between 3 and 100 or length(body_text) not between 1 and 2000 then raise exception 'Use a title of 3–100 characters and a message of 1–2,000 characters';end if;
   if action='announce' then
    if (select count(*) from public.gym_announcements where gym_id=g.id)>=50 then raise exception 'Remove an older announcement before adding another (limit 50)';end if;
    insert into public.gym_announcements(gym_id,author_id,title,body) values(g.id,uid,title_text,body_text);
   else
    update public.gym_announcements set title=title_text,body=body_text,updated_at=now() where gym_id=g.id and id=object_id;
    if not found then raise exception 'Announcement not found';end if;
   end if;event:=action;
  elsif action='pin' then
   if not exists(select 1 from public.gym_announcements where gym_id=g.id and id=object_id) then raise exception 'Announcement not found';end if;
   if (doc->>'pinned')::boolean and (select count(*) from public.gym_announcements where gym_id=g.id and pinned and id<>object_id)>=3 then raise exception 'Pin up to three announcements';end if;
   update public.gym_announcements set pinned=coalesce((doc->>'pinned')::boolean,false) where gym_id=g.id and id=object_id;event:='pin';
  elsif action='delete_announcement' then
   delete from public.gym_announcements where gym_id=g.id and id=object_id;
   if not found then raise exception 'Announcement not found';end if;event:=action;
  elsif action='message' then
   body_text:=btrim(coalesce(doc->>'body',''));
   if length(body_text) not between 1 and 2000 then raise exception 'Write 1–2,000 characters';end if;
   if (select count(*) from public.gym_messages where author_id=uid and created_at>now()-interval '1 minute')>=5 then raise exception 'Please wait a minute before sending more messages';end if;
   insert into public.gym_messages(gym_id,author_id,body) values(g.id,uid,body_text);
  elsif action='delete_message' then
   delete from public.gym_messages where gym_id=g.id and id=object_id and (author_id=uid or manager);
   if not found then raise exception 'Message not found or you cannot remove it';end if;event:=action;
  elsif action='schedule' then
   title_text:=btrim(coalesce(doc->>'title',''));start_time:=(doc->>'startsAt')::timestamptz;end_time:=(doc->>'endsAt')::timestamptz;
   if length(title_text) not between 3 and 100 or length(coalesce(doc->>'description',''))>1000 or start_time is null or end_time is null or start_time<=now() or start_time>now()+interval '180 days' or end_time<=start_time or end_time>start_time+interval '8 hours' or coalesce((doc->>'capacity')::integer,0) not between 1 and 100 then raise exception 'Use a future session within 180 days, up to 8 hours long, with 1–100 places';end if;
   if (select count(*) from public.gym_sessions where gym_id=g.id and ends_at>now())>=50 then raise exception 'This gym already has 50 upcoming sessions';end if;
   insert into public.gym_sessions(gym_id,title,description,starts_at,ends_at,capacity) values(g.id,title_text,btrim(coalesce(doc->>'description','')),start_time,end_time,(doc->>'capacity')::integer);event:=action;
  elsif action in ('cancel_session','rsvp','unrsvp') then
   select * into s from public.gym_sessions where gym_id=g.id and id=object_id for update;
   if s.id is null then raise exception 'Session not found';end if;
   if action='cancel_session' then delete from public.gym_sessions where id=s.id;event:=action;
   elsif action='unrsvp' then delete from public.gym_session_attendees where session_id=s.id and user_id=uid;
   else
    if s.starts_at<=now() then raise exception 'This session has already started';end if;
    if not exists(select 1 from public.gym_session_attendees where session_id=s.id and user_id=uid) then
     if (select count(*) from public.gym_session_attendees where session_id=s.id)>=s.capacity then raise exception 'This session is full';end if;
     insert into public.gym_session_attendees values(s.id,uid);
    end if;
   end if;
  elsif action='share_playlist' then
   snapshot:=doc->'playlist';
   if snapshot is null or jsonb_typeof(snapshot)<>'object' or snapshot->>'kind' is distinct from 'workout' or coalesce(snapshot->>'duration','') not in ('day','week') or length(btrim(coalesce(snapshot->>'name',''))) not between 1 and 80 or length(coalesce(snapshot->>'description',''))>240 then raise exception 'Choose a valid workout playlist';end if;
   if not public.plan_playlist_items_valid('workout',snapshot->>'duration',coalesce((snapshot->>'selectedDay')::integer,0),array(select jsonb_array_elements_text(coalesce(snapshot->'restDays','[]'::jsonb))::integer),snapshot->'items') or jsonb_array_length(snapshot->'items')=0 then raise exception 'Share a nonempty workout playlist with valid library exercises';end if;
   if exists(select 1 from jsonb_array_elements(snapshot->'items') e where coalesce(e->>'time','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$') then raise exception 'Invalid exercise time';end if;
   if (select count(*) from public.gym_shared_playlists where gym_id=g.id)>=20 then raise exception 'Remove a shared playlist before adding another (limit 20)';end if;
   -- Store only the explicitly shared workout template, never health or account metadata.
   select jsonb_agg(jsonb_build_object('id',e->'id','exerciseId',e->'exerciseId','day',e->'day','time',e->'time','sets',e->'sets','targetType',e->'targetType','target',e->'target','restSeconds',e->'restSeconds')) into entries from jsonb_array_elements(snapshot->'items') e;
   insert into public.gym_shared_playlists(gym_id,author_id,document) values(g.id,uid,jsonb_build_object('name',btrim(snapshot->>'name'),'description',coalesce(snapshot->>'description',''),'kind','workout','duration',snapshot->>'duration','selectedDay',coalesce((snapshot->>'selectedDay')::integer,0),'restDays',coalesce(snapshot->'restDays','[]'::jsonb),'items',entries));event:=action;
  elsif action='unshare_playlist' then
   delete from public.gym_shared_playlists where gym_id=g.id and id=object_id and (author_id=uid or manager);
   if not found then raise exception 'Playlist not found or you cannot remove it';end if;event:=action;
  elsif action='read_playlist' then
   select document into snapshot from public.gym_shared_playlists where gym_id=g.id and id=object_id;
   if snapshot is null then raise exception 'Shared playlist not found';end if;
   return jsonb_build_object('playlist',snapshot);
  elsif action='discussion' then
   page_no:=greatest(0,least(10000,coalesce((doc->>'page')::integer,0)));
   select count(*) into total from public.gym_messages where gym_id=g.id;
   select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id),'[]'::jsonb) into results from (
    select a.id,a.body,a.author_id,coalesce(nullif(u.raw_user_meta_data->>'username',''),nullif(u.raw_user_meta_data->>'display_name',''),case when u.id is null then 'Former member' else 'FitSync member' end) as username,a.created_at
    from public.gym_messages a left join auth.users u on u.id=a.author_id where a.gym_id=g.id order by a.created_at desc,a.id limit 30 offset page_no*30
   )x;
   return jsonb_build_object('messages',results,'total',total,'page',page_no);
  end if;
  if event is not null then
   insert into public.gym_activity(gym_id,actor_id,target_id,action) values(g.id,uid,target,event);
   delete from public.gym_activity where gym_id=g.id and id in(select id from public.gym_activity where gym_id=g.id order by created_at desc,id offset 200);
  end if;
 end if;
 if action='list' then
  search_term:=left(btrim(coalesce(doc->>'q','')),100);page_no:=greatest(0,least(1000,coalesce((doc->>'page')::integer,0)));
  select count(*) into total from public.gym_groups where join_mode<>'invite' and (search_term='' or strpos(lower(name),lower(search_term))>0);
  select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into results from (
   select gg.id,gg.name,gg.description,gg.join_mode,gg.created_at,(select count(*) from public.gym_group_members mm where mm.gym_id=gg.id) as member_count
   from public.gym_groups gg where join_mode<>'invite' and (search_term='' or strpos(lower(gg.name),lower(search_term))>0) order by gg.created_at desc,gg.id limit 6 offset page_no*6
  )x;
  return jsonb_build_object('gyms',results,'total',total,'page',page_no);
 end if;
 select * into m from public.gym_group_members where user_id=uid;
 if m.user_id is null then
  select jsonb_build_object('gym_id',r.gym_id,'name',gg.name,'created_at',r.created_at) into pending from public.gym_join_requests r join public.gym_groups gg on gg.id=r.gym_id where r.user_id=uid;
  return jsonb_build_object('gym',null,'members','[]'::jsonb,'pending',pending);
 end if;
 select * into g from public.gym_groups where id=m.gym_id;
 owner:=g.owner_id=uid;manager:=owner or m.role='staff';
 select coalesce(jsonb_agg(to_jsonb(x) order by x.role='admin' desc,x.joined_at,x.user_id),'[]'::jsonb) into roster from (
  select mm.user_id,coalesce(nullif(u.raw_user_meta_data->>'username',''),nullif(u.raw_user_meta_data->>'display_name',''),'FitSync member') as username,case when mm.user_id=g.owner_id then 'admin' else mm.role end as role,mm.joined_at
  from public.gym_group_members mm join auth.users u on u.id=mm.user_id where mm.gym_id=g.id
 )x;
 if manager then
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at,x.user_id),'[]'::jsonb) into requests from (
   select r.user_id,coalesce(nullif(u.raw_user_meta_data->>'username',''),nullif(u.raw_user_meta_data->>'display_name',''),'FitSync member') as username,r.created_at from public.gym_join_requests r join auth.users u on u.id=r.user_id where r.gym_id=g.id
  )x;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id),'[]'::jsonb) into activity from (
   select a.id,a.action,a.created_at,coalesce(nullif(u.raw_user_meta_data->>'username',''),nullif(u.raw_user_meta_data->>'display_name',''),case when u.id is null then 'Former member' else 'FitSync member' end) as actor,coalesce(nullif(t.raw_user_meta_data->>'username',''),nullif(t.raw_user_meta_data->>'display_name',''),case when t.id is null then 'Former member' else 'FitSync member' end) as target from public.gym_activity a left join auth.users u on u.id=a.actor_id left join auth.users t on t.id=a.target_id where a.gym_id=g.id order by a.created_at desc,a.id limit 200
  )x;
 end if;
 if owner then
  select coalesce(jsonb_agg(jsonb_build_object('user_id',b.user_id,'username',coalesce(nullif(u.raw_user_meta_data->>'username',''),nullif(u.raw_user_meta_data->>'display_name',''),'FitSync member'))),'[]'::jsonb) into bans from public.gym_bans b join auth.users u on u.id=b.user_id where b.gym_id=g.id;
 end if;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.pinned desc,x.created_at desc,x.id),'[]'::jsonb) into announcements from (
  select a.id,a.title,a.body,a.pinned,a.author_id,coalesce(nullif(u.raw_user_meta_data->>'username',''),nullif(u.raw_user_meta_data->>'display_name',''),case when u.id is null then 'Former member' else 'FitSync member' end) as username,a.created_at,a.updated_at from public.gym_announcements a left join auth.users u on u.id=a.author_id where a.gym_id=g.id
 )x;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.starts_at,x.id),'[]'::jsonb) into sessions from (
  select ss.*, (select count(*) from public.gym_session_attendees aa where aa.session_id=ss.id) as attending,exists(select 1 from public.gym_session_attendees aa where aa.session_id=ss.id and aa.user_id=uid) as joined
  from public.gym_sessions ss where ss.gym_id=g.id and ss.ends_at>now() order by ss.starts_at,ss.id limit 50
 )x;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id),'[]'::jsonb) into playlists from (
  select pp.id,pp.author_id,pp.document->>'name' as name,pp.document->>'description' as description,pp.document->>'duration' as duration,jsonb_array_length(pp.document->'items') as item_count,coalesce(nullif(u.raw_user_meta_data->>'username',''),nullif(u.raw_user_meta_data->>'display_name',''),case when u.id is null then 'Former member' else 'FitSync member' end) as username,pp.created_at from public.gym_shared_playlists pp left join auth.users u on u.id=pp.author_id where pp.gym_id=g.id
 )x;
 return jsonb_build_object('gym',to_jsonb(g),'role',case when owner then 'admin' else m.role end,'members',roster,'requests',coalesce(requests,'[]'::jsonb),'bans',coalesce(bans,'[]'::jsonb),'activity',coalesce(activity,'[]'::jsonb),'announcements',announcements,'sessions',sessions,'playlists',playlists);
end$$;
revoke all on function public.gym_group_action_v2(text,jsonb) from public,anon;
grant execute on function public.gym_group_action_v2(text,jsonb) to authenticated;
-- Old clients must obey new joining policies and moderation, too.
create or replace function public.gym_group_action(action text,doc jsonb default '{}'::jsonb)
returns jsonb language sql security definer set search_path=pg_catalog,public as $$select public.gym_group_action_v2(action,doc)$$;
revoke all on function public.gym_group_action(text,jsonb) from public,anon;
grant execute on function public.gym_group_action(text,jsonb) to authenticated;
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
 end if;return new;
end$$;
revoke all on function public.cleanup_reset_gym_membership() from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
