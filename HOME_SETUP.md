# Home dashboard and fitness chat

The Home body summarizes the signed-in user's saved daily plan, water log, playlists, progress journal, achievements and community sections. Each shortcut opens its matching page and tab. Water opens the existing Plans water tracker. Library totals come from the bundled catalogs. Existing hero artwork is preserved.

Fitness tip cards turn over to show educational descriptions and source links. These are informational, not personalized recommendations.

## Enable the optional chatbot and AI formulate

1. Create an account at https://openrouter.ai/ and sign in.
2. Open https://openrouter.ai/settings/keys and create an API key for FitSync.
3. In Vercel, open **fitsync-backend → Settings → Environment Variables**.
4. Add `OPENROUTER_API_KEY` with that key as a **Secret**, selecting Production (and Preview if needed). Keep it out of frontend variables and Git.
5. Save and redeploy the backend's latest deployment.
6. Sign in to FitSync with a regular account, open Home, and choose **Ask the FitSync fox**.

The same key enables **Plans → My Plan → AI formulate** in Workout and Nutrition. Deploy both updated apps to show the new buttons. For local development add the variable to `backend/.env.local` and restart the backend. No new database migration is needed for Home, chat or AI formulate.

AI formulation compares up to four eligible system-generated day drafts, then saves the selected complete draft through the normal plan storage flow. It uses up to three verified zero-priced `:free` model attempts, with no paid fallback. Only planning preferences, an adult/teen band, applicable energy reference and draft options are sent; names, email, exact age, body measurements, free-text allergy notes and private logs are omitted. Catalogue exclusions, rest days, portions and calculated targets stay under FitSync's existing rules. Failure leaves the current plan intact; **System formulate** remains available offline. A separate per-user burst limit allows four AI formulation requests per minute per server instance. See `MY_PLAN_SETUP.md` for the API and validation.

The backend discovers currently listed zero-priced `:free` models and attempts up to three in sequence. Optionally set `OPENROUTER_FREE_MODELS` to comma-separated preferred model IDs; they must still pass the free-catalog check. Model availability and free quotas depend on OpenRouter and its providers. Switching models cannot bypass an account-wide quota. Consult https://openrouter.ai/docs/api-reference/limits for current limits.

If every attempt fails, the UI reports unavailability and displays a retry time only when a provider supplies one. It does not invent a reset time. An in-memory per-user throttle shared by text chat and meal scanning limits bursts to eight requests per minute per server instance; it is not a globally durable quota.

Chat requires internet and a regular authenticated account. Messages stay in the current tab, are sent to OpenRouter/model providers, and are not stored in FitSync's database. A separate server-side model request classifies the latest question as workout, nutrition or other before answer generation. Out-of-scope requests receive a fixed redirect; unknown/malformed classifications fail closed. The answer instruction separately reinforces the boundary, including rejecting unrelated tasks disguised with a fitness pretext. These are AI-based checks, not a guarantee against every adversarial prompt or inaccurate answer. The UI includes a professional-guidance disclaimer. Configure provider privacy preferences before using real personal data.

## Scan a meal inside chat

Open **Ask the FitSync fox → Meal photo**, choose a clear JPEG/PNG/WebP food photo, optionally add ingredients or portion context, then choose **Scan meal**. Mobile file pickers may offer the camera. Original files must be under 12 MB and no more than 20 megapixels; the browser resizes to 1024 pixels and compresses to a JPEG under 1 MB. The authenticated `/api/coach/meal` endpoint enforces a 1.1 MB request limit while reading the stream, decodes the actual image, rejects unsupported/animated formats and re-encodes it to remove metadata before sending it to OpenRouter.

The scanner uses the same backend key and only currently listed zero-priced `:free` models whose input modalities include images. It sends a private base64 image through OpenRouter's Responses API, never a public image URL or storage upload. No free image-capable model means a clear unavailable message, with text chat offered instead; there is no paid fallback. Up to three attempts use 13-second timeouts each.

The model identifies catalogue food IDs and estimates edible gram ranges. Server validation rejects invented IDs, duplicate ingredients, invalid portions and extra output fields. FitSync calculates energy, protein, carbohydrate, fat and fiber ranges from the matched foods' existing USDA-backed values per 100 g. Source-linked benefit descriptions also come from the existing catalogue, not generated health claims. Unknown ingredients produce a **Partial match** label and matched-food totals only; no reliable matches produce no nutrient estimate. These are rough portion scenarios, not measured amounts or statistical confidence intervals. Photos cannot establish hidden ingredients, allergens, cross-contact or food safety. Use weighed portions and product labels when accuracy matters.

Photos are held temporarily for the request; they are not uploaded to Supabase or saved in FitSync records. The preview is removed after a successful scan, closing chat or changing account. The text result remains only in the current tab and can be discussed in follow-up questions. Nothing is added to the user's food log or plan. **New chat** clears results. OpenRouter/providers receive submitted photos and their retention policies still apply.

No database migration is needed. Deploy the updated frontend and backend. Run `node scripts/validate-coach-meals.cjs` for isolated authentication, scope checks, model parsing, catalogue arithmetic, image validation, free-only routing and shared-throttle tests; it uses mock providers and no API credits.

Technical reference: [OpenRouter image inputs](https://openrouter.ai/docs/guides/overview/multimodal/image-understanding). Food reference: [USDA FoodData Central](https://fdc.nal.usda.gov/). Portion guidance: [NIDDK food portions](https://www.niddk.nih.gov/health-information/weight-management/just-enough-food-portions).

Without a key, the rest of Home works normally and chat shows a setup/unavailability message. Saved plan summaries can be read offline after their data has been cached. Community refresh and AI responses require internet. Empty or unavailable summaries do not use fabricated example numbers.
