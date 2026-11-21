# Gym communities

Social's fourth card opens a gym workspace grouped into Community (Announcements, Discussion), Training (Sessions, Attendance, Playlists), Members (Team, Membership) and Management (owner-only Income, staff/admin Activity). Only the selected group's section links are shown. Each group remembers its last opened section; notification links still open their target directly. Navigation wraps on mobile instead of scrolling horizontally. Gym details, invite code, settings and leave/delete actions are in one collapsed disclosure above the workspace. These are user-created communities, separate from the retired gym locator. Manual membership plans, date tracking and staff-marked attendance are available; online payments and professional verification are not included. See docs/gym-management.md for the management update.

## Enable the feature

Apply these in Supabase SQL Editor after the existing playlist migrations (20261107_plan_playlists.sql and 20261108_playlist_schedule.sql):

1. backend/migrations/20261121_gym_groups.sql - initial groups. Skip if already applied.
2. backend/migrations/20261121_gym_groups_community.sql - community tools and updated permissions.
3. backend/migrations/20261121_gym_groups_time_zone.sql - gym session time zones.
4. backend/migrations/20261121_gym_groups_v4.sql - attendance, manual membership plans, guidance and notifications.
5. backend/migrations/20261121_gym_groups_v5_income.sql - owner-only income records and monthly totals.
6. backend/migrations/20261121_gym_groups_v6_checkins.sql - daily member self check-in and private/team history.
7. backend/migrations/20261121_gym_groups_v7_checkin_confirmation.sql - admin-only history review and confirmation; no admin self check-in.

The migrations are rerunnable; apply them in the listed order. Rerunning an older migration afterward can restore old function definitions. Existing groups retain members and default to open joining. Deploy frontend and backend together; the new API requires the v5 RPC and shows a setup message if missing. The migration notifies PostgREST to reload its schema.

## Roles

| Action | Member | Staff | Admin |
| --- | --- | --- | --- |
| View roster, announcements and join code | Yes | Yes | Yes |
| Post discussion; delete own messages | Yes | Yes | Yes |
| Reserve/cancel own session place | Yes | Yes | Yes |
| Share own workout playlists; save copies; unshare own contributions | Yes | Yes | Yes |
| Approve/decline requests | No | Yes | Yes |
| Post/edit/delete/pin announcements | No | Yes | Yes |
| Schedule/cancel sessions | No | Yes | Yes |
| Moderate discussion/shared playlists | No | Yes | Yes |
| View management activity | No | Yes | Yes |
| Record membership dates and attendance | No | Yes | Yes |
| Edit welcome/rules and membership plan catalog | No | No | Yes |
| Change roles; remove/ban/unban members | No | No | Yes |
| Edit gym/settings; transfer ownership; delete gym | No | No | Yes |
| Leave | Yes | Yes | Transfer ownership or delete first |

There is exactly one admin, initially the creator. Transfer requires a current member of the same gym and a confirmation. The new owner becomes admin; the previous owner becomes staff immediately and may leave. Staff is not a professional qualification. Permissions are enforced in PostgreSQL on every action, including after a concurrent demotion.

## Joining and moderation

- Open: join immediately by search or ten-character code.
- Approval required: code and directory joins both create a request. Applicants cannot read member content before approval.
- Invite only: hidden from search; a valid code joins immediately unless banned. Codes are shareable invitations, not proof of gym ownership.

One membership and one pending request per account. Creating/joining another gym clears a pending request. Applicants may cancel; staff/admin may approve or decline. Changing joining policy clears pending requests without approving anyone; applicants can request again. Up to 100 members and 100 pending requests per gym. Requests do not reserve places; approval rechecks capacity and membership.

Removal permits requesting/joining again under the current policy. A ban removes membership/reservations and blocks joining through listings, code and the legacy RPC. Only the admin can lift bans. Bans survive account-data reset; account deletion removes the associated ban. Staff cannot manage roles, remove members, ban users, transfer ownership or edit gym settings.

## Shared content

