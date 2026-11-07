begin;
-- Run after 20261107_plan_playlists.sql. Existing playlists and entry order are kept.
alter table public.plan_playlists add column if not exists selected_day integer not null default 0;
alter table public.plan_playlists add column if not exists rest_days integer[] not null default '{}';

create or replace function public.plan_playlist_items_valid(p_kind text, p_duration text, p_selected_day integer, p_rest_days integer[], p_items jsonb)
returns boolean language plpgsql stable set search_path = pg_catalog, public as $$
declare entry jsonb; legacy_items jsonb;
begin
  if p_selected_day is null or p_selected_day not between 0 and 6 or p_rest_days is null then return false; end if;
  if cardinality(p_rest_days) > 7 or (cardinality(p_rest_days) > 0 and array_ndims(p_rest_days) <> 1) then return false; end if;
  if exists (select 1 from unnest(p_rest_days) d where d is null or d not between 0 and 6 or (p_duration = 'day' and d <> p_selected_day)) then return false; end if;
  if cardinality(p_rest_days) <> (select count(distinct d) from unnest(p_rest_days) d) then return false; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then return false; end if;
  -- Reuse original ID, range and catalog checks, normalizing the legacy one-day index only for validation.
  select coalesce(jsonb_agg(case when p_duration = 'day' then value || '{"day":0}'::jsonb else value end order by ord), '[]'::jsonb)
    into legacy_items from jsonb_array_elements(p_items) with ordinality e(value, ord);
  if not public.plan_playlist_items_valid(p_kind, p_duration, legacy_items) then return false; end if;
  for entry in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(entry->'day') is distinct from 'number' or (entry->>'day') !~ '^[0-6]$' then return false; end if;
    if p_duration = 'day' and (entry->>'day')::integer <> p_selected_day then return false; end if;
    if p_kind = 'workout' and (entry->>'day')::integer = any(p_rest_days) then return false; end if;
    if jsonb_typeof(entry->'time') is distinct from 'string' or (entry->>'time') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then return false; end if;
  end loop;
  return true;
end;
$$;

alter table public.plan_playlists drop constraint if exists plan_playlists_valid_items;
-- Add defaults to old entries; never overwrite a user-entered time.
update public.plan_playlists p set items = (
  select coalesce(jsonb_agg(case when value ? 'time' then value else value || jsonb_build_object('time', case when p.kind = 'workout' then '08:00' when value->>'meal' = 'Breakfast' then '08:00' when value->>'meal' = 'Dinner' then '18:00' when value->>'meal' = 'Snack' then '15:00' else '12:00' end) end order by ord), '[]'::jsonb)
  from jsonb_array_elements(p.items) with ordinality e(value, ord)
), revision = revision + 1
where exists (select 1 from jsonb_array_elements(p.items) e where not (e ? 'time'));
alter table public.plan_playlists add constraint plan_playlists_valid_items check (public.plan_playlist_items_valid(kind, duration, selected_day, rest_days, items));
revoke all on function public.plan_playlist_items_valid(text, text, integer, integer[], jsonb) from public;
grant execute on function public.plan_playlist_items_valid(text, text, integer, integer[], jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
