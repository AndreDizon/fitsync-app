# Owner income ledger

## Setup

Apply `backend/migrations/20261121_gym_groups_v5_income.sql` after the existing v4 gym-management migration. It is transactional and rerunnable. Deploy frontend/backend together: the gym API now requires `gym_group_action_v5` and reports a setup error when it is missing. No existing membership fees are automatically backfilled as income.

## Income section

In the current admin workspace, the first collapsible card is **Payment history**. Its inline table has date filters and bottom pagination, retains refund/void actions, and refreshes after payments or corrections. **Make payment record** remains above the history and opens the existing payment form. Balances and monthly collections remain in their separate card.

Only the current gym owner sees Management > Income or can call income reads, exports and writes. Staff can still assign membership plans, but cannot inspect this ledger or its monthly totals. Ownership transfer moves income access to the new owner immediately at the database boundary.

The month, year and summary-currency selectors control the current view. Received, refunds and net received appear above payment records, 25 per page. On mobile, each record shows member, amount, type and date with details and actions expandable. The yearly table is under View yearly summary; selecting a month there opens its records. Record payment opens the payment form near the top. Different currencies are never added together or converted. Zero months display zero values. Net received is cash collected minus refunds, not profit; expenses are not recorded.

## Recording money

The current admin workspace's **Payments & revenue > Balances & revenue** card includes a collections summary:

- Cash received, refunds and net cash use the selected receipt month. Net cash is not profit, and outstanding balances are not subtracted as expenses.
- Unpaid balances are current snapshots across all plan dates, split into started plans and future plans/renewals. Removed assignments retain their outstanding fees under the existing ledger rules. The affected member count is distinct per currency.
- The monthly collection percentage compares current net payments against fees for assignments **starting in the selected month**. It does not compare that month's cash against future renewal fees. This is an as-of-now balance, not a reconstructed historical month-end balance.
- Amber status highlights unpaid started plans. Future-only balances receive a neutral pending status, while refund-heavy months are flagged separately. Currencies stay separate, and currencies with unpaid fees are shown even when no payments were received that month.
- A failed income request shows an error and retry action rather than zero cash or an apparently settled summary. The existing monthly CSV still exports ledger transactions.

Validate the calculation boundaries with `node scripts/validate-gym-collections.mjs`.

- Record a payment against an existing membership-period record. Member, plan and currency come from the database, not caller-supplied labels. The owner confirms that the money was received outside FitSync.
- Partial payments are supported. Total nonvoid payments minus nonvoid refunds for a membership cannot exceed its stored fee. Free plans do not generate income.
- Dates are gym-local calendar dates entered by the owner. They determine the income month and remain unchanged if the gym later changes its time zone. Dates must be between January 1, 2000 and the current gym-local date; future income is rejected.
- Amounts are positive decimal values with up to two decimal places, capped at 999,999 per record. Currency is inherited from the membership snapshot; plan edits do not rewrite historical records.
- Supported methods are cash, bank transfer, e-wallet, card received outside FitSync and other. An optional note is limited to 240 characters. FitSync does not process the payment or store banking/card credentials.
- Each save has an idempotency UUID. Retrying the identical form after a lost response returns the existing record rather than duplicating it. Reusing the UUID for different details is rejected.

## Refunds and corrections

A refund references a nonvoid payment in the same gym. Its amount cannot exceed that payment's unrefunded amount, and its date cannot precede the payment date. The refund reduces the month it was paid out, which can make a month's net total negative. Refunds do not change the membership's start/expiry dates or cancel community access.

Mistakes are voided rather than deleted. The owner supplies a reason; the record remains visible and is excluded from totals. A payment with live refund records cannot be voided until those refund records have been voided. Voiding is a bookkeeping correction and does not move money. Cancelling a membership record does not automatically refund or void payments.

The ledger stores who recorded or voided an entry and when. It is separate from staff-visible gym activity. No payment notification is sent to members by this feature.

## CSV export

The selected month's export includes all currencies and statuses, including voided entries, dates, member/plan labels, methods, notes and recording information. Amounts remain positive with a separate payment/refund type. Up to 5,000 records per gym/month are supported. Exports fetch 500 records per request and validate the count and snapshot so a concurrent ledger change cannot silently produce an inconsistent export. Spreadsheet formula prefixes are neutralized, and quotes/newlines are escaped.

## Privacy and removal

The new table has RLS enabled, direct access revoked from public/anon/authenticated roles, and an authenticated owner-only RPC. Group locking serializes writes, balance/refund checks and ownership changes. Reads and exports share the same owner boundary.

Member account reset/deletion removes the account link, membership link and note from affected income records while retaining anonymous amounts, dates, currencies and plan labels, so historical totals do not disappear. Recorder/voider account links are also removed when that account is reset/deleted. The owner sees Former member or Former admin where appropriate. Gym deletion or the current owner's data reset deletes the entire gym and income ledger; the gym deletion confirmation explicitly mentions income records. Existing personal progress/photos/nutrition records are not exposed.

## Validation

- `node scripts/validate-gym-income.mjs`: migration reruns; owner/staff/member/cross-gym boundaries; exact decimal, currency and month totals; installments, refunds, voids, retry IDs, paginated export, ownership transfer, anonymous reset/deletion and group deletion.
- `node scripts/validate-gym-income-csv.mjs`: spreadsheet formula neutralization, quote/newline escaping, status and decimal preservation.
- `node scripts/validate-gym-api.mjs`: API action allowlists, authentication and setup errors.
- `npm run typecheck` and `npm run build`: both workspaces.

Synthetic browser checks cover payment/refund/void workflows, lost-response retry, currency/year selection, CSV download, owner-only navigation and 320/390/768/1440 px layouts. No hosted records are changed by local checks.
