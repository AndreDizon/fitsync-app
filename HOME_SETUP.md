# Home dashboard and fitness chat

The Home body summarizes the signed-in user's saved daily plan, water log, playlists, progress journal, achievements and community sections. Each shortcut opens its matching page and tab. Water opens the existing Plans water tracker. Library totals come from the bundled catalogs. Existing hero artwork is preserved.

Fitness tip cards turn over to show educational descriptions and source links. These are informational, not personalized recommendations.

## Enable the optional chatbot

1. Create an account at https://openrouter.ai/ and sign in.
2. Open https://openrouter.ai/settings/keys and create an API key for FitSync.
3. In Vercel, open **fitsync-backend → Settings → Environment Variables**.
4. Add `OPENROUTER_API_KEY` with that key as a **Secret**, selecting Production (and Preview if needed). Keep it out of frontend variables and Git.
5. Save and redeploy the backend's latest deployment.
6. Sign in to FitSync with a regular account, open Home, and choose **Ask the FitSync fox**.

For local development add the same variable to `backend/.env.local` and restart the backend. No new database migration is needed for Home or chat.

The backend discovers currently listed zero-priced `:free` models and attempts up to five in sequence. Optionally set `OPENROUTER_FREE_MODELS` to comma-separated preferred model IDs; they must still pass the free-catalog check. Model availability and free quotas depend on OpenRouter and its providers. Switching models cannot bypass an account-wide quota. Consult https://openrouter.ai/docs/api-reference/limits for current limits.

If every attempt fails, the UI reports unavailability and displays a retry time only when a provider supplies one. It does not invent a reset time. An in-memory per-user throttle limits bursts to eight requests per minute per server instance; it is not a globally durable quota.

Chat requires internet and a regular authenticated account. Messages stay in the current tab, are sent to OpenRouter/model providers, and are not stored in FitSync's database. The assistant is instructed to stay within fitness/nutrition and related recovery topics; model output can still be imperfect. The UI includes a professional-guidance disclaimer. Configure provider privacy preferences before using real personal data.

Without a key, the rest of Home works normally and chat shows a setup/unavailability message. Saved plan summaries can be read offline after their data has been cached. Community refresh and AI responses require internet. Empty or unavailable summaries do not use fabricated example numbers.
