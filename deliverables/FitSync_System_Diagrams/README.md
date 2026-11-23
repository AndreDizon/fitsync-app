# FitSync System Diagrams

Summarized figures updated November 23, 2026 to match the supplied samples: short descriptions, grouped features, clear rows and minimal connections.

## Download and insert

| Figure | PNG image | SVG vector | PDF |
| --- | --- | --- | --- |
| 4.5 Context Diagram | [PNG](Figure_4_5_Context.png) | [SVG](Figure_4_5_Context.svg) | [PDF](Figure_4_5_Context.pdf) |
| 4.6 Use-Case Diagram | [PNG](Figure_4_6_Use_Case.png) | [SVG](Figure_4_6_Use_Case.svg) | [PDF](Figure_4_6_Use_Case.pdf) |
| 4.7 Data-Flow Diagram Level 0 | [PNG](Figure_4_7_DFD_Level_0.png) | [SVG](Figure_4_7_DFD_Level_0.svg) | [PDF](Figure_4_7_DFD_Level_0.pdf) |
| 4.9 Entity-Relationship Diagram | [PNG](Figure_4_9_ERD.png) | [SVG](Figure_4_9_ERD.svg) | [PDF](Figure_4_9_ERD.pdf) |
| 4.10 System Architecture | [PNG](Figure_4_10_Architecture.png) | [SVG](Figure_4_10_Architecture.svg) | [PDF](Figure_4_10_Architecture.pdf) |

The ZIP beside this folder contains every format and the editable sources. SVG preserves sharp text when resized. PNG is convenient for Word and Google Docs. The figures already include their numbered titles.

## Short explanations for the manuscript

**Figure 4.5** shows FitSync as one system connecting individual users, gym members and staff, gym owners and external services. Users provide preferences and records, while FitSync returns plans, information and summaries. External services support sign-in, account emails, educational AI chat and linked articles.

**Figure 4.6** summarizes features by role. Registered users manage personal planning, learning, progress and community participation. Gym members manage their own participation and view coverage. Staff help with requests, existing-plan assignments, renewals and moderation. Gym admins manage settings, roles, attendance confirmation, activities, plans and recorded payments.

**Figure 4.7** shows five main process groups. P1 manages accounts and preferences. P2 covers personal plans, logs, learning and progress. P3 handles community, gyms and attendance. P4 handles membership coverage and payment records. P5 sends submitted educational questions to OpenRouter and receives responses. D1–D4 represent grouped logical records rather than individual database tables.

**Figure 4.9** is a simplified physical ER overview of nine real tables defined in the repository migrations. Users own playlists, weekly plans and progress entries. A gym has many community members, while each user has at most one current gym-member row. Gyms offer membership plans; users receive coverage periods; payment/refund records can refer to those periods. Repeated USERS and GYMS boxes are the same tables, repeated to avoid crossing lines. This is based on the migration definitions, not a live schema inspection.

ER notation: PK means primary key, FK means foreign key, `many` means zero or more, and `0..1` means an optional single record. Optional plan/period references are preserved because `gym_membership_periods.plan_id` and `gym_income_entries.period_id` can be null after referenced records are removed. A user's gym-community row uses `user_id` as its primary key, so it is not a many-to-many community-membership model. Paid coverage can have several historical periods per user.

Only selected keys and foreign-key links are displayed. Social posts/comments, attendance, activity reservations, announcements, notifications, awards and security/helper tables are omitted from this core overview. Additional gym-owner, gym, member, recorder and refund self-reference links also exist in the schema. Progress-photo metadata is in progress entries, while file contents use Supabase Storage. Username/onboarding metadata belongs to the Auth user; no separate profile table is invented. The source migrations are `20261107_plan_playlists.sql`, `20261109_daily_plans.sql`, `20261110_progress.sql`, `20261121_gym_groups.sql`, `20261121_gym_groups_v4.sql` and `20261121_gym_groups_v5_income.sql`, with later encryption and gym migrations applied where relevant.

