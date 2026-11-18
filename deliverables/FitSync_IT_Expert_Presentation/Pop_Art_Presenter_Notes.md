# FitSync — value-led presentation and speaker notes

12 slides. Approximately 8–10 minutes of explanation plus a 4–5 minute live demonstration. The technical names are retained, with plain-language explanations.

This is a capstone presentation with a product-opportunity narrative, not a fabricated fundraising deck. No market-size, revenue, traction, clinical-outcome or investment-return figures are invented.

## 01 — A healthier routine should be easier to manage

Good day. We are KEYSTOKES, four fourth-year Information Technology students from the University of the Assumption in Pampanga. Our capstone is FitSync: An AI-Driven Platform for Smarter Workout and Nutrition Planning. The idea is simple: people should spend less effort organizing their health routine and more effort following it. Today we will show the value of bringing workouts, meals and progress together, explain how the system works in everyday language, and demonstrate the prototype for your expert evaluation.

**Presenter checks / technical detail**

This is a value-led capstone pitch, not a claim of existing investment, revenue or proven health outcomes.

**Sources**

- User brief; manuscript PDF page 1 (title and author list).

## 02 — Meet KEYSTOKES

Our team members are Christian Andre R. Dizon, Coeli Therese G. Brillante, Loraine Ann S. Escritor and Brian Noel M. Mendoza. Each member may give a brief personal introduction. Together, we are developing and evaluating FitSync as our capstone project. We are presenting to IT experts because your observations can help us improve its usefulness, clarity and technical quality.

**Presenter checks / technical detail**

Do not invent professional roles, qualifications or achievements for the members.

**Sources**

- Manuscript PDF page 1.

## 03 — The opportunity: remove everyday friction

The problem is not only knowing that exercise and nutrition matter. It is managing all the small tasks around them: choosing a routine, arranging meals, recording what happened and finding the record later. The manuscript identifies these difficulties in its local study context. FitSync responds by connecting those tasks in one place. That creates a clear product opportunity: simplify a repeated daily job rather than adding another disconnected tracker. We are inviting IT experts as respondents in our capstone evaluation to assess whether this promise is supported by the actual workflow.

**Presenter checks / technical detail**

The problem comes from the manuscript; we are not claiming measured reductions in logging time or completed user-research results. Confirm the IT-expert respondent role with the adviser-approved instrument.

**Sources**

- User request; manuscript PDF pages 17–18, 25–27.

## 04 — What FitSync does in everyday terms

FitSync connects three jobs. First, plan: users tell the app about their goals and practical preferences, then receive an editable schedule or build one themselves. Second, do: the app shows the next workout, meal or water entry and lets the user record completion. Third, review: the user can see the saved record and decide what to adjust. The value is in the connection between these steps. A completed activity becomes part of the person’s progress record rather than another note in a separate tool.

**Presenter checks / technical detail**

FitSync is decision support, not a medical diagnosis or treatment service. The current app is a responsive Next.js website, not a published native app.

**Sources**

- Manuscript PDF pages 2–5; README.md; shared/onboarding.ts; shared/daily-plans.ts.

## 05 — Why the app looks this way

We deliberately avoided an aggressive gym-only identity. FitSync also deals with meals, recovery and everyday habits, so the interface should feel welcoming while still carrying energy. Pulse yellow highlights actions. White and charcoal organize information, while orange, blue, pink and purple separate topics. Soft card depth and frosted effects add texture without making the app feel clinical. The fox mascot ties these experiences together. This design is intended to support clarity and recognition, and the evaluation will help us find where readability or accessibility still needs improvement.

**Presenter checks / technical detail**

The presentation has been made more vibrant; do not imply that this changes the application’s existing visual theme or proves usability.

**Sources**

- User-approved FitSync palette and design direction; frontend/app/home-surfaces.css; frontend/app/shared-app-design.css; frontend/components/home-theme-preview.tsx.

## 06 — The technology stack explained simply

