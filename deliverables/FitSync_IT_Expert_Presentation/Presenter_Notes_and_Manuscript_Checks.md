# FitSync — presenter notes

12 slides; approximately 8–9 minutes of explanation plus a 4–5 minute live demonstration.

## 01 — Opening

Good day. We are KEYSTOKES, a group of four fourth-year Bachelor of Science in Information Technology students from the University of the Assumption in Pampanga. Today, we are presenting our capstone, FitSync: An AI-Driven Platform for Smarter Workout and Nutrition Planning. We will introduce the problem, explain the current prototype and its design and safeguards, then demonstrate the app for your technical evaluation. Suggested timing: 25 seconds.

**Sources and evidence**

- User brief; manuscript PDF page 1 (title and author list).

## 02 — Introduce the members

Our members are Christian Andre R. Dizon, Coeli Therese G. Brillante, Loraine Ann S. Escritor and Brian Noel M. Mendoza. Each member can briefly introduce themselves here. Keep this introduction short and move into why the experts are being invited. Do not invent project roles or credentials that the group has not agreed on. Suggested timing: 20–30 seconds.

**Sources and evidence**

- Manuscript PDF page 1.

## 03 — Purpose of the expert presentation

We are presenting FitSync because IT experts are included in the evaluation activity for our capstone. We would like your feedback on whether its features work correctly, whether the experience is usable and efficient, and whether its security and data-handling decisions are suitable. Our manuscript uses ISO/IEC 25010 as the software-quality framework. We are not claiming certification or reporting evaluation results yet. Following the demo, we will use the approved research instrument and consent process. Presenter check: Chapter III explicitly describes IT experts validating instruments and local users providing survey responses; confirm the formal IT-expert respondent role with the adviser and approved instrument. Suggested timing: 35 seconds.

**Sources and evidence**

- User request; manuscript PDF pages 17–18, 25–27.

## 04 — System summary and problem

The manuscript identifies fragmented tools, manual tracking fatigue and difficulty reviewing progress among local fitness users. FitSync brings workout planning, meal scheduling, hydration and progress records into one interface. Users first provide preferences through onboarding. They can then generate an editable draft, create a playlist manually, or choose reference items from the libraries. Marking items done updates the summaries. The current implementation is a responsive web application, not a published native Android or iOS app. Suggested timing: 40 seconds.

**Sources and evidence**

- Manuscript PDF pages 2–5; README.md; shared/onboarding.ts; shared/daily-plans.ts.

## 05 — Frontend design rationale

Our visual direction intentionally combines fitness energy with a welcoming nutrition and lifestyle experience. Pulse yellow highlights most actions and selected states. Performance white and charcoal provide structure, while orange and brown add warmth. Blue, pink and purple separate subject areas. The cards use subtle clay-like depth and translucent surfaces, rather than an aggressive gym-only appearance. The fox mascot creates continuity across pages. These are design intentions, not proof of usability; expert feedback and user evaluation are needed to confirm readability, accessibility and comfort on different screens. Suggested timing: 40 seconds.

**Sources and evidence**

- User-approved FitSync palette and design direction; frontend/app/home-surfaces.css; frontend/app/shared-app-design.css; frontend/components/home-theme-preview.tsx.

## 06 — Technology stack and AI boundary

The current frontend uses Next.js 16, React 19 and TypeScript, with CSS/Tailwind and Lucide icons. The backend is a separate Next.js workspace running route handlers on Node.js 24. Shared TypeScript modules contain planning calculations and validation. Supabase provides authentication, PostgreSQL and private object storage, while the frontend and backend are deployed as Vercel projects. The optional chat assistant calls externally hosted models through OpenRouter. We did not train a custom model. The current daily planner uses explicit rules and catalog values; it does not ask an LLM to generate the schedule. The manuscript proposes React Native, adaptive generative planning and computer vision. Those should be presented as proposed scope rather than implemented functionality. Suggested timing: 50 seconds.

**Sources and evidence**

- frontend/package.json; backend/package.json; docs/ai/ARCHITECTURE.md; backend/app/api/coach/route.ts; manuscript PDF pages 8–10.

## 07 — Security: accounts, recovery and sessions

