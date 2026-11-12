# FitSync user data dictionary

Prepared: November 12, 2026. This inventories the current source-code data model, not actual users' records. It does not confirm which migrations have been applied to the live Supabase project. No credentials or private records are included.

**Reading this file:** Input = supplied by the user; system = created by the app/auth service; derived = calculated from saved inputs. Optional fields may be absent. Numeric onboarding inputs are stored as strings and parsed for calculations. Day indexes are Monday `0` through Sunday `6`.

## 1. Account and authentication

| Data / field | Type / source | Storage | Purpose / visibility |
|---|---|---|---|
| Account ID (`id`, referenced as `user_id`) | UUID; system | Supabase Auth; foreign keys on personal tables | Connects all records to their owner |
| Email | String; email signup or Google | Supabase Auth | Sign-in, verification and recovery; not a community post field |
| Password | Secret input for email authentication | Handled by Supabase Auth; not a plaintext application database field | Authenticate email/password accounts |
| Display name (`display_name`) | String; signup input | Auth user metadata | Greetings and account display |
| Provider name (`full_name`, `name`) | Optional strings; OAuth metadata | Auth user metadata | Name fallbacks and social author display |
| Provider identity / linked Google account | Provider-managed identity | Supabase Auth identities | Google login; available metadata depends on provider |
| Email verification, account creation and sign-in metadata | Service-managed values | Supabase Auth | Auth lifecycle; not custom fitness fields |
| Access/refresh session and authentication cookies | Service-generated tokens | Auth/session layer | Maintain sign-in; never use as public profile information |
| Onboarding profile (`fitsync_onboarding`) | Structured object; input + system | Auth user metadata | Personalized planning; fields below |

Google profile metadata may contain additional provider fields. Those are provider-dependent, not a fixed FitSync questionnaire. The app does not receive the user's Google password.

## 2. Onboarding profile

All fields below belong to `user_metadata.fitsync_onboarding` for a regular account. The development tester uses a separate signed preferences cookie rather than a database account.

| Field | Type / values | Meaning / use |
|---|---|---|
| `goal` | `general_fitness`, `fat_loss`, `muscle_gain`, `strength`, `endurance`, `mobility` | Primary fitness goal |
| `timeZone` | IANA timezone string, e.g. `Asia/Manila` | User-local date, day and week calculations |
| `age` | Numeric string; whole age 1–120 | Planning inputs; some adult estimates have separate eligibility rules |
| `ageRange` | String; legacy or derived age band | Under 18, 18–24, 25–34, 35–44, 45–54, 55–64, 65+ |
| `gender` | Woman, Man, Non-binary, Prefer not to say | Profile display; not treated as biological sex in energy calculations |
| `heightCm` | Optional numeric string; 100–250 cm | Energy estimates and profile display |
| `weightKg` | Optional numeric string; 20–350 kg | Onboarding baseline weight; distinct from dated progress logs |
| `targetWeightKg` | Optional numeric string; 20–350 kg | Goal display and weight-trend projection |
| `focusAreas` | String array | Overall, Chest, Back, Legs, Shoulders, Arms, Core, Cardio; Overall is exclusive |
| `activity` | Mostly seated, Lightly active, Moderately active, Very active | Energy activity multiplier |
| `experience` | Beginner, Intermediate, Advanced | Exercise selection suitability |
| `days` | Weekday string array, Mon–Sun | 1–6 training days; other days are workout rest days |
| `sessionMinutes` | Numeric string: 30, 45, 60, 75, 90 (legacy 15/20 still readable) | Total exercise-session time target |
| `equipment` | String array | Bodyweight, Dumbbells, Barbell, Resistance bands, Cable machine, Gym machines, Kettlebell |
| `adjustments` | String array | Low impact/no jumping, avoid overhead movements, avoid kneeling |
| `diet` | No preference, Vegetarian, Vegan, Pescatarian, Halal | Food matching preference |
| `allergies` | String array | Milk, Eggs, Fish, Shellfish, Peanuts, Tree nuts, Soy, Wheat, Sesame, Other |
| `allergiesReviewed` | Boolean | Records completion of allergy preference review |
| `otherAllergy` | String, up to 120 characters | Additional allergy description |
| `dislikes` | String, up to 200 characters | Foods the user prefers to avoid |
| `mealsPerDay` | Numeric string: 2, 3, 4, 5 | Meal schedule preference |
| `cookingMinutes` | Numeric string: 15, 30, 45, 60 | Preparation-time preference |
| `budget` | Budget-friendly, Moderate, Flexible | Food budget preference |
| `version` | `1` or `2`; system | Profile schema version |
| `completedAt` | Timestamp string; system | Onboarding completion timestamp |

