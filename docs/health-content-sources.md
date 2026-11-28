# Workout and nutrition guidance

Scope: onboarding, workout/food libraries and monitoring insights in Analytics. Reference check: 2026-11-20.

## Provenance and limits

- Food measurements come from the existing 100 USDA FoodData Central records. They are SR Legacy records, not live branded-product labels. This change does not replace or invent nutrient values.
- Portion calculations use edible grams and scale reported values from 100 g. Unknown nutrients remain null / Not reported. A reported zero is a valid value.
- Household measurement sources are displayed separately from FitSync editorial material. A FitSync data-check date does not mean a dietitian reviewed the record.
- Exercise demonstration media are credited to ExerciseGymGifsDB. Instructions, difficulty labels, default prescriptions, coaching notes and estimates are FitSync editorial material. Linking a professional reference does not certify the catalog or prove each demonstration has been independently reviewed.
- Practical exercise guidance distinguishes strength, cardio, stretching and plyometrics; it does not prescribe an individual load or rehabilitation program.
- No professional certification or endorsement is asserted. A registered nutritionist-dietitian and qualified exercise professional should review the content and planning logic before any such claim.

## Reference mapping

| Reference | Use in the interface |
| --- | --- |
| [WHO physical activity](https://www.who.int/news-room/fact-sheets/detail/physical-activity) | Adult weekly aerobic and strengthening guidance; distinguish session time from aerobic activity time. |
| [ACSM 2026 resistance training update](https://acsm.org/resistance-training-guidelines-update-2026/) | Practical strength guidance: manageable resistance, consistent technique, progressive training. |
| [CDC measuring activity intensity](https://www.cdc.gov/physical-activity-basics/measuring/index.html) | Talk test in cardio guidance. |
| [American Heart Association stretching](https://www.heart.org/en/healthy-living/exercise-and-physical-activity/fitness-basics/flexibility-exercise-stretching) | Smooth, comfortable, pain-free stretching without bouncing. |
| [HSS beginner plyometrics](https://www.hss.edu/health-library/move-better/plyometrics-workouts-for-beginner) | Practise landing control before increasing jumping difficulty. |
| [WHO healthy diet](https://www.who.int/news-room/fact-sheets/detail/healthy-diet) | Food variety and overall eating pattern; avoid reducing nutrition quality to calories/protein. |
| [USDA FoodData Central documentation](https://fdc.nal.usda.gov/data-documentation/) | Dataset provenance and limits; distinguish generic records from product-specific nutrition. |
| [Mifflin–St Jeor original study](https://pubmed.ncbi.nlm.nih.gov/2305711/) | Identify the resting-energy equation. FitSync's activity multipliers, 10% goal adjustment and macro allocations are application rules, not prescriptions from this study. |

## Planning explanations checked against implementation

New onboarding saves and profile edits require height, current weight and target weight, with shared client/server range validation. Previously completed profiles with missing measurements remain readable; their next save requires the missing values. Users maintaining weight can enter their current weight as the target.

`shared/daily-plans.ts` uses height and current weight with age and activity in adult energy estimates, then derives macro allocations. Target weight checks the direction of weight-based goals: conflicting targets use maintenance instead of the 10% goal adjustment. Target weight also feeds progress forecasts when enough eligible adult records exist; it is not substituted for current weight in the energy equation. Ages 13?17 use the separate growth-energy method below; weight-change target dates remain adult-only. Gender identity is not used as biological sex. The displayed equation range/midpoint is not a clinical confidence interval. The library calorie-burn estimate uses a fixed 70 kg reference and is not changed by onboarding weight. Body measurements do not determine session duration.

Onboarding is not a medical-readiness assessment. Generated food schedules are ingredient-and-portion drafts, not a guarantee of nutritional completeness. Allergy flags cannot establish cross-contact safety, and halal ingredient tags are not certification.

## Teen nutrition estimates

Ages 13–17 now use the [2023 DRI EER equations, Table 5-15](https://www.nationalacademies.org/read/26818/chapter/7), implemented in `shared/youth-energy.ts`. Inputs are age in whole years, height in centimetres, current weight in kilograms and a separate self-reported total daily activity category, including exercise. The older outside-workout activity question is not mapped silently to overall PAL. Saved profiles without this new answer remain readable but have no teen energy estimate until it is provided; their next onboarding save requires it.

The two published sex-coefficient calculations include growth energy: at age 13, 25 kcal/day for the male equation and 30 for the female equation; at ages 14–17, 20 for both. Gender is not used as biological sex. Sorted rounded results form a reference range, not a confidence interval. The midpoint is an editable menu-planning reference, not a calorie limit or a validated individual prescription. Neither target weight nor weight-loss/muscle-gain goals change teen energy. No adult BMI cutoffs are applied to teens. Calculations outside 1200–4500 kcal/day or outside supported input bounds require review; these are app limits, not clinical eligibility thresholds.

Meal generation uses this reference with existing preference/allergy constraints. Macro allocations are 20% protein, 50% carbohydrate and 30% fat, within the [youth AMDRs](https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/dietary-reference-intakes/tables/reference-values-macronutrients.html); these are app allocations, not guarantees of dietary adequacy. Self-reported PAL, growth and individual physiology introduce uncertainty. Pregnancy, breastfeeding and clinical needs are outside this feature. [NIDDK teen guidance](https://www.niddk.nih.gov/health-information/weight-management/take-charge-health-guide-teenagers) supports individualized guidance rather than automated restriction. Teen target-weight dates remain unavailable: EER is not a weight-loss or growth-trajectory model.

Run `node scripts/validate-youth-energy.mjs` for independently calculated coefficient fixtures, growth boundaries, input guards, no teen calorie deficit/surplus, rest-day energy and meal generation. Adult Mifflin–St Jeor calculations remain unchanged.

## Session-length suggestions

Onboarding displays a single expandable recommendation below the duration choices, with the age, experience, goal and selected days used as context. Adult starting budgets are Beginner 30, Intermediate 45, Advanced 60 minutes. A mobility goal uses 30 minutes; four or more selected training days cap the suggestion at 45 minutes to distribute the weekly workload. Warm-up, rest and cooldown are included. The suggestion updates with answers but never changes the user's selected duration automatically. Missing/invalid age, under-13 age and missing experience each show a specific explanation rather than implying every missing recommendation means the user is under 18.

For ages 13–17, the app uses a conservative 30-minute starting budget regardless of the adult experience tier, with qualified supervision for strength training and 2–3 nonconsecutive strength sessions. This is a planning choice informed by [AAP youth strength guidance](https://www.healthychildren.org/English/healthy-living/sports/Pages/Strength-Training.aspx), which describes 20–30-minute strength sessions 2–3 times weekly. The app separately explains [CDC's ages 6–17 recommendation](https://www.cdc.gov/physical-activity-basics/guidelines/children.html): at least 60 minutes of daily activity, including muscle- and bone-strengthening activity on at least three days. Daily activity can include play and sport; the 30-minute session budget does not satisfy the whole daily target. The 13-year display cutoff is an app scope choice, not an AAP minimum age for strength training.

These numbers are FitSync planning heuristics, not certified durations or standards for each experience level. Gender, height and weight do not determine the suggestion. [ACSM's 2026 guidance](https://acsm.org/resistance-training-guidelines-update-2026/) emphasizes individual goals, training volume and adherence; [US Physical Activity Guidelines](https://odphp.health.gov/sites/default/files/2019-09/Physical_Activity_Guidelines_2nd_edition.pdf) do not prescribe a specific number of minutes for muscle strengthening. A session budget is not equivalent to active aerobic minutes or proof that weekly activity recommendations are met.

## Monitoring methods

### Workout start dates, weekly recovery and target-weight outlook (November 28, 2026)

- New onboarding saves require a calendar start date on a selected training weekday. Both the calendar and shared validation reject a conflicting rest day. Users select 1–5 training days, leaving at least two rest days; this is a FitSync product rule, not a universal requirement for every activity or athlete. Existing six-day profiles remain readable so users can correct them when saving; new workout generation asks them to update the schedule.
- Date-aware System and AI generation reject dates before the selected start date, rest days and date/weekday mismatches. Nutrition is independent of the workout start. Existing saved plans are not deleted or rewritten. Account metadata stores the start, rest preference and weight-change assumption; no database migration is required.
- The target-weight date is **an arithmetic scenario**, not a program duration, validated weight forecast or guarantee. Days = ceiling(abs(target − current kg) / assumed kg per week × 7), added to the start date. Choices are 0.1, 0.25 or 0.5 kg/week for loss, and 0.1 or 0.25 for gain. The default 0.25 is an app assumption; gain is not a muscle-growth prediction. Weekly training frequency counts scheduled sessions but never multiplies the weight-change rate. Rest days remain part of elapsed calendar time.
- No scenario date is shown for under-18s, missing/invalid measurements, equal current/target weight, current/target BMI outside the app's 18.5–under-40 range, projections beyond two years or calendar limits. These are conservative application display rules, not individual clinical clearance. The entered current weight is assumed to apply at the start date, including when users choose a past date. Workouts do not stop automatically on the estimated date. The existing Progress forecast continues to use actual weight logs, separately from this hypothetical onboarding scenario.
- [CDC gradual weight loss](https://www.cdc.gov/healthy-weight-growth/losing-weight/index.html) provides general context for gradual loss; it does not validate FitSync's specific rates or calculate an individual's deadline. [NIDDK Body Weight Planner](https://www.niddk.nih.gov/health-information/weight-management/body-weight-planner) is an adult tool; FitSync does not implement its dynamic model or imply equivalence to it.
- The requested [Healthline workout-duration guide](https://www.healthline.com/health/fitness/how-long-should-a-workout-last) distinguishes longer heavy-strength rests from shorter endurance work. [Nike's guide](https://www.nike.com/ph/a/how-long-should-a-workout-be) discusses duration in relation to goals and lifestyle. [The 2026 ACSM position stand](https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/) and [NIDDK adult activity guidance](https://www.niddk.nih.gov/health-information/weight-management/healthy-eating-physical-activity-for-life/health-tips-for-adults) provide additional recovery context. None prescribe a single session length by gender, body size or experience alone.
- For resistance exercises, strength goals and heavy barbell compound lifts use a 120–300-second range (180-second automatic starting value). Other resistance work starts at 90 seconds for accessories or 120 for compound lifts, within 60–180 seconds; endurance caps at 120. A chosen rest is clamped to its exercise's range, never shortened below heavy-lift recovery minimums or increased merely to fill spare session time. Cardio and stretching retain their separate timing rules. Warm-up, cooldown, work, setup and between-set rests all stay within the selected session budget. AI chooses among these same validated drafts.
- Run `node scripts/validate-workout-program.mjs` alongside onboarding, daily-plan, AI-plan and workout-start-time validators. Browser checks cover disabled calendar dates, changed-day conflicts, the five-day limit, scenario recalculation, saved metadata, keyboard dismissal and 320–1440 px layouts.

- Analytics uses the selected period and excludes future records from observed totals. Missing logs are not treated as zero intake or zero effort.
- Beyond calories: nine additional nutrients are scaled from catalog values per 100 g using completed edible portions. Averages divide known nutrient amounts by food-logging days; coverage shows how many completed entries reported the nutrient. Partial logs and missing catalog values can make these amounts incomplete. Total sugars do not measure free or added sugars.
- Exercise comparisons use actual sets for the same exercise, combining entries on the same date. Load volume is repetitions multiplied by entered external kilograms; it is not a strength or muscle-growth score. Timed work is separate and excludes rest.
- Recovery summaries use the latest wellness entry per date for each metric. Averages use recorded days only. A change against the prior seven days requires at least three recorded dates in each block, within the selected period. These thresholds are FitSync display rules, not validated clinical thresholds.
- The next-seven-day outlook estimates completed exercise entries from the recorded completion rate. It requires at least four past workout dates spanning seven days and all seven upcoming dates loaded. Today is excluded from the baseline. This simple scenario assumes the recorded pace continues; it is not a calibrated probability, health forecast or automatic training recommendation.
- Do not infer weight change or a calorie deficit from partial food logs. [NIDDK's body-weight model](https://www.niddk.nih.gov/research-funding/technology-advancement-transfer/research-materials-licensing/body-weight-simulator-java-applet) illustrates that weight forecasting requires more than subtracting logged calories.

## Validation

### Playlist knowledge flashcards

Workout and nutrition playlist collections include 30 educational questions: 15 Workout and 15 Nutrition, with five per topic at Beginner, Intermediate and Advanced difficulty. The page header's Workout/Nutrition toggle selects the quiz topic. Each flashcard has one question and four options, with one correct answer. Choosing an answer locks the options, shows correctness and a source-backed explanation, and allows moving to the next question. Scores count correct answers for the current five-question deck only; changing difficulty or topic resets the quiz. Scores are not stored or treated as a health assessment. Difficulty describes question complexity, not a user's health or training ability.

- [CDC adult activity overview](https://www.cdc.gov/physical-activity-basics/guidelines/adults.html): adult aerobic and strengthening guidance, major muscle groups and spreading activity across the week. Adult-specific questions explicitly say adults.
- [CDC activity intensity](https://www.cdc.gov/physical-activity-basics/measuring/index.html): adjusting walking pace using breathing and recognising individual differences in effort.
- [CDC getting started](https://www.cdc.gov/healthy-weight-growth/physical-activity/getting-started.html) and [activity barriers](https://www.cdc.gov/physical-activity-basics/overcoming-barriers/index.html): short activity breaks, realistic scheduling, indoor alternatives and gradual increases.
- [NHS warm-up guidance](https://www.nhs.uk/live-well/exercise/how-to-warm-up-before-exercising/) and [strength exercises](https://www.nhs.uk/live-well/exercise/strength-exercises/): preparing for harder exercise, stopping painful movements and building up gradually.
- [ACSM resistance-training update](https://acsm.org/resistance-training-guidelines-update-2026/): achievable routines, simple equipment and optional failure training for healthy adults. Scenario choices apply this guidance; they are not individual programmes.
- [WHO healthy diet](https://www.who.int/news-room/fact-sheets/detail/healthy-diet): food variety and whole-grain choices.
- [CDC meals and snacks](https://www.cdc.gov/healthy-weight-growth/healthy-eating/meals-snacks.html), [fruit and vegetables](https://www.cdc.gov/healthy-weight-growth/healthy-eating/fruits-vegetables.html) and [budget shopping](https://www.cdc.gov/diabetes/healthy-eating/6-tips-eating-healthy-on-budget.html): practical snacks, produce choices, restaurant portions and meal planning. Only general shopping advice is used from the diabetes page; no disease-specific diet is prescribed.
- [FDA Nutrition Facts label](https://www.fda.gov/food/nutrition-facts-label/how-understand-and-use-nutrition-facts-label): recording the amount eaten, comparing equivalent portions, looking beyond protein claims and distinguishing added from total sugars. Label examples use U.S. conventions.

Reviewed November 23, 2026. All 30 questions present everyday decisions rather than definition recall. Each answer names its actual publisher. The flashcards do not generate personal calorie, weight-loss or exercise prescriptions. Run `node scripts/validate-knowledge-quiz.mjs` to check deck counts, distinct options, answer keys and publisher attribution.

Run `node scripts/validate-monitoring-insights.mjs` for portion scaling, unknown versus zero values, date boundaries, duplicate handling, actual-session comparisons, recovery coverage and outlook eligibility.

Use the existing food, exercise, estimate and library-filter validators to check catalog integrity. Browser checks should cover portion/100-g switching, invalid portions, unknown versus zero nutrients, contextual onboarding explanations, expandable references, keyboard dialog dismissal and 320–1440 px layouts. Existing source JSON and offline catalogs must stay unchanged for a presentation-only content update.


## Shared onboarding start and initial formulation ? November 28, 2026

The current implementation is specified in [onboarding-planning-standard.md](./onboarding-planning-standard.md). This supersedes the earlier workout-only start boundary: nutrition now shares that boundary and continues on workout rest days. Preparation generates the first seven days, preserves existing schedules, and reports suitability and menu-quality gaps. Adult equation coefficient choice, meal windows, nonconsecutive strength emphasis, and planning suitability checks are now connected to the shared engine. Standards, app heuristics, and remaining validation limits are distinguished in that specification.


### Logical onboarding order and trend sensitivity

The shared start date now follows training weekdays on onboarding page three; nutrition suitability is grouped with food inputs on page four. Progress uses weekly medians, bounded extrapolation and leave-one-week-out sensitivity checks. Research sources, exact app thresholds, exclusions and validation limits are recorded in [the planning specification](./onboarding-planning-standard.md#updated-prediction-method). These changes reduce specific failure modes; they do not establish clinical predictive accuracy.


### Full-range default planning

Onboarding preparation now generates all dates from the shared start through the displayed scenario target date, inclusive. When no supported weight-target date exists, it explicitly prepares a 28-day review period. This supersedes the earlier seven-day generation limit. The forecast formula itself remains a transparent assumption, not a validated personal prediction. Future calorie targets use current inputs rather than assumed future weight. See the planning specification for progress, retry, review and storage behavior.

### Exercise detail guidance and visible recovery

Exercise details separate movement technique, experience-based training guidance, and catalog references. Beginner, Intermediate and Advanced selectors change educational guidance only; catalog difficulty and saved prescriptions are unchanged. Movement-specific editorial instructions remain the technique source.

- [ACSM 2026 resistance training guidance](https://acsm.org/resistance-training-guidelines-update-2026/) supports consistent training, individualized goals, progressive demands and optional failure training. Experience alone does not establish a suitable load.
- [Grgic et al., rest intervals and strength](https://pubmed.ncbi.nlm.nih.gov/28933024/) supports longer recovery for trained strength work and describes 60-120 seconds as sufficient in untrained participants. FitSync's 1-2 minute accessory and 2-3 minute compound starting ranges, with 2-5 minutes for heavy work, are practical app guidance, not universal standards or individual prescriptions.
- [AHA flexibility guidance](https://www.heart.org/en/healthy-living/exercise-and-physical-activity/fitness-basics/flexibility-exercise-stretching) informs comfortable 10-30 second holds, warm muscles and gradual progression. Stretching does not receive a resistance-training rest prescription.
- [CDC intensity guidance](https://www.cdc.gov/physical-activity-basics/measuring/index.html) supplies the moderate-intensity talk test. Continuous cardio has no mandatory between-set interval.
- [HSS plyometrics guidance](https://www.hss.edu/health-library/move-better/plyometrics-workouts-for-beginner) informs landing control and progression; recovery follows movement quality rather than an invented expertise-specific timer.

To-do previews show the saved rest between sets and the next exercise's existing recovery/setup allowance. That allowance is already included in the next task's estimate; displaying it does not add time to the schedule. One-set tasks have no between-set break. Missing transition allowances are described without inventing a duration. This is educational content, not evidence of clinical validation or professional certification.

### Exercise technique and information grouping review — November 29, 2026

`frontend/lib/exercise-technique.ts` explicitly maps the 100 catalog IDs to movement-family notes. Existing four-step, variation-specific instructions remain intact. New purpose statements, two technique checks and easier/harder options are FitSync editorial synthesis; references describe related movements, and do not independently validate every equipment variation. The UI explicitly states this distinction.

| Related source | Use in the guide |
| --- | --- |
| [ACE chest press](https://www.acefitness.org/resources/everyone/exercise-library/19/chest-press/) and [push-up](https://www.acefitness.org/resources/everyone/exercise-library/41/push-up/) | Supported pressing and bodyweight pressing differ from chest flys; control the lowering phase and preserve support. |
| [ACE bent-over row](https://www.acefitness.org/resources/everyone/exercise-library/12/bent-over-row/) | Stable torso and controlled pulling; the exact support and grip remain variation-specific. |
| [ACE squat](https://www.acefitness.org/resources/everyone/exercise-library/135/bodyweight-squat/) | Lower-body balance, hip/knee movement and a controllable range. Single-leg and machine variants keep their own catalog instructions. |
| [ACSM: understanding the deadlift and its variations](https://doi.org/10.1249/FIT.0000000000000570) | Distinguish a standing Romanian deadlift from a conventional floor reset. |
| [NASM: dead bug](https://www.nasm.org/resource-center/exercise-library/dead-bug) and [core functions](https://www.nasm.org/resource-center/blog/training/best-abs-exercises) | Distinguish anti-extension, anti-rotation, side support, flexion and rotation. Pallof guidance emphasizes resisting rotation rather than twisting. |
| [ACE exercise library](https://www.acefitness.org/resources/everyone/exercise-library/) | Supplemental movement references for raises, curls, extensions, machines and other accessory work; the general library link is not represented as an exact source for every variation. |

Reading order is movement purpose and demonstration → four-step technique → common mistakes and corrections. Training groups experience-based guidance and scaling, catalog targets and counting, rest, then time/energy estimates. Reference groups classification, relevant sources, estimation limits and media credits. Only the selected tab's content is mounted.

Compound/accessory rest recommendations now use explicit movement mappings rather than the primary-muscle string: overhead and close-grip presses remain compound, while flys, knee extensions, hamstring curls and raises remain accessory. This changes educational library recommendations only; saved tasks and scheduling calculations are not rewritten. Expertise is not treated as a diagnosis or an automatic license to lift heavier. `scripts/validate-exercise-guidance.mjs` checks exact catalog coverage, uniqueness and these distinctions.

### Interactive expertise and body-weight examples

The Training & rest tab now uses `frontend/lib/exercise-scenario.ts` instead of the fixed catalog estimate. Beginner, Intermediate and Advanced produce different practice targets, recovery allowances and durations. These exact presets are FitSync educational scenarios, not official expertise standards or personalized training prescriptions. Advanced examples do not imply a requirement to do more work. Continuous cardio changes duration; timed conditioning uses rounds; flexibility changes comfortable hold volume with no invented mandatory timed break; plyometrics preserve quality-based recovery advice.

Energy uses adjustable kg/lb body weight, initially from the available planning profile. Without a valid weight, time remains visible and energy asks for a weight. These local controls do not edit onboarding, catalog data or saved schedules. The supported calculator input range is 20-350 kg; it is an input constraint, not a definition of healthy weight.

Duration = active seconds plus the displayed recovery breaks. Repetitions use 2-4 seconds each; holds use seconds directly. Per-side work counts both sides. Separate-side sets count the switch between sides as another recovery gap; alternating dead bugs, shoulder taps and Russian twists recover between full sets. Stretching counts hold time only. The next-exercise recovery/setup allowance, warm-up and cooldown are excluded and labeled separately.

The existing activity-class MET range is preserved across expertise levels; experience is not used to invent a higher metabolic intensity. Energy = (active MET × active seconds + 1.3 × recovery seconds) ÷ 60 × 3.5 × body weight in kg ÷ 200. It includes resting energy and is not a measured calorie burn or a nutrition target. [Compendium definitions](https://pacompendium.com/) support the MET method; [ACSM guidance](https://acsm.org/resistance-training-guidelines-update-2026/) supports individualization rather than rigid prescriptions by level. This supersedes earlier text saying that modal estimates stay fixed at 70 kg or do not change with experience. The offline catalog's original reference estimates remain available as source data.

### Training, calculations and references: content separation


The current modal order is **Training & rest → Calculations → Exercise reference**. Training groups demonstration, purpose and muscles, preparation, four-step technique, breathing/counting, common mistakes, easier/harder variations and recovery. Calculations groups experience and kg/lb controls together before the example targets, recovery allowances and duration/energy results. Reference contains related source links, estimation methodology and media/editorial credits. Controls retain their values when changing tabs; unselected content is not rendered.

The exercise records receive supplementary warm-up, equipment-check, breathing, counting and weekly-recovery notes via `frontend/lib/exercise-practice-notes.ts`. They complement the existing exact variation instructions. Equipment branches cover bands, cables, machines, free weights and bodyweight setups; cardio, flexibility, impact work and core holds retain distinct effort/breathing guidance. The library's strict offline catalog schema, saved prescriptions and planning engine are unchanged.

The gap review compared [ACE's chest-press structure](https://www.acefitness.org/resources/everyone/exercise-library/19/chest-press/) and [NASM's dead-bug structure](https://www.nasm.org/resource-center/exercise-library/dead-bug) with our current records. [Mayo Clinic's technique guidance](https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/weight-training/art-20045842) supports warm-up, regular breathing, controlled movement and recovery between demanding muscle sessions. These new notes are educational editorial guidance, not a screening assessment or rehabilitation prescription. The nutrition modal supplies the visual reference: cream surface, yellow selected tab, compact facts and a charcoal results panel.

### Pre-start warm-up

The library and every non-rest workout to-do plan show a separate warm-up guide. Existing Stationary Bike, Incline Treadmill Walk and Elliptical Cross-Trainer records can be viewed as easy-pace options; walking or marching is the equipment-free default. These are warm-up adaptations, not the catalog's working-set prescriptions. The [American Heart Association](https://www.heart.org/en/healthy-living/exercise/fitness-basics/warm-up-cool-down) supports a gradual 5–10 minute warm-up. New generated plans schedule warm-up before the chosen workout start. Overall session budgets retain it once; exercise block estimates and subsequent block timestamps exclude it. Legacy tasks retain stored time allowances; playlists without a stored warm-up show a separate five-minute preparation suggestion.