Next.js and React build the screens and make buttons, forms and page sections respond to the user. TypeScript helps us catch incorrect data types during development. Node.js runs server-side code, including checks before a request reaches saved records. Supabase is the managed service behind sign-in, the PostgreSQL database and private photo storage. Vercel hosts the frontend and backend. OpenRouter provides access to external language models for the optional fitness chat. There is an important distinction: the daily workout and meal planner currently follows explicit rules and calculations; it is not generated by a large language model.

**Presenter checks / technical detail**

Frontend includes CSS/Tailwind and Lucide icons. Frontend and backend are separate Next.js workspaces, with shared TypeScript modules. Manuscript React Native, food-photo AI and adaptive generative planning remain proposed scope.

**Sources**

- frontend/package.json; backend/package.json; docs/ai/ARCHITECTURE.md; backend/app/api/coach/route.ts; manuscript PDF pages 8–10.

## 07 — Account security: what the controls mean

Authentication means checking that someone is allowed to use an account. Supabase Auth handles this and stores a one-way password hash, not a readable password. Google sign-in verifies the email, while the new FitSync setup asks for a username and a separate FitSync password. A session is the proof the app uses to remember that the person has signed in. Protected routes are pages and server endpoints that check this proof before letting a request through. Recovery email uses the same public response for existing and unknown addresses, so the message cannot be used to look up accounts. Supabase verifies the link, and the app also uses a session-bound reset grant that lasts fifteen minutes and can be consumed once.

**Presenter checks / technical detail**

New authentication work remains local until migration, keys and provider settings are applied. Email-token expiry itself is configured in Supabase. Existing access tokens on other devices can remain valid until their configured expiry after global sign-out.

**Sources**

- frontend/proxy.ts; frontend/app/auth/actions.ts; frontend/lib/auth/recovery.ts; backend/lib/auth.ts; backend/migrations/20261118_account_security.sql; AUTH_SETUP.md; https://supabase.com/docs/guides/auth/passwords; https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html

## 08 — Data security: where the protections are used

Row-Level Security, or RLS, is a rule inside PostgreSQL that limits private records to their owner. The backend also checks the signed-in person itself rather than trusting a user ID supplied by a browser. Private Storage means progress photos are not openly available to anyone with a normal image address. A signed link is temporary permission to view a photo; current viewing links last ten minutes. HTTPS protects the connection while data travels. The public offline cache contains library content, not authenticated pages or private API responses. Settings separates clearing personal data from deleting an account, with password verification and a typed confirmation before either action.

**Presenter checks / technical detail**

Deletion requires the server-only service-role key and database migration. Private photos do not establish medical facts. Storage, Auth and PostgreSQL are separate services: partial failures must be handled honestly. Do not claim formal compliance, certification or absolute security.

**Sources**

- backend/migrations/20261107_plan_playlists.sql; backend/migrations/20261110_progress.sql; backend/app/api/progress/route.ts; frontend/next.config.mjs; backend/app/api/account/route.ts; AUTH_SETUP.md.

## 09 — Benefits that give the product staying power

FitSync is meant to stay useful after the first plan is created. A user has a next task to follow, a food portion to adjust, a water entry to log or a record to review. Achievements recognize saved milestones and reminders link directly to the feature that needs attention. Community tools add a place for questions and introductions. The product opportunity is this repeated usefulness: the features reinforce one another instead of operating as separate tools. We still need evaluation to show which parts users find most helpful and whether the combined workflow reduces friction.

**Presenter checks / technical detail**

Do not describe these intended benefits as proven retention, adherence, clinical improvement or commercial traction. Notification behavior while the app is closed depends on browser support; do not promise an always-on background push service.

**Sources**

- README.md; shared/notifications.ts; shared/progress.ts; frontend/components/progress-workspace.tsx; frontend/components/social-workspace.tsx; docs/ai/FEATURES_AND_FLOWS.md.

## 10 — Where the data comes from

Our current app contains one hundred curated exercise references and one hundred generic food references. These numbers describe the available content, not a sample of research participants or a measure of user adoption. ExerciseGymGifsDB supplies the demonstration media; FitSync’s instructions and planning labels are separately authored. Food nutrient values and source-backed gram portions come from USDA FoodData Central SR Legacy, April 2018. The source records are preserved so values can be checked. Food preparation matters: raw, dry and cooked values stay separate. Broad activity-energy estimates use MET values from the Physical Activity Compendium.

