# Data, APIs, calculations, and offline contracts

## Persisted model

| Entity | Storage | Owner / meaning |
| --- | --- | --- |
| Account/session | Supabase Auth | Authenticated UUID; SSR cookies |
| `fitsync_onboarding` | Auth user metadata | Validated versioned preferences, never authorization claims |
| Exercise/food catalogs | `backend/data/exercises.json`, `foods.json` + bundled/public copies | 100 public reference records each |
| `plan_catalog_refs` | Supabase | Identifier allowlist used by DB constraints; authenticated read only |
| `plan_playlists` | Supabase | User manual templates: kind/duration/selected day/rest days/items/revision |
| `daily_plan_weeks` | Supabase | Composite owner + Monday week_start; weekly JSON and revision |
| `progress_entries` | Supabase | Body/wellness/photo metadata, owner/date/payload/revision |
| `progress_visits` | Supabase | Unique owner/date for app use |
| `progress_awards` | Supabase | Unique owner/code and award timestamp |
| `progress-photos` | Private Storage | JPEG under user-id/entry-id.jpg, maximum 2 MB |

Apply migrations in order:

1. `backend/migrations/20261107_plan_playlists.sql`: catalog allowlist, initial playlist table/validation/RLS.
2. `backend/migrations/20261108_playlist_schedule.sql`: weekdays/rest days/times, validation and backfill.
3. `backend/migrations/20261109_daily_plans.sql`: weekly schedules/water/revisions; clears old nutrition rest flags.
4. `backend/migrations/20261110_progress.sql`: journal/visit/award tables and private photo policies.

Run SQL contents, not filenames. Success with no returned rows is normal. Saving editor text is optional; running applies DB changes. Local migration tests do not migrate hosted production. The live handoff probe confirmed three Progress tables exist and reject anonymous access, not every policy/bucket setting.

## Schedule contracts

Canonical types live in `shared/playlists.ts` and `shared/daily-plans.ts`:

```ts
type WorkoutPlaylistItem = {
  id: string; exerciseId: string; day: number; time: string;
  sets: number; targetType: 'reps' | 'time'; target: number; restSeconds: number
}
type NutritionPlaylistItem = {
  id: string; foodId: string; day: number; time: string;
  grams: number; meal: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'
}
type PlanTask = PlaylistItem & {
  done: boolean; actualSets?: { amount: number; weightKg: number }[]
}
type DaySchedule = { items: PlanTask[]; rest: boolean; source: string; variation: number }
type PlanDay = {
  workout: DaySchedule; nutrition: DaySchedule;
  water: { time: string; done: boolean }[] // exactly eight
}
type PlanWeek = { version: 1; week: string; days: PlanDay[]; revision: number }
```

Days: Monday=0 to Sunday=6. Times: HH:MM local wall-clock in saved IANA zone, not UTC timestamps. One-day playlists have a selected weekday; do not assume item day=0 (the first SQL predates scheduling enhancement). Entire weekly document is the write unit. Preserve stable UUIDs, parser/SQL agreement, revision checks and source/variation fields. Workout rest days cannot have exercises; nutrition rest is false. Actual sets do not replace planned targets. Changing time zone does not shift existing wall-clock times.

## API map

Browser calls same-origin frontend `/api`; proxy supplies verified Bearer token and Next rewrite reaches backend. Backend validates token again, derives owner, and uses RLS. No service-role key is used for normal app requests. Inspect handlers for exact bodies.

| Endpoint | Methods | Purpose |
| --- | --- | --- |
| `/api/health` | GET | Public reachability |
| `/api/coach` | POST | Authenticated streaming AI Gateway chat |
| `/api/playlists` | GET, POST | Collection and create |
| `/api/playlists/[id]` | PUT, DELETE | Owner/revision protected mutation |
| `/api/plans?week=YYYY-MM-DD` | GET | User Monday-start week |
| `/api/plans` | PUT | Validated whole-week replacement |
| `/api/plans/generate` | POST | Shared-engine server formulation; verified onboarding |
| `/api/progress` | GET | Entries, visits, weeks, awards; awards eligibility and photo signing |
| `/api/progress` | POST | Body/wellness create or action=visit with optional date |
| `/api/progress` | PUT, DELETE | Journal edit/delete with revision |
| `/api/progress/photo` | POST multipart | Bounded image processing + private upload/metadata |
| `/api/progress/profile` | PATCH | Own targetWeightKg metadata update |

There is no exercise/food browsing API. Social uses authenticated backend RPCs, a private image bucket and quarterly purge; see `SOCIAL_SETUP.md`. Social publishing and nearby maps require a connection. Private responses are no-store; authentication failures 401 and conflicts 409 must not become silent success. Plan/playlist bodies are bounded around 256 KiB and parsers constrain counts/amounts. Progress loads up to 1,000 entries/visits/weeks per type and signals a limit.

