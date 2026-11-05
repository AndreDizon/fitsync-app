# FitSync foundational exercise catalog

`exercises.json` is a strict JSON array of 100 curated exercises with exactly the
requested fields: id, name, bodyPart, target, secondaryMuscles, equipment,
category, difficulty, movementPattern, defaultTarget, gifUrl, thumbnailUrl,
specificInstructions, and coachTip.

The six groups contain 16 Chest, 16 Back, 20 Legs, 14 Shoulders, 18 Arms, and
16 Core/Cardio exercises. Group membership is stored separately in
`exercises-media.json`, so no additional field leaks into the JSON export.
The seeded package resolves display aliases and media paths for the library UI.
It is the primary source online and offline, loaded once per page session; all
library queries then run on the device. `exercises.json` is the exact export
array without wrappers; no exercise API endpoint is needed.

## Searching and filtering

The local query engine accepts `q`, `group`, `equipment`, `target_muscle`, `category`,
`difficulty`, `movementPattern`, `sort`, `page`, and `pageSize`.
Repeated parameters (or comma-separated values) match any selected value within
that facet; different facets must all match. For example,
`group=Chest&equipment=dumbbell&equipment=machine` returns chest exercises using
either dumbbells or a machine. Equipment describes the main training tool;
exercise instructions still identify supports such as benches or bars.

`facets` lists the catalog's stable options. `facetCounts` counts matches for
each option while ignoring its own facet and respecting search and other
selections. This lets the UI disable unavailable choices without hiding active
filters. Search matches all normalized terms across names and exercise metadata,
including secondary muscles; generic instruction wording does not create hits.
Aliases include DB, BB, pecs, abs, lats, and common push-up spellings.
Sorting supports `relevance`, `name`, `name-desc`, and `beginner`.

## Offline device seed

### Time, energy and future onboarding goals

`exercises-estimates.json` contains estimates keyed by all 100 exercise IDs,
separate from the original exercise schema. `npm run seed:offline` regenerates
it using `scripts/exercise-estimates.mjs` and embeds each estimate in the public
offline catalog. Run `node scripts/validate-exercise-estimates.mjs` to check
coverage, offline parity, ranges and work/rest calculations.

The six provisional goal keys are `general_fitness`, `fat_loss`, `muscle_gain`,
`strength`, `endurance` and `mobility`. These keys also match saved onboarding goals;
the exercise-details goal selector previews their guidance. Onboarding
supplies the saved goal and optional body weight in kilograms as defaults.

Time includes the suggested sets/reps or holds and between-set rest, excludes
setup/warm-up/cool-down, and doubles work for prescriptions marked per side.
Repetitions assume 2–4 seconds, with 45–90 seconds rest (60–120 for plyometrics).
Calories are broad adult planning estimates at a labeled 70 kg reference,
scaled linearly by entered weight. Gross energy includes resting metabolism:
`MET × 3.5 × weightKg / 200 × minutes`, calculated separately for active work
and 1.3-MET rest. Intensity ranges use activity classes, not measurements of
each exercise, from the [Physical Activity Compendium](https://pacompendium.com/),
including [conditioning](https://pacompendium.com/conditioning-exercise/) and
[rope jumping](https://pacompendium.com/sports/).
Choosing a goal does not change calories for an identical prescription.
Muscle/weight gain is qualitative guidance; `estimatedMuscleGainKg` is `null`
because individual exercise sessions cannot predict kilograms gained or lost.

`npm run seed:offline` creates a versioned package in `frontend/public/offline`:
the resolved 100-record dataset and a manifest listing all 200 exercise media files and the fox logo. The main app's Exercise Library reads this seed and uses the local query implementation in shared/exercise-query.ts.

The service worker saves these public assets with progress feedback and marks them ready only after every file is stored. Interrupted downloads can resume. It does not intercept page navigation or provide a separate offline page. The library works without a network connection while the app is open; reloading or launching the full app still requires its server.

Public cached records and GIFs survive browser
restarts, subject to browser storage eviction or the user clearing site data.
Private dashboard pages, login pages, sessions, and personal API data are excluded.

Instructions and fox coach tips were authored for FitSync. Difficulty labels
and set/repetition targets are general starting suggestions, not personalized
prescriptions. Each record has four distinct setup/execution/return steps.
Read more expands from the first three steps to the full instructions.

## Media convention

The export preserves the user's specified CDN convention:
`https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/{bodyPart}/{id}.gif`
and the equivalent `{id}.webp` thumbnail path. These are requested-format URLs,
not confirmed upstream asset paths. For example, the requested
`chest/barbell-bench-press.gif` returns 404, while the repository uses
`pectorals/barbell-bench-press.gif`. The pinned source thumbnails use
`.thumb.webp`; this thumbnail was not available at the sample v1.1.0 path.

To keep the app working, the library uses the verified local media paths in
`exercises-media.json`, not the export URL fields. Every exercise is matched by
its exact source slug. Each of the 100 GIFs and 100 source thumbnails is copied
without modification from [ExerciseGymGifsDB](https://github.com/JahelCuadrado/ExerciseGymGifsDB)
revision `f6d16e977fbee3c04295311c44cb8374ca8ff182` into
`frontend/public/exercises`. The manifest retains the original source path and
URL for attribution. The JSON export convention must be resolved using this
manifest before using the export's CDN URLs in another app.

## Maintaining the catalog

Edit `scripts/curated-exercises.mjs` for content. Rebuild the strict export and
media manifest from the project root:

```sh
node scripts/import-exercises.mjs
```

A local checkout at the pinned revision can supply assets instead of downloads:

```sh
node scripts/import-exercises.mjs /path/to/ExerciseGymGifsDB
```

Validate schema, group counts, unique IDs, and all local media with:

```sh
node scripts/validate-exercises.mjs
```

The catalog is public and read-only; personal APIs retain authentication.
General technique references used during authoring:
[ACE Exercise Library](https://www.acefitness.org/resources/everyone/exercise-library/)
and [NASM Exercise Library](https://www.nasm.org/workout-exercise-guidance).
FitSync's prose is original and has not been reviewed or endorsed by those
organizations. Source demonstrations are attributed separately from FitSync's
instructions and coach tips.
