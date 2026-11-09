begin;
create table if not exists public.community_posts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
 kind text not null check(kind in ('forum','people','gym')), author text not null check(length(author) between 1 and 80),
 body text not null check(length(btrim(body)) between 1 and 4000), role text not null default '' check(length(role)<=80),
 name text not null default '' check(length(name)<=120), location text not null default '' check(length(location)<=240),
 rating integer check(rating between 1 and 5), image_path text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 expires_at timestamptz not null default ((date_trunc('quarter',now() at time zone 'UTC') + interval '3 months') at time zone 'UTC'),
 check(kind<>'people' or length(btrim(role))>0),
 check(kind<>'gym' or (length(btrim(name))>0 and length(btrim(location))>0 and rating is not null)),
 check(image_path is null or image_path like user_id::text||'/%')
);
create index if not exists community_posts_feed on public.community_posts(kind,created_at desc);
create table if not exists public.community_daily_usage(user_id uuid references auth.users on delete cascade,kind text,day date,used integer not null,primary key(user_id,kind,day));
create table if not exists public.community_comments(id uuid primary key default gen_random_uuid(),post_id uuid not null references public.community_posts on delete cascade,user_id uuid not null references auth.users on delete cascade,author text not null,body text not null check(length(btrim(body)) between 1 and 1000),created_at timestamptz not null default now());
create index if not exists community_comments_post on public.community_comments(post_id,created_at);
create table if not exists public.community_hearts(post_id uuid references public.community_posts on delete cascade,user_id uuid references auth.users on delete cascade,primary key(post_id,user_id));
create table if not exists public.community_image_cleanup(path text primary key, queued_at timestamptz not null default now());
alter table public.community_posts enable row level security;
alter table public.community_daily_usage enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_hearts enable row level security;
alter table public.community_image_cleanup enable row level security;
revoke all on public.community_posts,public.community_daily_usage,public.community_comments,public.community_hearts,public.community_image_cleanup from anon,authenticated;
grant select on public.community_posts to authenticated;
drop policy if exists community_posts_read on public.community_posts;
create policy community_posts_read on public.community_posts for select to authenticated using(expires_at>now());

create or replace function public.community_cleanup_image() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$begin
 if old.image_path is not null and (tg_op='DELETE' or old.image_path is distinct from new.image_path) then insert into public.community_image_cleanup(path) values(old.image_path) on conflict(path) do update set queued_at=now();end if;
 return old;
end$$;
drop trigger if exists community_image_deleted on public.community_posts;
create trigger community_image_deleted after delete or update of image_path on public.community_posts for each row execute function public.community_cleanup_image();

