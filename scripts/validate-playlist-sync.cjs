// Real IndexedDB and Web Locks in an isolated browser origin; all HTTP is mocked.
const assert = require('node:assert/strict')
const path = require('node:path')
const { build } = require('esbuild')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.join(process.env.TEMP, 'fitsync-layout-check/node_modules/playwright'))
;(async () => {
  const built = await build({ stdin: { contents: `export * from './frontend/lib/playlists';export {offlinePlaylists} from './frontend/lib/playlist-offline';`, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, platform: 'browser', format: 'iife', globalName: 'playlistAudit' })
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const page = await browser.newPage({ serviceWorkers: 'block' })
    await page.route('https://playlist.fixture/**', route => route.fulfill({ contentType: 'text/html', body: '<div>Isolated playlist sync checks</div>' }))
    await page.goto('https://playlist.fixture/'); await page.addScriptTag({ content: built.outputFiles[0].text })
    const results = await page.evaluate(async () => {
      const api = window.playlistAudit, cache = api.offlinePlaylists
      const a = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', b = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
      const make = () => ({ id: crypto.randomUUID(), kind: 'workout', duration: 'day', selectedDay: 0, restDays: [0], name: 'Fixture routine', description: '', items: [] })
      const remote = input => ({ ...input, revision: 1, created_at: '2026-11-27T08:00:00Z', updated_at: '2026-11-27T08:00:00Z' })
      const check = (value, message) => { if (!value) throw new Error(message) }
      const results = []
      async function test(name, work) { try { await api.clearOfflinePlaylists(); api.setPlaylistAccount(a); await work(); results.push({ name, ok: true }) } catch (error) { results.push({ name, ok: false, message: error.message }) } }
      await test('Incomplete save response preserves pending device data', async () => {
        window.fetch = async () => Response.json({ userId: a, data: null })
        const input = make(); await api.savePlaylist(input).catch(() => {})
        const row = await cache.get(a, input.id)
        check(row && row.playlist.syncStatus === 'pending', 'Incomplete response deleted the local playlist')
      })
      await test('Previous session cannot return data after sign-out and sign-in', async () => {
        let release
        window.fetch = () => new Promise(resolve => { release = resolve })
        const request = api.playlistRequest('?kind=workout').then(() => false, () => true)
        api.setPlaylistAccount(null); api.setPlaylistAccount(a)
        release(Response.json({ userId: a, data: [] }))
        check(await request, 'A response from a previous session was accepted')
      })
      await test('Older failed edit cannot mark a newer edit conflicted', async () => {
        const input = make(), first = await cache.save(a, input), sent = await cache.get(a, input.id)
        await cache.save(a, { ...input, name: 'Corrected newer edit' }, first)
        await cache.markError(sent, 'Earlier input was invalid', true)
        const current = await cache.get(a, input.id)
        check(current.playlist.name === 'Corrected newer edit' && current.playlist.syncStatus === 'pending' && !current.playlist.syncError, 'An old request changed the newer edit status')
      })
      await test('New account sync does not wait for old account request', async () => {
        let release, startedB = false
        const first = make(), second = make(); await cache.save(a, first); await cache.save(b, second)
        window.fetch = async (_, init) => { const input = JSON.parse(init.body); if (input.id === first.id) return new Promise(resolve => { release = resolve }); startedB = true; return Response.json({ userId: b, data: remote(input) }) }
        const oldSync = api.syncPlaylists().catch(() => {})
        while (!release) await new Promise(resolve => setTimeout(resolve, 0))
        api.setPlaylistAccount(b)
        const newSync = api.syncPlaylists().catch(() => {})
        await new Promise(resolve => setTimeout(resolve, 150))
        const startedBeforeOldFinished = startedB
        release(Response.json({ userId: a, data: remote(first) }))
        await Promise.all([oldSync, newSync])
        check(startedBeforeOldFinished, 'New account inherited the old account sync promise')
        check((await cache.get(b, second.id)).playlist.syncStatus === 'synced', 'New account playlist was not synced')
      })
      await test('Malformed remote list cannot overwrite a healthy device copy', async () => {
        const input = make(), saved = await cache.save(a, input), sent = await cache.get(a, input.id)
        await cache.acknowledge(sent, remote(input))
        window.fetch = async () => Response.json({ userId: a, data: [{ id: input.id, kind: 'workout' }] })
        await api.listPlaylists('workout').catch(() => {})
        const row = await cache.get(a, input.id)
        check(row?.playlist.name === saved.name && Array.isArray(row.playlist.items), 'Malformed response replaced the healthy copy')
      })
      await test('Successful save and delete still sync correctly', async () => {
        window.fetch = async (_, init) => init.method === 'DELETE' ? Response.json({ userId: a }) : Response.json({ userId: a, data: remote(JSON.parse(init.body)) })
        const input = make(), saved = await api.savePlaylist(input)
        check(saved.syncStatus === 'synced', 'Save did not sync')
        const removed = await api.deletePlaylist(saved); check(!removed.pending && !await cache.get(a, input.id), 'Delete was not acknowledged')
      })
      await test('Reset/session errors must not silently return cached playlists', async () => {
        const input = make(); await cache.save(a, input); const sent = await cache.get(a, input.id); await cache.acknowledge(sent, remote(input))
        for (const status of [401, 403, 409]) {
          window.fetch = async () => Response.json({ error: 'Reload account' }, { status })
          const rejected = await api.listPlaylists('workout').then(() => false, error => error.status === status)
          check(rejected, 'Account error ' + status + ' was hidden by cached data')
        }
      })
      await test('Successful acknowledgement preserves a newer local edit', async () => {
        const input = make(), first = await cache.save(a, input), sent = await cache.get(a, input.id)
        await cache.save(a, { ...input, name: 'Newer routine' }, first)
        await cache.acknowledge(sent, remote(input))
        const row = await cache.get(a, input.id)
        check(row.playlist.name === 'Newer routine' && row.playlist.syncStatus === 'pending' && row.baseRevision === 1, 'Acknowledgement lost a newer edit')
      })
      await test('Genuine save conflicts are kept for explicit resolution', async () => {
        const input = make()
        window.fetch = async (_, init) => init.method === 'GET' ? Response.json({ userId: a, data: [remote({ ...input, name: 'Other device version' })] }) : Response.json({ error: 'Conflict' }, { status: 409 })
        const rejected = await api.savePlaylist(input).then(() => false, () => true)
        check(rejected && (await cache.get(a, input.id)).playlist.syncStatus === 'conflict', 'A real conflict was not preserved')
      })
      return results
    })
    results.forEach(result => console.log((result.ok ? 'PASS ' : 'FAIL ') + result.name + (result.message ? ': ' + result.message : '')))
    assert(results.every(result => result.ok), 'Playlist sync regressions failed')
  } finally { await browser.close() }
})().catch(error => { console.error(error.message); process.exit(1) })
