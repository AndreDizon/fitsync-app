# Enable FitSync authentication

The login, signup, Google OAuth, confirmation, password reset, and sign-out flows
use Supabase Auth.
For the two Vercel projects and their environment variables, see
[VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md).

## Local UI tester

Run `npm run seed:tester` to create/rotate a local tester password. The command
prints the credentials and saves them to ignored `logs/tester-credentials.json`.
The main form accepts email addresses only. Expand **Local tester access** below
the Google button to use the development username/password shortcut. This keeps
the real account flow separate from the device-only preview.

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

### Real demo user

`npm run seed:demo` creates a regular, email-confirmed Supabase Auth user, with
`demo@fit.test` / `Demo1234567!` as the demo credentials. This is a database-backed
account with a normal user ID and access token, not the local admin bypass.
The reserved `.test` address is for demonstration and cannot receive email.

Before running it, set `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY` (or
the legacy `SUPABASE_SERVICE_ROLE_KEY`) in ignored `backend/.env.local`.
Get the server-side secret key from your Supabase project's API Keys settings.
Never place it in frontend environment files or share it in chat. The app itself
still uses the public Supabase key; the admin secret is only for this manual seed.
The script does not change existing users or their passwords if the email exists.
Optional `DEMO_USER_EMAIL` and `DEMO_USER_PASSWORD` override the demo credentials.

The seed verifies password login when a public key is configured and saves the
resulting demo credentials in ignored `logs/demo-credentials.json`. It does not
grant admin privileges or insert a fake onboarding profile. Complete onboarding
after sign-in; apply the playlist migration in `PLAYLISTS_SETUP.md` for playlist saves.

If you prefer to avoid a local admin secret, create the same user through
Supabase → Authentication → Users → Add user, with email confirmation enabled.

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
protection when supported by your plan. FitSync's chosen delivery is now the
**Gmail API through a signed Supabase Send Email Hook**, using
`FitSync <andredizon2004@gmail.com>`. Follow [GMAIL_AUTH_SETUP.md](GMAIL_AUTH_SETUP.md)
for sender authorization, backend secrets and hook activation. This replaces
Supabase SMTP delivery once enabled. Live sending still requires authorization
by the sender's Google account.

Enable Supabase's secure password-change/reauthentication option and password
change email notifications. New Google account setup relies on the fresh OAuth
session; older sessions may be asked to sign in again by Supabase. Do not disable
reauthentication to bypass that response.

The Gmail hook renders FitSync's branded emails in `backend/lib/auth-email.ts`;
dashboard email templates below are only a fallback reference when using SMTP.
Do not activate both delivery approaches expecting two separate messages.

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

## Account setup, recovery and deletion (November 18 update)

Recovery follow-up: apply `backend/migrations/20261119_account_setup_status.sql`
after the November 18 account-security migration before deploying the updated
account-completion form. It lets only the signed-in verified user read a boolean
indicating whether a password exists. No hash is exposed. Recovered accounts keep
the password they just set and supply only a missing username. New Google accounts
without a password still create one. A retry after a profile-save failure must not
try to overwrite the password again. Email clients may open recovery links in a
new tab; the original tab is not remotely navigated or closed.

Apply `backend/migrations/20261118_account_security.sql` **after** all previous
migrations, including `20261118_notifications.sql`. It adds account-completion,
one-use recovery tracking and server-only data-reset functions. The file can be
rerun. The application fails closed if the functions are missing.

Set `AUTH_FLOW_SECRET` on the **frontend** server. Generate at least 32 random
bytes, for example:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use separate secrets for local and production. Keep a stable value across
instances in each environment. It signs an HttpOnly, session-bound recovery grant
that expires 15 minutes after a verified recovery callback. Changing this secret
invalidates open recovery forms. Configure the Supabase email token expiry to
900 seconds too; the app cannot change that hosted setting. Configure JWT expiry
to a suitably short interval (for example 15 minutes): revoking refresh tokens
does not instantly invalidate already-issued access tokens on other devices.