create or replace function public.community_action(action text,doc jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); pid uuid; post public.community_posts; result jsonb; display_name text; daily integer; offset_rows integer;
begin
 if uid is null then raise exception 'Sign in with a regular account.';end if;
 select left(coalesce(nullif(raw_user_meta_data->>'full_name',''),nullif(raw_user_meta_data->>'name',''),'FitSync member'),80) into display_name from auth.users where id=uid;
 if action='uploaded' then
  if doc->>'path' not like uid::text||'/%' then raise exception 'Invalid image owner.';end if;
  insert into public.community_image_cleanup(path) values(doc->>'path') on conflict do nothing;
  return jsonb_build_object('ok',true);
 end if;
 if action='list' then
  offset_rows:=greatest(0,least(coalesce((doc->>'page')::integer,0),10000))*12;
  select jsonb_build_object('posts',coalesce(jsonb_agg(to_jsonb(p)||jsonb_build_object('hearts',(select count(*) from public.community_hearts h where h.post_id=p.id),'hearted',exists(select 1 from public.community_hearts h where h.post_id=p.id and h.user_id=uid),'commentsCount',(select count(*) from public.community_comments c where c.post_id=p.id))),'[]'::jsonb)) into result from (
   select * from public.community_posts p where p.expires_at>now() and p.kind=doc->>'kind' and (coalesce(doc->>'mine','false')<>'true' or p.user_id=uid) and (coalesce(doc->>'role','')='' or p.role=doc->>'role' or (doc->>'role'='Other' and p.role not in ('Nutritionist','Fitness instructor','Personal trainer','Gym buddy','Running buddy'))) and (coalesce(doc->>'date','')='' or (p.created_at at time zone 'UTC')::date::text=doc->>'date') and (coalesce(doc->>'rating','0')='0' or p.rating >= (doc->>'rating')::integer) and (coalesce(doc->>'q','')='' or concat_ws(' ',p.body,p.author,p.name,p.location,p.role) ilike '%'||left(doc->>'q',120)||'%') order by case when doc->>'sort'='oldest' then p.created_at end asc, p.created_at desc,p.id desc limit 13 offset offset_rows
  ) p;
  return result||jsonb_build_object('userId',uid,'expiresAt',(date_trunc('quarter',now() at time zone 'UTC')+interval '3 months') at time zone 'UTC');
 end if;
 if action='create' then
  perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
  if doc->>'kind'='people' then
   if exists(select 1 from public.community_posts where user_id=uid and kind='people' and expires_at>now()) then raise exception 'You already have a coach or buddy post. Edit or delete it first.';end if;
  elsif doc->>'kind' in ('forum','gym') then
   insert into public.community_daily_usage values(uid,doc->>'kind',(now() at time zone 'UTC')::date,1) on conflict(user_id,kind,day) do update set used=community_daily_usage.used+1 returning used into daily;
   if daily>2 then raise exception 'Only 2 posts per day in this section. Your limit resets at 00:00 UTC.';end if;
  else raise exception 'Choose a valid section.';end if;
  insert into public.community_posts(user_id,kind,author,body,role,name,location,rating,image_path) values(uid,doc->>'kind',display_name,btrim(doc->>'body'),coalesce(doc->>'role',''),coalesce(doc->>'name',''),coalesce(doc->>'location',''),nullif(doc->>'rating','')::integer,nullif(doc->>'image_path','')) returning id into pid;
  return jsonb_build_object('id',pid);
 end if;
 pid:=(doc->>'id')::uuid;
 select * into post from public.community_posts where id=pid and expires_at>now() for update;
 if not found then raise exception 'This post expired or was deleted. Refresh the feed.';end if;
 if action='edit' or action='delete' then
  if post.user_id<>uid then raise exception 'You can only change your own posts.';end if;
  if action='delete' then delete from public.community_posts where id=pid;
  else update public.community_posts set body=btrim(doc->>'body'),role=coalesce(doc->>'role',''),name=coalesce(doc->>'name',''),location=coalesce(doc->>'location',''),rating=nullif(doc->>'rating','')::integer,image_path=nullif(doc->>'image_path',''),updated_at=now() where id=pid;end if;
 elsif action='heart' then
  if post.kind<>'forum' then raise exception 'Hearts are available in the forum.';end if;
  if exists(select 1 from public.community_hearts where post_id=pid and user_id=uid) then delete from public.community_hearts where post_id=pid and user_id=uid;else insert into public.community_hearts values(pid,uid);end if;
 elsif action='comments' then
  return jsonb_build_object('comments',coalesce((select jsonb_agg(to_jsonb(c)) from (select * from public.community_comments where post_id=pid order by created_at desc limit 100)c),'[]'::jsonb));
 elsif action='comment' then
  perform pg_advisory_xact_lock(hashtextextended(uid::text,1));
  if (select count(*) from public.community_comments where user_id=uid and created_at>now()-interval '1 minute')>=5 then raise exception 'Please wait a minute before commenting again.';end if;
  insert into public.community_comments(post_id,user_id,author,body) values(pid,uid,display_name,btrim(doc->>'body'));
 elsif action='deleteComment' then
  delete from public.community_comments where id=(doc->>'commentId')::uuid and post_id=pid and user_id=uid;
 else raise exception 'Unknown action.';end if;
 return jsonb_build_object('ok',true);
end$$;
revoke all on function public.community_action(text,jsonb) from public;
grant execute on function public.community_action(text,jsonb) to authenticated;
revoke all on function public.community_cleanup_image() from public;

create or replace function public.purge_community() returns void language plpgsql security definer set search_path=pg_catalog,public as $$begin
 delete from public.community_posts where expires_at<=now();
 delete from public.community_daily_usage where day<(now() at time zone 'UTC')::date-7;
 delete from public.community_image_cleanup q where exists(select 1 from public.community_posts p where p.image_path=q.path);
end$$;
revoke all on function public.purge_community() from public,anon,authenticated;
grant execute on function public.purge_community() to service_role;
grant select,delete on public.community_image_cleanup to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('community-images','community-images',false,2097152,array['image/jpeg']) on conflict(id) do nothing;
drop policy if exists community_image_upload on storage.objects;
create policy community_image_upload on storage.objects for insert to authenticated with check(bucket_id='community-images' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists community_image_read on storage.objects;
create policy community_image_read on storage.objects for select to authenticated using(bucket_id='community-images' and exists(select 1 from public.community_posts where image_path=name and expires_at>now()));
drop policy if exists community_image_remove on storage.objects;
create policy community_image_remove on storage.objects for delete to authenticated using(bucket_id='community-images' and (storage.foldername(name))[1]=auth.uid()::text);
notify pgrst,'reload schema';
commit;
