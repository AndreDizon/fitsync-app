# FitSync IT Expert Technical Evaluation

FitSync: An AI-Driven Platform for Smarter Workout and Nutrition Planning

Version 3 | Revised to match the evaluated prototype

Adapted from the eight product-quality characteristics of ISO/IEC 25010:2011

## Purpose and consent

We invite you to evaluate FitSync after a guided demonstration, hands-on testing and review of relevant technical evidence. Participation is voluntary. You may leave an item unanswered or stop participating. Evaluator information will be used for this academic study and handled confidentially by the research team. Signing below indicates your agreement to participate.

## Evaluated scope

Onboarding; rule-based workout and nutrition planning; one-day and one-week playlists; exercise and food libraries; task and water logging; analytics; measurements and wellness check-ins; private photo timeline; achievements and share cards; forum and people introductions; reminders; account security; optional AI chat. Gym location search, GPS/directions and camera-based food scanning are excluded.

## How to answer

Rate each statement using the evidence you observed. Use NO (Not observed) if a feature was not tested or technical evidence was unavailable. Do not assume a capability works because a technology is listed. NO and blank responses are excluded from the mean; report how many ratings were received per item.

## Evidence for technical items

Access rules, encryption, key handling, maintainability and deployment require code/configuration review or controlled tests. Visual inspection alone is insufficient. Test private-data isolation with two disposable accounts. Keep real credentials and personal records out of the evaluation.

## Evaluator profile

Name/title (optional): __________  Date: __________

Role: __________  Years of IT experience: ____  Consent signature: __________

Test device/browser: __________

## Rating scale

| Rating | Response | Mean range | Interpretation |
|---|---|---|---|
| 4 | Strongly Agree | 3.26-4.00 | Highly Acceptable |
| 3 | Agree | 2.51-3.25 | Acceptable |
| 2 | Disagree | 1.76-2.50 | Fairly Acceptable |
| 1 | Strongly Disagree | 1.00-1.75 | Not Acceptable |
| NO | Not observed | Not scored | Insufficient evidence |

## 1. Functional Suitability

Completeness, correctness and appropriateness

| Technical indicator | 4 | 3 | 2 | 1 | NO |
|---|---|---|---|---|---|
| 1.1 The daily workout planner uses the selected training days, start time, session length, equipment and movement preferences when preparing an editable schedule. | | | | | |
| 1.2 Food calorie and nutrient totals update consistently when the user changes a food portion or marks a scheduled food entry as completed. | | | | | |
| 1.3 Users can create, edit and save one-day or one-week workout and nutrition playlists, then apply them to their daily schedule. | | | | | |
| 1.4 Analytics and achievement progress reflect saved activity records, while measurements, check-ins and photos appear within the selected Documentation period. | | | | | |

Evidence / recommendations: __________________________________

## 2. Performance Efficiency

Response time, resource use and capacity

| Technical indicator | 4 | 3 | 2 | 1 | NO |
|---|---|---|---|---|---|
| 2.1 Pages and controls respond within a reasonable time during the demonstrated tasks on the stated test device and network. | | | | | |
| 2.2 Optimized images and cached artwork load without preventing users from reading or interacting with the page. | | | | | |
| 2.3 Pagination or bounded scrolling keeps long record histories, photo timelines and analytics views manageable as more records are displayed. | | | | | |
| 2.4 Saving records and processing photo uploads provide timely feedback without unnecessarily blocking unrelated page controls. | | | | | |

Evidence / recommendations: __________________________________

## 3. Compatibility

Coexistence and interoperability

| Technical indicator | 4 | 3 | 2 | 1 | NO |
|---|---|---|---|---|---|
| 3.1 The frontend and backend exchange records with Supabase authentication, database and storage services without observable data mismatches in the tested workflows. | | | | | |
| 3.2 FitSync confirmation and password-recovery emails delivered through the Gmail API support successful code verification in the application. | | | | | |
| 3.3 The optional AI chat exchanges messages through OpenRouter and displays responses correctly in the application. | | | | | |
| 3.4 CSV exports from Record history preserve the selected records and readable values when opened in a compatible spreadsheet application. | | | | | |

