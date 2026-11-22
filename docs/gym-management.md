# Gym management: attendance, plans and notifications

## Enable the update

Apply these migrations in Supabase SQL Editor in order. Skip any already applied, but do not run older migrations after newer ones.

1. `20261121_gym_groups.sql`
2. `20261121_gym_groups_community.sql`
3. `20261121_gym_groups_time_zone.sql`
4. `20261121_gym_groups_v4.sql`
5. `20261121_gym_groups_v5_income.sql`
6. `20261121_gym_groups_v6_checkins.sql`
7. `20261121_gym_groups_v7_checkin_confirmation.sql`
8. `20261121_gym_groups_v8_history_filters.sql`
9. `20261121_gym_groups_v9_settings.sql`
10. `20261121_gym_groups_v10_admin_workspace.sql`
11. `20261121_gym_groups_v11_settings_cards.sql`

The existing playlist migrations are prerequisites. Apply v11 after v10, then deploy frontend and backend together. `/api/gyms` uses `gym_group_action_v10` for existing actions and `gym_group_action_v11` for the independent settings cards and transfer-and-leave action. A missing migration shows an explicit setup error. The migrations are transactional and rerunnable. Existing groups, roles, session instants, plans and payment records are preserved.

## Collapsible admin cards (v11)

Manage gym contains three separately titled, expandable cards:

- **Gym name & code:** edit the name and copy the existing gym code. Saving the name preserves the server's current guidance and joining settings.
- **Welcome, rules & joining:** welcome message/description, rules, time zone and four joining statuses. Saving this card preserves the server's current gym name.
- **Ownership & deletion:** select a current member, then confirm Transfer ownership & leave. Both changes execute in one transaction. No other member means this action is unavailable; Delete gym remains separately confirmed and permanently removes the gym's shared records.

Member-management cards also have native, keyboard-accessible disclosure headers. Date filters, table pagination and activity role filtering remain available when expanded. No data is removed by collapsing a card.

## Admin workspace (v10)

The admin has six destinations, with a mobile section selector replacing the desktop sidebar:

| Destination | Tasks |
| --- | --- |
| Manage gym | Name, join code, welcome message, rules, time zone and joining status. Closed blocks new joins even with a code; existing members remain. |
| Manage members | Separate tables for pending requests, all members and banned accounts. Activity opens a table popup with a current-actor-role filter. |
| Gym attendance | Daily visits, checkout times, admin confirmation and per-person history. Scheduled-session attendance remains available in a separate popup. |
| Plans & assignments | Catalog table with create/edit/delete popups; member assignment table with apply/edit, renewal, removal and history. |
| Discussion | Chat, announcements, event preregistration, attendee lists and shared workout playlists. All training sessions also remain accessible, including sessions created before v10. |
| Payments & revenue | Record a member payment, review balances, inspect/refund/void ledger records and export monthly revenue records. |

Every admin table has its own date range, search and bottom page navigation, including empty and single-page tables. Visit and payment reports filter on the server before paging. Dates use the gym time zone; date-only coverage/payment fields retain their stored local calendar date. Legacy plan, ban and registration creation dates remain unknown, rather than being backfilled with an invented date. Unknown dates appear under All dates only.

Members and staff can check out their own open visit. A later-day check-in is blocked until an earlier open visit is checked out. Checkout does not confirm attendance or enable admin self-check-in. The daily key still permits only one visit per member per gym-local day.

Deleting a catalog plan preserves assignments through their saved name, fee and currency. Editing an assignment cannot overlap coverage, reduce its fee below net money already paid, or change its currency while it has nonvoid payment history. Removing an assignment retains payment history and does not issue a refund or erase its outstanding fee.

A member payment is limited to the outstanding balance in the selected currency and allocated to the oldest outstanding assignments first. The allocation is atomic and request IDs prevent duplicate retries. This records money received outside FitSync; it is not a payment gateway. Refunds, voiding and CSV exports retain their existing behavior. Private payment retry metadata is removed on account reset/deletion.

Announcement/event publishing uses stable request IDs. A group-session post creates the announcement and scheduled session together. Members preregister under existing capacity rules; only the owner can open the admin registration report. Reservations remain separate from attendance. Existing gym notification triggers also apply to new announcements and sessions.

