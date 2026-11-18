begin;

create table if not exists public.used_password_recoveries (
  user_id uuid not null references auth.users(id) on delete cascade,
  grant_id uuid not null,
  expires_at timestamptz not null,
  primary key(user_id,grant_id)
);
alter table public.used_password_recoveries enable row level security;
revoke all on public.used_password_recoveries from public,anon,authenticated;
create or replace function public.consume_fitsync_recovery(grant_id uuid,valid_until timestamptz)
returns boolean language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := auth.uid();
begin
  if owner_id is null or valid_until<=now() or valid_until>now()+interval '16 minutes' then return false; end if;
  delete from public.used_password_recoveries where user_id=owner_id and expires_at<=now();
  insert into public.used_password_recoveries(user_id,grant_id,expires_at)
    values(owner_id,grant_id,valid_until) on conflict do nothing;
  return found;
end $$;
revoke all on function public.consume_fitsync_recovery(uuid,timestamptz) from public,anon;
grant execute on function public.consume_fitsync_recovery(uuid,timestamptz) to authenticated;

-- Uses the verified session identity. A metadata edit alone cannot bypass
-- Google's required FitSync password setup.
create or replace function public.complete_fitsync_registration(chosen_username text)
returns void language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := auth.uid();
begin
  if owner_id is null then raise exception 'Authentication required'; end if;
  if chosen_username is null or chosen_username !~ '^[a-zA-Z0-9][a-zA-Z0-9._-]{2,29}$' then
    raise exception 'Invalid username';
  end if;
  update auth.users set
    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('username',chosen_username,'display_name',chosen_username),
    raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"fitsync_credentials_ready":true}'::jsonb
  where id = owner_id and email_confirmed_at is not null and length(encrypted_password) > 0;
  if not found then raise exception 'Confirm your email and set a FitSync password first'; end if;
end $$;
revoke all on function public.complete_fitsync_registration(text) from public,anon;
grant execute on function public.complete_fitsync_registration(text) to authenticated;

create or replace function public.begin_fitsync_data_operation(owner_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update auth.users set raw_app_meta_data=coalesce(raw_app_meta_data,'{}'::jsonb)
    || jsonb_build_object('fitsync_data_resetting_until',extract(epoch from now())::bigint*1000+120000)
  where id=owner_id and coalesce((raw_app_meta_data->>'fitsync_data_resetting_until')::bigint,0)
    <=extract(epoch from now())::bigint*1000;
  return found;
end $$;
revoke all on function public.begin_fitsync_data_operation(uuid) from public,anon,authenticated;
grant execute on function public.begin_fitsync_data_operation(uuid) to service_role;

-- Only the backend's service role can erase data, after password reauthentication.
-- Relational deletion and onboarding reset happen together in one transaction.
create or replace function public.reset_fitsync_data(owner_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if owner_id is null then raise exception 'Account required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text,0));
  delete from public.user_notifications where user_id=owner_id;
  delete from public.community_comments where user_id=owner_id;
  delete from public.community_hearts where user_id=owner_id;
  delete from public.community_posts where user_id=owner_id;
  delete from public.community_daily_usage where user_id=owner_id;
  delete from public.community_image_cleanup where path like owner_id::text||'/%';
  delete from public.progress_entries where user_id=owner_id;
  delete from public.progress_visits where user_id=owner_id;
  delete from public.progress_awards where user_id=owner_id;
  -- Keep consumed recovery grants until expiry: a data reset must not make an
  -- already-used password recovery proof valid again. Account deletion cascades them.
  delete from public.daily_plan_weeks where user_id=owner_id;
  delete from public.plan_playlists where user_id=owner_id;
  update auth.users set raw_user_meta_data=coalesce(raw_user_meta_data,'{}'::jsonb)-'fitsync_onboarding'
    , raw_app_meta_data=coalesce(raw_app_meta_data,'{}'::jsonb)||jsonb_build_object('fitsync_data_epoch',greatest(coalesce((raw_app_meta_data->>'fitsync_data_epoch')::bigint,0)+1,(extract(epoch from clock_timestamp())*1000)::bigint))
  where id=owner_id;
end $$;
revoke all on function public.reset_fitsync_data(uuid) from public,anon,authenticated;
grant execute on function public.reset_fitsync_data(uuid) to service_role;
notify pgrst,'reload schema';
commit;
