import assert from 'node:assert/strict'
import { createDemoUser, validateDemoOptions } from './seed-demo.mjs'
const options = { url: 'https://example.supabase.co', adminKey: 'sb_secret_test_fixture', publicKey: 'sb_publishable_test_fixture', email: 'demo@fit.test', password: 'Demo1234567!' }
for (const patch of [{ adminKey: '' }, { adminKey: 'sb_publishable_not_admin' }, { url: 'http://example.com' }, { url: 'https://example.supabase.co/extra' }, { password: 'short' }]) assert.throws(() => validateDemoOptions({ ...options, ...patch }))
let writes = 0, signedOut = false
const factory = (url, key, config) => {
  assert.equal(url, options.url)
  assert.equal(config.auth.persistSession, false)
  if (key === options.adminKey) return { auth: { admin: { async createUser(input) {
    writes++; assert.equal(input.email, options.email); assert.equal(input.password, options.password)
    assert.equal(input.email_confirm, true); assert.equal(input.user_metadata.display_name, 'Demo')
    assert(!('role' in input) && !('app_metadata' in input))
    return { data: { user: { id: 'demo-id', email: input.email } }, error: null }
  } } } }
  assert.equal(key, options.publicKey)
  return { auth: { async signInWithPassword(input) { assert.equal(input.password, options.password); return { data: { user: { id: 'demo-id' }, session: { access_token: 'not-printed' } }, error: null } }, async signOut(input) { assert.equal(input.scope, 'local'); signedOut = true } } }
}
assert.deepEqual(await createDemoUser(options, factory), { id: 'demo-id', email: options.email, verified: true })
assert.equal(writes, 1); assert(signedOut)
await assert.rejects(createDemoUser(options, () => ({ auth: { admin: { async createUser() { return { data: null, error: { code: 'email_exists', message: 'exists' } } } } } })), /left unchanged/)
console.log('PASS: demo seed requires server credentials, confirms email, creates only a regular user, verifies login, and never resets an existing account.')
