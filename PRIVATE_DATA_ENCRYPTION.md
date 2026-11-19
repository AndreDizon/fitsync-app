# Private record encryption

FitSync now supports application-level AES-256-GCM encryption in the backend, in addition to Supabase's infrastructure encryption and HTTPS. **The hosted database is not converted by editing this repository. Complete the deployment steps below.**

## Coverage and limits

- Playlists: name, description, exercise/food entries, times, selected day and rest days.
- Weekly plans: the complete document, including workout/food entries, completion, logs and water schedule.
- Progress: measurements, wellness values, journal notes and photo captions in the payload.
- Private progress photos: JPEG bytes are encrypted before upload. Viewing uses an authenticated backend endpoint that decrypts the bytes and returns an uncached JPEG. Storage links alone cannot render encrypted files.
- Metadata remains readable: owner and record IDs, dates/week start, kind/duration, revision and timestamps. Visits and achievement identifiers remain readable. The backend needs these for ownership, pagination and concurrency.
- Supabase Auth credentials, onboarding preferences in Auth metadata, community posts/comments, notifications, device/browser offline copies and exports are **not additionally encrypted by this feature**. Existing infrastructure protection and access rules still apply. Public community content remains readable by its intended audience.
- This is **server-side application encryption, not end-to-end encryption**. The backend can decrypt records after authentication. Someone with the server's encryption keys and database access could also decrypt them.

The backend validates ordinary input before encrypting. Database ownership rules and revision checks remain in force. AES-GCM authenticates ciphertext, and its context binds each record to the owner, table, ID and revision. Separate owner keys are derived with HKDF-SHA-256. Every encryption uses a fresh random 96-bit IV. Altered or unreadable ciphertext fails closed; the app does not silently write plaintext.

## Key configuration

A random key was generated locally in ignored `backend/.env.local`. Do not put its value in Git, chat, a screenshot or a `NEXT_PUBLIC_` variable.

Set these **backend Vercel environment variables** before deploying:

| Name | Value |
| --- | --- |
| `PRIVATE_DATA_ENCRYPTION_KEYS` | JSON object containing key IDs and independent 32-byte hex keys, such as `{"v1":"<64 hex characters>"}`. Copy the actual local value without its surrounding single quotes. |
| `PRIVATE_DATA_ENCRYPTION_ACTIVE_KEY` | `v1` |

Do not reuse Gmail, Auth, service-role or webhook secrets as encryption keys. Back up the keys securely: losing a key makes its encrypted records and photos unreadable. Keep production keys separate from development keys when using separate databases. For a shared database, every backend and conversion script accessing it must have the same complete key ring.

## Deployment and conversion

1. Take a database backup and arrange a maintenance window. Pause app writes while deploying and converting; do not run an old backend against the new write requirements.
2. Set the two encryption environment variables in the backend deployment environment. Keep a secure backup of their values.
3. Run `backend/migrations/20261119_private_data_encryption.sql` in the Supabase SQL editor, after the existing playlist, plan and progress migrations. It adds encrypted columns, retains RLS and revision checks, allows legacy reads, and requires encrypted envelopes for future writes. The SQL migration is repeatable.
4. Deploy the updated backend, then the frontend for updated photo-access guidance. The existing frontend can use the same JSON API; private photo URLs now point to `/api/progress/photo?id=...` and require the signed-in session. Restart local backend processes after changing environment variables. Backend Vercel builds reject missing or invalid encryption key configuration.
5. With the matching keys, Supabase URL and service-role key in ignored `backend/.env.local`, run from the project root:

   ```powershell
   node scripts/encrypt-private-data.cjs
   ```

   This is a dry run. It reports counts without printing private content. It downloads photos to memory to identify their format; it does not change records or files.

6. To encrypt existing rows and photos, run:

   ```powershell
   node scripts/encrypt-private-data.cjs --apply
   ```

   The script replaces sensitive plaintext fields with placeholders and stores encrypted envelopes. It increments record revisions and uses optimistic concurrency checks. Photo content is replaced at the same private storage path. Stop writes during conversion; the Storage API does not offer the same row revision checks. On interruption, keep all keys and rerun. Missing files or other failures stop the conversion rather than claiming success.

7. Rerun the dry run; all candidate counts should be zero. Test create, edit, reload, analytics, CSV export, photo viewing and account deletion with a disposable account. Existing local pending changes may need conflict resolution because conversion advances revisions.
8. Reopen Progress or refresh its data so any previously returned photo links are replaced. Resume normal use only after verification.

Old backups, existing downloaded exports and older storage versions may still contain the original plaintext. Handle their retention separately. Conversion does not erase every historical copy.

## Rotation

Add a new independently generated key under a new ID, for example `v2`, while retaining `v1`. Set the active ID to `v2` and redeploy. Old ciphertext remains readable using its embedded key ID. In a maintenance window, run the conversion script with `--rotate`, first as a dry run and then with `--apply --rotate`. Verify all rows/photos and backup requirements before considering removal of an old key.

## Verification

```powershell
node scripts/check-private-data-encryption.cjs
npm.cmd run typecheck --workspace backend
```

The isolated tests use fake transports and local PostgreSQL through PGlite. They do not access a live project. They check cryptographic round trips, random IVs, tampering, wrong owners/record revisions, key rotation, missing-key rejection, transport behavior, migration repeatability, conversion and preserved database ownership rules.
