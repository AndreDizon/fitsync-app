// Isolated network/storage fixtures. Never connects to a real account.
const assert = require('node:assert/strict')
const { buildSync } = require('esbuild')
const code = buildSync({ stdin: { contents: "export * from './frontend/lib/daily-plans';export {blankWeek} from './shared/daily-plans';", resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, platform: 'node', format: 'cjs' }).outputFiles[0].text
const mod = { exports: {} }; Function('module', 'exports', code)(mod, mod.exports)
const api = mod.exports, values = {}
const original = { fetch: global.fetch, localStorage: global.localStorage, navigator: Object.getOwnPropertyDescriptor(global, 'navigator'), window: global.window }
global.localStorage = new Proxy({ getItem: k => values[k] ?? null, setItem: (k, v) => { values[k] = v }, removeItem: k => { delete values[k] } }, { ownKeys: () => Reflect.ownKeys(values), getOwnPropertyDescriptor: () => ({ configurable: true, enumerable: true }) })
global.window = new EventTarget()
Object.defineProperty(global, 'navigator', { configurable: true, value: { onLine: true } })
const owner = 'test-account', week = '2026-11-23'
const response = data => Response.json({ userId: owner, data })
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }
const edit = source => { const current = api.cachedWeek(owner, week); current.document.days[0].workout.source = source; return api.storeWeek(owner, current.document, current.token) }
const waitFor = async predicate => { for (let i = 0; i < 100; i++) { if (predicate()) return; await new Promise(r => setTimeout(r, 0)) } throw new Error('Fixture did not reach expected request') }
let failures = 0
async function test(name, run) { api.clearDailyPlanCopies(); try { await run(); console.log('PASS', name) } catch (e) { failures++; console.error('FAIL', name, e.message) } }
;(async () => {
  try {
    await test('Reject a valid response for the wrong week', async () => {
      edit('Keep my week')
      global.fetch = async () => response(api.blankWeek('2026-11-30'))
      const result = await api.syncWeek(owner, week)
      assert.equal(result.document.week, week)
      assert(result.pending); assert(result.error)
    })
    await test('Signing back in starts a fresh sync instead of reusing an old request', async () => {
      const old = deferred(); let reads = 0
      global.fetch = () => ++reads === 1 ? old.promise : Promise.resolve(response(api.blankWeek(week)))
      const first = api.syncWeek(owner, week); await waitFor(() => reads === 1)
      api.clearDailyPlanCopies()
      const second = api.syncWeek(owner, week)
      await new Promise(r => setTimeout(r, 0))
      const actualReads = reads
      old.resolve(response(api.blankWeek(week)))
      await Promise.all([first, second])
      assert.equal(actualReads, 2)
    })
    await test('A conflict refresh cannot overwrite an edit made while it was loading', async () => {
      const sent = edit('Earlier edit'), remote = structuredClone(sent.document); remote.revision = 1
      const refresh = deferred(); let reads = 0
      global.fetch = async () => ++reads === 1 ? Response.json({ error: 'Conflict' }, { status: 409 }) : refresh.promise
      const work = api.syncWeek(owner, week); await waitFor(() => reads === 2)
      const latest = edit('Newer edit')
      refresh.resolve(response(remote)); await work
      const saved = api.cachedWeek(owner, week)
      assert.equal(saved.token, latest.token)
      assert.equal(saved.document.days[0].workout.source, 'Newer edit')
      assert(saved.pending)
    })
    await test('An older network error does not attach to newer local edits', async () => {
      edit('Earlier edit'); const pending = deferred(); let reads = 0
      global.fetch = () => { reads++; return pending.promise }
      const work = api.syncWeek(owner, week); await waitFor(() => reads === 1)
      const latest = edit('Newer edit')
      pending.resolve(Response.json({ error: 'Temporary failure' }, { status: 503 })); await work
      const saved = api.cachedWeek(owner, week)
      assert.equal(saved.token, latest.token); assert(!saved.error); assert(saved.pending)
    })
    await test('Queued work from before sign-out never sends new-session records', async () => {
      const gate = deferred(); navigator.locks = { request: async (_key, run) => { await gate.promise; return run() } }
      let reads = 0; global.fetch = async () => { reads++; return response(api.blankWeek(week)) }
      const work = api.syncWeek(owner, week)
      api.clearDailyPlanCopies(); edit('New session edit'); gate.resolve(); await work
      delete navigator.locks
      assert.equal(reads, 0); assert(api.cachedWeek(owner, week).pending)
    })
    await test('Successful acknowledgements sync newer edits with the advanced revision', async () => {
      const firstEdit = edit('Earlier edit'), first = deferred(); let writes = 0
      global.fetch = async (_url, init) => {
        assert.equal(init.method, 'PUT'); writes++
        if (writes === 1) return first.promise
        const document = JSON.parse(init.body)
        assert.equal(document.revision, 1)
        return response({ ...document, revision: 2 })
      }
      const work = api.syncWeek(owner, week); await waitFor(() => writes === 1)
      edit('Latest edit'); first.resolve(response({ ...firstEdit.document, revision: 1 }))
      const saved = await work
      assert.equal(saved.document.days[0].workout.source, 'Latest edit')
      assert.equal(saved.document.revision, 2); assert(!saved.pending); assert.equal(writes, 2)
    })
    await test('A genuine device conflict preserves local content for explicit resolution', async () => {
      edit('Device edit'); const remote = api.blankWeek(week); remote.revision = 2
      global.fetch = async (_url, init) => init.method === 'PUT' ? Response.json({ error: 'Conflict' }, { status: 409 }) : response(remote)
      const saved = await api.syncWeek(owner, week)
      assert(saved.conflict); assert(saved.pending)
      assert.equal(saved.document.days[0].workout.source, 'Device edit')
    })
  } finally {
    global.fetch = original.fetch; global.localStorage = original.localStorage; global.window = original.window
    if (original.navigator) Object.defineProperty(global, 'navigator', original.navigator); else delete global.navigator
  }
  if (failures) process.exitCode = 1
})().catch(e => { console.error(e); process.exit(1) })