Supabase Auth handles credential storage; FitSync does not store plaintext passwords. Email registration collects a username, email and confirmed password, while Google supplies a verified identity and the setup page requests a separate FitSync password. Password recovery returns the same public response for valid addresses regardless of account existence or delivery errors. Supabase verifies the email token; the app also checks a signed HttpOnly session-bound grant that expires after 15 minutes and is atomically consumed before a password update. Protected routes redirect signed-out visitors and backend endpoints verify tokens independently. Local private copies are cleared at logout, with a pending-edit check in the normal sign-out flow. Important: new account-security work is local and requires its migration, server secrets and live-account tests before the hosted demo can claim it works there. Suggested timing: 55 seconds.

**Sources and evidence**

- frontend/proxy.ts; frontend/app/auth/actions.ts; frontend/lib/auth/recovery.ts; backend/lib/auth.ts; backend/migrations/20261118_account_security.sql; AUTH_SETUP.md; https://supabase.com/docs/guides/auth/passwords; https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html

## 08 — Security: data ownership, photos and user control

RLS is the database ownership layer: a valid login alone does not allow access to another user’s records. Backend APIs derive the user ID from a verified session, not from a browser-supplied owner field. Progress photos are stored privately and are displayed through signed URLs with a short lifetime, currently ten minutes. HTTPS and production security headers protect transport and browser behavior. Personal responses are marked private/no-store, while the service worker caches public exercise and food assets. Settings separates deleting data, which keeps credentials and restarts onboarding, from deleting the account, which removes owned data and signs out. New deletion controls require a server-only service key, migration and live tests. Data resets also invalidate stale data generations so old devices cannot silently repopulate deleted records. These controls support privacy, but do not by themselves establish formal Data Privacy Act compliance. Suggested timing: 50 seconds.

**Sources and evidence**

- backend/migrations/20261107_plan_playlists.sql; backend/migrations/20261110_progress.sql; backend/app/api/progress/route.ts; frontend/next.config.mjs; backend/app/api/account/route.ts; AUTH_SETUP.md.

## 09 — Features and practical benefits

Onboarding makes the initial suggestions relevant to the user’s available time, equipment and dietary preferences. Plans and playlists let users customize schedules rather than being locked into a recommendation. The two reference libraries reduce searching across separate sites. Progress combines behavioral, nutrition and workout analytics with measurements, energy and recovery logs and optional private photos. Notifications are grouped, configurable by feature and cleared when their linked task is completed or social activity is viewed. Device alerts require permission and are not a promise of background push delivery while the app is closed. Thirty achievements across five categories provide milestones and shareable cards. Community tools support questions and introductions; availability still depends on authentication and backend setup. These are intended benefits, not measured improvements from completed research. Suggested timing: 45 seconds.

**Sources and evidence**

- README.md; shared/notifications.ts; shared/progress.ts; frontend/components/progress-workspace.tsx; frontend/components/social-workspace.tsx; docs/ai/FEATURES_AND_FLOWS.md.

## 10 — Datasets and how trust is supported

The current catalogs contain exactly 100 curated exercises and 100 generic foods, rather than the proposed fifty-per-library baseline in the manuscript. Exercise demonstrations and thumbnails come from ExerciseGymGifsDB at the pinned source revision recorded in backend/data/README.md. FitSync’s instructions, tags and planning targets are separately authored. Food nutrient values and household gram weights come from USDA FoodData Central SR Legacy, April 2018, with provenance preserved in foods-source.json. Values are stored on a 100-gram edible-weight basis, and preparation states remain distinct. The Physical Activity Compendium supports broad MET activity-class estimates in exercise details. These references support traceability, not a guarantee that an individual’s exact meal composition, allergies or energy expenditure is measured accurately. We did not train a custom AI model on these catalogs. Suggested timing: 50 seconds.

**Sources and evidence**

- backend/data/README.md; backend/data/foods-source.json; NUTRITION_LIBRARY.md; scripts/exercise-estimates.mjs; https://github.com/JahelCuadrado/ExerciseGymGifsDB; https://fdc.nal.usda.gov/download-datasets/; https://pacompendium.com/adult-compendium/

## 11 — Formulation and transparent calculations

