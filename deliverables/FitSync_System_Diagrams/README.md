# FitSync System Diagrams

Summarized figures updated November 23, 2026 to match the supplied samples: short descriptions, grouped features, clear rows and minimal connections.

## Download and insert

| Figure | PNG image | SVG vector | PDF |
| --- | --- | --- | --- |
| 4.5 Context Diagram | [PNG](Figure_4_5_Context.png) | [SVG](Figure_4_5_Context.svg) | [PDF](Figure_4_5_Context.pdf) |
| 4.6 Use-Case Diagram | [PNG](Figure_4_6_Use_Case.png) | [SVG](Figure_4_6_Use_Case.svg) | [PDF](Figure_4_6_Use_Case.pdf) |
| 4.7 Data-Flow Diagram Level 0 | [PNG](Figure_4_7_DFD_Level_0.png) | [SVG](Figure_4_7_DFD_Level_0.svg) | [PDF](Figure_4_7_DFD_Level_0.pdf) |

The ZIP beside this folder contains every format and the editable sources. SVG preserves sharp text when resized. PNG is convenient for Word and Google Docs. The figures already include their numbered titles.

## Short explanations for the manuscript

**Figure 4.5** shows FitSync as one system connecting individual users, gym members and staff, gym owners and external services. Users provide preferences and records, while FitSync returns plans, information and summaries. External services support sign-in, account emails, educational AI chat and linked articles.

**Figure 4.6** summarizes features by role. Registered users manage personal planning, learning, progress and community participation. Gym members manage their own participation and view coverage. Staff help with requests, existing-plan assignments, renewals and moderation. Gym admins manage settings, roles, attendance confirmation, activities, plans and recorded payments.

**Figure 4.7** shows five main process groups. P1 manages accounts and preferences. P2 covers personal plans, logs, learning and progress. P3 handles community, gyms and attendance. P4 handles membership coverage and payment records. P5 sends submitted educational questions to OpenRouter and receives responses. D1–D4 represent grouped logical records rather than individual database tables.

## Scope and notation

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

The renderer uses `@viz-js/viz` in `%TEMP%/fitsync-diagram-tools`, Playwright in `%TEMP%/fitsync-layout-check`, installed Chrome and the repository's Sharp package. Regenerate the ZIP after editing.

Checked against the implemented account, planning, library, progress, social and gym workspaces, AI/email routes and gym permission migrations through v13.