Validation: `node scripts/validate-gym-admin.mjs` and `node scripts/validate-gym-api.mjs` exercise the migration and API boundaries. The v10 changes require the database migration; building the app does not apply it to Supabase.

## Welcome and rules

Edit gym details contains the gym name, welcome message (up to 1,000 characters), gym rules (up to 4,000), joining policy and time zone. The Description field and separate welcome/rules editor have been removed from this panel. Save gym details saves all these fields together via the admin-only `gym_group_settings` RPC. Apply v9 after v8; its transaction rolls back guidance, settings and notifications together if validation fails. Current members see the welcome message and can expand the rules. Updating this guidance notifies current members except the editor. New members receive a welcome notification. The public gym directory does not expose guidance. No automatic waiver or legal agreement is implied.

## Membership plans and dated records

The Membership section separates community membership/roles from a recorded gym plan. Joining a group does not buy a membership, and a plan expiring does not remove community access or automatically block reservations.

- Admin creates, edits, archives or restores plans. Up to 50 plans per gym; name 3-80 characters, description up to 500, duration 1-730 days, optional listed fee up to 999,999 with two decimals and a three-letter currency.
- Admin and staff assign plans to current members, with start and inclusive expiry dates in the gym's selected time zone. Dates span at most 730 days, and the start must be within the past year or next two years.
- Records cannot overlap for the same member. Renewal creates a new record starting after the current expiry rather than overwriting history. Up to 100 records per member per gym.
- The admin assignment row combines adjoining periods into continuous coverage: original start, latest expiry, total days and total plan fees. Each currency stays separate; gaps and cancelled periods never add covered days. Renewal previews show the extra days, added fee and combined coverage totals before saving. Payment history keeps each underlying assignment and its fee.
- Each record snapshots the plan name, fee and currency. Later catalog edits do not rewrite old records. Archiving hides a plan from new assignments while preserving records.
- A record is active, upcoming, expired or cancelled based on gym-local dates. Staff can cancel an incorrect record; it stays in history and its reminders stop. Cancellation neither refunds a payment nor removes a member from the community.
- Members see only their own dated records. Admin/staff may view records for their gym's members. Leaving/removal cancels current/future recorded periods; account-data reset deletes that user's records. Fee records are not payment confirmations. FitSync does not collect card details or process payments.

## Daily member check-ins

Training > Attendance offers a daily Check in action without needing a scheduled session. The server records the authenticated member, current timestamp and calendar day in the gym time zone. A unique gym/member/day key makes duplicate clicks and retries safe. Dates and identities cannot be supplied by the client. New visits start pending. The current gym admin confirms a visit, recording the confirmation time and admin identity. Confirmation retries preserve the original confirmation. Existing v6 visits also start pending after the upgrade. Daily check-ins remain separate from scheduled-session attendance.

Members and staff see only their own history and confirmation status. Only the current gym admin can see all member check-ins and confirm them; history is paginated at 20 records. The admin reviews visits instead of checking in: the button is hidden and the database rejects admin check-ins. Ownership transfer immediately transfers review and confirmation permissions. Check-in remains available regardless of paid-plan status, matching existing community access rules. Leaving prevents new visits; history remains in the gym until account-data reset, account deletion or gym deletion. No location tracking is collected.

Apply v6 after v5, then v7. New check-in actions use the authenticated v7 RPC, with RLS enabled and direct table access revoked. v7 also hardens the v6 entry point so older clients cannot retain staff access or submit admin check-ins. Existing tools continue using v5, so a missing v7 migration only disables daily check-ins with a setup message. Do not rerun v6 after v7.

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

## History filters and navigation

Gym destinations are grouped in a desktop sidebar and mobile section selector, with Overview prioritizing actions for the current role. Membership records and Plan catalog are separate destinations; admins and staff initially see records for All members, and regular members see only their own. The membership workspace has separate color-coded views: green Member records & renewals and blue Plan catalog. Records and catalog use semantic tables with ten rows per page. Records support member/plan search, member, status and inclusive coverage-date filters; catalog supports plan search and availability filters. Both have their own page navigation and reset controls. On small screens, each table scrolls horizontally inside a keyboard-focusable region. Creation and assignment forms stay collapsed until needed.

