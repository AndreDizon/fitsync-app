# FitSync

A fox-themed fitness and nutrition companion with onboarding-based planning, reference libraries, private playlists, daily to-dos, and progress tracking.

**New developer or AI assistant?** Read the architecture, feature flows, data contracts, operations and design notes linked below. Inspect current source and Git status before editing.

## Run locally

Use Node.js **24.x**. From repository root:

```sh
npm ci
npm run dev
```

- Frontend: http://localhost:3000
- Backend health: http://localhost:3001/api/health
- Two npm workspaces: `frontend/` and `backend/`; domain logic in `shared/`.
- Copy workspace `.env.example` files to `.env.local` and configure privately. Frontend proxies `/api/*` to `BACKEND_URL` (local default http://127.0.0.1:3001).

## Features

- Supabase email/password and Google authentication, separate five-step onboarding.
- Plans has Workout/Nutrition modes, each with My Plan, Playlist and Library tabs.
- Libraries: 100 exercises and 100 generic foods, detailed views, filters, numbered pagination, static thumbnails/manual demonstrations and public offline caches.
- Playlists: manually customize one day or a full week with times/quantities/workout rest days; account-backed with private offline copies.
- My Plan: calculate daily suggestions from onboarding, import playlists, add/replace library items, mark completion, record actual sets/water, sync account-owned weekly documents. Formulation runs locally online/offline; it is not generative AI.
- Progress: Analytics, Documentation and Achievements, real plan/visit statistics, editable body/wellness records, private photos and conditional weight-trend outlook.
- Home: account-driven daily summaries, page/tab shortcuts, water status and educational tip cards. Optional authenticated OpenRouter chat uses up to five free-model attempts; see [HOME_SETUP.md](HOME_SETUP.md).
- Social: account-backed community sections, reviews and nearby facilities; see [SOCIAL_SETUP.md](SOCIAL_SETUP.md). Settings still contains some unfinished controls.

Offline features require opening/signing in online and relevant data downloads first. Full offline cold-start/login is not implemented. Public service worker never caches private data; Progress journal/photo writes need internet.

## Guides

| Topic | Document |
| --- | --- |
| Features and page relationships | [Features and flows](docs/ai/FEATURES_AND_FLOWS.md) |
| Architecture and source map | [Architecture](docs/ai/ARCHITECTURE.md) |
| Data and offline contracts | [Data and offline](docs/ai/DATA_AND_OFFLINE.md) |
| Operations and validation | [Operations](docs/ai/OPERATIONS.md) |
| Design and remaining work | [Design and backlog](docs/ai/DESIGN_AND_BACKLOG.md) |
| Home and chatbot setup | [HOME_SETUP.md](HOME_SETUP.md) |
| Community setup | [SOCIAL_SETUP.md](SOCIAL_SETUP.md) |
| Auth and Google | [AUTH_SETUP.md](AUTH_SETUP.md) |
| Two-project Vercel deployment | [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) |
| My Plan and calculations | [MY_PLAN_SETUP.md](MY_PLAN_SETUP.md) |
| Playlists and sync | [PLAYLISTS_SETUP.md](PLAYLISTS_SETUP.md) |
| Progress storage/definitions | [PROGRESS_SETUP.md](PROGRESS_SETUP.md) |
| Food provenance/measurements | [NUTRITION_LIBRARY.md](NUTRITION_LIBRARY.md) |
| Exercise provenance | [backend/data/README.md](backend/data/README.md) |

Database migrations are in `backend/migrations/`; apply in filename order. Running SQL applies changes; saving SQL editor text is optional. Local validators do not migrate production.

## Checks

```sh
npm run typecheck
node scripts/validate-onboarding.mjs
node scripts/validate-playlists.mjs
node scripts/validate-daily-plans.mjs
node scripts/validate-progress.mjs
npm run build
```

More catalog/auth/deployment commands: [Operations](docs/ai/OPERATIONS.md). Avoid builds while dev processes use the same `.next` directories. Never commit credentials or environment files.

## Working conventions

Read workspace `AGENTS.md` instructions and the installed Next.js documentation before implementation. Preserve account ownership, RLS, revisions and offline conflict handling. Libraries are public reference catalogs; playlists are reusable manual templates; My Plan is the dated completion schedule; Progress derives analytics and stores private documentation. The local tester is not a database account. Never commit credentials or claim hosted deployment/migration success from local checks alone. Keep UTF-8 text intact and preserve uncommitted user work.
