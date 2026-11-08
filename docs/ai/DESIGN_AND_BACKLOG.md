# Design rules and known gaps

## Preserve the established design

One default theme: Fox Energy, vibrant daytime yellow/white/black with warm cream/orange fades and restrained supporting colors. Reuse `Wordmark` for outlined italic FitSync text; keep its thicker outline. Do not reintroduce theme choices without request.

- Canvas is subtly warm off-white (lightened toward #FAF8F3), not strongly beige. Header is glossy white; hamburger/account button have coordinated size/style.
- Hero backgrounds are edge-bleed yellow grids/orange fade. Home/Plans/Social top offsets and vertical treatment should align responsively; keep mascots/earth readable and deliberately layered.
- Plans changes dumbbell/apple mascot; minimal flowing line art. User removed unwanted dots/half-circle outlines behind mascot.
- Folder nav: continuous fills, rounded/slanted edges, no mismatched seams/gaps/double overlays, no shrinking press animation, does not span all the way right. This was revised many times; inspect before touching.
- Bottom nav central Play has connected arch/border, oblong page choices, active label, hide-on-scroll behavior. Avoid disconnected circle border and excessive spacing.
- Footer is compact, angled yellow backdrop with off-white contact-focused panel and fox accents; little excess blank/yellow space. Contact page is future work.
- Auth has separate custom mobile layout below768px and desktop split layout at768px+. Preserve that exception; do not scale desktop auth onto phones.
- Decorative browser bar on desktop mascot panel is dark; mobile indicator is light. Sparkles filled white, varied shapes/sizes up to five. Reuse actual assets instead of replacing mascot arbitrarily.
- Opening splash is three seconds, no skip. Onboarding mascot/question bubble and body focus map are existing features.
- Progress uses Analytics/Documentation/Achievements. Body measurements and Energy/recovery explicitly belong to Documentation. Analytics has summary/habits/goal outlook; achievements groups habits and completed work.

## Known incomplete functionality

| Area | Current limitation |
| --- | --- |
| Home | Fixed date/sample streak/calorie/movement/examples; toggles not canonical My Plan |
| Social | Hardcoded community count/people/gyms, in-memory preview posts, partial writes, preview like IDs |
| Settings | Some inert edit/notification/offline/export/delete controls |
| Contact | Footer coming soon only |
| Preparation animation | Copy says generation will be connected next although daily formulation exists |
| Offline relaunch | No complete cached private app shell or offline login |
| Journal/photos | Writes online only |

Further considerations:

1. Use canonical plan/progress data when wiring Home; do not create another independent tracker.
2. Social needs schema/RLS and real fetch/pagination/update/delete/IDs before being called integrated. GPS display is not a location service; connect/comments are previews.
3. Weight logs do not silently rewrite onboarding. Profile changes do not retroactively regenerate schedules.
4. Progress awards are personal self-tracking, not tamper-proof rewards. Owner policies permit award inserts. Strong scoring needs privileged eligibility enforcement.
5. Totals derive from current historical plans, not immutable completion events; replacement/unmarking can change them. Already earned awards persist.
6. History limit is1000 per type. Full lifetime reporting needs pagination/aggregation.
7. Delete-account must remove photo blobs before deleting Auth row; DB cascade only deletes records.
8. Photo upload lacks body/wellness's stable-client-UUID retry mechanism; consider ambiguous failure duplicate risk before automatic retry.
9. Private browser caches are not encrypted vaults. Preserve isolation, cleanup and sync warnings.
10. Encoding mistakes previously created visible '?' separators. Inspect actual UTF-8 source, since PowerShell display itself may misrender valid characters. Do not replace real question marks or syntax ternaries.
11. Existing ignored browser fixtures may need updates for three-tab Progress UI. Committed validators are the durable baseline.

## Implementation discipline

Read shared type/parser, API, SQL and cache layers before changing private data contracts. Preserve revisions, UUID retry behavior, owner checks, epoch guards and explicit conflict resolution. Regenerate catalog assets/SQL allowlists together and retain provenance. Use native/editable accessible controls, focus management, keyboard tabs and reduced motion. Test small screens without hiding necessary content.

Catalogs stay informational. Reuse full details in pickers, freeze thumbnails until play, retain preparation states and gram-backed portions, avoid invented source values. Planning and forecast heuristics do not promise medical outcomes, precise body-fat loss or muscle gain. Coach AI and deterministic planner are separate features.

Suggested priorities (not additional authorization): live real-account plan-to-progress smoke test; canonical Home metrics; preparation-copy cleanup; real Social schema; contact/export/delete-account flows; committed responsive tab UI checks. Do not implement these solely because this document lists them.
