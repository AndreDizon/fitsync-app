# FitSync authentication email through Gmail (no SMTP)

Sender: **FitSync <andredizon2004@gmail.com>**.

Supabase still handles users, password hashing, confirmation and recovery tokens.
Its **Send Email Hook** calls the FitSync backend, which sends branded HTML and
plain-text messages with the Gmail API. Supabase SMTP settings and dashboard email
templates are not used while this hook is enabled. No Gmail App Password is needed.
The emails are defined in `backend/lib/auth-email.ts`.

Current signup and password-recovery messages contain numeric verification codes.
Enter the code at `/verify-email` in the original FitSync tab; no extra browser tab
is opened. Old confirmation/reset links remain supported. Deploy both apps for
this change, then request a fresh message. No Supabase template or SMTP change is
needed because the enabled hook supplies the entire email.

## 1. Authorize the Gmail account

Authorize **andredizon2004@gmail.com**, the personal Gmail account chosen as
FitSync's sender. This account authorizes outgoing mail only; FitSync users do
not need to grant Gmail mailbox access.

1. Open Google Cloud Console and create a separate project, for example **FitSync
   Capstone Mail**. Keep this separate from the Google sign-in client used by users.
2. Under **APIs & Services > Library**, enable **Gmail API**.
3. Configure **Google Auth Platform** (OAuth consent): app name **FitSync**, your
   contact email, and the narrow scope `https://www.googleapis.com/auth/gmail.send`.
   This permission sends mail; it does not grant inbox-reading permission.
4. Use an **External** audience for this personal Gmail account. While the app is
   in Testing, add `andredizon2004@gmail.com` as a test user. Follow Google's
   verification requirements before a public release.
5. Create an OAuth **Web application** client. For this one-time configuration,
   add the exact authorized redirect URI:
   `https://developers.google.com/oauthplayground`.
6. Open Google's [OAuth Playground](https://developers.google.com/oauthplayground).
   In its settings, select **Use your own OAuth credentials** and enter the new
   client ID and secret. Use server-side flow and offline access.
7. Enter only `https://www.googleapis.com/auth/gmail.send` in Step 1 and authorize
   **andredizon2004@gmail.com**. Check the selected Google account carefully.
   FitSync users never need to authorize this scope; it is for the sender only.
8. In Step 2, exchange the authorization code and copy the **refresh token** into
   the backend's secret settings. Do not send it, the client secret, or token-bearing
   screenshots in chat. Do not use the short-lived access token as the refresh token.

External OAuth apps in Testing generally receive refresh tokens that expire after
7 days for Gmail scopes. Reauthorize before a demonstration if necessary; arrange
an appropriate production configuration for ongoing use. Google can revoke
tokens and Gmail sending limits can interrupt delivery. This is
appropriate for a small authorized capstone test, not unlimited production mail.

## 2. Backend environment variables

Set these in the **backend Vercel project**, in the deployment environment you use:

| Key | Value |
| --- | --- |
| `AUTH_EMAIL_SITE_URL` | `https://fitsync-app-features.vercel.app` (origin only) |
| `GMAIL_CLIENT_ID` | The new mail-sending OAuth client ID |
| `GMAIL_CLIENT_SECRET` | That client's secret |
| `GMAIL_REFRESH_TOKEN` | Sender mailbox's authorized refresh token |
| `SUPABASE_SEND_EMAIL_HOOK_SECRET` | Signing secret generated in the next step |

Keep all credentials server-side, without a `NEXT_PUBLIC_` prefix. For local work,
use ignored `backend/.env.local`. The existing frontend `AUTH_FLOW_SECRET` and
backend `SUPABASE_SERVICE_ROLE_KEY` are still required for their separate security
features. Neither substitutes for the Gmail credentials or webhook signing secret.

## 3. Connect the Supabase hook

1. In Supabase **Authentication > Hooks**, create/configure **Send Email** using
   an HTTPS endpoint:
   `https://YOUR-BACKEND-DOMAIN/api/auth/email-hook`.
2. Generate its signing secret. Copy the whole value (including `v1,whsec_` if
   shown) into backend `SUPABASE_SEND_EMAIL_HOOK_SECRET`.
3. Deploy the backend with these environment variables. The endpoint must be
   reachable by Supabase, without Vercel deployment-password protection. It has
   its own signature and timestamp checks, and rejects unsigned requests.
4. Enable/save the Send Email Hook only once the endpoint is deployed. If hook
   creation enables it immediately, temporarily disable it until the backend is
   ready. An enabled but unconfigured hook will prevent authentication emails.
5. You can leave **custom SMTP disabled**. The enabled hook replaces built-in
   delivery. Do not disable **Email sign-in** or **Confirm email**.
6. Keep Supabase email-token expiry at **900 seconds**. Keep email rate limits
   enabled, and enable the password-change security notification as documented
   in `AUTH_SETUP.md`. The rendered expiry text follows the hosted setting rather
   than making a separate claim about token lifetime.
7. Set Supabase **Site URL** and frontend `NEXT_PUBLIC_SITE_URL` to the deployed
   frontend origin; keep its callback URLs in the redirect allowlist.

Supported actions: email signup, password recovery, reauthentication code, and
password-change notification. Unsupported actions fail explicitly; magic links,
invitations, email-address changes and other notification types are not implemented
by this sender. Do not enable those flows without adding and testing their templates.
Do not return an empty success response to silently skip an authentication email.

The hook has a bounded request size, verifies the original signed request body and
timestamp, and uses only a server-configured link origin and fixed sender. Delivery
failures return an error. No token, email body, recipient, or Google response is
logged by the handler. Supabase may retry failed requests; Gmail delivery is not
exactly-once, so a timeout after Gmail accepted mail can result in a duplicate email.

## 4. Verify on a disposable account

1. Run `node scripts/check-auth-email.cjs` for isolated checks (no emails sent).
2. Register a disposable account using an inbox you control. Verify that the
   confirmation email shows **FitSync** as the sender name, the selected Gmail sender
   address, a charcoal header, and a yellow **Confirm email** button.
3. Request password recovery. Check Inbox and Spam. Its yellow **Reset password**
   button should open the deployed FitSync reset form. After a successful reset,
   the old password and a reused recovery link must fail.
4. Check the sender's Gmail Sent folder and Supabase Auth logs if delivery fails.
   Common causes are disabled Gmail API, a wrong sender account, an expired refresh
   token, quota, or an incorrectly copied hook secret.

Live Gmail delivery has not been verified until the sender authorizes access and
these hosted settings are applied. Local tests simulate Google responses only.

References: [Supabase Send Email Hook](https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook),
[Gmail sending](https://developers.google.com/workspace/gmail/api/guides/sending),
[Gmail scopes](https://developers.google.com/workspace/gmail/api/auth/scopes),
[Google OAuth token expiry](https://developers.google.com/identity/protocols/oauth2#expiration),
[Workspace app controls](https://knowledge.workspace.google.com/admin/apps/control-which-apps-access-google-workspace-data).
