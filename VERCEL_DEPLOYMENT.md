# Deploy FitSync frontend and backend

Use **two Vercel projects connected to the same GitHub repository**. The repository
root is an npm workspace, not the Next.js app root. Deploying the root with
`npm run build` builds both apps and does not place a Next.js output at root.
Both apps pin Next.js 16.4.5, including the current security patches. Do not
redeploy the older 16.3.3 lockfile when testing this configuration.

## Project settings

| Setting | Frontend project | Backend project |
| --- | --- | --- |
| Git repository | AndreDizon/fitsync-app | AndreDizon/fitsync-app |
| Production branch | main | main |
| Root Directory | `frontend` | `backend` |
| Framework Preset | Next.js | Next.js |
| Node.js Version | 24.x | 24.x |
| Include source files outside Root Directory | Enabled | Enabled |
| Install Command | From vercel.json | From vercel.json |
| Build Command | From vercel.json | From vercel.json |
| Output Directory | `.next` | `.next` |

Each app's `vercel.json` installs the repository's locked npm workspaces with
`npm ci --include=dev --prefix ..`, then builds only that app using `npm run build`.
Do not set `frontend/.next`, `backend/.next`, `public` or `out` as the output
directory: paths are relative to each project's Root Directory.
Do not use `npm start`, `npm run dev`, or the repository-wide workspace build as
Vercel's Build Command. Vercel serves the compiled Next.js app automatically.

Outside-root access is essential: the frontend imports `shared/`, and its
prebuild generates the offline catalog using `scripts/` and `backend/data/`.
These are build inputs; the exercise library does not call a database or API.

## Environment variables

Add these in each project's **Settings → Environment Variables** for Production
and any Preview environments you use. Environment changes require a new build.
Use actual values in Vercel; do not commit `.env.local` files.

### Backend project

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project HTTPS URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | The same public publishable key used by the frontend |
| `OPENROUTER_API_KEY` | Your OpenRouter key for optional fitness chat; see HOME_SETUP.md |

The legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` can replace the publishable-key variable.
Never use a Supabase service-role/secret key in a `NEXT_PUBLIC_*` variable.
The backend can deploy and serve health without the AI key, but the coach returns
503 until the AI key is configured. Do not enable `DEV_TEST_AUTH` in production.

Deploy the backend first. Its public URL should be an origin such as
`https://your-fitsync-backend.vercel.app`. Verify **`/api/health`**, not `/`:
the backend root has no page and a root 404 is expected.

### Frontend project

| Name | Value |
| --- | --- |
| `BACKEND_URL` | Backend's stable production HTTPS origin; no `/api` suffix |
| `NEXT_PUBLIC_SITE_URL` | Frontend's stable HTTPS origin |
| `NEXT_PUBLIC_SUPABASE_URL` | Same Supabase project HTTPS URL as backend |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Same Supabase public key as backend |

Do not set `BACKEND_URL` to localhost, the frontend's own domain, a Vercel
dashboard URL, or a deployment URL with a path. The frontend proxies `/api/*`
to that origin and forwards the verified user's bearer token server-side.
Browsers keep using the frontend domain, so this does not require browser CORS.

If Vercel Deployment Protection blocks the backend domain, the proxy cannot
reach its API. Ensure the chosen backend production domain accepts external
requests; the coach route still independently requires a valid Supabase token.
Do not disable authentication in the app to work around platform protection.

For Preview builds, set an appropriate frontend site origin and allow its exact
OAuth callback URLs in Supabase. A preview that uses the production site origin
will send authentication callbacks to production.

## Supabase redirects

In Supabase **Authentication → URL Configuration**, set Site URL to the frontend
origin. Add its exact callbacks:

```text
https://YOUR_FRONTEND_DOMAIN/auth/callback
https://YOUR_FRONTEND_DOMAIN/auth/callback?next=/reset-password
```

Google Cloud's authorized OAuth callback is the **Supabase** callback shown in
Supabase's Google provider settings, not the backend project URL. See
[AUTH_SETUP.md](AUTH_SETUP.md) for email templates and Google setup.

## Redeploy and verify

1. Deploy backend, then verify `GET BACKEND_ORIGIN/api/health` returns JSON with
   `status: "ok"` and `service: "fitsync-backend"`.
2. Set frontend variables, then redeploy frontend. Clear build cache on the first
   deployment after correcting roots/install settings.
3. Open frontend `/login`, then frontend `/api/health`. The latter must return
   the same backend health JSON rather than a Vercel sign-in/protection page.
4. Confirm anonymous `POST /api/coach` returns 401 on both domains; test a real
   authenticated user separately. The localhost admin tester is intentionally
   unavailable in production.
5. Check signup/Google login, onboarding saving, plan-preparation transition, and
   the exercise library. First-time offline media caching requires network access.

Builds now stop with named-variable errors if a Vercel environment is incomplete.
Frontend builds also run TypeScript validation. Check the first red error in
each project's Build Logs, rather than only the final `exited with 1` line.

Repository checks:

```sh
node scripts/validate-deployment.mjs
npm run typecheck
npm run build
```

These verify code/configuration locally. A successful local build does not verify
your Vercel dashboard settings, external deployment protection, Supabase provider
configuration, or a live deployment.

References: [Vercel monorepos](https://vercel.com/docs/monorepos),
[outside-root files](https://vercel.com/docs/monorepos/monorepo-faq),
[build settings](https://vercel.com/docs/builds/configure-a-build),
[Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).
