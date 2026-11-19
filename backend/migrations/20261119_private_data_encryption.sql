begin;
alter table public.plan_playlists add column if not exists encrypted_data jsonb;
alter table public.daily_plan_weeks add column if not exists encrypted_data jsonb;
alter table public.progress_entries add column if not exists encrypted_data jsonb;
-- The backend validates decrypted input before sealing it. PostgreSQL cannot
-- inspect ciphertext. Keep the legacy checks for rows not yet converted.
do $$ declare r record; begin
 for r in select conrelid::regclass as tbl,conname,pg_get_constraintdef(oid) as def from pg_constraint
 where contype='c' and conrelid in ('public.daily_plan_weeks'::regclass,'public.progress_entries'::regclass)
 and (pg_get_constraintdef(oid) like '%daily_plan_valid(%' or pg_get_constraintdef(oid) like '%progress_payload_valid(%') loop
 execute format('alter table %s drop constraint %I',r.tbl,r.conname);
 end loop;
end $$;
alter table public.daily_plan_weeks drop constraint if exists private_week_content;
alter table public.daily_plan_weeks add constraint private_week_content check(encrypted_data is not null or public.daily_plan_valid(document));
alter table public.progress_entries drop constraint if exists private_progress_content;
alter table public.progress_entries add constraint private_progress_content check(encrypted_data is not null or public.progress_payload_valid(kind,payload));
create or replace function public.require_private_envelope() returns trigger language plpgsql set search_path=pg_catalog as $$
begin
 if new.encrypted_data is null or jsonb_typeof(new.encrypted_data)<>'object' or new.encrypted_data->>'version' is distinct from '1'
 or jsonb_typeof(new.encrypted_data->'keyId') is distinct from 'string'
 or jsonb_typeof(new.encrypted_data->'iv') is distinct from 'string'
 or jsonb_typeof(new.encrypted_data->'tag') is distinct from 'string'
 or jsonb_typeof(new.encrypted_data->'ciphertext') is distinct from 'string'
 then raise exception 'Encrypted private content required' using errcode='23514'; end if;
 return new;
end $$;
revoke all on function public.require_private_envelope() from public;
do $$ declare tbl text; begin
 foreach tbl in array array['plan_playlists','daily_plan_weeks','progress_entries'] loop
 execute format('drop trigger if exists require_private_envelope on public.%I',tbl);
 execute format('create trigger require_private_envelope before insert or update on public.%I for each row execute function public.require_private_envelope()',tbl);
 end loop;
end $$;
notify pgrst,'reload schema';
-- Encrypted images are opaque bytes, slightly larger than the source JPEG.
update storage.buckets set public=false,file_size_limit=2097252,allowed_mime_types=array['image/jpeg','application/octet-stream'] where id='progress-photos';
commit;
