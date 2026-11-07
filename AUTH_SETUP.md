# Enable FitSync authentication

The login, signup, Google OAuth, confirmation, password reset, and sign-out flows
use Supabase Auth.
For the two Vercel projects and their environment variables, see
[VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md).

## Local UI tester

Run `npm run seed:tester` to create/rotate a local tester password. The command
prints the credentials and saves them to ignored `logs/tester-credentials.json`.
Only a salted scrypt hash and a session-signing secret go into the ignored
`frontend/.env.local`. Sign in at `http://localhost:3000/login`.

Tester access requires `NODE_ENV=development`, `DEV_TEST_AUTH=true`, and a localhost
host. It is disabled in production regardless of the flag. Sessions use signed,
8-hour, HttpOnly/SameSite cookies. This account previews the dashboard and does
not create a Supabase user, grant database admin privileges, or bypass backend
JWT checks. Google and live data still require Supabase configuration. Sign out
from Settings. Set `DEV_TEST_AUTH=false` and restart to disable the account;
rerunning the seed command also invalidates previous tester sessions.

## Project connection

Keep the existing `BACKEND_URL` in `frontend/.env.local` and add:

```dotenv
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
```

Set the same Supabase URL and public key in `backend/.env.local`. Never put a
service-role key or Google client secret in frontend environment variables.
Restart both services after changing environment files.

In Supabase Authentication > URL Configuration, set Site URL to your app URL.
Allow `http://localhost:3000/auth/callback` and
`http://localhost:3000/auth/callback?next=/reset-password`. For deployment replace
localhost with your HTTPS origin and set `NEXT_PUBLIC_SITE_URL` accordingly.
Use exact production redirect URLs rather than wildcard domains.

## Email and password

Enable the Email provider and **Confirm email**. Set the minimum password length
to 12 in Supabase as well as the app's validation. Enable leaked-password
protection when supported by your plan. Configure your SMTP provider for reliable
confirmation and password reset delivery; Supabase's default email service has
development restrictions.

Default confirmation links work through the PKCE callback in the browser that
started signup. For confirmation links that also work across browsers/devices,
use this URL in the Confirm signup email template:

```text
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
```

For the Reset password email template use:

```text
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery
```

Keep Supabase email/password request rate limits enabled. Configure production
edge/WAF throttling for `/login`, `/signup`, `/forgot-password`, and authenticated
AI requests. If enabling Supabase CAPTCHA, add the corresponding challenge widget
and token to these forms before enabling that provider setting.

## Google / Gmail

1. In Google Cloud create an OAuth consent screen and a **Web application** OAuth
   client. Request only basic profile, email, and OpenID scopes.
2. Add the callback URL shown in the Supabase Google provider settings to Google's
   authorized redirect URIs (`https://YOUR_PROJECT.supabase.co/auth/v1/callback`).
3. Enable Google in Supabase Authentication > Providers and enter the Google
   client ID and secret **in Supabase**, never in the browser app.
4. If the consent screen is in testing mode, add the Gmail accounts you will test
   with. Publish/verify the consent screen as required for production.

Google creates an account on first sign-in; the same button signs in returning
users. FitSync never collects the Google password or requests Gmail mailbox
access.

## Security boundaries

- Next.js Server Actions validate input and apply the framework's origin checks.
- Server-side `getUser()` checks protect the dashboard and password update route.
- Proxy refreshes cookie sessions and sends only verified access tokens to the
  backend. Auth responses use `private, no-store` caching.
- The backend coach route independently validates Bearer tokens with
  Supabase; direct access to port 3001 cannot bypass authentication.
- The exercise library reads the bundled seed without an exercise API or JWT.
  Enable Row Level Security on `social_posts`, `social_likes`, and `gyms`; use authenticated read
  policies where appropriate and ownership checks such as `auth.uid() = author_id`
  for writes. Authentication alone does not provide table-level authorization.
- OAuth callback destinations are restricted to `/` and `/reset-password`.
- Cookies use SameSite=Lax and Secure in production. Supabase SSR shares session
  cookies with its browser client; these are not HttpOnly. Never expose service
  keys, render untrusted HTML, or cache authenticated pages at a CDN.
- Signup uses 12–128 character passwords with confirmation. Password reset signs
  out sessions through Supabase. Configure session lifetime and inactivity limits
  to match your deployment requirements.
- Deploy over HTTPS. The app sends frame-denial, MIME-sniffing protection,
  referrer/permissions policies, and production HSTS headers.

## Verification after configuration

Test email confirmation, rejected invalid credentials, Google first-time signup
and returning login, expired callback links, password reset, and sign-out using
test accounts. An anonymous `/` request must redirect to `/login`; anonymous or
invalid-token `/api/coach` calls must return 401. The backend `/api/exercises`
endpoint was removed and returns 404. Check that a
second user cannot read or change another user's private database rows.

Local UI/route checks do not replace these live provider and database tests.

References: [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client),
[Google sign-in](https://supabase.com/docs/guides/auth/social-sign-in/auth-google),
[password security](https://supabase.com/docs/guides/auth/password-security).