**Presenter checks / technical detail**

These catalogs are not training data for a custom AI model. Generic food records do not establish product-specific allergy safety or halal suitability. The manuscript proposes fifty baseline items per library; the current catalog contains one hundred each.

**Sources**

- backend/data/README.md; backend/data/foods-source.json; NUTRITION_LIBRARY.md; scripts/exercise-estimates.mjs; https://github.com/JahelCuadrado/ExerciseGymGifsDB; https://fdc.nal.usda.gov/download-datasets/; https://pacompendium.com/adult-compendium/

## 11 — Formulation explained without losing the detail

The food calculation is straightforward. Each source value is expressed per one hundred grams, so the app multiplies it by the chosen grams and divides by one hundred. For example, the current cooked-white-rice reference has one hundred thirty kilocalories per one hundred grams. One hundred fifty grams gives about one hundred ninety-five kilocalories. Workout planning first checks which exercises fit the user’s equipment, experience and movement preferences. It then fits work, rest and preparation into the chosen session time and sequences tasks from the selected start time. For adult daily energy, we use the Mifflin–St Jeor equation as a starting estimate, add activity and goal factors, and show a range. The user remains able to edit the result.

**Presenter checks / technical detail**

Detailed equation: base = 10×weight kg + 6.25×height cm − 5×age; apply coefficients −161 and +5, then activity multiplier and goal factor. Current goal factors: 0.9 fat loss, 1.1 muscle gain, otherwise 1.0. Gender identity is not treated as biological sex. Protein is 20% of estimated energy, or 25% for muscle/strength goals; fat 30%; carbohydrate gets the remainder. Protein and carbohydrate use 4 kcal/g, fat 9 kcal/g. Under-18 users do not receive adult calorie-target calculations; some profiles are deferred for professional review. Exercise-detail estimates use MET×3.5×weight kg÷200×minutes for work and rest separately. These are app planning assumptions, not individually validated prescriptions. Marking a workout task done records estimated time, not stopwatch time.

**Sources**

- shared/daily-plans.ts: planTargets, taskMinutes, foodTotals, eligibleExercises and formulateDay; scripts/exercise-estimates.mjs; MY_PLAN_SETUP.md; backend/data/foods.json; Mifflin et al. 1990, American Journal of Clinical Nutrition, doi:10.1093/ajcn/51.2.241.

## 12 — Live demonstration and closing message

We will now walk through one ordinary day. On Home, we will see what needs attention. In Workout, we will generate or edit a task and mark it complete. In Nutrition, we will change a food portion and see the calculation respond. In Progress, we will review the saved record. We will briefly show Community and Settings as well. The value to watch for is the connection: one action becomes part of a routine, and the routine becomes a record the user can understand. Our next step is to use expert feedback and user evaluation to strengthen that experience.

**Presenter checks / technical detail**

Use a prepared disposable account and nonsensitive sample records. Do not delete a real account during the demo. Local and deployed builds may differ. New authentication controls require migration, keys and live-account tests. Native React Native distribution, food-photo AI recognition, mini-games and automatic RPE-based LLM recalibration remain proposed scope, not current demo features. Invite the adviser-approved evaluation after the live demo; no separate closing slide is added.

**Sources**

- Live prototype: https://fitsync-app-features.vercel.app; local app: http://localhost:3000; AUTH_SETUP.md; manuscript proposed scope and current repository implementation.

## Manuscript alignment

The supplied manuscript proposes React Native, a computer-vision meal parser, adaptive generative planning, educational mini-games and Word exports. The current code is a responsive Next.js web app, with a rule-based planner, USDA-backed portion logging, achievements and CSV record exports. Present these as different implementation stages. Confirm the IT-expert respondent role and research instrument with the adviser. The original file Presenter_Notes_and_Manuscript_Checks.md includes a more detailed comparison table.
