Progress is account-owned and uses real plan completion, recorded app visits and user-entered journal data. The previous sample progress screen has been removed.

Hosted setup

1. Apply the three plan migrations documented in MY_PLAN_SETUP.md first.
2. Run backend/migrations/20261110_progress.sql in Supabase SQL Editor. It creates progress_entries, progress_visits, progress_awards and a private progress-photos storage bucket. The migration is rerunnable.
3. Deploy/restart both workspaces. Existing Supabase project URL and public publishable key are sufficient for the app APIs; do not put a service-role key in the frontend.

No hosted migration was applied by local tests. The local admin tester sees its planning profile and empty progress, but cannot write account logs or photos.

Data definitions

- App streaks are distinct days with recorded app use in the saved onboarding time zone. A current streak remains live through yesterday so users have today to continue it. Queued offline visits replay on reconnect. Device clocks can affect offline visit dates; this is a personal habit tool, not an audited competition.
- Completion calendar and task totals use the schedule dates of marked exercise/food entries. Water is excluded from task badges. Future scheduled entries do not count. A finished workout day has at least one exercise and all its exercises marked done. Historical plan replacement or unmarking can change these statistics.
- Exercise time is an estimate from the saved working sets/reps/duration and between-set rest. It is not measured time, does not include warm-up/cooldown, and does not claim calorie burn or muscle gain.
- The weekly graph covers eight Monday-start weeks; the calendar covers twelve weeks. Body/wellness chart filters are 28, 84 or 365 days. The API loads up to 1,000 entries, visits and plan weeks per type and explicitly reports history limits. Device plan copies override account copies for the same week when displaying pending edits.
- Achievements are persisted when synced account history meets a threshold and remain unlocked even if tasks are later undone. Pending local completions can display Sync to unlock. Thresholds: first app day, 3/7/30-day best streak, 1/25/100 completed exercise/food tasks, and 10 finished workout days. Milestone counters are self-tracking data, not a tamper-proof scoring system.

Journal and goal editing

Body logs support kg, self-reported body-fat %, and chest/waist/hips/arm/thigh circumferences in cm. Wellness logs support RPE 1-10, energy/mood/sleep-quality/soreness 1-5 and sleep hours 0-24. Fields are optional; at least one measured/rated value is required. Notes have a 500-character limit. Real calendar dates and no future dates are enforced. Entries can be edited or deleted, with revision checks to prevent silently overwriting another device. New body/wellness entries have stable IDs so retries do not duplicate identical entries.

Target-weight edits update the authenticated user's saved onboarding metadata and current planning context. Other onboarding measurements are unchanged; users can update them through planning preferences. Logged weights do not silently rewrite onboarding measurements or past plans.

Fat mass is logged weight times body-fat percentage. Fat-free mass is the remainder, including water, organs and bone, not a direct measure of muscle. It is calculated only when weight and body-fat values were entered together.

Projection method

A simple least-squares line uses the latest entry per date in the last 90 days. It requires four distinct dates across at least 21 days and a latest entry within 30 days. The app suppresses dates for users under 18, missing target/age, near-flat rates (<0.02 kg/week), noisy fits (R-squared <0.5), very rapid observed change (>1.5 kg/week), trends moving away from the target, stale projected dates and extrapolations longer than 365 days. These are conservative app heuristics, not clinical validation or recommended rates. R-squared describes line agreement, not probability of reaching the goal. A displayed month assumes the recorded trend continues; it is not a promise. The app does not predict muscle gain, strength or endurance outcomes from weight. Context on adult weight-planning scope: https://www.niddk.nih.gov/bwp (the NIDDK model is not used by this implementation).

Private photos

Photo uploads accept JPEG/PNG/WebP. The client resizes to 1280 pixels and the server independently decodes, limits pixels, strips metadata, and re-encodes JPEG. The bucket is private, limited to JPEG and 2 MB per uploaded file. Paths are user-id/entry-id.jpg. RLS restricts records and storage paths to their owner. The backend issues 10-minute signed viewing URLs; no public image URLs or service-role credentials are returned. Photo metadata/captions/dates can be edited; deleting an entry also removes its object. Failed object cleanup is explicitly reported with the entry ID for support. If implementing account deletion later, remove that user's storage objects before deleting auth.users; SQL cascades journal/visit/award rows but do not remove storage blobs.

Connectivity and privacy

Journal/photo/target writes require a connection and keep the form open on failure. The last successful account snapshot is readable offline, with pending device plan edits merged into its totals. Photo URLs are excluded from that snapshot; viewing photos requires connectivity. Snapshots and queued visits are partitioned by account and cleared on signout. An in-flight request cannot repopulate a cache after signout. Progress APIs are private/no-store, and the public exercise-library service worker never caches them. Signing out checks pending plan/playlist/activity changes first. Offline reopening/sign-in still follows the existing app limitation.

Validation

node scripts/validate-progress.mjs checks actual PostgreSQL migration/idempotency, owner isolation, revisions, validation, private storage policies, timezone/streak calculations, task totals and forecast edge cases. Browser tests in the ignored logs directory exercise actual Progress routes against local PostgreSQL, body/wellness create/edit/delete, private photo upload/delete, accessible dialogs and 320-1440px layouts. They create no live users or hosted records.


Verify live photo saving

1. Use the same Supabase project URL and public publishable key in frontend and backend. Configure frontend BACKEND_URL to reach your backend, as described in VERCEL_DEPLOYMENT.md. Restart local servers or redeploy after environment changes. Never put a service-role key in frontend variables.
2. Apply missing SQL migrations in filename order: 20261107_plan_playlists.sql, 20261108_playlist_schedule.sql, 20261109_daily_plans.sql, 20261110_progress.sql, 20261111_social.sql, 20261117_progress_achievements.sql, and 20261118_achievement_claims.sql, from backend/migrations. Run each file's SQL contents in your project's SQL editor.
3. Confirm the progress-photos Storage bucket is private. The Progress migration creates account-owner policies for both progress_entries and stored images.
4. Sign out of Local tester access. Sign in using a normal Supabase email/password account or configured Google login, then complete onboarding. See AUTH_SETUP.md for account setup.
5. In Progress > Documentation > Photo timeline, use Add photo, select a JPEG/PNG/WebP, choose a date inside the active period, and save. Reload the page and sign out/in; the photo should remain. Edit its caption, reload, then delete a test photo and confirm both its progress_entries row and storage object are removed.
6. Sign in with a second regular account and confirm the first account's photos do not appear. Do not use a copied signed image URL as an isolation test: anyone possessing that temporary link may view it until expiry (10 minutes).

The timeline displays six photos per page, newest first by default. Oldest first changes the chronological direction. The bottom Previous/Next controls navigate previews; changing the period or order resets the page. Compare two photos opens a separate comparison view using any photos in the selected period.

Social cleanup is separate from private photos. For deployed Social post cleanup, configure backend-only CRON_SECRET and SUPABASE_SERVICE_ROLE_KEY, and deploy backend/vercel.json's daily /api/social/cleanup schedule. See SOCIAL_SETUP.md. Private progress photos remain until their owner deletes them; they are not part of Social's quarterly purge.
