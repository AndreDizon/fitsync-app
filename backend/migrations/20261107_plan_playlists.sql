begin;

-- Public identifiers only. Account holders cannot change the library allowlist.
create table if not exists public.plan_catalog_refs (
  kind text not null check (kind in ('workout', 'nutrition')),
  id text not null,
  primary key (kind, id)
);
alter table public.plan_catalog_refs enable row level security;
drop policy if exists plan_catalog_read on public.plan_catalog_refs;
create policy plan_catalog_read on public.plan_catalog_refs for select to authenticated using (true);
revoke all on public.plan_catalog_refs from anon, authenticated;
grant select on public.plan_catalog_refs to authenticated;

-- BEGIN GENERATED CATALOG
insert into public.plan_catalog_refs(kind,id) values
('workout', 'barbell-bench-press'),
('workout', 'barbell-incline-bench-press'),
('workout', 'dumbbell-bench-press'),
('workout', 'dumbbell-incline-bench-press'),
('workout', 'dumbbell-fly'),
('workout', 'cable-standing-fly'),
('workout', 'push-up'),
('workout', 'incline-push-up'),
('workout', 'lever-chest-press'),
('workout', 'lever-seated-fly'),
('workout', 'decline-push-up'),
('workout', 'kneeling-push-up-male'),
('workout', 'dumbbell-decline-bench-press'),
('workout', 'smith-bench-press'),
('workout', 'band-bench-press'),
('workout', 'chest-and-front-of-shoulder-stretch'),
('workout', 'cable-pulldown'),
('workout', 'pull-up'),
('workout', 'chin-up'),
('workout', 'cable-seated-row'),
('workout', 'barbell-bent-over-row'),
('workout', 'dumbbell-bent-over-row'),
('workout', 'dumbbell-incline-row'),
('workout', 'cable-straight-arm-pulldown'),
('workout', 'lever-seated-row'),
('workout', 'inverted-row'),
('workout', 'cable-underhand-pulldown'),
('workout', 'pull-up-neutral-grip'),
('workout', 'inverted-row-bent-knees'),
('workout', 'band-one-arm-standing-low-row'),
('workout', 'barbell-shrug'),
('workout', 'kneeling-lat-stretch'),
('workout', 'barbell-high-bar-squat'),
('workout', 'dumbbell-goblet-squat'),
('workout', 'sled-45-leg-press'),
('workout', 'barbell-romanian-deadlift'),
('workout', 'dumbbell-lunge'),
('workout', 'dumbbell-rear-lunge'),
('workout', 'dumbbell-single-leg-split-squat'),
('workout', 'lever-leg-extension'),
('workout', 'lever-lying-leg-curl'),
('workout', 'barbell-glute-bridge'),
('workout', 'lever-standing-calf-raise'),
('workout', 'lever-seated-calf-raise'),
('workout', 'barbell-deadlift'),
('workout', 'dumbbell-step-up'),
('workout', 'lever-seated-leg-curl'),
('workout', 'lever-seated-hip-abduction'),
('workout', 'lever-seated-hip-adduction'),
('workout', 'bodyweight-standing-calf-raise'),
('workout', 'lying-side-quads-stretch'),
('workout', 'jump-squat'),
('workout', 'barbell-seated-overhead-press'),
('workout', 'dumbbell-seated-shoulder-press'),
('workout', 'dumbbell-lateral-raise'),
('workout', 'cable-lateral-raise'),
('workout', 'dumbbell-rear-fly'),
('workout', 'cable-rear-delt-row-with-rope'),
('workout', 'dumbbell-front-raise'),
('workout', 'lever-shoulder-press'),
('workout', 'dumbbell-standing-overhead-press'),
('workout', 'dumbbell-arnold-press'),
('workout', 'lever-lateral-raise'),
('workout', 'cable-standing-cross-over-high-reverse-fly'),
('workout', 'cable-standing-shoulder-external-rotation'),
('workout', 'rear-deltoid-stretch'),
('workout', 'barbell-curl'),
('workout', 'dumbbell-biceps-curl'),
('workout', 'dumbbell-hammer-curl'),
('workout', 'cable-curl'),
('workout', 'dumbbell-preacher-curl'),
('workout', 'cable-pushdown-with-rope-attachment'),
('workout', 'cable-overhead-triceps-extension-rope-attachment'),
('workout', 'barbell-close-grip-bench-press'),
('workout', 'dumbbell-lying-triceps-extension'),
('workout', 'dumbbell-kickback'),
('workout', 'dumbbell-incline-biceps-curl'),
('workout', 'dumbbell-concentration-curl'),
('workout', 'ez-barbell-curl'),
('workout', 'barbell-reverse-curl'),
('workout', 'cable-one-arm-tricep-pushdown'),
('workout', 'diamond-push-up'),
('workout', 'dumbbells-seated-triceps-extension'),
('workout', 'overhead-triceps-stretch'),
('workout', 'dead-bug'),
('workout', 'reverse-crunch'),
('workout', 'crunch-floor'),
('workout', 'side-bridge-v-2'),
('workout', 'band-horizontal-pallof-press'),
('workout', 'shoulder-tap'),
('workout', 'mountain-climber'),
('workout', 'jack-jump-male'),
('workout', 'jump-rope'),
('workout', 'stationary-bike-walk'),
('workout', 'hanging-leg-raise'),
('workout', 'russian-twist'),
('workout', 'weighted-front-plank'),
('workout', 'burpee'),
('workout', 'walk-elliptical-cross-trainer'),
('workout', 'walking-on-incline-treadmill'),
('nutrition', 'cooked-white-rice'),
('nutrition', 'dry-oats'),
('nutrition', 'roasted-chicken-breast'),
('nutrition', 'hard-boiled-egg'),
('nutrition', 'cooked-tilapia'),
('nutrition', 'calcium-set-tofu'),
('nutrition', 'cooked-mung-beans'),
('nutrition', 'raw-banana'),
('nutrition', 'boiled-broccoli'),
('nutrition', 'plain-greek-yogurt'),
('nutrition', 'brown-rice'),
('nutrition', 'quinoa'),
('nutrition', 'pearled-barley'),
('nutrition', 'bulgur'),
('nutrition', 'couscous'),
('nutrition', 'whole-wheat-pasta'),
('nutrition', 'whole-wheat-bread'),
('nutrition', 'white-bread'),
('nutrition', 'millet'),
('nutrition', 'buckwheat-groats'),
('nutrition', 'roasted-chicken-thigh'),
('nutrition', 'roasted-turkey-breast'),
('nutrition', 'lean-ground-beef'),
('nutrition', 'roasted-pork-tenderloin'),
('nutrition', 'atlantic-salmon'),
('nutrition', 'canned-light-tuna'),
('nutrition', 'canned-sardines'),
('nutrition', 'cooked-shrimp'),
('nutrition', 'egg-white'),
('nutrition', 'atlantic-cod'),
('nutrition', 'lentils'),
('nutrition', 'chickpeas'),
('nutrition', 'black-beans'),
('nutrition', 'red-kidney-beans'),
('nutrition', 'pinto-beans'),
('nutrition', 'white-beans'),
('nutrition', 'split-peas'),
('nutrition', 'green-soybeans'),
('nutrition', 'tempeh'),
('nutrition', 'apple-with-skin'),
('nutrition', 'orange'),
('nutrition', 'mango'),
('nutrition', 'papaya'),
('nutrition', 'pineapple'),
('nutrition', 'watermelon'),
('nutrition', 'grapes'),
('nutrition', 'strawberries'),
('nutrition', 'blueberries'),
('nutrition', 'bartlett-pear'),
('nutrition', 'avocado'),
('nutrition', 'green-kiwi'),
('nutrition', 'guava'),
('nutrition', 'cantaloupe'),
('nutrition', 'boiled-spinach'),
('nutrition', 'carrot'),
('nutrition', 'tomato'),
('nutrition', 'cucumber-with-peel'),
('nutrition', 'romaine-lettuce'),
('nutrition', 'cabbage'),
('nutrition', 'boiled-cauliflower'),
('nutrition', 'green-beans'),
('nutrition', 'red-bell-pepper'),
('nutrition', 'boiled-zucchini'),
('nutrition', 'boiled-eggplant'),
('nutrition', 'white-mushrooms'),
('nutrition', 'onion'),
('nutrition', 'baked-butternut-squash'),
('nutrition', 'boiled-asparagus'),
('nutrition', 'boiled-okra'),
('nutrition', 'boiled-kale'),
('nutrition', 'whole-milk'),
('nutrition', 'reduced-fat-milk'),
('nutrition', 'skim-milk'),
('nutrition', 'plain-low-fat-yogurt'),
('nutrition', 'cottage-cheese'),
('nutrition', 'cheddar-cheese'),
('nutrition', 'part-skim-mozzarella'),
('nutrition', 'almonds'),
('nutrition', 'walnuts'),
('nutrition', 'cashews'),
('nutrition', 'pistachios'),
('nutrition', 'dry-roasted-peanuts'),
('nutrition', 'chia-seeds'),
('nutrition', 'flaxseed'),
('nutrition', 'pumpkin-seed-kernels'),
('nutrition', 'sunflower-seed-kernels'),
('nutrition', 'sesame-seed-kernels'),
('nutrition', 'olive-oil'),
('nutrition', 'canola-oil'),
('nutrition', 'sunflower-oil'),
('nutrition', 'sesame-oil'),
('nutrition', 'coconut-oil'),
('nutrition', 'unsalted-butter'),
('nutrition', 'boiled-potato'),
('nutrition', 'boiled-sweet-potato'),
('nutrition', 'cooked-yam'),
('nutrition', 'cooked-taro'),
('nutrition', 'baked-sweet-potato'),
('nutrition', 'baked-potato-with-skin'),
('nutrition', 'boiled-beetroot')
on conflict do nothing;
-- END GENERATED CATALOG

