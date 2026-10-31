import { createClient } from '@supabase/supabase-js'

export async function authenticate(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1]
  if (!token) return { response: Response.json({ error: 'Authentication required' }, { status: 401 }) }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return { response: Response.json({ error: 'Service unavailable' }, { status: 503 }) }
  const client = createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } })
  const { data: { user }, error } = await client.auth.getUser(token)
  if (error || !user) return { response: Response.json({ error: 'Invalid or expired session' }, { status: 401 }) }
  return { client, user }
}
