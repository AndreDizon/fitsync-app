begin;
create table if not exists public.user_notifications (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users on delete cascade,
 post_id uuid not null references public.community_posts on delete cascade,
 feature text not null check(feature in ('like','comment')),
 event_key text not null unique,
 title text not null,
 body text not null,
 kind text not null check(kind in ('forum','people','gym')),
 created_at timestamptz not null default now()
);
create index if not exists user_notifications_recipient on public.user_notifications(user_id,created_at desc);
alter table public.user_notifications enable row level security;
revoke all on public.user_notifications from anon,authenticated;
grant select on public.user_notifications to authenticated;
drop policy if exists user_notifications_read on public.user_notifications;
create policy user_notifications_read on public.user_notifications for select to authenticated using(user_id=auth.uid());

create or replace function public.notify_community_activity() returns trigger language plpgsql security definer set search_path=pg_catalog as $$
declare post public.community_posts; actor text; event_type text; source_key text;
begin
 select * into post from public.community_posts where id=new.post_id and expires_at>now();
 if not found or post.user_id=new.user_id then return new;end if;
 select left(coalesce(nullif(raw_user_meta_data->>'full_name',''),nullif(raw_user_meta_data->>'name',''),'Someone'),80) into actor from auth.users where id=new.user_id;
 event_type:=case when tg_table_name='community_hearts' then 'like' else 'comment' end;
 if event_type='like' then source_key:='like:'||post.id::text||':'||new.user_id::text;
 else source_key:='comment:'||new.id::text;end if;
 insert into public.user_notifications(user_id,post_id,feature,event_key,title,body,kind)
 values(post.user_id,post.id,event_type,source_key,
 case when event_type='like' then actor||' liked your post' else actor||' commented on your post' end,
 case when event_type='like' then 'Open the conversation to see your post.' else 'Open the conversation to read the comment.' end,post.kind)
 on conflict(event_key) do nothing;
 return new;
end$$;
revoke all on function public.notify_community_activity() from public;
drop trigger if exists community_like_notification on public.community_hearts;
create trigger community_like_notification after insert on public.community_hearts for each row execute function public.notify_community_activity();
drop trigger if exists community_comment_notification on public.community_comments;
create trigger community_comment_notification after insert on public.community_comments for each row execute function public.notify_community_activity();
create or replace function public.notification_post(post_id uuid) returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 select to_jsonb(p)||jsonb_build_object('hearts',(select count(*) from public.community_hearts h where h.post_id=p.id),'hearted',exists(select 1 from public.community_hearts h where h.post_id=p.id and h.user_id=auth.uid()),'commentsCount',(select count(*) from public.community_comments c where c.post_id=p.id)) into result from public.community_posts p where p.id=notification_post.post_id and p.user_id=auth.uid() and p.expires_at>now();
 return jsonb_build_object('posts',case when result is null then '[]'::jsonb else jsonb_build_array(result) end,'userId',auth.uid());
end$$;
revoke all on function public.notification_post(uuid) from public;
grant execute on function public.notification_post(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
