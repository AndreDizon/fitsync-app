# FitSync - Reporting Script, Version 2

KEYSTOKES | University of the Assumption, Pampanga

Short version: approximately 4-5 minutes, excluding the live demonstration.

## Slide 1 - Introducing FitSync

Good day, everyone. We are KEYSTOKES, fourth-year IT students from the University of the Assumption in Pampanga. Our capstone is **FitSync: An AI-Driven Platform for Smarter Workout and Nutrition Planning**. It brings workouts, nutrition and progress tracking into one app to help users organize and follow their routine.

## Slide 2 - Meet the Team

Our members are Christian Andre R. Dizon, Coeli Therese G. Brillante, Loraine Ann S. Escritor and Brian Noel M. Mendoza. We are presenting to you as IT experts and respondents in our study. Your feedback will help us evaluate the system's features, ease of use and technical quality.

## Slide 3 - The Problem

A healthier routine requires users to plan exercises, arrange meals and track their progress. Using separate tools can make this harder to manage. FitSync connects these tasks so users have one place to prepare their schedule, record completed activities and understand what to do next.

## Slide 4 - How FitSync Works

FitSync follows **plan, do and review**. Users enter their goals and preferences, then generate an editable plan or build their own. They record completed exercises, food entries and water intake. Their saved records appear in Progress, helping them review their habits and adjust their routine.

## Slide 5 - Our Design Approach

FitSync combines workout and nutrition planning, so we chose a friendly but sporty design. Yellow highlights important actions, while white and charcoal keep information clear. Other colors separate sections. Soft depth and our fox mascot give the app its identity while keeping it welcoming for beginners.

## Slide 6 - Technology Stack

**Next.js, React and TypeScript** build the interface, while **Node.js** runs backend checks. **Supabase and PostgreSQL** handle sign-in, records and photo storage. The **Gmail API** sends account emails, and **Vercel** hosts the system. **OpenRouter** powers the optional AI chat. Daily plans use programmed rules and calculations.

## Slide 7 - Account Security

**Supabase Auth** manages sign-in and stores password hashes instead of readable passwords. Email confirmation and recovery codes help verify account ownership. Recovery responses avoid revealing whether an account exists. Temporary, single-use authorization protects password changes, while protected pages and backend requests check that users are signed in.

## Slide 8 - Data Privacy

**Row-Level Security** limits private records to their owner. **AES-256-GCM** encrypts private plans, measurements, journal notes and photos, and detects altered content. **HKDF-SHA-256** derives separate user keys. Keys stay on the server, and **HTTPS** protects data in transit. This is server-side encryption; onboarding information and browser offline copies are outside this extra protection.

## Slide 9 - Benefits for Users

Users can manage workouts, food portions and water logs, then review measurements, check-ins and private photos. Reminders support scheduled tasks, and achievements recognize recorded milestones. Community features provide space for questions and introductions. Together, these tools give users a clear next action and a record of their routine.

## Slide 10 - Data Sources

FitSync includes **100 exercise and 100 food references**. Exercise media comes from **ExerciseGymGifsDB**, food values from **USDA FoodData Central**, and general activity-energy estimates from the **Physical Activity Compendium**. These named sources make information easier to check. They are reference libraries, not training data for our own AI model.

## Slide 11 - Calculations and Planning

Food nutrients are scaled to the selected portion. Workout plans consider equipment, experience, preferences, session length and start time. Adult energy estimates use the **Mifflin-St Jeor equation**, with activity and goal adjustments. These results are editable planning guides, rather than exact measurements or medical prescriptions.

## Slide 12 - Live Demonstration

We will now demonstrate Home, daily planning, activity completion, food portions and Progress, followed by Community and Settings. Please observe how the features connect and how easily users can follow each task. Your feedback will help us improve FitSync. Thank you, and let us begin the demonstration.