Evidence / recommendations: __________________________________

## 4. Usability

Learnability, operation, error protection and presentation

| Technical indicator | 4 | 3 | 2 | 1 | NO |
|---|---|---|---|---|---|
| 4.1 Navigation labels and page headings make Home, Plans, Social, Progress and Settings easy to find and understand. | | | | | |
| 4.2 Forms identify required inputs and show clear messages that help users correct invalid values or unsuccessful actions. | | | | | |
| 4.3 Responsive layouts keep text, controls and essential card content readable and usable on the tested desktop and mobile screen sizes. | | | | | |
| 4.4 Selected filters, task completion states, sync information and reminder settings are visually clear and understandable. | | | | | |

Evidence / recommendations: __________________________________

## 5. Reliability

Availability, fault handling and recovery

| Technical indicator | 4 | 3 | 2 | 1 | NO |
|---|---|---|---|---|---|
| 5.1 Previously saved plans, playlists and downloaded reference libraries remain accessible during the tested network interruption, within the documented offline limits. | | | | | |
| 5.2 Failed or interrupted saves show an accurate status and a recovery or retry option instead of falsely reporting success. | | | | | |
| 5.3 After reconnecting, pending plan or playlist changes can be synchronized, and conflicting versions are identified for resolution. | | | | | |
| 5.4 If the AI chat service is unavailable or rate-limited, the application explains the failure while rule-based planning remains usable independently of AI chat. | | | | | |

Evidence / recommendations: __________________________________

## 6. Security

Confidentiality, integrity and authentication

| Technical indicator | 4 | 3 | 2 | 1 | NO |
|---|---|---|---|---|---|
| 6.1 Protected pages and backend operations reject unauthenticated access, and one signed-in user cannot read or change another user's private records in the tested access checks. | | | | | |
| 6.2 The reviewed implementation encrypts private plan and playlist contents, progress payloads and photo files using AES-256-GCM, with server-held keys derived per owner using HKDF-SHA-256. | | | | | |
| 6.3 Account confirmation and recovery require valid verification codes; recovery authorization expires and becomes unusable after a successful password change. | | | | | |
| 6.4 Backend validation rejects invalid or unauthorized requests without exposing private records, encryption keys or service credentials in browser responses. | | | | | |

Evidence / recommendations: __________________________________

## 7. Maintainability

Modularity, analysis, modification and testing

| Technical indicator | 4 | 3 | 2 | 1 | NO |
|---|---|---|---|---|---|
| 7.1 The reviewed code separates interface components, backend routes and shared planning rules clearly enough to locate and modify a feature. | | | | | |
| 7.2 Shared TypeScript types and validation rules help keep frontend, backend and stored data formats consistent during changes. | | | | | |
| 7.3 Documented catalog import or seed processes allow exercise and food reference content to be updated without rewriting the overall application structure. | | | | | |
| 7.4 The supplied checks, migration files and setup documentation support testing and troubleshooting changes to planning, authentication and encrypted storage. | | | | | |

Evidence / recommendations: __________________________________

## 8. Portability

Adaptability and deployment

| Technical indicator | 4 | 3 | 2 | 1 | NO |
|---|---|---|---|---|---|
| 8.1 Core application workflows operate consistently in the tested modern desktop and mobile browsers. | | | | | |
| 8.2 The interface adapts to changes in screen size and orientation without hiding essential controls or requiring unintended horizontal page scrolling. | | | | | |
| 8.3 The documented setup allows the frontend and backend to run locally and deploy to Vercel using environment-specific configuration. | | | | | |
| 8.4 Browser-dependent features, such as device notifications and native sharing, provide understandable alternatives or limitations when unsupported or not permitted. | | | | | |

Evidence / recommendations: __________________________________
