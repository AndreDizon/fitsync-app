/* Isolated security regression tests. Never connects to a hosted project. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { buildSync } = require('esbuild')
const { PGlite } = require('@electric-sql/pglite')

function bundle(entry, overrides = {}) {
  const out = buildSync({ entryPoints: [path.resolve(entry)], bundle: true, platform: 'node', format: 'cjs', write: false, plugins: undefined,
    external: ['server-only', 'next/headers', 'next/navigation', 'next/cache', '@supabase/supabase-js', '@supabase/ssr'],
  }).outputFiles[0].text
  const mod = { exports: {} }
  const localRequire = name => {
    if (name === 'server-only') return {}
    if (name in overrides) return overrides[name]
    return require(name)
  }
  new Function('require', 'module', 'exports', out)(localRequire, mod, mod.exports)
  return mod.exports
}

async function databaseTests() {
  const db = new PGlite()
  const owner = '00000000-0000-4000-8000-000000000001', other = '00000000-0000-4000-8000-000000000002'
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; grant usage on schema auth to authenticated,service_role;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
    create table auth.users(id uuid primary key,encrypted_password text,email_confirmed_at timestamptz,raw_user_meta_data jsonb,raw_app_meta_data jsonb);
    insert into auth.users values('${owner}','hash',now(),'{"fitsync_onboarding":{"completed":true}}','{}'),('${other}','hash',now(),'{}','{}');`)
  const tables = ['user_notifications', 'community_comments', 'community_hearts', 'community_posts', 'community_daily_usage', 'progress_entries', 'progress_visits', 'progress_awards', 'daily_plan_weeks', 'plan_playlists']
  for (const table of tables) await db.exec(`create table public.${table}(user_id uuid references auth.users on delete cascade);insert into public.${table} values('${owner}'),('${other}');`)
  await db.exec(`create table public.community_image_cleanup(path text primary key);insert into public.community_image_cleanup values('${owner}/photo.jpg'),('${other}/photo.jpg');`)
  const migration = fs.readFileSync('backend/migrations/20261118_account_security.sql', 'utf8')
  await db.exec(migration)
  await db.exec(migration) // Explicitly verify repeatability.
  const setupMigration = fs.readFileSync('backend/migrations/20261119_account_setup_status.sql', 'utf8')
  await db.exec(setupMigration)
  await db.exec(setupMigration)
  await db.exec('set role anon;')
  await assert.rejects(db.query('select public.fitsync_has_password()'), /permission denied/)
  await db.exec('reset role;')
  await db.exec(`select set_config('test.uid','${owner}',false);set role authenticated;`)
  assert.equal((await db.query('select public.fitsync_has_password() as ready')).rows[0].ready, true)
  await db.exec(`reset role;update auth.users set encrypted_password='' where id='${owner}';set role authenticated;`)
  assert.equal((await db.query('select public.fitsync_has_password() as ready')).rows[0].ready, false)
  await assert.rejects(db.query('select public.complete_fitsync_registration($1)', ['member.one']), /set a FitSync password/)
  await db.exec(`reset role;update auth.users set encrypted_password='hash' where id='${owner}';set role authenticated;`)
  await assert.rejects(db.query('select public.reset_fitsync_data($1)', [other]), /permission denied/)
  await assert.rejects(db.query('select public.begin_fitsync_data_operation($1)', [other]), /permission denied/)
  await assert.rejects(db.query('select public.complete_fitsync_registration($1)', ['invalid name']), /Invalid username/)
  await db.query('select public.complete_fitsync_registration($1)', ['member.one'])
  const grant = '00000000-0000-4000-8000-000000000003', until = new Date(Date.now() + 600000).toISOString()
  assert.equal((await db.query('select public.consume_fitsync_recovery($1,$2) as ok', [grant, until])).rows[0].ok, true)
  assert.equal((await db.query('select public.consume_fitsync_recovery($1,$2) as ok', [grant, until])).rows[0].ok, false)
  assert.equal((await db.query('select public.consume_fitsync_recovery($1,now()-interval \'1 second\') as ok', [other])).rows[0].ok, false)
  await db.exec('reset role;set role service_role;')
  assert.equal((await db.query('select public.begin_fitsync_data_operation($1) as ok', [owner])).rows[0].ok, true)
  assert.equal((await db.query('select public.begin_fitsync_data_operation($1) as ok', [owner])).rows[0].ok, false)
  await db.query('select public.reset_fitsync_data($1)', [owner])
  await db.exec('reset role;')
  for (const table of tables) assert.deepEqual((await db.query(`select user_id from ${table}`)).rows.map(row => row.user_id), [other], table)
  const user = (await db.query('select * from auth.users where id=$1', [owner])).rows[0]
  assert.equal(user.encrypted_password, 'hash')
  assert.equal(user.raw_user_meta_data.username, 'member.one')
  assert.equal(user.raw_user_meta_data.fitsync_onboarding, undefined)
  assert.equal(user.raw_app_meta_data.fitsync_credentials_ready, true)
  assert(user.raw_app_meta_data.fitsync_data_epoch > 0)
  assert.equal((await db.query('select count(*)::int as count from used_password_recoveries')).rows[0].count, 1)
  assert.deepEqual((await db.query('select path from community_image_cleanup')).rows, [{ path: other + '/photo.jpg' }])
  await db.close()
  console.log('PASS SQL permissions, registration, one-use recovery, operation lock, isolated reset, preserved credentials and rerunnable migration')
}

async function cookieTests() {
  const jar = new Map()
  process.env.AUTH_FLOW_SECRET = 'fixture-secret-that-is-at-least-32-characters'
  const recovery = bundle('frontend/lib/auth/recovery.ts', { 'next/headers': { cookies: async () => ({ get: key => jar.get(key), set: (key, value, options) => jar.set(key, { value, options }) }) } })
  await recovery.grantRecovery('owner', 'verified-token')
  assert(await recovery.hasRecovery('owner', 'verified-token'))
  assert.equal(await recovery.hasRecovery('other', 'verified-token'), false)
  assert.equal(await recovery.hasRecovery('owner', 'other-token'), false)
  const cookie = jar.get(recovery.recoveryCookie)
  assert.equal(cookie.options.httpOnly, true)
  assert.equal(cookie.options.maxAge, 900)
  jar.set(recovery.recoveryCookie, { value: cookie.value + 'tampered' })
  assert.equal(await recovery.hasRecovery('owner', 'verified-token'), false)
  jar.set(recovery.recoveryCookie, cookie)
  const now = Date.now
  try { Date.now = () => now() + 901000; assert.equal(await recovery.hasRecovery('owner', 'verified-token'), false) }
  finally { Date.now = now }
  console.log('PASS recovery signature, HttpOnly cookie, expiry, user and session binding')
}

async function policyTests() {
  const { needsAccountSetup, validUsername } = bundle('shared/account-security.ts')
  assert(validUsername('member.one'))
  for (const username of ['', 'ab', ' leading', 'a'.repeat(31), '<script>']) assert(!validUsername(username))
  assert(needsAccountSetup({ app_metadata: { provider: 'google' }, user_metadata: { username: 'member.one', fitsync_credentials_ready: true } }))
  assert(!needsAccountSetup({ app_metadata: { provider: 'google', fitsync_credentials_ready: true }, user_metadata: { username: 'member.one' } }))
  assert(!needsAccountSetup({ app_metadata: { provider: 'email' }, user_metadata: { username: 'member.one' } }))
  console.log('PASS username validation and server-owned Google completion flag')
}

async function actionTests() {
  let deliveriesFail = false, updates = 0, hasPassword = true, registrationFails = false, registered = 0, updateError = null
  const jar = new Map()
  const user = { id: 'fixture-owner', email: 'member@example.com', email_confirmed_at: new Date().toISOString(), app_metadata: { provider: 'google', fitsync_credentials_ready: true }, user_metadata: { username: 'member.one' } }
  const client = { auth: {
    resetPasswordForEmail: async () => { if (deliveriesFail) throw new Error('provider failure'); return { error: null } },
    getUser: async () => ({ data: { user } }),
    getSession: async () => ({ data: { session: { access_token: 'fixture-token' } } }),
    updateUser: async () => { updates++; return { error: updateError } },
    refreshSession: async () => ({ error: null }),
    signOut: async () => ({ error: null }),
  }, rpc: async fn => {
    if (fn === 'consume_fitsync_recovery') return { data: true, error: null }
    if (fn === 'fitsync_has_password') return { data: hasPassword, error: null }
    if (fn === 'complete_fitsync_registration') { registered++; return { error: registrationFails ? {} : null } }
    throw Error('Unexpected function ' + fn)
  } }
  const actions = bundle('frontend/app/auth/actions.ts', {
    '@supabase/ssr': { createServerClient: () => client },
    'next/headers': { cookies: async () => ({ getAll: () => [], get: key => jar.get(key), set: (key, value) => jar.set(key, { value }), delete: key => jar.delete(key) }) },
    'next/navigation': { redirect: value => { throw new Error('Unexpected redirect ' + value) } },
    'next/cache': { revalidatePath: () => {} },
  })
  const form = (values) => { const result = new FormData(); for (const [key, value] of Object.entries(values)) result.set(key, value); return result }
  const known = await actions.forgotPassword({}, form({ email: 'member@example.com' }))
  deliveriesFail = true
  const unknown = await actions.forgotPassword({}, form({ email: 'unknown@example.com' }))
  assert.deepEqual(known, unknown)
  const password = form({ password: 'a long fixture passphrase', confirmPassword: 'a long fixture passphrase', name: 'member.one' })
  assert((await actions.resetPassword({}, password)).error.includes('expired'))
  assert((await actions.completeAccount({}, password)).error.includes('already complete'))
  assert.equal(updates, 0)
  user.app_metadata.fitsync_credentials_ready = false
  user.user_metadata.username = ''
  const usernameOnly = form({ name: 'member.one' })
  await assert.rejects(actions.completeAccount({}, usernameOnly), /Unexpected redirect \/$/)
  assert.equal(updates, 0, 'A recovered password must not be set again')
  assert.equal(registered, 1)
  registrationFails = true
  assert((await actions.completeAccount({}, usernameOnly)).error.includes('password is already set'))
  assert.equal(updates, 0)
  registrationFails = false; hasPassword = false
  assert((await actions.completeAccount({}, usernameOnly)).fieldErrors.password)
  assert.equal(updates, 0, 'First-time Google users must still set a valid password')
  await assert.rejects(actions.completeAccount({}, password), /Unexpected redirect \/$/)
  assert.equal(updates, 1)
  const recovery = bundle('frontend/lib/auth/recovery.ts', { 'next/headers': { cookies: async () => ({ get: key => jar.get(key), set: (key, value) => jar.set(key, { value }) }) } })
  await recovery.grantRecovery(user.id, 'fixture-token')
  user.user_metadata.username = 'member.one'
  updateError = { code: 'same_password' }
  assert((await actions.resetPassword({}, password)).error.includes('different from your current password'))
  assert.equal(registered, 3, 'Rejected password updates must not mark credentials ready')
  updateError = null
  await recovery.grantRecovery(user.id, 'fixture-token')
  await assert.rejects(actions.resetPassword({}, password), /Unexpected redirect \/login\?password=updated/)
  assert.equal(registered, 4, 'A successful reset completes existing username setup')
  assert((await actions.signup({}, form({ email: 'a@example.com', name: '<invalid>', password: 'a long fixture passphrase', confirmPassword: 'a long fixture passphrase' }))).fieldErrors.name)
  console.log('PASS generic recovery, reset authorization, username-only completion after recovery, new Google password required, setup retries preserve password, signup validation')
}

async function endpointTests() {
  const owner = '00000000-0000-4000-8000-000000000001'
  let passwordOK = false, storageFails = false, deleted = false, reset = false, privilegedCalls = 0
  const user = { id: owner, email: 'test@example.com', email_confirmed_at: new Date().toISOString(), app_metadata: { provider: 'email' }, user_metadata: { username: 'member.one' } }
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fixture.invalid'
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'public-fixture'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'secret-fixture'
  const client = { auth: { getUser: async () => ({ data: { user }, error: null }), signInWithPassword: async () => ({ data: { user: passwordOK ? user : null }, error: passwordOK ? null : {} }), signOut: async () => ({ error: null }), admin: { updateUserById: async () => ({ error: null }), deleteUser: async id => { assert.equal(id, owner); deleted = true; return { error: null } } } },
    rpc: async (fn, args) => { assert.equal(args.owner_id, owner); privilegedCalls++; if (fn === 'reset_fitsync_data') reset = true; return { data: true, error: null } },
    storage: { from: () => ({ list: async prefix => { assert.equal(prefix, owner); return { data: [], error: storageFails ? {} : null } } }) },
    from: () => ({ delete: () => ({ like: async () => ({ error: null }) }) }) }
  const route = bundle('backend/app/api/account/route.ts', { '@supabase/supabase-js': { createClient: () => client } })
  const token = 'header.' + Buffer.from(JSON.stringify({ app_metadata: {} })).toString('base64url') + '.signature'
  const request = (body, auth = true) => new Request('https://fixture.invalid/api/account', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body) })
  const body = { operation: 'reset', confirmation: 'DELETE DATA', password: 'current password', userId: 'attacker-selected-target' }
  assert.equal((await route.POST(request(body, false))).status, 401)
  assert.equal((await route.POST(request({ ...body, confirmation: 'wrong' }))).status, 400)
  assert.equal((await route.POST(request(body))).status, 403)
  assert.equal(privilegedCalls, 0)
  passwordOK = true; storageFails = true
  assert.equal((await route.POST(request(body))).status, 503)
  assert.equal(reset, false); assert.equal(deleted, false)
  storageFails = false
  assert.equal((await route.POST(request(body))).status, 200)
  assert(reset); assert.equal(deleted, false)
  assert.equal((await route.POST(request({ ...body, operation: 'delete', confirmation: 'DELETE ACCOUNT' }))).status, 200)
  assert(deleted)
  user.app_metadata.fitsync_data_epoch = 42
  assert.equal((await route.POST(request(body))).status, 409)
  console.log('PASS unauthorized/incorrect confirmations/password rejected, no privileged calls before reauthentication, storage failure stops deletion, verified owner only, stale device blocked')
}

async function settingsRecoveryTests() {
  let user = { email: 'member@example.com', email_confirmed_at: new Date().toISOString() }
  let error = null, calls = 0, throws = false
  const client = { auth: {
    getUser: async () => ({ data: { user } }),
    resetPasswordForEmail: async email => { calls++; assert.equal(email, 'member@example.com'); if (throws) throw new Error('network'); return { error } },
  } }
  const actions = bundle('frontend/app/auth/account-actions.ts', {
    '@supabase/ssr': { createServerClient: () => client },
    'next/headers': { cookies: async () => ({ getAll: () => [], set: () => {} }) },
  })
  assert.match((await actions.requestAccountRecovery()).message, /member@example.com/)
  error = { status: 503, message: 'private provider detail' }
  const failure = await actions.requestAccountRecovery()
  assert(failure.error); assert.equal(failure.message, undefined)
  assert(!failure.error.includes('private provider detail'))
  error = { status: 429 }
  assert.match((await actions.requestAccountRecovery()).error, /Too many/)
  throws = true
  assert.match((await actions.requestAccountRecovery()).error, /Could not reach/)
  user = null
  const before = calls
  assert.match((await actions.requestAccountRecovery()).error, /Sign in/)
  assert.equal(calls, before)
  console.log('PASS signed-in recovery handles delivery failure, rate limits, network errors and account email without claiming delivery')
}

;(async () => { await policyTests(); await cookieTests(); await databaseTests(); await endpointTests(); await actionTests(); await settingsRecoveryTests() })().catch(error => { console.error(error); process.exitCode = 1 })
