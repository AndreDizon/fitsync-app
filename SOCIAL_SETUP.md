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

Apply `backend/migrations/20261121_gym_groups.sql` after the existing migrations to enable the fourth card's create/join actions. Each account can belong to one group, up to 100 members. The creator is gym admin and can promote members to staff or demote staff to members. Staff cannot manage roles. Join by name search or a ten-character code. These are unverified user-created groups, not paid memberships or business listings. See `docs/gym-groups.md` for permissions, privacy and reset behavior. Run `node scripts/validate-gym-groups.mjs` for isolated SQL tests.

Community writes require an internet connection. Reporting/moderation, messaging and verified professional credentials are not part of this version.

## Validation

Run `node scripts/validate-social.mjs` for local SQL integration tests, and `npm run typecheck` for both workspaces. The SQL tests use an isolated in-memory database and never modify hosted data.
