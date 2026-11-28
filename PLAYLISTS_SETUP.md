Workout and nutrition playlists are private, manual collections for one day (Monday-Sunday selectable) or a full week. They support one Create playlist entry point, collection search, day/week filtering, editing, copying, ordering and confirmed deletion. Library pickers and saved entries both open the complete reference details.

Each entry has an editable HH:MM time. Workouts start at 08:00 and subsequent entries suggest 30 minutes later. Meal defaults are Breakfast 08:00, Lunch 12:00, Snack 15:00 and Dinner 18:00; changing meal slots preserves a time the user customized. Workout rest days cannot contain exercises: move/remove those entries first. Nutrition has no rest-day flag or control. Item removal is available in one-day and one-week playlists.

To enable storage in Supabase:

1. Run backend/migrations/20261107_plan_playlists.sql in Supabase SQL Editor.
2. Then run backend/migrations/20261108_playlist_schedule.sql and backend/migrations/20261109_daily_plans.sql (also clears older nutrition rest flags). This adds weekdays, rest days and times, preserves existing entries and backfills missing times. Both migrations can be rerun.
3. Configure the Supabase URL and publishable key in both apps, as described in AUTH_SETUP.md. Playlist requests never use a service-role key.
4. Start/redeploy both apps and sign in with a normal Supabase account. Local admin is a UI tester without a database identity.

The frontend proxy attaches the signed-in access token. The backend verifies it, derives the owner rather than accepting user_id, and uses owner RLS. Database checks enforce canonical catalog IDs, scheduling and quantities. Updates/deletes compare revisions; responses are private/no-store. GET downloads collections in batches of 100. Regenerate catalog IDs after future catalog changes with node scripts/seed-playlist-catalog.mjs.

Saved playlists have an account-partitioned IndexedDB device copy. In an already opened, signed-in app, users can create, read, edit and delete without connectivity. Save writes the device copy before attempting the account request. Pending changes replay on reconnect or Sync now. A pending label means saved on this device, not uploaded to the database. Offline deletions use tombstones until acknowledged.

Sync preserves newer in-flight device edits and reconciles a lost response without creating duplicate records. Conflicts preserve the local version for review: Make a copy keeps it as another playlist; Use account version explicitly discards it. Stale edits in another tab are rejected. Signing out clears private device copies. Storage can be removed by browser settings or eviction, so pending edits should be synced before clearing browser data.

Libraries remain public, seeded, informational and independent of onboarding. They do not have playlist-creation or add-to-plan actions; selection happens inside the playlist editor. Catalogs/media are cached separately by the service worker. Private playlists use IndexedDB, never the public service-worker cache. Full cold-start offline authentication/navigation is not provided by the library cache; open/sign in online first.

Checks: node scripts/validate-playlists.mjs runs actual PostgreSQL migrations, validation, two-user RLS, revision protection and cascade tests. npm run typecheck covers both apps. Local checks do not install either migration on hosted Supabase.

Additional sync regression checks: `node scripts/validate-playlist-sync.cjs`
uses Chrome's actual IndexedDB and Web Locks in an isolated browser origin, with
all HTTP mocked. Set `PLAYWRIGHT_MODULE` to a Playwright module path if the local
browser-test installation is elsewhere. It checks incomplete save responses,
sign-out/sign-in races, overlapping account syncs, failed older edits, malformed
remote collections, genuine conflicts, pending-edit preservation and ordinary
save/delete acknowledgements. No live account or database is used.

Successful save responses must contain the expected playlist ID/kind, validated
content, a positive revision and valid timestamps before acknowledging a device
write. A missing or invalid result keeps the local copy pending instead of
treating it as deleted. Remote lists are validated before merging, and account
access/reset errors are surfaced instead of returning stale cached lists.
Each sync belongs to a specific account session; sign-out invalidates its
responses even when the same account signs in again. A failed request for an
older local version cannot mark a newer edit as conflicted. Genuine conflicts
for the current version still require explicit resolution.
