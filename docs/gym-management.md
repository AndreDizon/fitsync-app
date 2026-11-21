# Gym management: attendance, plans and notifications

## Enable the update

Apply these migrations in Supabase SQL Editor in order. Skip any already applied, but do not run older migrations after newer ones.

1. `20261121_gym_groups.sql`
2. `20261121_gym_groups_community.sql`
3. `20261121_gym_groups_time_zone.sql`
4. `20261121_gym_groups_v4.sql`
5. `20261121_gym_groups_v5_income.sql`
6. `20261121_gym_groups_v6_checkins.sql`

The existing playlist migrations are prerequisites. Deploy frontend and backend together. `/api/gyms` now requires `gym_group_action_v5`; a missing migration shows an explicit setup error. The management migration is transactional and rerunnable. Existing groups, roles, session instants and shared content are preserved; new welcome/rules fields start blank.

## Welcome and rules

The admin edits the welcome message (up to 1,000 characters) and gym rules (up to 4,000). Current members see the welcome message and can expand the rules. Updating this guidance notifies current members except the editor. New members receive a welcome notification. The public gym directory does not expose guidance. No automatic waiver or legal agreement is implied.

## Membership plans and dated records

The Membership section separates community membership/roles from a recorded gym plan. Joining a group does not buy a membership, and a plan expiring does not remove community access or automatically block reservations.

- Admin creates, edits, archives or restores plans. Up to 50 plans per gym; name 3-80 characters, description up to 500, duration 1-730 days, optional listed fee up to 999,999 with two decimals and a three-letter currency.
- Admin and staff assign plans to current members, with start and inclusive expiry dates in the gym's selected time zone. Dates span at most 730 days, and the start must be within the past year or next two years.
- Records cannot overlap for the same member. Renewal creates a new record starting after the current expiry rather than overwriting history. Up to 100 records per member per gym.
- Each record snapshots the plan name, fee and currency. Later catalog edits do not rewrite old records. Archiving hides a plan from new assignments while preserving records.
- A record is active, upcoming, expired or cancelled based on gym-local dates. Staff can cancel an incorrect record; it stays in history and its reminders stop. Cancellation neither refunds a payment nor removes a member from the community.
- Members see only their own dated records. Admin/staff may view records for their gym's members. Leaving/removal cancels current/future recorded periods; account-data reset deletes that user's records. Fee records are not payment confirmations. FitSync does not collect card details or process payments.

## Daily member check-ins

Training > Attendance offers a daily Check in action without needing a scheduled session. The server records the authenticated member, current timestamp and calendar day in the gym time zone. A unique gym/member/day key makes duplicate clicks and retries safe. Dates and identities cannot be supplied by the client. These are self-reported visits, not verified presence or staff-marked session attendance.

Members see only their own history. Staff and the owner can choose All gym members; history is paginated at 20 records. Check-in remains available regardless of paid-plan status, matching existing community access rules. Leaving prevents new visits; history remains in the gym until account-data reset, account deletion or gym deletion. No location tracking is collected.

Apply v6 after v5. New check-in actions use the authenticated v6 RPC, with RLS enabled and direct table access revoked. Existing tools continue using v5, so a missing v6 migration only disables daily check-ins with a setup message.

## Scheduled session attendance

Attendance is a separate section with 20 sessions per page. Started sessions appear first. Admin/staff can open a session roster showing current members, previous attendance records and reservation flags. They may mark Attended, Absent, Excused or Not marked only after the session starts. Walk-ins can be recorded even without a reservation. Staff can correct an entry, and members receive an attendance update notification.

Reservations never mark attendance or complete a personal workout. Members see their own attendance status, not other members' individual attendance. Started sessions cannot be cancelled through current or older RPCs; this preserves attendance history. Deleting the gym still removes its sessions and attendance. User account deletion/reset deletes their individual attendance records.

## Notifications and renewal reminders

Gym alerts use the existing notification bell and optional device alerts. Settings includes Gym updates and Gym renewal reminders, enabled by default for accounts without a saved choice. History, read/dismiss state and preferences follow the existing account-scoped device storage. Server notification records are private to their recipient and retained for 30 days; the bell displays up to 200 recent notifications across features.

Events include joining, requests awaiting management review, requests ending, role/ownership changes, guidance/announcements, scheduled/cancelled sessions, attendance corrections and membership assignments/cancellations. Session cancellation alerts go to reserved members. Links open the relevant gym section, and old links cannot expose a gym the recipient no longer belongs to.

Renewal reminders use gym-local dates: within seven days, the day before, on expiry day, and after expiry (up to 30 days late). Each stage is deduplicated per membership record. A covering renewal or cancellation withdraws stale reminders; notifications reconcile those removals on the device. Reserved members also receive one upcoming-session reminder within 24 hours of its start. Reminders do not expose another member's dates.

While FitSync is open, alerts refresh each minute, on reconnect/focus and after local gym actions. Device alerts require the existing browser permission and remain subject to browser/background restrictions. Closed-app web push, renewal emails and payment processing are not implemented. Server-queued alerts appear when a member next opens FitSync.

The existing daily `/api/social/cleanup` job also calls `queue_gym_reminders(null)` using the service-role client. It reuses the current CRON_SECRET and SUPABASE_SERVICE_ROLE_KEY configuration and adds no second Vercel cron. Individual notification reads queue only that authenticated recipient's due reminders. The queue function is not callable by anon/authenticated clients directly; only the service role or owner-controlled wrapper can run it. Missing migration errors are visible rather than silently dropping alerts.

## Permissions and cleanup

New tables have RLS enabled and no direct public/anon/authenticated access. `gym_group_action_v4` derives identity from auth.uid(), rechecks group membership/roles under the group lock and delegates existing actions to v3. Plan writes and attendance marks never trust a supplied gym ID or author. Joining policies, bans and session capacity continue to use the previous database enforcement. Table triggers ensure older clients also emit notifications and preserve attendance history.

The update shares no private measurements, progress photos or personal nutrition records. Attendance, rules and gym plan records are stored separately from encrypted personal workout plans. Account reset/deletion and gym deletion remove the applicable new records. Historical gym activity remains bounded to 200 management actions.

## Checks

- `node scripts/validate-gym-management.mjs`: real PostgreSQL/PGlite migration reruns, role boundaries, dates/overlap/history, private records, reminders/deduplication/stale withdrawals, attendance/corrections, legacy cancellation guard, cron permissions, RLS and reset/deletion.
- `node scripts/validate-gym-time-zone.mjs`: zone settings, conversions, fractional offsets and DST edge cases.
- `node scripts/validate-gym-api.mjs`: authenticated action allowlists and sanitized playlist sharing.
- `node scripts/validate-gym-notification-targets.mjs`: preferences, deep-link validation and older destinations.
- `npm run typecheck` and `npm run build`: both workspaces.

Synthetic browser fixtures exercise welcome/rules, plan creation and assignment, attendance marking, member restrictions, the actual notification provider/bell, reminder withdrawal, preference opt-out, deep links, and 320-1440 px layouts. Local checks never modify the hosted database.

## Owner income records

The owner can now manually record actual payments received, refunds and void corrections in an owner-only Income section. Membership assignment alone never counts as paid. See `docs/gym-income.md` for monthly currency-separated summaries, exports and financial-record reset behavior.
