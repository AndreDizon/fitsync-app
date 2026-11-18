/* Real Supabase SSR SDK against a local HTTP fixture; no live users or email. */
const assert = require('node:assert/strict')
const { createServer } = require('node:http')
const { buildSync } = require('esbuild')
const jar = new Map(), calls = []
const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'member@example.com', email_confirmed_at: new Date().toISOString(), created_at: new Date().toISOString(), app_metadata: { provider: 'email' }, user_metadata: { username: 'member.one' } }
const jwt = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url') + '.' + Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url') + '.fixture-signature'
const session = { access_token: jwt, refresh_token: 'fixture-refresh', token_type: 'bearer', expires_in: 3600, user }
let used = false, expectedType = 'email'
const server = createServer(async (req, res) => {
  const parts = []; for await (const part of req) parts.push(part)
  const body = parts.length ? JSON.parse(Buffer.concat(parts).toString()) : null
  const path = new URL(req.url, 'http://fixture').pathname
  calls.push({ method: req.method, path, body })
  res.setHeader('Content-Type', 'application/json')
  if (path.endsWith('/signup')) return res.end(JSON.stringify({ ...user, email_confirmed_at: null }))
  if (path.endsWith('/recover') || path.endsWith('/resend')) return res.end('{}')
  if (path.endsWith('/verify')) {
    if (used || body.token !== '123456' || body.type !== expectedType || body.email !== user.email) { res.statusCode = 403; return res.end(JSON.stringify({ error_code: 'otp_expired', msg: 'Invalid code' })) }
    used = true; return res.end(JSON.stringify(session))
  }
  if (path.endsWith('/user')) return res.end(JSON.stringify(user))
  if (path.endsWith('/consume_fitsync_recovery')) return res.end('true')
  if (path.endsWith('/complete_fitsync_registration')) return res.end('{}')
  if (path.endsWith('/logout')) { res.statusCode = 204; return res.end() }
  res.statusCode = 404; res.end('{}')
})
function bundle(entry) {
  const code = buildSync({ entryPoints: [entry], bundle: true, write: false, platform: 'node', format: 'cjs', tsconfig: 'frontend/tsconfig.json', external: ['server-only', 'next/headers', 'next/navigation', 'next/cache', '@supabase/ssr', '@supabase/supabase-js'] }).outputFiles[0].text
  const mod = { exports: {} }
  const localRequire = name => {
    if (name === 'server-only') return {}
    if (name === 'next/headers') return { cookies: async () => ({ getAll: () => [...jar].map(([name, item]) => ({ name, value: item.value })), get: key => jar.get(key), set: (key, value, options) => jar.set(key, { value, options }), delete: key => jar.delete(key) }) }
    if (name === 'next/navigation') return { redirect: url => { throw new Error('Redirect ' + url) } }
    if (name === 'next/cache') return { revalidatePath: () => {} }
    return require(name)
  }
  new Function('require', 'module', 'exports', code)(localRequire, mod, mod.exports)
  return mod.exports
}
const form = fields => { const data = new FormData(); for (const [key, value] of Object.entries(fields)) data.set(key, value); return data }
;(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  Object.assign(process.env, { NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${server.address().port}`, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'fixture-public', NEXT_PUBLIC_SITE_URL: 'http://localhost:3000', AUTH_FLOW_SECRET: 'fixture-only-secret-longer-than-thirty-two-characters', NODE_ENV: 'test' })
  try {
    const actions = bundle('frontend/app/auth/actions.ts')
    const pending = bundle('frontend/lib/auth/email-verification.ts')
    const password = 'a long fixture passphrase'
    await assert.rejects(actions.signup({}, form({ name: 'member.one', email: user.email, password, confirmPassword: password })), /Redirect \/verify-email$/)
    assert.equal((await pending.readEmailVerification()).kind, 'signup')
    assert(!jar.get(pending.verificationCookie).value.includes(password))
    assert((await actions.verifyEmailCode({}, form({ code: '000000' }))).error)
    await assert.rejects(actions.verifyEmailCode({}, form({ code: '123456' })), /Redirect \/$/)
    assert.equal(await pending.readEmailVerification(), null)
    assert((await actions.verifyEmailCode({}, form({ code: '123456' }))).error)
    expectedType = 'recovery'; used = false
    await assert.rejects(actions.forgotPassword({}, form({ email: user.email })), /Redirect \/verify-email$/)
    await actions.resendEmailCode({})
    await assert.rejects(actions.verifyEmailCode({}, form({ code: '123456' })), /Redirect \/reset-password$/)
    await assert.rejects(actions.resetPassword({}, form({ password, confirmPassword: password })), /Redirect \/login\?password=updated$/)
    assert(calls.some(call => call.path.endsWith('/verify') && call.body.type === 'email'))
    assert(calls.some(call => call.path.endsWith('/verify') && call.body.type === 'recovery'))
    assert(calls.some(call => call.path.endsWith('/user') && call.method === 'PUT' && call.body.password === password))
    assert(calls.some(call => call.path.endsWith('/logout')))
    assert(!jar.has(pending.verificationCookie))
    console.log('PASS real Supabase SDK: signup, same-tab code confirmation, invalid/reused codes, recovery resend, password update and global logout. No live emails sent.')
  } finally { await new Promise(resolve => server.close(resolve)) }
})().catch(error => { console.error(error); process.exitCode = 1 })
