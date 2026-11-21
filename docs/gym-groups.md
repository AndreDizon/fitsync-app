# Gym communities

Social's fourth card, after Learn & improve, opens a gym-community workspace. It is separate from the retired location finder and old `community_posts.kind='gym'` listings. No location lookup, paid membership or business verification is implied.

## Enable the feature

Apply `backend/migrations/20261121_gym_groups.sql` in the Supabase SQL editor after the existing project migrations. The migration is rerunnable and creates tables, an authenticated RPC and account-reset cleanup. Deploy frontend and backend changes together. The frontend's existing `/api/:path*` rewrite forwards `/api/gyms`; backend authentication verifies the account session and account-data generation. A missing RPC shows an explicit setup message rather than fake successful membership.

## Membership and roles

| Role | Permissions |
| --- | --- |
| Gym admin (creator) | View roster and join code; edit name/description; promote members to staff; demote staff to members; remove members; delete the gym. |
| Staff | View the roster and join code; leave the gym. Staff is a team designation, not a verified professional qualification. |
| Gym member | View the roster and join code; leave the gym. |

The creator is the sole admin and cannot be demoted or removed. Admin transfer is not included. An admin must delete the gym to leave; members retain their personal FitSync accounts and private records. Removal is not a ban: groups are publicly joinable, so removed users can rejoin.

Each account can create or join one gym at a time. Gym names are 3–60 characters, descriptions up to 400. The authenticated directory searches names and returns six groups per page. Join directly from a listing or use its ten-character code. Groups support up to 100 members, including the admin; the database serializes capacity checks with membership writes.

## Privacy and enforcement

`gym_group_action` derives ownership from `auth.uid()` and enforces permissions in PostgreSQL. Client-supplied owner IDs and roles cannot assign the admin role. Direct table reads/writes are revoked for anon/authenticated roles, with RLS enabled. Public directory responses contain only group details and member counts; rosters and join codes require membership. Rosters expose username, member ID, role and join date, not email, birth date, health metadata, private photos, food logs or payments. Group names/descriptions are public to signed-in FitSync users; join codes are convenient identifiers, not access secrets.

Account deletion cascades membership; deleting the creator's account deletes the gym. The existing data reset removes the saved onboarding profile. A trigger handles that event in the same transaction: ordinary members leave the gym and creators disband their gym. Memberships are not auto-removed by the quarterly forum cleanup.

## Verification

Run `node scripts/validate-gym-groups.mjs` for a local PGlite/PostgreSQL audit of migration reruns, permissions, cross-gym isolation, role changes, spoofed owner fields, member limits, private roster fields, data reset and deletion cascades. No hosted data is changed. Browser checks cover card navigation, join/create, failed-join correction, directory pages, promotion/demotion, leaving/disbanding, unavailable backend state and 320–1440 px widths.