## 3. Saved workout and nutrition playlists

Database: `public.plan_playlists`. These are manually arranged reusable plans, separate from the dated My Plan to-do lists.

| Field | Type | Meaning |
|---|---|---|
| `id` | UUID | Playlist identity |
| `user_id` | UUID | Owner's Auth account |
| `kind` | `workout` / `nutrition` | Playlist mode |
| `duration` | `day` / `week` | One-day or weekly playlist |
| `selected_day` / client `selectedDay` | Integer 0–6 | Selected weekday for a one-day playlist |
| `rest_days` / client `restDays` | Integer array 0–6 | Workout rest weekdays; nutrition has no rest days |
| `name` | String, 1–80 characters | User's playlist title |
| `description` | String, up to 240 characters | Optional description |
| `items` | JSON array | Ordered exercises or foods; fields below |
| `revision` | Positive integer | Detects conflicting edits |
| `created_at` | Timestamp | Creation time |
| `updated_at` | Timestamp | Last saved update |

### Playlist entries and daily tasks

| Field | Applies to | Type / unit | Meaning |
|---|---|---|---|
| `id` | Both | UUID | Individual entry identity, distinct from catalog ID |
| `day` | Both | Integer 0–6 | Scheduled weekday |
| `time` | Both | `HH:mm` string | Editable local clock time; not a UTC timestamp |
| Array position | Both | Ordered index | User-defined item order |
| `exerciseId` | Workout | Catalog ID string | Selected library exercise |
| `sets` | Workout | Integer 1–20 | Planned sets |
| `targetType` | Workout | `reps` / `time` | Repetitions or seconds per set |
| `target` | Workout | Integer; reps or seconds | 1–100 reps, or 1–3600 seconds |
| `restSeconds` | Workout | Integer 0–600 | Planned rest between sets |
| `foodId` | Nutrition | Catalog ID string | Selected library food |
| `grams` | Nutrition | Number 1–2000 g | Edible portion in the catalog's preparation state |
| `meal` | Nutrition | Breakfast, Lunch, Dinner, Snack | Meal grouping |
| `done` | Daily tasks only | Boolean | User marked the task complete |
| `actualSets` | Daily workout tasks only | Array, up to 20 records | What the user reports completing |
| `actualSets[].amount` | Actual set | Integer | Completed repetitions or seconds, according to target type |
| `actualSets[].weightKg` | Actual set | Number 0–1000 kg | Logged resistance; zero can represent bodyweight |

## 4. Dated My Plan and water records

Database: `public.daily_plan_weeks`. Workout, nutrition and water share one owner/week document.

| Field / path | Type | Meaning |
|---|---|---|
| `user_id` | UUID | Owner |
| `week_start` | Date; Monday | Week identifier |
| `document.version` | Integer `1` | Document schema version |
| `document.week` | Date string | Matches the database week start |
| `document.revision` / `revision` | Integer | Synchronization revision |
| `updated_at` | Timestamp | Last database update |
| `document.days` | Array of 7 days | Monday–Sunday schedules |
| `days[].workout.items` | Task array | Dated workout entries with completion and optional actual sets |
| `days[].nutrition.items` | Task array | Dated food entries with portions and completion |
| Each mode's `rest` | Boolean | Workout rest status; always false for nutrition |
| Each mode's `source` | String, up to 100 characters | Describes plan origin, such as manual/system/playlist |
| Each mode's `variation` | Integer 0–100000 | Generation variation used for alternatives |
| `days[].water` | Array of 8 records | Daily app water goal |
| `water[].time` | `HH:mm` string | Editable scheduled time for each glass |
| `water[].done` | Boolean | Glass marked consumed |

The water goal currently represents eight 250 ml glasses (2,000 ml), not a separately measured bottle volume. Marking a task done does not independently measure exercise duration or actual food consumption.

