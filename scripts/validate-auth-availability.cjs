// Auth-provider failures are injected; no real sessions or services are used.
const assert = require('node:assert/strict')
const { buildSync } = require('esbuild')
const out = buildSync({ entryPoints: ['backend/lib/auth.ts'], bundle: true, write: false, platform: 'node', format: 'cjs', external: ['@supabase/supabase-js'] }).outputFiles[0].text
const owner = '11111111-1111-4111-8111-111111111111'
let authError = null, throws = false, creations = 0
const user = { id: owner, email_confirmed_at: new Date().toISOString(), app_metadata: { provider: 'email' }, user_metadata: { username: 'member.one' } }
const fakeClient = { auth: { getUser: async () => { if (throws) throw new TypeError('Failed to fetch'); return { data: { user: authError ? null : user }, error: authError } } } }
const mod = { exports: {} }
Function('module', 'exports', 'require', out)(mod, mod.exports, name => name === '@supabase/supabase-js' ? { createClient: () => { creations++; return fakeClient } } : require(name))
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
;(async () => {
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fixture.invalid'; process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'public-fixture'
    const token = 'header.' + Buffer.from(JSON.stringify({ app_metadata: {} })).toString('base64url') + '.signature'
    const request = () => new Request('https://fixture.invalid/api/progress', { headers: { Authorization: 'Bearer ' + token } })
    assert.equal((await mod.exports.authenticate(new Request('https://fixture.invalid/api/progress'))).response.status, 401)
    assert.equal(creations, 0)
    for (authError of [{ name: 'AuthApiError', status: 401 }, { name: 'AuthApiError', status: 403 }]) assert.equal((await mod.exports.authenticate(request())).response.status, 401)
    for (authError of [{ name: 'AuthRetryableFetchError', status: 0 }, { name: 'AuthRetryableFetchError' }, { name: 'AuthApiError', status: 503 }]) {
      const result = await mod.exports.authenticate(request()); assert.equal(result.response.status, 503); assert((await result.response.json()).error.includes('temporarily unreachable'))
    }
    throws = true; assert.equal((await mod.exports.authenticate(request())).response.status, 503); throws = false; authError = null
    assert.equal((await mod.exports.authenticate(request())).user.id, owner)
    user.app_metadata.fitsync_data_epoch = 42
    assert.equal((await mod.exports.authenticate(request())).response.status, 409)
    console.log('PASS auth availability: missing/invalid tokens stay unauthorized; returned and thrown provider/network outages return retryable 503; valid users and stale-reset protection still work.')
  } finally {
    if (url === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = url
    if (key === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = key
  }
})().catch(error => { console.error(error); process.exit(1) })
