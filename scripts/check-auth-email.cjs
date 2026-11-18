/* Isolated tests: Google calls are mocked. Never sends real email. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { buildSync } = require('esbuild')
const { Webhook } = require('standardwebhooks')
function bundle(entry) {
  const code = buildSync({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', write: false }).outputFiles[0].text
  const mod = { exports: {} }
  new Function('require', 'module', 'exports', code)(require, mod, mod.exports)
  return mod.exports
}
const secret = 'whsec_' + Buffer.alloc(32, 7).toString('base64')
Object.assign(process.env, {
  AUTH_EMAIL_SITE_URL: 'https://fitsync-app-features.vercel.app',
  SUPABASE_SEND_EMAIL_HOOK_SECRET: 'v1,' + secret,
  GMAIL_CLIENT_ID: 'test-client', GMAIL_CLIENT_SECRET: 'test-secret', GMAIL_REFRESH_TOKEN: 'test-refresh',
})
const { renderAuthEmail } = bundle('backend/lib/auth-email.ts')
const { POST } = bundle('backend/app/api/auth/email-hook/route.ts')
const event = { user: { email: 'recipient@example.com' }, email_data: { email_action_type: 'recovery', token_hash: 'a'.repeat(64), site_url: 'https://evil.example', redirect_to: 'https://evil.example' } }
function signed(value = event, date = new Date()) {
  const body = JSON.stringify(value)
  const id = 'event_test'
  return new Request('https://backend.example/api/auth/email-hook', {
    method: 'POST', body,
    headers: { 'Content-Type': 'application/json', 'webhook-id': id, 'webhook-timestamp': String(Math.floor(date.getTime() / 1000)), 'webhook-signature': new Webhook(secret).sign(id, date, body) },
  })
}
async function main() {
  let calls = []
  global.fetch = async (url, options) => {
    calls.push([url, options])
    return Response.json(url.includes('oauth2') ? { access_token: 'test-access' } : { id: 'test-message' })
  }
  const rendered = renderAuthEmail(event)
  assert.match(rendered.html, /Reset password/)
  assert.match(rendered.text, /https:\/\/fitsync-app-features\.vercel\.app\/auth\/confirm\?token_hash=/)
  assert.doesNotMatch(rendered.html, /evil\.example/)
  const signup = { ...event, email_data: { ...event.email_data, email_action_type: 'signup' } }
  assert.match(renderAuthEmail(signup).text, /type=email/)
  assert.match(renderAuthEmail({ ...event, email_data: { email_action_type: 'reauthentication', token: '123456' } }).text, /123456/)
  assert.match(renderAuthEmail({ ...event, email_data: { email_action_type: 'password_changed_notification' } }).subject, /password was changed/)
  assert.throws(() => renderAuthEmail({ ...event, user: { email: 'ok@example.com\r\nBcc: evil@example.com' } }))
  assert.throws(() => renderAuthEmail({ ...event, email_data: { email_action_type: 'unknown' } }))
  process.env.AUTH_EMAIL_SITE_URL = 'javascript:alert(1)'
  assert.throws(() => renderAuthEmail(event))
  process.env.AUTH_EMAIL_SITE_URL = 'https://fitsync-app-features.vercel.app'
  const unsigned = new Request('https://backend.example/api/auth/email-hook', { method: 'POST', body: JSON.stringify(event) })
  assert.equal((await POST(unsigned)).status, 401)
  assert.equal((await POST(signed(event, new Date(Date.now() - 600000)))).status, 401)
  const tampered = signed()
  assert.equal((await POST(new Request(tampered.url, { method: 'POST', headers: tampered.headers, body: JSON.stringify(signup) }))).status, 401)
  assert.equal(calls.length, 0, 'Rejected signatures must never contact Google')
  assert.equal((await POST(signed())).status, 200)
  assert.equal(calls.length, 2)
  assert.match(calls[0][1].body.toString(), /grant_type=refresh_token/)
  assert.match(calls[1][0], /andredizon2004%40gmail\.com/)
  const mime = Buffer.from(JSON.parse(calls[1][1].body).raw, 'base64url').toString()
  assert.match(mime, /From: FitSync <andredizon2004@gmail\.com>/)
  assert.match(mime, /multipart\/alternative/)
  assert.match(mime, /To: recipient@example.com\r\n/)
  assert.equal((await POST(signed({ ...event, email_data: { email_action_type: 'bad' } }))).status, 422)
  const over = signed()
  const overHeaders = new Headers(over.headers); overHeaders.set('content-length', '65537')
  assert.equal((await POST(new Request(over.url, { method: 'POST', headers: overHeaders, body: '{}' }))).status, 413)
  delete process.env.SUPABASE_SEND_EMAIL_HOOK_SECRET
  assert.equal((await POST(signed())).status, 503)
  process.env.SUPABASE_SEND_EMAIL_HOOK_SECRET = secret
  let logged = []
  const originalError = console.error
  console.error = (...args) => logged.push(args.join(' '))
  global.fetch = async () => Response.json({ error: 'private-provider-detail' }, { status: 401 })
  try { assert.equal((await POST(signed())).status, 503) }
  finally { console.error = originalError }
  assert.doesNotMatch(logged.join(' '), /recipient@example.com|private-provider-detail|test-refresh/)
  fs.mkdirSync('logs/auth-email-preview', { recursive: true })
  fs.writeFileSync('logs/auth-email-preview/recovery.html', rendered.html)
  fs.writeFileSync('logs/auth-email-preview/signup.html', renderAuthEmail(signup).html)
  console.log('Passed: signed hook, stale/tampered/unsigned rejection, bounded body, fixed origin/sender, supported actions, MIME, and safe delivery failure. No emails sent.')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
