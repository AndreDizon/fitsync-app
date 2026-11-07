begin;
create or replace function public.progress_payload_valid(kind text,p jsonb) returns boolean language plpgsql immutable set search_path=pg_catalog as $$
declare k text;v jsonb;n numeric;has_value boolean:=false;
begin
 if jsonb_typeof(p) is distinct from 'object' or octet_length(p::text)>4000 then return false;end if;
 for k,v in select * from jsonb_each(p) loop
  if k='notes' then if jsonb_typeof(v)<>'string' or length(p->>k)>500 then return false;end if;
  elsif k='path' then if kind<>'photo' or jsonb_typeof(v)<>'string' or length(p->>k)>150 then return false;end if;has_value:=true;
  else
   if jsonb_typeof(v)<>'number' then return false;end if;n:=(p->>k)::numeric;has_value:=true;
   if kind='body' then
    if k='weightKg' then if n<1 or n>500 then return false;end if;
    elsif k='bodyFat' then if n<1 or n>75 then return false;end if;
    elsif k in ('chest','waist','hips','arm','thigh') then if n<5 or n>300 then return false;end if;
    else return false;end if;
   elsif kind='wellness' then
    if k='sleepHours' then if n<0 or n>24 then return false;end if;
    elsif k='rpe' then if n<1 or n>10 or trunc(n)<>n then return false;end if;
    elsif k in ('energy','mood','sleepQuality','soreness') then if n<1 or n>5 or trunc(n)<>n then return false;end if;
    else return false;end if;
   else return false;end if;
  end if;
 end loop;
 return has_value and (kind<>'photo' or p ? 'path');
exception when others then return false;end;$$;
revoke all on function public.progress_payload_valid(text,jsonb) from public;grant execute on function public.progress_payload_valid(text,jsonb) to authenticated;
create table if not exists public.progress_entries(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,kind text not null check(kind in ('body','wellness','photo')),date date not null check(date>='1900-01-01'),payload jsonb not null,revision integer not null default 1 check(revision>0),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(public.progress_payload_valid(kind,payload)),check(kind<>'photo' or payload->>'path'=user_id::text||'/'||id::text||'.jpg'));
create index if not exists progress_owner_date on public.progress_entries(user_id,date desc);
create or replace function public.progress_revision() returns trigger language plpgsql set search_path=pg_catalog as $$begin
 if tg_op='INSERT' then if new.revision<>1 then raise exception 'Initial revision must be one';end if;
 elsif new.user_id<>old.user_id or new.id<>old.id or new.kind<>old.kind or new.revision<>old.revision+1 then raise exception 'Stale revision or identity change';end if;
 if tg_op='UPDATE' then new.created_at:=old.created_at;end if;new.updated_at:=now();return new;end;$$;
revoke all on function public.progress_revision() from public;
drop trigger if exists progress_revision on public.progress_entries;create trigger progress_revision before insert or update on public.progress_entries for each row execute function public.progress_revision();
alter table public.progress_entries enable row level security;revoke all on public.progress_entries from anon,authenticated;grant select,insert,update,delete on public.progress_entries to authenticated;
drop policy if exists progress_owner on public.progress_entries;create policy progress_owner on public.progress_entries for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
create table if not exists public.progress_visits(user_id uuid not null references auth.users(id) on delete cascade,date date not null,primary key(user_id,date));alter table public.progress_visits enable row level security;revoke all on public.progress_visits from anon,authenticated;grant select,insert on public.progress_visits to authenticated;drop policy if exists visits_read on public.progress_visits;create policy visits_read on public.progress_visits for select to authenticated using(auth.uid()=user_id);drop policy if exists visits_insert on public.progress_visits;create policy visits_insert on public.progress_visits for insert to authenticated with check(auth.uid()=user_id);
create table if not exists public.progress_awards(user_id uuid not null references auth.users(id) on delete cascade,code text not null check(code in ('hello','streak3','streak7','streak30','todo1','todo25','todo100','workout10')),awarded_at timestamptz not null default now(),primary key(user_id,code));alter table public.progress_awards enable row level security;revoke all on public.progress_awards from anon,authenticated;grant select,insert on public.progress_awards to authenticated;drop policy if exists awards_read on public.progress_awards;create policy awards_read on public.progress_awards for select to authenticated using(auth.uid()=user_id);drop policy if exists awards_insert on public.progress_awards;create policy awards_insert on public.progress_awards for insert to authenticated with check(auth.uid()=user_id);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('progress-photos','progress-photos',false,2097152,array['image/jpeg']) on conflict(id)do update set public=false,file_size_limit=2097152,allowed_mime_types=array['image/jpeg'];
drop policy if exists progress_photos_read on storage.objects;create policy progress_photos_read on storage.objects for select to authenticated using(bucket_id='progress-photos' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists progress_photos_insert on storage.objects;create policy progress_photos_insert on storage.objects for insert to authenticated with check(bucket_id='progress-photos' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists progress_photos_delete on storage.objects;create policy progress_photos_delete on storage.objects for delete to authenticated using(bucket_id='progress-photos' and (storage.foldername(name))[1]=auth.uid()::text);
notify pgrst,'reload schema';commit;