## 5. Progress documentation

Database: `public.progress_entries`. A user can create, edit and delete their own documentation. Measurements and wellness scores are self-reported.

| Field | Type / validation | Meaning |
|---|---|---|
| `id` | UUID | Progress entry identity |
| `user_id` | UUID | Owner |
| `kind` | `body`, `wellness`, `photo` | Documentation category |
| `date` | Date | User-selected documentation date; client rejects future dates |
| `revision` | Positive integer | Edit conflict protection |
| `created_at`, `updated_at` | Timestamps | Record history metadata |
| `payload.weightKg` | Number, 1–500 kg | Dated weight measurement |
| `payload.bodyFat` | Number, 1–75 percent | Self-reported body-fat percentage |
| `payload.chest` | Number, 5–300 cm | Chest circumference |
| `payload.waist` | Number, 5–300 cm | Waist circumference |
| `payload.hips` | Number, 5–300 cm | Hip circumference |
| `payload.arm` | Number, 5–300 cm | Arm circumference |
| `payload.thigh` | Number, 5–300 cm | Thigh circumference |
| `payload.rpe` | Integer 1–10 | Perceived exertion |
| `payload.energy` | Integer 1–5 | Energy rating |
| `payload.mood` | Integer 1–5 | Mood rating |
| `payload.sleepQuality` | Integer 1–5 | Sleep quality rating |
| `payload.soreness` | Integer 1–5 | Soreness rating |
| `payload.sleepHours` | Number 0–24 | Reported sleep duration |
| `payload.notes` | Optional string, up to 500 characters | Personal notes |
| `payload.path` | Storage object path | Photo reference: owner ID/entry ID.jpg |
| Photo binary | JPEG, up to 2 MB | Private `progress-photos` storage bucket |
| `photoUrl` | Temporary generated URL | Display access to a photo; excluded from persistent progress cache |

Body fields belong to body entries; wellness fields belong to wellness entries. A photo entry stores its path and may include notes. The app does not infer body fat or muscle mass from an image.

## 6. Visits and achievements

| Table / field | Type | Meaning |
|---|---|---|
| `progress_visits.user_id` | UUID | Owner |
| `progress_visits.date` | Date | App visit day; unique per user/date |
| `progress_awards.user_id` | UUID | Award owner |
| `progress_awards.code` | Fixed code | Earned milestone identity |
| `progress_awards.awarded_at` | Timestamp | Award timestamp |

| Award code | Display name | Unlock condition |
|---|---|---|
| `hello` | First steps | Use FitSync on 1 day |
| `streak3` | Finding rhythm | Best app streak of 3 days |
| `streak7` | Week in sync | Best app streak of 7 days |
| `streak30` | Fox on fire | Best app streak of 30 days |
| `todo1` | One small win | 1 completed workout/food task |
| `todo25` | Momentum maker | 25 completed tasks |
| `todo100` | Century club | 100 completed tasks |
| `workout10` | Stronger habit | Finish all workout tasks on 10 workout days |

## 7. Social/community data

These records are intended for other signed-in community members to read. They are different from private plans and progress photos.

| Table / field | Type / limits | Meaning |
|---|---|---|
| `community_posts.id` | UUID | Post identity |
| `community_posts.user_id` | UUID | Author's account |
| `community_posts.kind` | `forum`, `people`, `gym` | Section |
| `community_posts.author` | String, 1–80 characters | Name snapshot derived from Auth metadata |
| `community_posts.body` | String, 1–4000 characters | Post text, introduction or gym comments |
| `community_posts.role` | String, up to 80 characters | Coach/buddy role, including custom role; required for people posts |
| `community_posts.name` | String, up to 120 characters | Gym/facility name; required for gym posts |
| `community_posts.location` | String, up to 240 characters | Posted facility location; required for gym posts |
| `community_posts.rating` | Nullable integer 1–5 | Required gym star rating |
| `community_posts.image_path` | Optional owner-prefixed path | Uploaded community image reference |
| `community_posts.created_at`, `updated_at` | Timestamps | Creation/edit times |
| `community_posts.expires_at` | Timestamp | Next UTC quarter boundary; posts become unavailable then |
| `community_comments.id`, `post_id`, `user_id` | UUIDs | Comment identity, parent and author |
| `community_comments.author` | String | Author name snapshot |
| `community_comments.body` | String, 1–1000 characters | Comment text |
| `community_comments.created_at` | Timestamp | Comment time |
| `community_hearts.post_id`, `user_id` | UUID pair | Forum heart membership; one heart per user/post |
| `community_daily_usage.user_id`, `kind`, `day`, `used` | UUID, section, UTC date, integer | Posting quota counter, including previously created posts |
| `community_image_cleanup.path`, `queued_at` | Path, timestamp | Server maintenance queue for image removal |
| Community image binary | JPEG, up to 2 MB | Private `community-images` bucket; access linked to community post rules |

