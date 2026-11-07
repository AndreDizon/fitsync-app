begin;
-- Nutrition never has rest days. Preserve food entries while clearing older flags.
update public.plan_playlists set rest_days='{}',revision=revision+1 where kind='nutrition' and cardinality(rest_days)>0;
-- Requires both playlist migrations for the canonical item validation functions.
create or replace function public.daily_plan_valid(doc jsonb) returns boolean language plpgsql stable set search_path=pg_catalog,public as $$
declare d jsonb; s jsonb; task jsonb; water jsonb; k text; i integer := 0; rest integer[];
begin
 if doc->>'version' is distinct from '1' or jsonb_typeof(doc->'days') is distinct from 'array' or jsonb_array_length(doc->'days') <> 7 then return false; end if;
 for d in select value from jsonb_array_elements(doc->'days') loop
  if jsonb_typeof(d->'water') is distinct from 'array' or jsonb_array_length(d->'water') <> 8 then return false; end if;
  for water in select value from jsonb_array_elements(d->'water') loop
   if jsonb_typeof(water->'done') is distinct from 'boolean' or (water->>'time') is null or (water->>'time') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then return false; end if;
  end loop;
  foreach k in array array['workout','nutrition'] loop
   s := d->k;
   if jsonb_typeof(s->'rest') is distinct from 'boolean' or (k='nutrition' and s->>'rest' <> 'false') or jsonb_typeof(s->'source') is distinct from 'string' or length(s->>'source') > 100 or (s->>'variation') is null or (s->>'variation') !~ '^[0-9]{1,6}$' or (s->>'variation')::integer>100000 then return false; end if;
   rest := case when k='workout' and s->>'rest'='true' then array[i] else '{}'::integer[] end;
   if not public.plan_playlist_items_valid(k,'day',i,rest,s->'items') or jsonb_array_length(s->'items') > 60 then return false; end if;
   for task in select value from jsonb_array_elements(s->'items') loop
    if jsonb_typeof(task->'done') is distinct from 'boolean' then return false; end if;
   end loop;
  end loop;
  i := i+1;
 end loop;
 return true;
exception when others then return false;
end; $$;
revoke all on function public.daily_plan_valid(jsonb) from public;
grant execute on function public.daily_plan_valid(jsonb) to authenticated;
create table if not exists public.daily_plan_weeks (
 user_id uuid not null references auth.users(id) on delete cascade,
 week_start date not null check(extract(isodow from week_start)=1),
 document jsonb not null check(public.daily_plan_valid(document)),
 revision integer not null default 1 check(revision>0),
 updated_at timestamptz not null default now(),
 primary key(user_id,week_start),
 check(document->>'week'=week_start::text),
 check((document->>'revision')::integer=revision)
);
alter table public.daily_plan_weeks enable row level security;
revoke all on public.daily_plan_weeks from anon;
grant select,insert,update,delete on public.daily_plan_weeks to authenticated;
drop policy if exists daily_plan_owner on public.daily_plan_weeks;
create policy daily_plan_owner on public.daily_plan_weeks for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
create or replace function public.daily_plan_revision() returns trigger language plpgsql set search_path=pg_catalog as $$ begin
 if tg_op='INSERT' then if new.revision<>1 then raise exception 'Initial revision must be one'; end if;
 else if new.user_id<>old.user_id or new.week_start<>old.week_start or new.revision<>old.revision+1 then raise exception 'Invalid revision or owner change'; end if; end if;
 new.updated_at:=now();return new;
end; $$;
drop trigger if exists daily_plan_revision on public.daily_plan_weeks;
create trigger daily_plan_revision before insert or update on public.daily_plan_weeks for each row execute function public.daily_plan_revision();
notify pgrst,'reload schema';
commit;