## Scope and notation

**Figure 4.10** shows the implemented architecture in five components. The Next.js frontend provides React/TypeScript screens and server-side account handling. Its authenticated `/api` requests are rewritten to the separate Next.js/Node.js backend, which validates requests, checks permissions, generates plans, handles gym operations and encrypts private data. The backend accesses Supabase PostgreSQL, Auth and Storage. The frontend also uses Supabase Auth directly for account/session handling, shown as a dashed connection; this does not depict unrestricted browser access to private tables. Browser localStorage, IndexedDB and CacheStorage hold the relevant saved copies, preferences and downloaded assets. OpenRouter receives submitted chat through the backend, keeping its API key on the server. It does not automatically read private user records or generate the programmed daily plans. Frontend and backend have Vercel deployment configurations.

Architecture verification is against repository implementation and deployment configuration, not a live hosting inspection. Sources: `frontend/next.config.mjs` (API rewrites), `frontend/proxy.ts` (session checks and bearer forwarding), `frontend/lib/auth/server.ts` and `frontend/app/auth/actions.ts` (account handling), `backend/lib/auth.ts` (API authorization), `backend/lib/private-data.ts` (private-data handling), `backend/app/api/coach/route.ts` (OpenRouter), `frontend/lib/daily-plans.ts` (localStorage), `frontend/lib/playlist-offline.ts` (IndexedDB), `frontend/public/exercise-library-sw.js` (CacheStorage), both workspace package files and both `vercel.json` files. Optional email delivery, external article sites and detailed browser/server subcomponents are omitted from this intentionally simple view.

- These are simplified overview diagrams following the supplied samples. The use-case figure groups functions into boxes instead of showing individual UML ellipses and inheritance arrows. It is a role-based use-case summary, not an exhaustive UML specification.
- All gym roles retain registered-user personal features. Staff have member participation features plus limited operational permissions.
- Admin confirms gym visits; members and staff log their own check-ins/checkouts. Event reservations are separate from visit attendance.
- Staff can apply existing plans and renew coverage. Only the admin changes plan offers, edits/removes coverage, manages finances, changes roles/settings, bans users, transfers ownership or schedules gym activities.
- Joining a gym, receiving membership coverage and recording payment are separate actions. Payments are recorded after receipt outside FitSync; this is not online payment processing.
- The DFD repeats the User entity across rows for readability. Arrows into processes show summarized requests; two-way links show record exchange or service requests/responses. User-facing responses, shared-profile lookups, caches and detailed subflows are omitted.
- D2 groups personal records and reference content for this summary. Reference catalogues and article/quiz data are read-only; user plans, logs and progress are editable. D1–D4 are logical groups, not a single-table schema.
- Google sign-in, Gmail and article publishers are grouped in the context diagram; their detailed flows are omitted from the summarized DFD. OpenRouter receives submitted chat, not automatic access to private logs. Plan generation uses programmed rules and calculations.
- This manuscript separates the context view from the Level 0 process breakdown. Some schools call the breakdown Level 1; rename the caption if your adviser follows that convention.
- The retired gym locator and food camera scan are excluded.

## Editable sources

Edit the three `.dot` files with Graphviz-compatible tools. To regenerate SVG, high-resolution PNG and vector PDF in the current workspace, run:

```text
node deliverables/FitSync_System_Diagrams/render-diagrams.cjs
```

The renderer uses `@viz-js/viz` in `%TEMP%/fitsync-diagram-tools`, Playwright in `%TEMP%/fitsync-layout-check`, installed Chrome and the repository's Sharp package. Append a figure name such as `Figure_4_9_ERD` to regenerate just that figure. Regenerate the ZIP after editing.

Checked against the implemented account, planning, library, progress, social and gym workspaces, AI/email routes and gym permission migrations through v13.
