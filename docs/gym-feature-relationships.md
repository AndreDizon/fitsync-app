# Gym feature relationships and workspace design

The gym workspace is an authenticated community and operations tool inside Social. It does not process payments, verify physical attendance automatically, or grant access based on a paid plan.

## The relationships the interface must communicate

| Feature | Depends on | What it changes | What it does not change |
| --- | --- | --- | --- |
| Join request / invitation | Gym joining policy and capacity | Community participation after joining/approval | Paid plan status, payment or attendance |
| Member role | Current gym ownership and roster | Which operations are permitted | Professional credentials |
| Plan catalog | Admin-defined duration and listed fee | Templates available for future enrollment | Existing member records or income |
| Member record / renewal | Current member and an available plan | Inclusive coverage dates and reminders | Community access, payment confirmation |
| Income entry | Existing member record; owner records received money | Monetary history and monthly totals | Membership dates or gym access |
| Session reservation | Upcoming session with capacity | A reserved place | Daily check-in, roster attendance, personal workout completion |
| Daily check-in | Current gym participant; one per gym-local day | Pending visit that the admin can confirm | Scheduled-session attendance |
| Session attendance | Scheduled session has started; staff/admin marks roster | Attended/absent/excused status for that session | Daily check-in or personal workout completion |
| Shared playlist | Sanitized snapshot of the author's own workout playlist | A gym training template others can copy | Private workout/progress records or previously saved copies |
| Welcome, rules and settings | Admin edits settings; members read guidance | Community information, joining policy and local time | Existing sessions' stored UTC instants |

Plan expiry never removes a participant from the community or blocks check-in/reservations. Income totals only include recorded money. A refund is a monetary event; it does not cancel a membership record. These are separate operations with explicit confirmations.

## Roles and next actions

- **Admin:** overview prioritizes daily check-in review, join requests and renewals. Plan catalog → member record → received payment is a visible sequence. Only the admin sees Income, changes gym settings/roles/ownership, or confirms daily visits. Admins do not check themselves in.
- **Staff:** overview combines their own check-in status with join requests, renewals and session roster work. Staff may assign membership dates and mark scheduled attendance, but cannot inspect other participants' daily visits, confirm visits, edit plan templates/settings or view income.
- **Member:** overview prioritizes their own check-in, recorded coverage and upcoming sessions. Their records are labeled My membership. Available plans are read-only. They can reserve a place, discuss and copy training templates without exposing personal health records.

## Layout contract

Keep FitSync's typography, yellow primary actions and restrained green/blue operational surfaces. On desktop, navigation is a stable grouped sidebar beside one work panel. On smaller screens, a labeled grouped section selector replaces the sidebar; it does not push the task below a large menu.

Overview is the initial destination. Renewal shortcuts open the matching due records using the overview?s server calendar day; staff personal coverage shortcuts open their own member filter. Its counts and status use real gym data. Today's check-in summary is loaded separately with the existing authenticated API; the server's calendar day wins over the device clock. Failed summaries show recovery instead of false zero counts. Income is not fetched for an overview.

Daily visits and scheduled-session attendance have explicit separate modes. Notification links to the existing attendance destination initially reveal scheduled attendance, matching the existing session-attendance notification source. Normal navigation and daily-review overview actions open daily visits. Other existing destination identifiers remain valid.

Plan catalog and member records are distinct sidebar destinations. The existing standalone membership component retains its two-view navigation, while the full workspace controls the selected view to avoid nested menus. Tables, filters, pagination and renewal safeguards remain intact.

Gym information/settings is a dedicated destination. Code, joining policy, welcome/rules and admin settings remain accessible there. Leaving/deletion remains behind a separate disclosure and the existing confirmation.

## Source of truth

Business rules: `docs/gym-groups.md`, `docs/gym-management.md`, `docs/gym-income.md`, and migrations v4–v9. PostgreSQL remains the authorization boundary. This layout change adds no permission or billing rules and requires no new SQL migration.
