# FitSync - Reporting Script

KEYSTOKES | University of the Assumption, Pampanga

Read each slide at a comfortable pace. Pause between paragraphs. The technical names are kept, with simple explanations of what they do.

## Slide 1 - Introducing FitSync

Good day, everyone. We are KEYSTOKES, fourth-year Information Technology students from the University of the Assumption in Pampanga.

Today, we are presenting our capstone, **FitSync: An AI-Driven Platform for Smarter Workout and Nutrition Planning**. FitSync brings workout planning, nutrition and progress tracking into one app. It helps users organize their routine and know what to do next. We will introduce the system, explain how it works, and end with a live demonstration.

## Slide 2 - Meet the Team

Our members are Christian Andre R. Dizon, Coeli Therese G. Brillante, Loraine Ann S. Escritor and Brian Noel M. Mendoza. Together, we are developing and evaluating FitSync for our capstone project.

We are presenting to you as IT experts and respondents in our study. Your feedback will help us check whether the system works properly, is easy to use, and meets its technical requirements. We also want to learn which parts need improvement before our next evaluation.

## Slide 3 - The Problem

Starting a healthier routine involves many small decisions. What exercise should I do? What should I eat? When should I do it? How do I know if I am staying consistent?

Managing these tasks across different tools can make the routine harder to follow. FitSync brings them together in one place. Users can prepare a plan, follow their daily schedule and review their records. This makes their next step clearer and gives them a practical way to keep track of their habits.

## Slide 4 - How FitSync Works

FitSync follows three steps: **plan, do and review**.

First, users enter their goals, available time, equipment and food preferences. They can generate an editable daily plan or create their own routine using playlists and the libraries. Next, they mark completed exercises and food entries, and log their water intake. Finally, they review their saved activity in Progress. This connects what they planned with what they actually recorded, helping them decide what to adjust next.

## Slide 5 - Our Design Approach

FitSync supports both exercise and nutrition, so its design should feel welcoming while still looking sporty. It should also suit everyday activities such as planning meals, drinking water and taking a rest day.

Yellow highlights important buttons. White and charcoal keep the content clear, while other colors help separate sections. Soft shadows and glass-like surfaces add depth. Our fox mascot gives the app a friendly identity. These choices aim to make the system appealing and easier to explore, especially for beginners.

## Slide 6 - Technology Stack

**Next.js and React** build the pages, buttons and interactive features. **TypeScript** helps us catch certain coding mistakes during development. **Node.js** runs the backend, where requests and data are checked.

**Supabase** manages user sign-in, the **PostgreSQL** database and private photo storage. The **Google Gmail API** sends FitSync's confirmation and recovery emails. **Vercel** hosts the frontend and backend online.

**OpenRouter** connects the optional AI chat assistant to language models. The daily planner uses programmed rules and calculations. The planner and AI chat therefore have separate roles in the system.

## Slide 7 - Account Security

**Supabase Auth** manages sign-in and user sessions. It stores password hashes, which are one-way results used to check passwords without keeping them as readable text.

Email registration requires confirmation. For Google sign-up, Google verifies the email, and users complete their FitSync username and password setup. FitSync sends confirmation and recovery codes through Gmail. Users enter these codes in the app.

Recovery responses do not reveal whether an email has an account. After verification, temporary, single-use authorization protects the password change. Protected pages and backend requests also check that the user is signed in.

## Slide 8 - Data Privacy

FitSync uses access rules and encryption to protect private records. **Row-Level Security**, or RLS, checks which records belong to each user and limits access accordingly.

**AES-256-GCM** turns private plans, playlist contents, measurements, journal notes and photos into unreadable data before storage. It also detects changes to the encrypted content. **HKDF-SHA-256** creates a separate encryption key for each user from the server's main key. A new random value is used each time data is encrypted.

The backend keeps the keys and unlocks records for authorized requests. **HTTPS** protects information while it travels. This is server-side encryption, not end-to-end encryption. Onboarding information and browser offline copies are outside this extra encryption layer. Users can also clear their data or delete their account.

## Slide 9 - Benefits for Users

FitSync helps users manage the routine after creating a plan. They can follow scheduled workouts, adjust food portions, log water and review their activity.

They can also record measurements, complete daily check-ins and maintain a private photo timeline. Achievements recognize recorded milestones, while reminders help users return to tasks. Community sections provide space to ask questions and meet people with similar interests.

The main benefit is having these tools connected. Users can see what to do next and return to their records to understand their routine over time.

## Slide 10 - Data Sources

FitSync currently includes **100 exercise references and 100 food references**. Exercise demonstration images come from **ExerciseGymGifsDB**. FitSync adds its own instructions and planning labels.

Food nutrient values and supported portion weights come from **USDA FoodData Central's SR Legacy dataset**. General activity-energy estimates refer to the **Physical Activity Compendium**.

Using named sources makes the information easier to check. These are reference libraries; they were not used to train our own AI model. Food preparation also matters, so raw and cooked food entries must be treated separately.

## Slide 11 - Calculations and Planning

Food values change with the selected portion. For example, if rice has 130 kilocalories per 100 grams, a 150-gram portion has about 195 kilocalories. The app multiplies the reference value by the chosen grams, then divides by 100.

Workout planning considers the user's equipment, experience, preferences and available time. Exercises are scheduled from the chosen start time using their estimated durations.

For adults, energy estimates use the **Mifflin-St Jeor equation**, which estimates resting energy needs. Activity and goal factors then adjust that estimate. Users can edit their plans. These figures are planning guides, not exact measurements or medical prescriptions.

## Slide 12 - Live Demonstration

We will now show how FitSync works during a typical day. We will begin on Home, review a workout plan, mark an activity complete, adjust a food portion and check the saved progress. We will also briefly show Community and Settings.

Please observe how the features connect, whether the information is clear, and how easily users can move between tasks. Your feedback will help us improve FitSync as a combined workout and nutrition planning platform. Thank you, and we will now begin the demonstration.
