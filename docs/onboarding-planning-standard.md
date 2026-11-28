# Onboarding and planning specification

Reviewed November 28, 2026. This describes the implemented planner, including its limits. It is evidence-informed general planning software, not a clinically validated prescription or professional certification.

## Onboarding sequence

1. **Goal:** direction and focus areas.
2. **Starting point:** time zone, age, nutrition suitability, optional adult energy-equation coefficient, gender, usual activity including exercise, teen total activity where applicable, height, current and target weight, and the **shared workout and nutrition start date**. The date can be chosen before training weekdays exist; weekday compatibility is checked on page three. The target-weight outlook becomes available when the needed measurements and training weekdays exist.
3. **Movement:** exercise suitability, experience, 1–5 training weekdays, workout time, between-set recovery, total session budget, equipment and movement exclusions. At least two non-workout days is a FitSync product rule, not a universal professional standard. The start date must be one of the selected training weekdays.
4. **Food:** dietary pattern, explicit allergy review, exclusions, meal count, preparation time, first/last meal times and budget.
5. **Review:** inspect and edit answers before saving. Preparation then generates **seven consecutive calendar days from the shared start**, with meals on every day and workouts on eligible training days. Future weeks can be formulated in My Plan. A distant target-weight scenario does not trigger years of unattended prescriptions.

Existing profiles remain readable. New suitability questions are required on new saves; historical unanswered profiles are not silently reclassified as professionally assessed. No diagnosis details are requested. Gender is never substituted for biological sex.

## What the research changed

| Evidence | Implemented consequence | Boundary |
| --- | --- | --- |
| [ACSM 2026 resistance-training position stand](https://doi.org/10.1249/MSS.0000000000003897) recommends engaging major muscle groups at least twice weekly; individual progression and consistency matter. | Select up to three nonconsecutive whole-body strength-emphasis weekdays, including the Sunday–Monday boundary. Other selected days emphasize conditioning/mobility. Equipment, experience and movement exclusions still apply. | A restricted focus, equipment pool, or tightly clustered schedule may prevent full coverage. This is disclosed; the planner does not claim the weekly standard was met. |
| [CDC adult activity guidance](https://www.cdc.gov/physical-activity-basics/guidelines/adults.html) combines aerobic activity with two strength days. | Fat-loss and endurance goals retain strength exposure instead of selecting only cardio. | Session budgets include rest/setup and cannot be reported as minutes of moderate or vigorous aerobic activity. The app does not certify intensity or weekly adherence. |
| [AHA resistance-training scientific statement](https://pmc.ncbi.nlm.nih.gov/articles/PMC11209834/) discusses controlled progression and individualized load. | Session notes ask for manageable effort and controlled repetitions before increasing load. Warm-up, cooldown, rest and transitions count toward the selected budget. | No 1RM test or automatic kilogram prescription. Repetitions in reserve and progression advice are coaching heuristics, not measured exertion. |
| [ACSM preparticipation screening research](https://doi.org/10.1249/tjx.0000000000000073) considers activity, symptoms, known disease and intended intensity. | A compact exercise suitability check pauses automatic workouts if individual guidance is requested. | This is deliberately not a replacement for the full ACSM screening algorithm, PAR-Q+, diagnosis or medical clearance. |
| [USDA DRI calculator](https://www.nal.usda.gov/human-nutrition-and-food-safety/dri-calculator) distinguishes age, sex, activity and pregnancy/lactation needs; the [NIDDK weight planner](https://www.niddk.nih.gov/health-information/weight-management/body-weight-planner) excludes minors and pregnancy/breastfeeding. | Add an optional adult equation-coefficient choice and nutrition suitability check. When review is needed, pause calorie targets, menus and target-weight dates. Teen energy retains its growth-energy method without a loss deficit. | FitSync uses Mifflin–St Jeor for supported adults, not the NIH dynamic weight model or the adult DRI calculator's equations. Choosing a coefficient does not resolve hormonal, clinical or individual variation. |
| [WHO healthy-diet guidance](https://www.who.int/news-room/fact-sheets/detail/healthy-diet) includes food diversity, fruit/vegetables and fibre. | Menu portions are fitted to energy and macro references within ingredient caps. Drafts disclose energy/protein gaps, fruit/vegetable intake below 400 g, fibre below 25 g, and missing fibre data. | These checks identify gaps; they do not establish micronutrient completeness or replace individualized dietetic review. |

## Calculation and scheduling rules

- Adult resting energy uses `10 × kg + 6.25 × cm − 5 × age`, plus the selected published coefficient (−161 or +5). If unspecified, both results form a range and their midpoint supports menu drafting. This range is not a confidence interval.
- Usual **total** activity uses the existing approximate factors 1.2 / 1.375 / 1.55 / 1.725. Exercise energy is not added again. These are app approximations, not measurements. A 10% goal adjustment remains an app policy; incompatible target direction uses maintenance. Unsupported energy/BMI profiles are referred for individual review.
- Teen energy uses the existing 2023 DRI EER growth equations and total daily activity; no loss deficit, muscle-gain surplus, or target-weight deadline is applied. Selecting an adult sex coefficient does not change teen calculations.
- Adult macro allocations remain 20% protein (25% for strength/muscle goals), 30% fat and the remaining carbohydrate. Teens retain 20/30/50. These are menu references, not claims of an optimal sports nutrition prescription.
- Food selection preserves dietary, allergen, preparation-state, dislike, cooking-time and budget exclusions. “Other” allergy requires manual review. Portion fitting cannot override these constraints or ingredient caps. A missing food group or substantial nutrient mismatch is reported.
- Meals are evenly spaced from the first to last meal time, in the selected time zone. This supports a routine; it does not prescribe fasting or assert a metabolically superior meal frequency.
- Nutrition cannot be formulated before the shared start date, but remains available on workout rest days. Workout dates must also match the selected training weekday. Both System and AI formulation use the shared engine constraints.
- The optional target-weight date is arithmetic from the selected pace, not a forecast from an energy-balance model. It does not stop training, force calorie changes, or guarantee that the target will be reached. Review real weight trends instead.

## Reliability and follow-up

Initial preparation loads each affected account week before writing, keeps existing schedules and their completion records, validates stored plans, and uses existing revision/conflict handling. It is idempotent across retries and concurrent component mounts. Failed initial refreshes do not create an overwrite of an unknown remote week. Account changes invalidate pending work. Device-only or pending-sync status is explicit.

After the first week, users should review actual effort, pain, fatigue, adherence, hunger, food tolerance and recorded weight trends. Fully automatic longitudinal adaptation, clinical nutrition targets, rehabilitation, pregnancy/lactation prescriptions and professional sign-off remain outside the implemented scope. Those require qualified assessment and prospective validation; adding onboarding fields alone would not establish them.

Validation: `validate-onboarding-planning.mjs`, existing onboarding/daily-plan/workout/AI/youth checks, TypeScript, production builds and responsive browser checks.
