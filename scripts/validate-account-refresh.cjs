// Network and account-isolation fixtures only; never connects to Supabase.
const assert = require('node:assert/strict')
const { buildSync } = require('esbuild')
const code = buildSync({ stdin: { contents: `export * from './frontend/lib/account-request';export * from './frontend/lib/progress';export * from './frontend/lib/daily-plans';export {blankWeek} from './shared/daily-plans';`, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, platform: 'node', format: 'cjs' }).outputFiles[0].text
const mod = { exports: {} }; Function('module', 'exports', code)(mod, mod.exports)
const api = mod.exports
const storage = {}
Object.defineProperties(storage, { getItem: { value: key => storage[key] ?? null }, setItem: { value: (key, value) => { storage[key] = value } }, removeItem: { value: key => { delete storage[key] } } })
const original = { fetch: global.fetch, navigator: Object.getOwnPropertyDescriptor(global, 'navigator'), localStorage: global.localStorage, window: global.window }
global.localStorage = storage; global.window = new EventTarget()
Object.defineProperty(global, 'navigator', { configurable: true, value: { onLine: true } })
;(async () => {
  let count = 0
  try {
    global.fetch = async () => { count++; if (count === 1) throw new TypeError('Failed to fetch'); return Response.json({ ok: true }) }
    assert.equal((await api.accountRequest('/api/progress', { method: 'GET' }, 'Progress refresh')).ok, true)
    assert.equal(count, 2, 'A transient read retries once')
    count = 0; global.fetch = async () => { count++; throw new TypeError('Failed to fetch') }
    await assert.rejects(api.accountRequest('/api/account', { method: 'POST' }, 'Account action'), /Could not reach the account service/)
    assert.equal(count, 1, 'Never retry account writes/deletions')
    await assert.rejects(api.accountRequest('/api/progress', { method: 'GET' }, 'Progress refresh'), /saved records are kept/)
    count = 0; global.fetch = async () => { count++; throw new DOMException('Expired', 'TimeoutError') }
    await assert.rejects(api.accountRequest('/api/progress', { method: 'GET' }, 'Progress refresh'), /took too long/)
    assert.equal(count, 1)
    for (const status of [401, 403, 409, 500]) {
      global.fetch = async () => new Response('<html>unavailable</html>', { status })
      await assert.rejects(api.accountRequest('/api/progress', { method: 'GET' }, 'Progress refresh'), error => error.status === status && !error.message.includes('Unexpected token'))
    }
    const snapshot = owner => ({ userId: owner, entries: [], visits: ['2026-11-27'], weeks: [], awards: [], today: '2026-11-27' })
    api.recordAppVisit('account-one', '2026-11-27')
    let reads = 0, visits = 0
    global.fetch = async (url, init) => {
      if (init?.method === 'POST') { visits++; throw new TypeError('Failed to fetch') }
      reads++; return Response.json(String(url).includes('summary=streak') ? { userId: 'account-one', streak: 1 } : snapshot('account-one'))
    }
    const result = await api.loadProgress('account-one')
    assert.equal(result.userId, 'account-one'); assert(!result.offline); assert(result.awardWarning.includes('visit is still waiting'))
    assert.equal(reads, 1); assert.equal(visits, 1); assert.equal(api.pendingVisits('account-one').length, 1)
    assert.equal(await api.loadAppStreak('account-one', 'Asia/Manila'), 1, 'A failed visit must not block a readable streak')
    for (const status of [401, 403, 409]) {
      global.fetch = async () => Response.json({ error: 'Sign in or reload your account.' }, { status })
      await assert.rejects(api.loadProgress('account-one'), error => error.status === status)
    }
    global.fetch = async () => { throw new TypeError('Failed to fetch') }
    assert.equal((await api.loadProgress('account-one')).offline, true)
    await assert.rejects(api.loadProgress('account-two'), /Could not reach/, 'Never reuse another account cache')
    global.fetch = async () => Response.json(snapshot('account-one'))
    await assert.rejects(api.loadProgress('account-two'), error => error.status === 409)
    api.clearProgressCopies(); assert.equal(api.cachedProgress('account-one'), null)
    global.fetch = async () => Response.json(snapshot('account-two'))
    assert.equal((await api.loadProgress('account-two')).userId, 'account-two')
    api.clearProgressCopies()
    let release
    global.fetch = () => new Promise(resolve => { release = resolve })
    const pending = api.loadProgress('account-two')
    while (!release) await new Promise(resolve => setTimeout(resolve, 0))
    api.clearProgressCopies(); release(Response.json(snapshot('account-two')))
    await assert.rejects(pending, /Account changed/); assert.equal(api.cachedProgress('account-two'), null)
    global.fetch = async () => Response.json({ userId: 'account-two', data: null })
    const loaded = await api.syncWeek('account-two', '2026-11-23'); assert(!loaded.error)
    const week = api.blankWeek('2026-11-23'); api.storeWeek('account-two', week, loaded.token)
    count = 0; global.fetch = async () => { count++; throw new TypeError('Failed to fetch') }
    const saved = await api.syncWeek('account-two', '2026-11-23'); assert(saved.pending); assert.match(saved.error, /Could not reach/); assert.equal(count, 1, 'A failed plan write stays pending and is not retried automatically')
    global.fetch = async () => Response.json({ userId: 'account-two', data: null })
    const unconfirmed = await api.syncWeek('account-two', '2026-11-23')
    assert(unconfirmed.pending); assert.match(unconfirmed.error, /did not confirm/, 'An empty write response must never discard pending edits')
    api.clearDailyPlanCopies()
    global.fetch = async () => { throw new TypeError('Failed to fetch') }
    assert((await api.syncWeek('account-three', '2026-11-23')).error)
    global.fetch = async () => Response.json({ userId: 'account-three', data: null })
    const recovered = await api.syncWeek('account-three', '2026-11-23')
    assert(!recovered.error, 'Successful empty-account refresh must clear an old error')
    const remoteWeek = api.blankWeek('2026-11-23'); remoteWeek.days[0].workout.source = 'Former account plan'
    global.fetch = async () => Response.json({ userId: 'account-three', data: remoteWeek })
    await api.syncWeek('account-three', '2026-11-23')
    global.fetch = async () => Response.json({ userId: 'account-three', data: null })
    assert.equal((await api.syncWeek('account-three', '2026-11-23')).document.days[0].workout.source, 'Not planned', 'A removed server week must not remain as live synced data')
    api.clearProgressCopies()
    release = null; global.fetch = () => new Promise(resolve => { release = resolve })
    const streakPending = api.loadAppStreak('account-two', 'Asia/Manila')
    while (!release) await new Promise(resolve => setTimeout(resolve, 0))
    api.clearProgressCopies(); release(Response.json({ userId: 'account-two', streak: 99 }))
    await assert.rejects(streakPending, /Account changed/, 'A streak response from before sign-out must not be returned')
    storage['fitsync-private-daily-plan:account-two:broken'] = JSON.stringify({ document: { week: 'invalid', days: null }, pending: true })
    assert.deepEqual(api.devicePlanWeeks('account-two'), [], 'Malformed device weeks must not reach analytics')
    storage['fitsync-private-progress:account-two'] = JSON.stringify({ ...snapshot('account-two'), weeks: [{ days: null }] })
    assert.equal(api.cachedProgress('account-two'), null, 'Malformed snapshot weeks must not reach analytics')
    storage['fitsync-private-progress:account-two'] = JSON.stringify({ ...snapshot('account-two'), visits: ['not-a-date'] })
    assert.equal(api.cachedProgress('account-two'), null, 'Malformed visit dates must not reach streak calculations')
    delete storage['fitsync-private-daily-plan:account-two:broken']
    storage['fitsync-private-daily-plan:account-two:not-json'] = '{broken json'
    storage['fitsync-private-daily-plan:account-two:2026-11-23'] = JSON.stringify({ document: api.blankWeek('2026-11-23') })
    assert.equal(api.devicePlanWeeks('account-two').length, 1, 'One unreadable JSON record must not hide healthy weeks')
    console.log('PASS account refresh: read retry, no repeated writes, visit resilience, account isolation, sign-out guards, pending writes preserved, cleared recovered errors, removed remote weeks and corrupt-cache protection.')
  } finally {
    global.fetch = original.fetch; global.localStorage = original.localStorage; global.window = original.window
    if (original.navigator) Object.defineProperty(global, 'navigator', original.navigator); else delete global.navigator
  }
})().catch(error => { console.error(error); process.exit(1) })