From/To filters are inclusive and applied with Apply dates; Clear filters restores all dates. Membership records match any coverage overlapping the selected date range. Team activity uses the gym-local action date and covers the full retained dataset (latest 200 actions). Both filter their complete already-loaded dataset before pagination: membership records at 10 rows and team activity at 20.

Daily check-in history filters recorded visit dates; scheduled attendance filters gym-local session start dates. The v8 RPC filters before counting or pagination, so old records outside the first page remain findable. Today's check-in status stays independent of history filters; admin confirmations preserve the selected range. Apply v8 after v7 to enable attendance filtering. Existing admin-only confirmation and staff/member own-history restrictions are preserved.

### Quick renewal

Staff/admin can select Renew beside an eligible member record. It prefills the member and the same plan when still available. The suggested start is today or the day after the member's latest noncancelled coverage ends, whichever is later; the selected plan duration sets the inclusive expiry. Archived or unavailable plans must be replaced with an available plan before saving. The operator reviews the dates and confirms the new record; backend overlap validation remains authoritative. Existing coverage and payment records are preserved. No database migration is needed for the table/renewal UI update.

## Workflow overview

### Events and group sessions (v12)

Apply `backend/migrations/20261122_gym_groups_v12_session_types.sql` after v11. It adds a persistent Event/Group session type while preserving existing reservations and attendance. Existing activities linked to event announcements are classified as events; other existing sessions become group sessions. New creation is admin-only, validates gym-local times and participant limits, and uses a request ID to avoid duplicates on retry. Existing membership reads remain available before applying v12, but creating typed activities requires the migration.

Admins and members use the Events & group sessions card under Gym attendance / My attendance. It has a type filter, date range and bottom pagination. Admins create activities, inspect preregistrations and cancel activities; members reserve or cancel their own place. Both attendance pages have only two cards: daily gym visits and Events & group sessions. The separate session-attendance button/card is removed; historical attendance records remain in the database. Discussion has no scheduling, reservation or registration controls: it contains chat, announcements and shared playlists. Legacy session links open the attendance card. Historical linked announcements remain plain notes and deleting one does not cancel its activity.

Gym members use the same sidebar, mobile section selector, plain page headings and titled collapsible cards as the admin workspace. Their menu follows the admin order: Gym information, Gym team, My attendance, My membership and Discussion. There is no member Overview; default and legacy Overview links open Gym information. Gym information has exactly two cards: a combined read-only details/welcome/rules card, followed by Leave gym. Its content follows the admin sequence: gym name, code, welcome message, rules, time zone and joining status. The team directory has its own destination. My attendance separates daily visits from events/group sessions; My membership separates coverage records from available plans. Discussion groups chat, announcements and shared playlists. Events and group sessions are under attendance. Existing notification destinations open and focus the appropriate card, including on mobile. Staff retain their existing operational workspace.

My attendance shows only the signed-in member's daily visits, check-in/checkout times and admin confirmation, with server-side date filtering and persistent bottom pagination. Session attendance remains separate. My membership filters coverage to the signed-in member before rendering and provides coverage-date/status filters and pagination; available plans are read-only in a separate card. Listed fees do not confirm payment, and members cannot apply/renew plans or record money. Gym team offers a read-only dated, paginated directory with role filtering. Discussion retains announcements and shared playlists without exposing owner tools. Session reservations are on My attendance. Existing notification destinations map to their corresponding member pages. This layout requires no new migration or permissions.

See `docs/gym-feature-relationships.md`. Admin overview links to daily check-in reviews, join requests, membership renewals and session roster work. Staff see their own daily visit and permitted operations. Members see their own check-in/coverage and upcoming sessions. Overview renewal links apply the Needs renewal within 7 days filter; already-recorded contiguous renewals are excluded. Member and request lists support name search and ten-row pagination, with a role filter for the roster.

Daily visits and scheduled-session attendance are separate controlled views. Normal navigation opens daily visits; old attendance notification links open session history, matching the existing notification source. Gym info, rules, invitations and admin settings are a separate destination. This UI/workflow update requires no new SQL migration.