## Offline matrix

All offline statements assume an already opened, authenticated app and relevant data downloaded.

| Action | Offline behavior |
| --- | --- |
| Exercise search/filter/details/GIF | Public catalog/media cache after download |
| Food search/filter/details/calculator | Bundled data + saved food catalog |
| Playlist CRUD | Private IndexedDB queue/tombstones, later sync |
| My Plan formulation/alternative | Local shared engine with loaded profile/catalogs |
| Import playlist | Previously downloaded account collection |
| Task/water/actual sets | Private localStorage week copy, later sync |
| Progress analytics | Last snapshot plus available device plans/visits |
| Visit logging | Owner/date queue, replay online |
| Journal/target/photo writes | Online only; keep form open on failure |
| Photo viewing | Online signed URL; no URL in saved snapshot |
| AI coach | Online only |
| Cold launch/login | Not implemented offline |

### Public cache

`frontend/public/exercise-library-sw.js` caches only allowlisted public media/catalogs in content-hashed versioned caches, plus separate food cache. Food caching does not trigger exercise download. Readiness appears after verified completion. First exercise media download is about 32 MB and requires network + HTTPS/localhost. Static WebP first frames prevent unwanted animation.

Never cache navigation HTML, tokens, cookies, private API responses or account data in this worker. Old `/offline-library` redirects to the app; do not create another disconnected library.

### Private copies and conflicts

- Playlist IndexedDB: `fitsync-private-playlists-v1`, owner+UUID key, base revision, tombstone and local version.
- Weekly localStorage: `fitsync-private-daily-plan:<owner>:<week>`.
- Progress snapshot: `fitsync-private-progress:<owner>`; photo URLs stripped.
- Queued visits: `fitsync-private-progress:visits:<owner>`.

Signout clears private copies and uses epoch/account guards against in-flight requests restoring them. Pending edits prompt Sync first / Stay / explicit discard. Offline deletion uses tombstones until acknowledged. Newer edits during requests must survive, stale other-tab updates are rejected, and conflicts preserve local work until explicit resolution. Browser eviction/clearing destroys pending copies; these are browser copies, not an encrypted vault.

## Computation semantics

Planner is `shared/daily-plans.ts`; UI and backend consume the same engine. Formulation is deterministic calculation, not generative AI.

Workout eligibility respects equipment/experience/focus/movement preferences and avoids duplicates within a day. Budget reserves four warm-up minutes, three cooldown minutes and minute transitions. Estimated work uses timed sets or reps at three seconds plus between-set rest. Strength goal affects targets/rest; no measured workout duration or guaranteed burn/gain is claimed.

Food uses real nutrient values per 100 g edible weight scaled to portions. Raw/dry/cooked states are distinct. Diet/allergens/dislikes/time/budget influence selection. Unstructured Other allergy blocks automatic selection; ingredient matching cannot guarantee product/cross-contact safety. Menus are ingredient drafts, not clinical diets or complete recipes.

Adult targets use Mifflin-St Jeor, activity multipliers and app -10% fat-loss/+10% muscle-gain adjustments; conflicting target direction uses maintenance. Gender is not assumed sex, so both equation coefficients form a range. Under-18, missing measurements and BMI/energy boundaries can suppress target calculation; manual planning remains. Exact macros/thresholds and sources: MY_PLAN_SETUP.md. Keep heuristics transparent.

Progress uses schedule dates of marked tasks; future tasks/water excluded from badges. A workout day counts only with nonempty all-done exercise list. Monthly time is estimated working time, not measured or warm-up/cooldown. Replacing historical plans can change charts.

Streaks are distinct local visit dates, not retroactive account age. Current streak may end yesterday. Achievements: first app day; best streak 3/7/30; tasks 1/25/100; finished workouts 10. Persisted badges remain earned. This is self-report tracking, not tamper-proof competitive scoring (owners can insert their own awards).

Forecast: least-squares over up to 90 days, latest per distinct date; >=4 dates over >=21 days, newest <=30 days old. Suppress under 18, flat/noisy/opposite/very rapid trends, missing target or >365-day horizon. It is an extrapolation, not a promise. Fat-free mass requires paired weight/body-fat; includes bone/water/organs, not muscle alone. No photo-based body analysis.

Photos are resized client-side and independently decoded/pixel-limited/re-encoded by Sharp server-side with metadata removal. Signed URLs expire after 10 minutes. Deleting metadata attempts object cleanup and reports failure. Auth row deletion cascades DB records but not blobs: future delete-account code must remove objects first.
