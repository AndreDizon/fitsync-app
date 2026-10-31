# FitSync

Authentication setup (including Google sign-in): [AUTH_SETUP.md](AUTH_SETUP.md).

- `frontend/`: Next.js UI, components, public assets, and Supabase browser client.
- `backend/`: Next.js API service, including the streaming AI coach and health endpoint.
- `scripts/`: shared development launcher.

Install Node.js LTS, then from this folder run:

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

Also provide the Supabase values in `backend/.env.local` for the exercise
library API (`/api/exercises`), which reads the existing `exercises` table.

Run each service separately with `npm run dev:frontend` or `npm run dev:backend`.
Run `npm run typecheck` to check both projects and `npm run build` to build both.
For production, run `npm run start --workspace frontend` and
`npm run start --workspace backend` in separate terminals after building.