create or replace function public.plan_playlist_items_valid(p_kind text, p_duration text, p_items jsonb)
returns boolean language plpgsql stable set search_path = pg_catalog, public as $$
declare entry jsonb; seen text[] := '{}'; entry_id text; value_key text;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then return false; end if;
  if jsonb_array_length(p_items) > 350 or octet_length(p_items::text) > 262144 then return false; end if;
  for entry in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(entry) <> 'object' then return false; end if;
    entry_id := entry->>'id';
    if entry_id is null or entry_id !~* '^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$' or entry_id = any(seen) then return false; end if;
    seen := array_append(seen, entry_id);
    if jsonb_typeof(entry->'day') is distinct from 'number' or (entry->>'day') !~ '^[0-6]$' then return false; end if;
    if p_duration = 'day' and (entry->>'day')::integer <> 0 then return false; end if;
    if p_kind = 'workout' then
      if not exists (select 1 from public.plan_catalog_refs where kind = p_kind and id = entry->>'exerciseId') then return false; end if;
      foreach value_key in array array['sets', 'target', 'restSeconds'] loop
        if jsonb_typeof(entry->value_key) is distinct from 'number' or (entry->>value_key) !~ '^\d{1,4}$' then return false; end if;
      end loop;
      if (entry->>'sets')::integer not between 1 and 20 or (entry->>'restSeconds')::integer not between 0 and 600 then return false; end if;
      if entry->>'targetType' is null or entry->>'targetType' not in ('reps', 'time') then return false; end if;
      if (entry->>'target')::integer < 1 or (entry->>'target')::integer > (case when entry->>'targetType' = 'reps' then 100 else 3600 end) then return false; end if;
    elsif p_kind = 'nutrition' then
      if not exists (select 1 from public.plan_catalog_refs where kind = p_kind and id = entry->>'foodId') then return false; end if;
      if jsonb_typeof(entry->'grams') is distinct from 'number' then return false; end if;
      if (entry->>'grams')::numeric not between 1 and 2000 then return false; end if;
      if entry->>'meal' is null or entry->>'meal' not in ('Breakfast', 'Lunch', 'Dinner', 'Snack') then return false; end if;
    else return false;
    end if;
  end loop;
  return true;
