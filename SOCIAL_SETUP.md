# Social community setup

The Social body has one overview with three preview sections: Open forum, Coaches & gym buddies, and Gyms & facilities. Each View more button replaces the body with that section?s full feed and tools. Back to community returns to its overview section. The existing hero stays in place. These are real account-backed features, not the old preview posts. A regular Supabase account is required; the local admin tester cannot publish.

## Enable the database

Run the **contents** of `backend/migrations/20261111_social.sql` in the Supabase SQL editor once. It is safe to rerun. This creates separate `community_*` tables, ownership rules, posting RPCs, and the private `community-images` storage bucket. Existing legacy `social_posts` and `gyms` tables are untouched.

Forum and gym sections each allow two new posts per user per UTC day. Edits do not count, and deleting a post does not restore the daily allowance. Coaches/buddies allow one active introduction per account. Roles are self-described; FitSync does not verify credentials. Authors can edit/delete posts, and commenters can delete their own comments. Forum hearts toggle per account. Feeds paginate 12 posts; threads show the latest 100 comments.

## Quarterly purge and images

All posts expire together on January 1, April 1, July 1 and October 1 at 00:00 UTC. Comments and hearts expire with their post. Expired posts immediately disappear through the database rules, even if cleanup has not run yet. This is a calendar-quarter reset, so a post made just before a reset has a short lifetime.

`backend/vercel.json` schedules `/api/social/cleanup` daily at 03:00 UTC. Set these **backend-only** Vercel variables:

- `CRON_SECRET`: a long random secret. Vercel sends it as the scheduled request's Bearer token.
- `SUPABASE_SERVICE_ROLE_KEY`: the Supabase service role key, used only by the protected cleanup handler. Never prefix this with `NEXT_PUBLIC_` or share it in screenshots.
- `NEXT_PUBLIC_SUPABASE_URL`: the existing project URL.

The job physically removes expired posts and cascades comments/hearts, then deletes queued images in batches of 100. Deleted/replaced images and abandoned uploads are queued. A one-hour grace period avoids deleting an image while a post is being composed. Active post images are removed from that queue. More than 100 queued images drain over subsequent runs. Failed storage cleanup retries on the next run. Signed image links last ten minutes; refresh the feed to renew. Images are decoded and resized on the server with metadata removed.

## Nearby facilities

Use my location asks for browser GPS permission. Requires HTTPS (localhost also works). `frontend/next.config.mjs` now permits geolocation for the app itself. Coordinates are not written to community posts or the account database. The server queries rounded coordinates and caches results for 15 minutes; map tiles and external directions have their own providers.

Nearby searches use three public Overpass endpoints sequentially on failure (up to the requested maximum of five): overpass-api.de, overpass.kumi.systems, and overpass.private.coffee. These are map data services, not AI models. Coverage includes gyms/sports centres, outdoor fitness, yoga and mapped dietitians within about 6 km. Data is incomplete in some locations. The list sorts by straight-line distance. Clicking a result marks it on the map. Show walking route draws an OSRM/FOSSGIS foot route and shows estimated walking distance/time; external Google Maps directions are also available. Route requests send coordinates to the provider, are cached for 30 minutes and spaced at least one second apart per server instance. No paid API key is required.

Public services do not have a universal daily reset. Retry-After is shown when supplied; otherwise the UI says the reset is unknown. Cache, one-minute per-account request spacing and provider cooldowns limit load. These process-local limits are best effort on serverless instances, not durable distributed quotas. High traffic requires a hosted/self-hosted provider and shared caching.

OpenStreetMap tiles have attribution and normal browser caching. They are not prefetched for offline use. See https://wiki.openstreetmap.org/wiki/Overpass_API and https://operations.osmfoundation.org/policies/tiles/ for provider policies.

Community writes and nearby search require an internet connection. There is no fabricated offline publish success. Reporting/moderation, messaging and verified professional credentials are not part of this version.

## Validation

Run `node scripts/validate-social.mjs` for local SQL integration tests, and `npm run typecheck` for both workspaces. The SQL tests use an isolated in-memory database and never modify hosted data.