Workout generation filters the exercise catalog by equipment, experience, focus and movement constraints. It then fits normal set, repetition, rest and preparation blocks into the chosen session budget and sequences times from the preferred start time. It does not adapt prescriptions automatically from RPE in the current implementation. Food nutrients use the formula: source nutrient per 100 grams multiplied by the selected grams divided by 100. Cooked white rice has 130 kcal per 100 grams in the current source record; 150 grams gives 195 kcal. For adult daily energy, the code computes base = 10 × weight(kg) + 6.25 × height(cm) − 5 × age(years), then applies both published coefficients (−161 and +5), activity multipliers and a goal factor. It shows a range rather than inferring biological sex from gender identity. Fat-loss and muscle-gain factors are 0.9 and 1.1, within app guardrails; these are implementation choices, not medically validated recommendations. Macros are planning allocations: 20% protein, or 25% for muscle/strength goals, 30% fat and the remainder carbohydrate. Adult calorie targeting is not applied under 18, and some profiles are deferred for professional review. Meal drafts may not exactly reach calculated targets. Exercise-detail calories use MET × 3.5 × weight(kg) / 200 × minutes, calculated separately for work and rest; they are broad gross estimates, not wearable measurements or the food target. Suggested timing: 65 seconds.

**Sources and evidence**

- shared/daily-plans.ts: planTargets, taskMinutes, foodTotals, eligibleExercises and formulateDay; scripts/exercise-estimates.mjs; MY_PLAN_SETUP.md; backend/data/foods.json; Mifflin et al. 1990, American Journal of Clinical Nutrition, doi:10.1093/ajcn/51.2.241.

## 12 — Live app demo — final part

Switch to the app. Use a prepared test account with nonsensitive sample records. First show Home and the daily summaries. In Plans, demonstrate a selected day, an editable workout draft, a library detail and completion. Switch to Nutrition and show a gram-backed food portion and planned versus completed nutrients. Open Progress for Analytics, Documentation and an achievement, then briefly show a Community filter and Settings. Do not perform real account deletion during the presentation. Only demonstrate the new authentication controls in a local or hosted build where the migration and keys have been configured and tested. If the hosted build has older code, explain this before showing the feature rather than claiming it is live. The computer-vision meal parser, native app-store release and automatic RPE-based LLM recalibration described in the manuscript are not part of this working demo. Invite the approved expert evaluation after the demonstration. Suggested demo length: 4–5 minutes.

**Sources and evidence**

- Live prototype: https://fitsync-app-features.vercel.app; local app: http://localhost:3000; AUTH_SETUP.md; manuscript proposed scope and current repository implementation.

## Important manuscript alignment checks

The supplied PDF contains 31 PDF pages and Chapters I–III, despite its filename. Page references above refer to PDF page numbers, not the printed chapter page numbers.

| Manuscript proposal | Current prototype / presentation wording |
| --- | --- |
| React Native, Android/iOS and Play Store distribution | Responsive Next.js web prototype |
| Generative adaptive workout engine using feedback | Explicit rule-based daily planner; editable schedules |
| Food-photo computer vision and automatic macros | USDA-backed manual food/portion logging; private progress photos are not a food-recognition model |
| 50 exercises and 50 food profiles | Actual checked-in catalogs contain 100 exercises and 100 foods |
| Educational mini-games and unlockable library records | Achievements and reference libraries are implemented; do not promise mini-games in this demo |
| MS Word exports | Current record history exports CSV; do not claim Word export |
| No recurring cloud jobs | Social cleanup has a separate protected cleanup endpoint and deployment configuration; do not claim there are no server cleanup tasks |
| IT experts validate instruments; local users provide survey responses | User brief requests IT-expert respondents; confirm that role against the adviser-approved research instrument |

## Before presenting

- Confirm name spellings and the exact group spelling KEYSTOKES.
- Decide whether to demonstrate localhost or the hosted version; they may not contain the same updates.
- Complete migrations and secret configuration before showing new signup/recovery/deletion controls.
- Use a disposable account, nonsensitive sample photos and prepared plan history. Do not show environment files or credentials.
- Test internet, OAuth redirects and SMTP delivery. Keep a screenshot/video backup.
- The app is decision support, not a clinical diagnosis, prescription or guarantee of results.
- Do not claim ISO certification, completed respondent results, regulatory compliance or a custom-trained AI model.
