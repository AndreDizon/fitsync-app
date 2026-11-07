# FitSync

Authentication setup (including Google sign-in): [AUTH_SETUP.md](AUTH_SETUP.md).
Vercel frontend/backend setup and troubleshooting: [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md).

- `frontend/`: Next.js UI, components, public assets, and Supabase browser client.
- `backend/`: Next.js API service, including the streaming AI coach and health endpoint.
- `scripts/`: shared development launcher.

Install Node.js 24 LTS (the version used on Vercel), then from this folder run:

```sh
npm install
npm run dev
```

Frontend: http://localhost:3000
Backend health: http://localhost:3001/api/health

The frontend proxies `/api/*` to the backend. Set `BACKEND_URL` in
`frontend/.env.local` to change its default of `http://127.0.0.1:3001`.

Copy `backend/.env.example` to `backend/.env.local` and provide an
`AI_GATEWAY_API_KEY` for the AI coach. Copy `frontend/.env.example` to
`frontend/.env.local` and provide your Supabase project values to enable the
existing authentication and social database features. These require the
project's existing Supabase tables and policies. The app opens at `/login` and
requires a verified session before the dashboard is accessible.

The exercise library uses a bundled, read-only catalog
of 100 foundational exercises with demonstration media from
JahelCuadrado/ExerciseGymGifsDB. It works without Supabase
configuration. The seeded catalog is its primary source online and offline;
search, focus/muscle/equipment/type/level/movement filters, sorting, and pagination
run on the device without exercise API requests. Equipment supports
multiple choices, option counts reflect other active filters, and search accepts
common aliases such as DB, BB, pecs, and pushups. The UI displays 24 cards per page and opens details
with locally hosted demonstrations, specific execution steps, suggested targets,
and fox coach tips. The collection includes 16 Chest, 16 Back, 20 Legs,
14 Shoulders, 18 Arms, and 16 Core/Cardio exercises. The strict JSON array is in
[backend/data/exercises.json](backend/data/exercises.json).
See [catalog provenance and import instructions](backend/data/README.md) for
field mappings and media availability.

The exercise library automatically saves all 100 records, thumbnails, and GIFs
on the device after its first visit (about 32 MB). Keep it open until it says
**the offline-ready note appears**. The same library supports search,
filters, sorting, pagination, instructions, and demonstrations without a network
connection while the app is open. Reloading or launching the full app still requires its server;
there is no separate offline-mode button. The first download
requires a network connection and HTTPS or localhost. Clearing the browser's
site storage removes its offline copy.

Run `npm run seed:offline` to rebuild the offline package. This also runs before
frontend development/build commands and after importing the exercise catalog.
Only public exercise data and media are cached;
authenticated dashboard HTML, credentials, and personal API responses are not.
There is no exercise API endpoint; the library reads the seeded catalog directly.

Run each service separately with `npm run dev:frontend` or `npm run dev:backend`.

### Onboarding and planning preferences

After sign-in, accounts without a valid completed profile go to `/onboarding`.
Five steps collect a primary goal, multiple focus areas (or Overall), exact adult
age, gender (including Prefer not to say), activity level, optional height/current
weight/target weight, training days/experience/equipment/movement preferences, food
preferences/allergies/cooking time/budget, and a final review. The shared
allowlist and validation live in `shared/onboarding.ts`; all saves recheck
authentication and validate on the server. Settings → Goals & planning
preferences opens the flow again. Unfinished answers remain in component memory;
they are not persisted as a draft and are lost on refresh.

Successful saves open `/plan-preparation`, an authenticated fox-themed setup
animation that summarizes the saved goal, exercise and meal preferences before
returning to the dashboard. It runs for approximately 5.4 visible seconds, waits
for the app-opening overlay to finish, pauses while the browser tab is hidden,
and respects reduced-motion preferences. The progress represents this setup
animation, not a server plan-generation job. Copy explicitly states that plan
generation is not connected yet; a completed profile is required to open it.

Real accounts save versioned preferences to their own Supabase Auth user
metadata under `fitsync_onboarding`; no additional database migration is needed.
Version 2 includes the new biometric and focus fields. Earlier version-1 profiles
keep their existing answers; editing them asks for exact age and gender before
saving the upgraded profile. Age range is now derived from exact age. Gender is
self-described profile information and is not treated as biological sex for an
energy equation. Target weight is a preference, not an automatically prescribed
healthy weight or a promised outcome.
This is preference data, never an authorization or administrator flag. The local
tester uses a signed, HttpOnly, localhost-only preference cookie for 30 days;
it does not write a real Supabase account. These personal preferences are not
included in public exercise seeds or service-worker caches.

Completed profiles supply the exercise-detail goal and optional weight defaults.
Exercise/meal-plan generation is not connected yet: existing plan examples are
not generated from this intake. A future planner must consume the validated
profile, honor selected training days/equipment, treat food allergies as hard
exclusions (including cross-contact considerations), and route requests needing
professional guidance for review. The meal/food library is still to be built.

Checks: `node scripts/validate-onboarding.mjs` and `npm run typecheck`.
Run `npm run typecheck` to check both projects and `npm run build` to build both.
For production, run `npm run start --workspace frontend` and
`npm run start --workspace backend` in separate terminals after building.
