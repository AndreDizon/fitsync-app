import { createClient } from '@supabase/supabase-js'
import { parseEnv } from 'node:util'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
export function validateDemoOptions(options) {
  if (!options.url || !options.adminKey) throw new Error('Configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) in backend/.env.local, then rerun npm run seed:demo. Never put the secret key in frontend files or chat.')
  const url = new URL(options.url)
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash || url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) throw new Error('Use a valid HTTPS Supabase project origin, or a local Supabase origin.')
  let legacyRole
  try { legacyRole = JSON.parse(Buffer.from(options.adminKey.split('.')[1], 'base64url').toString()).role } catch {}
  if (!options.adminKey.startsWith('sb_secret_') && legacyRole !== 'service_role') throw new Error('A server-side Supabase secret/service-role key is required. A public publishable/anon key cannot create confirmed demo accounts.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(options.email)) throw new Error('Use a valid demo email address.')
  if (typeof options.password !== 'string' || options.password.length < 12 || options.password.length > 128) throw new Error('Demo passwords must follow the app’s 12–128 character rule.')
}
export async function createDemoUser(options, factory = createClient) {
  validateDemoOptions(options)
  const authOptions = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  const admin = factory(options.url, options.adminKey, authOptions)
  const { data, error } = await admin.auth.admin.createUser({ email: options.email, password: options.password, email_confirm: true, user_metadata: { display_name: 'Demo', fitsync_demo: true } })
  if (error) {
    if (['email_exists', 'user_already_exists'].includes(error.code) || /already.*(registered|exists)/i.test(error.message)) throw new Error('That demo email already exists. Its password and data were left unchanged. Use another DEMO_USER_EMAIL or reset its password through Supabase.')
    throw new Error(`Supabase could not create the demo account (${error.code || error.status || 'request failed'}). Check the project credentials and password policy.`)
  }
  if (!data?.user?.id) throw new Error('Supabase did not return a created user. Check Authentication → Users before retrying.')
  let verified = false
  if (options.publicKey) {
    const client = factory(options.url, options.publicKey, authOptions)
    const login = await client.auth.signInWithPassword({ email: options.email, password: options.password })
    verified = !login.error && login.data.user?.id === data.user.id
    if (login.data.session) await client.auth.signOut({ scope: 'local' })
  }
  return { id: data.user.id, email: data.user.email, verified }
}
async function main() {
  const env = { ...process.env }
  for (const relative of ['backend/.env.local', '.env.local']) {
    try { const parsed = parseEnv(await readFile(resolve(root, relative), 'utf8')); for (const [key, value] of Object.entries(parsed)) if (!env[key]) env[key] = value } catch (error) { if (error.code !== 'ENOENT') throw error }
  }
  // Only public connection settings may be read from the browser application's file.
  try { const parsed = parseEnv(await readFile(resolve(root, 'frontend/.env.local'), 'utf8')); for (const key of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']) if (!env[key]) env[key] = parsed[key] } catch (error) { if (error.code !== 'ENOENT') throw error }
  const options = { url: env.NEXT_PUBLIC_SUPABASE_URL, adminKey: env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY, publicKey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY, email: env.DEMO_USER_EMAIL || 'demo@fit.test', password: env.DEMO_USER_PASSWORD || 'Demo1234567!' }
  const result = await createDemoUser(options)
  await mkdir(resolve(root, 'logs'), { recursive: true })
  await writeFile(resolve(root, 'logs/demo-credentials.json'), JSON.stringify({ email: result.email, password: options.password, userId: result.id }, null, 2) + '\n', { mode: 0o600 })
  console.log(`Demo account created in Supabase Auth.\nEmail: ${result.email}\nPassword: ${options.password}\n${result.verified ? 'Email/password login verified.' : 'Login not verified; configure the public Supabase key in both apps to sign in.'}\nThis is a regular user. Complete onboarding after signing in. Playlist storage also requires its database migration.`)
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1 })
