# FitSync: start here for AI assistants

Last reviewed: 2026-11-08, Asia/Manila. This describes the local source at handoff time, including uncommitted Progress UI changes. It does not claim that every local change is deployed.

## Product

FitSync is a fitness capstone application with a friendly yellow fox mascot. Its core is a personalized exercise and nutrition planner driven by onboarding preferences, supported by public reference libraries, private user-created playlists, daily completion tracking, and progress documentation.

**Read these documents before implementing changes:**

1. [Features and page relationships](docs/ai/FEATURES_AND_FLOWS.md)
2. [Architecture and source map](docs/ai/ARCHITECTURE.md)
3. [Data, APIs, and offline behavior](docs/ai/DATA_AND_OFFLINE.md)
4. [Development, deployment, and verification](docs/ai/OPERATIONS.md)
5. [Design rules, known gaps, and next-work guidance](docs/ai/DESIGN_AND_BACKLOG.md)

For deeper existing specifications, read [My Plan](MY_PLAN_SETUP.md), [Playlists](PLAYLISTS_SETUP.md), [Progress](PROGRESS_SETUP.md), [Nutrition catalog](NUTRITION_LIBRARY.md), [Authentication](AUTH_SETUP.md), [Vercel](VERCEL_DEPLOYMENT.md), and [Exercise provenance](backend/data/README.md).

## Essential distinctions

- **Library:** 100 exercises and 100 generic foods, bundled and informational. Defaults do not personalize themselves to onboarding. No exercises API is needed or present.
- **Playlist:** a user's reusable, manually assembled one-day or one-week template, saved to their account with an offline device copy.
- **My Plan:** the dated, Monday-start weekly to-do schedule. It can be formulated from onboarding, imported from a playlist, or edited using library items. Completion happens here.
- **Progress:** derived plan/visit analytics plus account-owned body/wellness/photo documentation and persisted achievements.
- **Formulation is deterministic calculation, not generative AI.** The separate AI coach uses a model through AI Gateway.
- **Offline support is not a complete offline-first application shell.** Open and sign in online first. Public catalogs and private plan/playlist copies support specific offline actions; offline cold-start/login is not implemented.
- **Local admin tester is not a database user.** Never claim its preview writes account data. A real authenticated Supabase account is required.
- **Home/Social/Settings are partly prototype UI.** Do not treat their sample numbers, dates, people, gyms, or inert controls as completed backend features.

## Stack and repository

Repository: `AndreDizon/fitsync-app`, normal branch `main`.

Node 24.x, npm workspaces, Next.js 16.4.5, React 19, TypeScript, Tailwind 4 plus substantial handwritten CSS. Two separate Next applications:

- `frontend/`: UI and Supabase SSR authentication, port 3000.
- `backend/`: authenticated API routes, port 3001.
- `shared/`: canonical parsers, catalog query helpers, planning and progress calculations.
- `backend/data/`: checked-in exercise and food reference catalogs and provenance.
- `backend/migrations/`: ordered Supabase SQL migrations.
- `scripts/`: seeding, validation, deployment checks, local launcher.

## Instructions for the next assistant

- Inspect current source and `git status`; do not reset or overwrite uncommitted work.
- Read applicable `frontend/AGENTS.md` and `backend/AGENTS.md`. They require consulting installed Next documentation before editing Next code. Docs are under `node_modules/next/dist/docs/` with `.md` extensions.
- Keep account ownership and revision/conflict protections intact. Never use public service-worker caches for private data.
- Keep catalogs informational and shared calculations consistent online/offline.
- Do not print or commit `.env.local`, OAuth client secrets, service-role keys, database passwords, or session tokens.
- Follow explicit user requests to implement changes; do not only propose them. Do not push/deploy unless requested or already authorized for the current task.
- Do not silently run a destructive database reset or regenerate curated data from an unrelated source.
- Do not use local test success as evidence that hosted migrations or Vercel deployment succeeded.
- Use UTF-8-safe edits. This project has previously suffered visible `?` separators from encoding mistakes.
- User prefers concrete changes, concise explanations, and few unnecessary approval questions.

## Session state worth preserving

- All changes through commit `851d082` were pushed previously. Later local work reorganized Progress into Analytics, Documentation, and Achievements tabs and improved layout. Check Git for the exact current diff; do not assume those newer edits are deployed.
- User confirmed earlier plan migrations succeeded. A subsequent read-only live check found `progress_entries`, `progress_visits`, and `progress_awards` exist and deny anonymous access. This is evidence of table creation, not a full live policy/storage audit.
- User reported Google login working on Vercel after fixing Supabase Site URL and adding the frontend callback. Preserve that configuration.
- Current request is documentation/handoff only. These documents contain no private credentials.
