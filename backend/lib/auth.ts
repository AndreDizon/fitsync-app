import { needsAccountSetup } from '../../shared/account-security'
import { createClient } from '@supabase/supabase-js'
import { privateDataFetch } from './private-data'

export async function authenticate(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1]
  if (!token) return { response: Response.json({ error: 'Authentication required' }, { status: 401 }) }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return { response: Response.json({ error: 'Service unavailable' }, { status: 503 }) }
  const client = createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } })
  let checked: Awaited<ReturnType<typeof client.auth.getUser>>
  try { checked = await client.auth.getUser(token) }
  catch { return { response: Response.json({ error: 'The sign-in service is temporarily unreachable. Retry shortly; your saved records are kept.' }, { status: 503 }) } }
  const { data: { user }, error } = checked
  if (error && (error.name === 'AuthRetryableFetchError' || error.status === 0 || (error.status ?? 0) >= 500)) return { response: Response.json({ error: 'The sign-in service is temporarily unreachable. Retry shortly; your saved records are kept.' }, { status: 503 }) }
  if (error || !user) return { response: Response.json({ error: 'Invalid or expired session' }, { status: 401 }) }
  if (!user.email_confirmed_at) return { response: Response.json({ error: 'Confirm your account email before continuing.' }, { status: 403 }) }
  if (needsAccountSetup(user)) return { response: Response.json({ error: 'Complete your account setup first.' }, { status: 403 }) }
  // getUser verified the token above. Compare its data generation with current
  // server-owned metadata so another device cannot sync pre-reset records back.
  try {
    const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
    if (Number(claims.app_metadata?.fitsync_data_epoch || 0) !== Number(user.app_metadata.fitsync_data_epoch || 0)) return { response: Response.json({ error: 'Your account data was reset. Reload FitSync before continuing.' }, { status: 409 }) }
  } catch { return { response: Response.json({ error: 'Invalid session' }, { status: 401 }) } }
  if (Number(user.app_metadata.fitsync_data_resetting_until) > Date.now()) return { response: Response.json({ error: 'An account data operation is in progress. Try again shortly.' }, { status: 409 }) }
  const privateClient = createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` }, fetch: privateDataFetch(user.id) }, auth: { persistSession: false, autoRefreshToken: false } })
  return { client: privateClient, user }
}
