# Development, deployment, and checks

## Local

Node **24.x**, npm locked workspaces:

```sh
npm ci
npm run dev
```

Frontend port 3000, backend port 3001 (`/api/health`). Root launcher starts both; if one fails it stops the other. Separate commands: `npm run dev:frontend`, `npm run dev:backend`.

On this Windows machine default Node may be 26. Use Node 24; `npm exec --package=node@24 -- node -p process.execPath` can locate it. If directly launching `scripts/dev.mjs` with Node, set a valid npm_execpath. Background Start-Process should be hidden. Check process command lines/listeners before stopping only app processes. Never kill all Node processes indiscriminately.

Copy each `.env.example` to `.env.local`, populate privately, never commit. Do not run build and dev concurrently into the same `.next`. Inspect dev-generated next-env.d.ts changes before committing.

## Variables

| Location | Variable | Purpose |
| --- | --- | --- |
| Both | NEXT_PUBLIC_SUPABASE_URL | Same Supabase origin |
| Both | NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Public key; legacy ANON variable supported |
| Frontend | BACKEND_URL | Backend origin only, no /api |
| Frontend | NEXT_PUBLIC_SITE_URL | App origin for auth callbacks |
| Backend | OPENROUTER_API_KEY | Optional secret chat credential; see HOME_SETUP.md |
| Frontend localhost only | DEV_TEST_* | Signed tester settings; inspect AUTH_SETUP.md |

Public key is not service role. Never put service-role/secret key in NEXT_PUBLIC variables. Normal app APIs use user tokens, not administrative credentials. Demo-account maintenance script needs separately authorized privileged credentials; existence of a seed script does not mean the demo account was created.

## Vercel

Two projects, same `AndreDizon/fitsync-app` Git repository, production main:

| | Frontend | Backend |
| --- | --- | --- |
| Project | fitsync-app-features | fitsync-backend |
| Root | frontend | backend |
| Known production origin | https://fitsync-app-features.vercel.app | https://fitsync-backend-hazel.vercel.app |

Use Node24/Next.js preset and outside-root source access. Per-app vercel.json installs root locked workspaces and builds the app. Output is `.next` relative to app root. Root workspace build does not create repository-root `.next`, which caused an earlier deployment failure.

Backend root 404 is normal. Verify backend `/api/health`, then frontend `/api/health`. Backend deployment protection must not intercept API proxy requests; retain application token verification. Environment edits require redeploy. Git push may trigger builds, but do not claim Ready without checking. Preview callback/origin needs intentional configuration.

## Auth redirect issue already solved

Google worked but returned from Vercel to localhost. Supabase Site URL was localhost. User corrected Site URL/allowed callback and confirmed production Google sign-in works.

- Supabase Site URL: `https://fitsync-app-features.vercel.app`.
- Allowed app callback: `https://fitsync-app-features.vercel.app/auth/callback` (and reset-password variant documented in AUTH_SETUP.md).
- Frontend NEXT_PUBLIC_SITE_URL must match frontend production origin.
- Google Cloud authorized redirect is Supabase `/auth/v1/callback`, NOT frontend or backend app URL.
- Allow explicit localhost callbacks for development without replacing production Site URL.
- Do not reuse consumed OAuth code URLs, bypass nonce checks, or start localhost as a production fix.

OAuth secret appeared in earlier screenshots. Never reproduce it in source/docs. Rotation remains advisable before release. External dashboards are user-managed unless connected tools actually have access; never claim remote changes without evidence.

## Committed validation

```sh
npm run typecheck
node scripts/validate-auth.mjs
node scripts/validate-onboarding.mjs
node scripts/validate-playlists.mjs
node scripts/validate-daily-plans.mjs
node scripts/validate-progress.mjs
node scripts/validate-exercises.mjs
node scripts/validate-exercise-estimates.mjs
node scripts/validate-library-media.mjs
node scripts/validate-foods.mjs
node scripts/validate-deployment.mjs
npm run build
```

Choose checks relevant to the change, avoid unnecessary repetition. PGlite tests use real PostgreSQL semantics with isolated auth/storage fixtures; they do not change production. Existing ignored logs may contain earlier browser fixtures that assume pre-tab Progress layout; adapt selectors before interpreting failures.

`node scripts/check-auth-connection.mjs`: read-only provider/key reachability, not proof of end-to-end OAuth success.

Maintenance commands: `npm run seed:offline`, `npm run seed:foods`, `node scripts/seed-playlist-catalog.mjs` after catalog-ID changes, `scripts/freeze-exercise-thumbnails.mjs` for static frames. Import/curation scripts preserve source provenance; do not blindly overwrite curated data. Frontend predev/prebuild regenerate public seed assets; normal builds should not require downloading upstream datasets.

## Manual acceptance checklist

1. Email/Google/recovery, onboarding gate, editing preferences, real account versus tester.
2. Workout/Nutrition changes all three Plans tabs; reference pagination/filters/static images/manual GIF/details.
3. Playlist save exits, back discards unsaved draft, item removal, no nutrition rest day.
4. Formulate/import/manual selection/replacement; editable time and quantities, meal completion, actual sets/water.
5. Offline changes/formulation/import using downloaded collection; reconnect/conflict/signout warning and cleanup.
6. Progress tabs, 320/393/768/1440 widths, body/wellness CRUD, photo compare/delete, goal edit, real stats/awards.
7. Second account sees none of first account's private data/caches. Synced records survive logout/login; unsynced discard does not.
8. Deployed frontend+backend health and authenticated smoke test after release.

## Evidence at handoff

Local Progress validation passed parsers/calculations/forecast/actual SQL migration/RLS/revision/private-storage fixtures. Later layout edits passed frontend TypeScript. Read-only hosted probe found Progress tables and anonymous denial; it did not verify every logged-in CRUD/bucket setting. Google success is user-reported. Do not conflate these evidence levels.
