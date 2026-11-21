# Questionnaire V3 - Researcher notes

## Framework and use

This is a project-specific draft evaluation instrument, not an ISO certification or a validated questionnaire. It preserves the source questionnaire's eight categories and four-point agreement scale. It explicitly identifies ISO/IEC 25010:2011 because that edition uses the eight-category product-quality model. A newer edition exists; do not describe this instrument as using the latest edition. Confirm the intended edition, revised statements and scoring with the capstone adviser before distribution.

Primary reference: https://www.iso.org/standard/35733.html

## Changes from the supplied V2 PDF

- Replaced AI/SDK-based plan formulation claims with evaluation of the implemented rule-based daily planner. OpenRouter is evaluated separately as optional conversational AI.
- Removed automatic workout-load/rest adjustment based on RPE. Wellness check-ins record perceived effort; they do not establish that automatic adaptation exists.
- Removed gym locator, GPS, walking directions, Leaflet/map integration and camera-based food recognition from evaluated scope. Private progress-photo uploads remain included; they do not scan food or analyze body composition.
- Replaced Word progress-log/playlist export claims with the implemented CSV export from Record history.
- Replaced guaranteed AI fallback schedules with independent rule-based planning and clear AI-service errors.
- Limited offline evaluation to previously saved/downloaded content. Private photo access, journal writes and community publishing are not promised offline.
- Replaced blanket claims of legal compliance or guaranteed prompt-injection prevention with observable access checks, backend validation and implementation review.
- Specified the encryption scope: private plan/playlist contents, progress payloads and private photo files. This does not claim every database field or browser copy is additionally encrypted.
- Added a non-scored Not observed response so experts are not forced to rate untested controls.
- Replaced many bundled implementation-name statements with task-oriented indicators. The revised version has 32 indicators, four per category, rather than retaining the original uneven item counts.

## Suggested demonstration evidence

1. Create a disposable account, verify its email and complete onboarding. Demonstrate recovery with an expiring code without exposing credentials.
2. Generate a workout schedule from the selected start time; edit and reorder exercises without moving the time slots. Log task completion and water intake.
3. Create one-day and one-week workout/nutrition playlists. Test filters and portion calculations in the reference libraries.
4. Change Analytics and Documentation periods, review charts, paginate history and export matching records as CSV.
5. Upload and view a private progress photo. Show photo sorting/pagination. Review saved check-ins and measurement entries.
6. Demonstrate achievement progress, claiming and share-card export; verify the exported image.
7. Open the actual forum and people-introduction sections. Preview mockups are illustrative content, not evidence of successful posting. Use a second disposable account to check comments/hearts and related notifications where included in the test.
8. Demonstrate reminder preferences, an eligible due reminder and its removal after completion. Explain browser/device delivery limits.
9. Review code/configuration and controlled tests for owner isolation, authenticated photo retrieval, encryption, tamper rejection and server-held keys. Do not provide real secrets to evaluators.
10. Test network interruption/reconnection and unavailable AI chat independently. Document device, browser, network and any conditions that could not be tested.

Use only disposable accounts for data clearing and account-deletion demonstrations. Do not run destructive tests against a researcher's real account.

## Scoring

Preserved proposed mean bands from V2: 3.26-4.00 Highly Acceptable; 2.51-3.25 Acceptable; 1.76-2.50 Fairly Acceptable; 1.00-1.75 Not Acceptable. The research team should confirm its rounding and aggregation method with its adviser. Exclude NO and blanks rather than treating them as zero. Report valid response counts and missing/not-observed responses. Agreement scores alone do not prove security, performance or regulatory compliance.

## Rebuilding

`build-questionnaire.cjs` creates the PDF, editable DOCX and Markdown from `questionnaire-v3.json`. It uses temporary document-generation dependencies (pdfkit and docx), without changing FitSync's application dependencies. Set `FITSYNC_DOCUMENT_MODULES` to a node_modules directory containing those packages if necessary.
