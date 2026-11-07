My Plan is a weekly, account-owned to-do schedule. Workout and nutrition share the selected week's water log, but have separate task lists, sources and completion. The four visual sections are targets, Monday-Sunday navigation, tasks, and water. Dates use Asia/Manila and weeks start on Monday.

Run these SQL files in order in Supabase SQL Editor:

1. `backend/migrations/20261107_plan_playlists.sql`
2. `backend/migrations/20261108_playlist_schedule.sql`
3. `backend/migrations/20261109_daily_plans.sql`

The third migration adds `daily_plan_weeks`, owner RLS, canonical catalog validation, timestamps and revision protection. It removes old nutrition rest flags without removing food entries. Configure the existing Supabase public URL/key in both Vercel projects and redeploy both workspaces. No service-role key is used by these APIs. The localhost admin tester has a clearly labeled, device-only preview; it does not create database records. The hosted migration cannot be applied without access to the project's database.

`GET /api/plans?week=YYYY-MM-DD` reads the authenticated user's Monday-start week. `PUT /api/plans` replaces the validated weekly document using its current revision; stale writes return 409. Bodies are limited to 256 KiB. The user ID comes from the verified token and is never accepted from request data. RLS independently restricts all reads/writes to that owner. Responses are private/no-store.

`POST /api/plans/generate` accepts only the plan type, weekday, variation and excluded catalog IDs. It reads the completed onboarding profile from the verified user's metadata rather than trusting client-supplied measurements or goals. A deterministic shared engine filters equipment, experience, focus areas, movement preferences, known allergens, dietary preferences, dislikes, cooking time and budget. Unsupported equipment is not assumed available. Requests for professional guidance stop automatic workout formulation; an unstructured Other allergy stops automatic food selection. Manual planning remains available, with known allergen matches displayed on tasks.

Nourishment energy uses the published Mifflin-St Jeor resting-energy equation, activity multipliers (1.2, 1.375, 1.55, 1.725) and FitSync planning adjustments of -10% for fat loss or +10% for muscle gain. Conflicting target-weight directions use maintenance instead. Because onboarding records gender rather than biological sex, both published sex coefficients form the displayed range; its midpoint is the planning value. Missing or invalid age/height/weight, BMI below 18.5 or at least 40, professional-review preferences, or energy estimates outside 1,200-4,500 kcal prevent automatic nutrition targets. These boundaries and percentage adjustments are app heuristics, not clinical validation.

Macro allocations use 25% protein energy for strength/muscle goals, otherwise 20%, plus 30% fat and the remainder carbohydrates. Ingredient portions are selected from the actual 100-food catalog, with preparation states and portion caps; some constraints can leave groups unavailable. Menus are ingredient drafts, not recipes or guaranteed complete diets. Planned totals and completed totals are always calculated from the actual quantities and can differ from the computed target. The interface states this and reports unmet groups. No body-fat loss or muscle-gain quantity is promised.

Workout suggestions use the chosen session budget, goal and available exercises, vary across requests, and avoid duplicate exercises within a day. Estimated minutes are sets times timed work or repetitions at three seconds, plus between-set rest. Warm-up and cool-down are excluded. Onboarding training-day selections establish initial workout rest days. Formulating a rest day produces an empty workout list. Manually adding tasks overrides that day's rest flag. Nutrition never has rest days.

Users can formulate/regenerate one selected day, request one alternative, choose a replacement or additional library item, or import playlists. One-day playlists map their selected source weekday to the currently displayed day. Weekly playlists replace Monday-Sunday for the selected mode only. Imports copy entries and reset completion, never mutate the playlist; water and the other mode remain intact. Replacing populated schedules asks before resetting their tasks. View details reuses the full reference library dialogs, including manual GIF playback.

Task checkboxes immediately update completed time or nutrients. Editing amounts/targets resets that task's completion. Every task and each of eight water glasses has an editable time. Water defaults to eight 250 ml glasses as an app goal, not a universal hydration prescription; the same day's water is shown in both modes. Changing days keeps separate completion and water logs.

Edits first save to an account-partitioned private localStorage copy, then sync after a short debounce or reconnect. Offline manual edits and completion remain available within an already opened/signed-in app. Backend generation needs connectivity. Revision conflicts preserve the device version until the user explicitly reloads the account week. In-flight newer edits are preserved, other-tab stale writes are rejected, and signout clears copies and prevents outstanding requests from restoring them. Browser storage eviction/clearing can remove unsynced edits. The public library service worker never caches these private endpoints, and full cold-start offline authentication is not provided.

Validation: `node scripts/validate-daily-plans.mjs` tests computations, eligibility, parsing and actual PostgreSQL migrations/RLS/revisions/cascade; `npm run typecheck` checks both apps. Local database tests do not modify hosted Supabase.

Sources:
- Mifflin et al., original energy equation: https://www.sciencedirect.com/science/article/pii/S0002916523166986
- Adult activity guidance: https://www.cdc.gov/physical-activity-basics/guidelines/adults.html
- Food values and preparation states: the source-backed seeded food catalog documented in NUTRITION_LIBRARY.md.