Forum and gym allow two new posts per user per UTC day. People allows one active introduction per user. Expiration is a shared quarterly boundary, **not exactly 90 days after each post**. Physical cleanup requires the deployed cleanup job; disappearance from the feed and physical deletion are separate operations.

## 8. Calculated user information

These values are generally calculated from the above records rather than independent questionnaire/database columns.

| Metric / display | Inputs | Calculation / interpretation |
|---|---|---|
| Local day, current weekday and week | Timezone and current clock | User-local calendar context |
| Workout rest weekdays | Onboarding days or imported playlist | Applies only to workout mode |
| Daily movement target | Session minutes, rest status | Rest day target becomes zero |
| Energy target and range | Age, height, weight, activity, goal | Mifflin–St Jeor coefficient range with activity multiplier and goal adjustment; eligibility checks may make it unavailable |
| Protein, carbohydrate and fat targets | Estimated energy and goal | Planning allocations in grams; not measured intake |
| Planned workout minutes | Sets, reps/seconds, rest | Timed sets or task-specific seconds per rep (4 seconds normally, 5 for loaded barbell compounds; legacy/manual default 3), plus between-set rests and explicitly scheduled warm-up, cooldown and setup/transitions |
| Completed workout minutes | Tasks marked done | Sum of estimated durations; not a live timer |
| Exercise count / completed / remaining | Workout tasks and `done` | Task totals for selected day |
| Planned and logged kcal/macros | Food catalog per 100 g, portion grams, `done` | All food items versus only checked food items |
| Meal totals and completion | Meal grouping and food tasks | Per-meal nutrients and completed ingredient count |
| Water count, percent and app volume | Eight water completion flags | Checked count / 8; 250 ml per checked glass |
| Home momentum | Today's workout and food tasks | Completed / total plan tasks; water excluded |
| Next scheduled task | Unfinished workout and food tasks | Earliest scheduled unfinished task, potentially overdue |
| Current and best app streak | Recorded visit dates | Consecutive app-use days; not necessarily consecutive workouts |
| Active/completed days | Dated task completion | Days with at least one completed workout or food item |
| Completed workout days | Daily workout tasks | Nonempty days where every workout task is checked |
| Weekly frequency and monthly minutes | Dated workout completion | Chart counts and estimated completed movement time |
| Body/measurement trends | Dated body logs | Weight, body-fat and circumference chart series |
| Weight target projection | Recent weight logs, target and age | Linear trend of last 90 days; needs adult eligibility, at least 4 dated logs spanning 21 days, recent data and a usable trend; may return no prediction |
| Projection rate and fit | Weight log regression | kg/week and R-squared; estimates, not promised outcomes |
| Achievements unlocked / next milestone | Visits, streaks and completed tasks | Evaluated against milestone definitions above |
| Nearby distance / route | GPS position and selected facility | Temporary location-based results; not a workout activity recording |

## 9. Device-only, temporary and synchronization data