end;
$$;

create table if not exists public.plan_playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('workout', 'nutrition')),
  duration text not null check (duration in ('day', 'week')),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  description text not null default '' check (char_length(description) <= 240),
  items jsonb not null default '[]'::jsonb,
  revision integer not null default 1 check (revision >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plan_playlists_valid_items check (public.plan_playlist_items_valid(kind, duration, items))
);
create index if not exists plan_playlists_owner_kind_updated on public.plan_playlists(user_id, kind, updated_at desc);

create or replace function public.plan_playlists_protect_update()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  if new.id <> old.id or new.user_id <> old.user_id or new.kind <> old.kind then
    raise exception 'Playlist identity and owner cannot change' using errcode = '23514';
  end if;
  if new.revision <> old.revision + 1 then
    raise exception 'Playlist revision must increment by one' using errcode = '23514';
  end if;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists plan_playlists_protect_update on public.plan_playlists;
create trigger plan_playlists_protect_update before update on public.plan_playlists for each row execute function public.plan_playlists_protect_update();

alter table public.plan_playlists enable row level security;
alter table public.plan_playlists force row level security;
revoke all on public.plan_playlists from anon, authenticated;
grant select, insert, update, delete on public.plan_playlists to authenticated;
drop policy if exists plan_playlists_select_own on public.plan_playlists;
create policy plan_playlists_select_own on public.plan_playlists for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists plan_playlists_insert_own on public.plan_playlists;
create policy plan_playlists_insert_own on public.plan_playlists for insert to authenticated with check ((select auth.uid()) = user_id and revision = 1);
drop policy if exists plan_playlists_update_own on public.plan_playlists;
create policy plan_playlists_update_own on public.plan_playlists for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists plan_playlists_delete_own on public.plan_playlists;
create policy plan_playlists_delete_own on public.plan_playlists for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on function public.plan_playlist_items_valid(text, text, jsonb) from public;
grant execute on function public.plan_playlist_items_valid(text, text, jsonb) to authenticated;
revoke all on function public.plan_playlists_protect_update() from public;
notify pgrst, 'reload schema';
commit;