Set `SUPABASE_SERVICE_ROLE_KEY` on the **backend** server for deletion. Never use
this value in `NEXT_PUBLIC_*` variables. It is used only after verifying the
signed-in user's identity, confirmed email, current password and confirmation
phrase. The target user ID always comes from the verified session.

Email registration now asks for username, email and a confirmed FitSync password.
Google supplies the verified email; `/complete-account` asks for username and a
separate FitSync password. Existing accounts missing these details also complete
this step once. Username is a display handle, not an alternative login identifier;
email remains the sign-in identifier. A server-owned completion flag is set only
after the database confirms a verified email and a stored password.

Recovery always returns the same message for valid email addresses, including
delivery/rate-limit failures. Tokens are verified by Supabase, and a recovery grant
can be consumed only once before setting a new password. A regular signed-in
session alone cannot open the reset form. A failed password update consumes the
grant; request a fresh recovery email to retry.

Settings includes recovery email, sign out everywhere, delete data, and delete
account. Deletions require the current **FitSync** password and `DELETE DATA` or
`DELETE ACCOUNT`. Google-only users from older versions can set a FitSync password
through email recovery first. Do not enter a Google password.

Data reset removes playlists, daily plans, progress, photos, achievements,
community activity and notifications, clears onboarding, and keeps credentials.
Account deletion removes Storage files first, then deletes the Auth user; foreign
keys cascade the owned database records. Operations lock concurrent requests and
advance a data generation on reset so stale device sessions cannot sync old
records back. On reload, a changed generation clears private device copies before
background syncing starts. Public offline exercise assets and device appearance
are preserved. Server copies are removed; previously downloaded/exported files or
screenshots held outside FitSync cannot be recalled. Existing short-lived signed
photo links expire normally; Storage/CDN caches may have their own expiry.

Storage, Auth and Postgres are separate services. A failure can remove some files
before a later step fails. The UI reports this honestly and permits a retry; it
does not claim a full rollback. Review live cleanup failures before re-enabling
uploads. A 2-minute server lock expires automatically if a worker is interrupted.

### Verify with a dedicated test account

1. Register by email, confirm it, sign in and complete onboarding. Repeat with
   Google; verify username/password setup is required and the email is read-only.
2. Request recovery for an existing and a nonexistent email. Verify the responses
   match. Open a recovery email, reset the password, and try the old link again.
3. Check protected routes after signing out. Check local private storage clears.
4. Upload a test photo and create records. Reset data with the wrong password or
   phrase (must fail), then the correct details. Verify records/files are removed,
   the account remains, and onboarding reopens. Reload a second signed-in device
   and verify it does not restore the old records.
5. In a separate disposable account, delete the account. Verify files and rows are
   gone and signing in with its old password fails. Test failed-storage retries.

These are live-environment checks. Automated tests use isolated fixtures and an
in-memory database, never your production account. Recovery email delivery,
Google consent settings, rate limits and production secrets still require the
Supabase/Vercel configuration above.

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

Run `node scripts/check-auth-connection.mjs` to check both local environment files
and read the Supabase Auth provider settings without creating accounts or sending
email. It never prints keys. This requires the Supabase Project URL and public
publishable/anon key, not either Vercel deployment URL. The two apps must use the
same Supabase project. Add `NEXT_PUBLIC_SITE_URL=http://localhost:3000` locally.

The forms use email/name/current-password/new-password autocomplete, explicit
labels, visible password placeholders, a show/hide control and matching-password
validation. Google follows the password form on desktop and mobile. Passwords
are not returned in action state or logged. Server-side field validation remains
authoritative; generic sign-in and recovery replies avoid exposing account status.

`node scripts/validate-auth.mjs` exercises the actual Supabase SSR SDK against an
isolated HTTP auth fixture: signup, login cookies, password recovery/update,
global sign-out, Google PKCE and callback allowlists. It does not contact the
live project or create a live account.

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
