import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { authenticate } from '../../../lib/auth'
import { readPlaylistBody } from '../../../lib/playlist-body'

export const maxDuration = 60
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })

/** Delete through Storage's API, never by deleting storage.objects rows. */
async function removeUserImages(client: SupabaseClient, bucket: string, owner: string) {
  // Upload routes create flat, user-prefixed paths. Delete each page before
  // requesting the next, so removals cannot cause offset pagination to skip files.
  for (let batch = 0; batch < 1000; batch++) {
    const result = await client.storage.from(bucket).list(owner, { limit: 100, sortBy: { column: 'name', order: 'asc' } })
    if (result.error) throw new Error('storage')
    if (!result.data.length) return
    if (result.data.some(file => !file.id || file.name.includes('/'))) throw new Error('unexpected storage folder')
    const removed = await client.storage.from(bucket).remove(result.data.map(file => owner + '/' + file.name))
    if (removed.error) throw new Error('storage')
  }
  throw new Error('storage limit')
}

export async function POST(request: Request) {
  const auth = await authenticate(request)
  if (auth.response) return auth.response
  if (!request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'Invalid request.' }, 415)
  const parsed = await readPlaylistBody(request)
  if (parsed.response) return parsed.response
  const body = parsed.value as { operation?: unknown; confirmation?: unknown; password?: unknown } | null
  if (!body || !['reset', 'delete'].includes(String(body.operation)) || body.confirmation !== (body.operation === 'delete' ? 'DELETE ACCOUNT' : 'DELETE DATA')) return json({ error: 'Check the confirmation phrase.' }, 400)
  if (typeof body.password !== 'string' || !body.password || body.password.length > 128) return json({ error: 'Enter your current FitSync password.' }, 400)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !publicKey || !serviceKey) return json({ error: 'Account deletion is not configured yet. Contact support.' }, 503)
  const user = auth.user!
  if (!user.email || !user.email_confirmed_at) return json({ error: 'Confirm your account email before continuing.' }, 403)
  // A separate non-persistent client verifies the password without replacing the
  // caller's session. Supabase enforces its configured authentication rate limits.
  const verifier = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const checked = await verifier.auth.signInWithPassword({ email: user.email, password: body.password })
  if (checked.error || checked.data.user?.id !== user.id) return json({ error: 'Could not verify your password. Try again, or use email recovery first.' }, 403)
  await verifier.auth.signOut({ scope: 'local' })
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  let locked = false
  try {
    const lock = await admin.rpc('begin_fitsync_data_operation', { owner_id: user.id })
    if (lock.error) throw new Error('lock')
    if (lock.data !== true) return json({ error: 'An account operation is already in progress. Please wait and retry.' }, 409)
    locked = true
    await removeUserImages(admin, 'progress-photos', user.id)
    await removeUserImages(admin, 'community-images', user.id)
    if (body.operation === 'reset') {
      const reset = await admin.rpc('reset_fitsync_data', { owner_id: user.id })
      if (reset.error) throw new Error('database')
      const unlock = await admin.auth.admin.updateUserById(user.id, { app_metadata: { fitsync_data_resetting_until: 0 } })
      if (unlock.error) throw new Error('unlock')
      locked = false
    } else {
      // Existing tables reference auth.users with ON DELETE CASCADE.
      const deleted = await admin.auth.admin.deleteUser(user.id)
      if (deleted.error) throw new Error('account')
      locked = false
      await admin.from('community_image_cleanup').delete().like('path', user.id + '/%')
    }
    return json({ operation: body.operation })
  } catch {
    // Storage and Auth are separate services, so failure cannot be rolled back
    // atomically. Never claim success after only part of the operation completed.
    return json({ error: 'Deletion did not finish. Some files may already be removed. Keep this page open and retry; contact support if it continues.' }, 503)
  } finally {
    if (locked) await admin.auth.admin.updateUserById(user.id, { app_metadata: { fitsync_data_resetting_until: 0 } })
  }
}
