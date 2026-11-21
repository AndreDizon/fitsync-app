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

- Analytics uses the selected period and excludes future records from observed totals. Missing logs are not treated as zero intake or zero effort.
- Beyond calories: nine additional nutrients are scaled from catalog values per 100 g using completed edible portions. Averages divide known nutrient amounts by food-logging days; coverage shows how many completed entries reported the nutrient. Partial logs and missing catalog values can make these amounts incomplete. Total sugars do not measure free or added sugars.
- Exercise comparisons use actual sets for the same exercise, combining entries on the same date. Load volume is repetitions multiplied by entered external kilograms; it is not a strength or muscle-growth score. Timed work is separate and excludes rest.
- Recovery summaries use the latest wellness entry per date for each metric. Averages use recorded days only. A change against the prior seven days requires at least three recorded dates in each block, within the selected period. These thresholds are FitSync display rules, not validated clinical thresholds.
- The next-seven-day outlook estimates completed exercise entries from the recorded completion rate. It requires at least four past workout dates spanning seven days and all seven upcoming dates loaded. Today is excluded from the baseline. This simple scenario assumes the recorded pace continues; it is not a calibrated probability, health forecast or automatic training recommendation.
- Do not infer weight change or a calorie deficit from partial food logs. [NIDDK's body-weight model](https://www.niddk.nih.gov/research-funding/technology-advancement-transfer/research-materials-licensing/body-weight-simulator-java-applet) illustrates that weight forecasting requires more than subtracting logged calories.

## Validation

Run `node scripts/validate-monitoring-insights.mjs` for portion scaling, unknown versus zero values, date boundaries, duplicate handling, actual-session comparisons, recovery coverage and outlook eligibility.

Use the existing food, exercise, estimate and library-filter validators to check catalog integrity. Browser checks should cover portion/100-g switching, invalid portions, unknown versus zero nutrients, contextual onboarding explanations, expandable references, keyboard dialog dismissal and 320–1440 px layouts. Existing source JSON and offline catalogs must stay unchanged for a presentation-only content update.