| Data | Location / lifetime | Purpose / account relationship |
|---|---|---|
| Selected visual theme | Browser localStorage, `fitsync-home-theme` | Device preference; not a fitness profile field |
| Daily week device copy | localStorage, owner/week key | Offline plans and queued edits |
| Daily sync flags | `pending`, `conflict`, `error`, `token` | Pending upload, conflict message and local change identity |
| Playlist device copy | IndexedDB, `fitsync-private-playlists-v1` | Offline private playlists |
| Playlist sync metadata | `syncStatus`, `localVersion`, `syncError`, `baseRevision`, `deleted`, owner/key | Queued saves/deletions and conflict protection |
| Progress snapshot | Owner-keyed localStorage | Cached entries, visits, weeks and awards; may have offline/limited status |
| Pending app-visit dates | Owner-keyed localStorage | Queue visit records until connected |
| Exercise/food library assets and cache state | Bundled files and browser/service-worker cache | Shared offline reference content; not personal exercise history |
| Unsaved editor fields, selected tabs/days, searches and filters | UI state unless explicitly saved | Temporary interaction state, not separate user database records |
| Chat messages (`role`, `content`) | Current UI session; sent to backend/OpenRouter/model provider | Not saved to the FitSync account by the chat component; provider retention is separate |
| Chat request/error/reset state | UI/backend request handling | Response, failure and retry feedback |
| GPS latitude, longitude and accuracy | Browser geolocation/UI state; sent for nearby search | Permission-based nearby facilities; no account location-history table in the reviewed schema |
| Selected facility and route results | UI/request state and map providers | Nearby place name/location/distance and directions |

Private device copies are cleared by sign-out handling; users must sync pending changes before relying on their account copy after signing in again. Browser cache may be evicted or cleared. Offline availability does not mean a new installation already has all media downloaded.

## 10. Shared catalog information associated with user selections

| Catalog | Examples of reference information | Relationship to user data |
|---|---|---|
| Exercise library | ID, name, body part, target/secondary muscles, equipment, category, difficulty, movement pattern, default target, instructions, coach tip, GIF/thumbnail and estimates | User tasks reference `exerciseId`; the catalog remains general reference content |
| Food library | ID, name, classifications, preparation state, serving measurements, nutrients per 100 g, benefits, dietary/allergen information and illustrations | User tasks reference `foodId` and grams; totals are calculated from the reference food |
| `plan_catalog_refs` | Allowed kind/ID pairs | Shared validation allowlist, not a user's collection |
| Fitness fact cards | Titles, explanatory tips, art and source links | Editorial content, not personalized health records |

## 11. Boundaries and source references

| Boundary | Current interpretation |
|---|---|
| Steps, heart rate, wearable telemetry | No dedicated personal measurement schema identified in the reviewed models; do not infer these from decorative card art |
| Burned calories versus food energy | Food kcal represents catalog-based intake. Checked exercise duration is an estimate; it is not a sensor measurement of energy expenditure |
| Goal achievement | A forecast is conditional on data quality; completing tasks alone does not prove a target weight was reached |
| Role labels | A self-posted nutritionist/trainer role does not itself establish verified credentials |
| Sensitive data | Auth/session data, measurements, progress photos, allergies, wellness notes and exact location require appropriate handling |
| Server credentials | API keys, service-role keys, cron secrets and database passwords are configuration secrets, not user fields, and are intentionally omitted |
| Completeness | Covers implemented application fields found in the sources below. Hosting/auth/provider operational logs can contain additional metadata outside these custom models |

| Source | Defines |
|---|---|
| `shared/onboarding.ts` | Questionnaire fields, options, validation and profile version |
| `frontend/app/onboarding/actions.ts` | Auth metadata storage for onboarding |
| `frontend/app/auth/actions.ts` | Signup display name and auth flow |
| `shared/playlists.ts` | Playlist/client item structures |
| `shared/daily-plans.ts` | Dated plans, actual sets, targets and nutrient/time computations |
| `shared/progress.ts` | Documentation, habits, milestones and forecast |
| `backend/migrations/20261107_plan_playlists.sql` | Playlist base tables and owner policies |
| `backend/migrations/20261108_playlist_schedule.sql` | Playlist weekday/time/rest scheduling |
| `backend/migrations/20261109_daily_plans.sql` | Daily plan week storage |
| `backend/migrations/20261110_progress.sql` | Documentation, visits, awards and private photo storage |
| `backend/migrations/20261111_social.sql` | Posts, comments, hearts, quotas and community image storage |
| `frontend/lib/daily-plans.ts`, `playlist-offline.ts`, `progress.ts`, `plan-signout.ts` | Device copies and synchronization |
| `frontend/components/coach-chat.tsx`, `social-facilities.tsx`, `home-theme-preview.tsx` | Temporary chat/location data and device theme |