- Announcements: up to 50 per gym, titles 3?100 characters, messages 1?2,000. Management may edit/delete any announcement and pin up to three; pinned notes appear first.
- Discussion: private to current members, newest 30 messages per page with older/newer navigation. Messages are 1?2,000 characters. Five currently retained messages per sender per minute. Authors delete their own messages; management can moderate others. No direct messaging or threaded replies.
- Sessions: management sets title, details, gym-local start/end and 1?100 places. The admin chooses a Gym session time zone in Edit gym details (also available when creating a gym). Existing groups default to Asia/Manila, Philippine time, UTC+08:00. Session input and display use that gym time zone for all members, regardless of device settings. The server converts wall-clock input to UTC with PostgreSQL time-zone rules; DST gaps and repeated local times are rejected with a correction message. A stale gym time zone requires refresh. Changing the gym time zone preserves the UTC instant of existing sessions; their displayed clock time changes accordingly. Up to 50 upcoming sessions, within 180 days, up to eight hours long. Unique reservations and capacity checks are serialized. Leaving/removal/banning clears reservations; cancelling a session removes all reservations. Reservations do not verify attendance or complete workouts. Change a session by cancelling and creating a replacement.
- Playlists: up to 20 shared workout snapshots. The API loads/decrypts only the authenticated user's own saved workout playlist and sanitizes template fields. SQL independently validates library exercises, sets/reps/rest, times, days and rest days. No encrypted envelope, private health or account metadata is copied. Members may save a new independent copy through the existing personal playlist flow. Original edits/deletion do not affect snapshots; unsharing does not remove already saved copies. Nutrition playlists are not shared.
- Activity: staff/admin see the latest 200 management actions, including approvals, declines, promotions/demotions, removals, bans, transfers and shared-content management. It shows current usernames, not emails, and is a bounded operational history rather than a permanent compliance record.

## Privacy and cleanup

The v3 RPC adds time-zone settings/conversion and delegates community actions to v2. Both derive identity from auth.uid(); the original RPC delegates to v2, so old clients cannot bypass joining policies/bans. Legacy absolute UTC session timestamps remain supported. Direct table access is revoked from public/anon/authenticated roles with RLS enabled. The API additionally checks email verification, account setup and account-data generation, and returns private no-store responses. No service-role client is used for community actions.

Directory responses exclude roster, codes and private content. Requests are visible only to their applicant and gym management. Rosters expose username, member identifier, role and join date. Gym content is intentionally shared with current members and is not end-to-end encrypted. Joining does not expose personal plans, measurements, nutrition logs or private photos. Text renders as plain React text, never injected HTML.

Deleting the current owner's account disbands the gym. Deleting another account removes membership, requests, reservations and bans; shared content remains attributed to a former member. Account-data reset removes participation and authored shared content, and disbands any gym currently owned by the user. After transfer, the original creator may reset/delete without disbanding the transferred gym. Quarterly forum cleanup does not affect gyms.

Refresh loads current gym information. Gym alerts are now included in the notification bell, with optional device alerts while FitSync is open and server-queued renewal reminders. Closed-app push and live chat are not included. See docs/gym-management.md. Gym operations require connectivity.

## Verification

- node scripts/validate-gym-groups.mjs - original migration regression in isolation.
- node scripts/validate-gym-community.mjs - migration reruns, joining, management permissions, cross-gym privacy, announcements/pins, discussion paging, session capacity, snapshots, bans, transfer, activity, RLS and reset.
- node scripts/validate-gym-time-zone.mjs - admin-only settings, zone validation, UTC conversion, fractional offsets, DST gaps/repeats, unchanged scheduled instants, stale-zone rejection and reruns.
- node scripts/validate-gym-api.mjs - authentication, allowlists, setup errors, private no-store responses and own-playlist sanitization.
- npm run typecheck and npm run build - both workspaces.

Browser fixtures use synthetic users/content and cover the workflows, themed confirmations, member/staff restrictions, pending cancellation, dark-theme contrast and 320-1440 px widths. Checks do not modify hosted data.

Owner-only payment records, monthly income summaries, refunds, void corrections and CSV exports are described in docs/gym-income.md. Staff and ordinary members cannot access income.
