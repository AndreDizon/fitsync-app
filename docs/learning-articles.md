# Social learning collection

Replaces Gyms & facilities. The overview displays three educational links at a time, with topic and expertise-level filters, reset controls and bottom pagination. Seventeen articles are maintained in `frontend/lib/learning-articles.ts`. Links open on the original publisher's site; full articles are not copied or fetched by FitSync.

Topics: workout, nutrition and recovery. Beginner, intermediate and advanced describe familiarity with the topic: foundations, applying the basics and deeper guidance. These are FitSync editorial labels, not credentials or publisher classifications. Selecting Workout defaults to the saved onboarding training experience when available; users can override it. Nutrition and Recovery never infer expertise from training experience. Each topic retains its selected level while this component remains open. Clear filters resets all selections. These browsing suggestions are not a personal training prescription. Content is accessible without signing in. Source links checked November 21, 2026.

The location finder and map component are removed. Nearby-search and directions endpoints return HTTP 410 without requesting location data or contacting mapping services. The Social API rejects new/edited gym listings. Existing database records remain untouched, and legacy gym navigation returns to the Social overview. Forum and introductions retain their own filters, posting and interactions.

Maintain links by checking the publisher, page subject, current URL and suitability before editing the collection. Sources currently include CDC, WHO, ACSM, the American Heart Association, the U.S. FDA NIH Office of Dietary Supplements, NIH NHLBI, NIDDK, NHS, NSCA and the National Academies. These links do not imply endorsement of FitSync.

The collection has six pages without filters (three cards per page, two on the final page), adding three pages to the original collection. New topics include teen movement/nutrition, flexibility, calcium, sleep stages and habits, training frequency and energy equations. Compact cards use 16px padding, 18px titles and a shared footer row for publisher and link; links retain 44px minimum touch height.

Card minimum height is measured from the tallest natural article across the full collection at the current column width, then shared across pages and filters. Width and font changes trigger a new measurement. Content is never clipped; footer links align to the bottom edge even when publisher names wrap.
