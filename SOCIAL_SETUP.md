# Social community setup

The Social overview contains illustrative forum and buddy previews, Learn & improve, and a fourth card for gym communities. Open the forum or introductions for account-backed posts, or Explore gyms to create/join a group. Back to community returns to the overview. Articles are available without signing in. A regular Supabase account is required to publish or join a gym.

## Enable the database

Run the **contents** of `backend/migrations/20261111_social.sql` in the Supabase SQL editor once. It is safe to rerun. This creates separate `community_*` tables, ownership rules, posting RPCs, and the private `community-images` storage bucket. Existing legacy `social_posts` and `gyms` tables are untouched.

The forum allows two new posts per user per UTC day. Edits do not count, and deleting a post does not restore the daily allowance. Coaches/buddies allow one active introduction per account. Roles are self-described; FitSync does not verify credentials. Authors can edit/delete posts, and commenters can delete their own comments. Forum hearts toggle per account. Feeds paginate 12 posts; threads show the latest 100 comments.

## Quarterly purge and images

All posts expire together on January 1, April 1, July 1 and October 1 at 00:00 UTC. Comments and hearts expire with their post. Expired posts immediately disappear through the database rules, even if cleanup has not run yet. This is a calendar-quarter reset, so a post made just before a reset has a short lifetime.

`backend/vercel.json` schedules `/api/social/cleanup` daily at 03:00 UTC. Set these **backend-only** Vercel variables:

- `CRON_SECRET`: a long random secret. Vercel sends it as the scheduled request's Bearer token.
- `SUPABASE_SERVICE_ROLE_KEY`: the Supabase service role key, used only by the protected cleanup handler. Never prefix this with `NEXT_PUBLIC_` or share it in screenshots.
- `NEXT_PUBLIC_SUPABASE_URL`: the existing project URL.

The job physically removes expired posts and cascades comments/hearts, then deletes queued images in batches of 100. Deleted/replaced images and abandoned uploads are queued. A one-hour grace period avoids deleting an image while a post is being composed. Active post images are removed from that queue. More than 100 queued images drain over subsequent runs. Failed storage cleanup retries on the next run. Signed image links last ten minutes; refresh the feed to renew. Images are decoded and resized on the server with metadata removed.

## Learn & improve

Replaces the retired gym locator. Seventeen educational links cover workout, nutrition and recovery, with topic/expertise-level filters and three articles per page. See `docs/learning-articles.md` for source and maintenance details. There is no location permission request, map, nearby search or walking route. Old locator endpoints return HTTP 410. Existing legacy gym records are preserved; new gym communities use separate tables and API routes.

## Gym communities

Apply `backend/migrations/20261121_gym_groups.sql`, then `backend/migrations/20261121_gym_groups_community.sql` and `backend/migrations/20261121_gym_groups_time_zone.sql`, followed by `backend/migrations/20261121_gym_groups_v4.sql`, `backend/migrations/20261121_gym_groups_v5_income.sql`, `backend/migrations/20261121_gym_groups_v6_checkins.sql`, `backend/migrations/20261121_gym_groups_v7_checkin_confirmation.sql` and `backend/migrations/20261121_gym_groups_v8_history_filters.sql`, after the existing playlist migrations. If community tools already work, apply the time-zone, v4, v5, v6, v7 and v8 migrations in that order, skipping any already applied. Each account can belong to one group, up to 100 members. Open, approval-required and invite-only joining are supported. The gym workspace includes announcements, private discussion, session reservations, shared workout playlists and a roster. Staff review requests, manage announcements/sessions and moderate content; only the admin changes roles, manages bans, transfers ownership or deletes the gym. Gyms can now record manual membership plans, start/expiry dates, attendance and renewal reminders. Members can also Check in once per gym-local day without a session; only the gym admin can review and confirm team check-ins. Members and staff see their own pending/confirmed visits; the admin cannot check in. Run `node scripts/validate-gym-checkins.mjs` for check-in privacy, deduplication and cleanup checks. They are unverified communities with no online payment processing. See `docs/gym-management.md`. See `docs/gym-groups.md` for details. Run `node scripts/validate-gym-community.mjs` and `node scripts/validate-gym-api.mjs` for isolated checks.

Community writes require an internet connection. Gym discussion and moderation are available within a group. Direct messaging, global forum reporting/moderation and verified professional credentials are not part of this version.

## Validation

Run `node scripts/validate-social.mjs` for local SQL integration tests, and `npm run typecheck` for both workspaces. The SQL tests use an isolated in-memory database and never modify hosted data.

The current owner also has an Income tab for manual payment records, refunds, voids, monthly totals and CSV exports. Applying a priced membership plan does not itself record income. See `docs/gym-income.md`.
