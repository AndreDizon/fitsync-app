// Only the public catalog, its media and a public offline page are cached.
// Never cache the authenticated dashboard, login pages, API sessions or RSC data.
const META = 'fitsync-library-meta-v1'
const PREFIX = 'fitsync-library-content-v1-'
const MANIFEST = '/offline/exercise-manifest.json'

let seeding
let lastProgress = { phase: 'saving', completed: 0, total: 202 }
const listeners = new Set()
const publish = progress => {
  lastProgress = progress
  for (const port of listeners) { try { port.postMessage(progress) } catch { listeners.delete(port) } }
}
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()))
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))
async function currentCache() {
  const meta = await caches.open(META)
  const response = await meta.match(MANIFEST)
  if (!response) return null
  return caches.open(PREFIX + (await response.json()).version)
}
async function download(url) {
  const response = await fetch(url, { cache: 'no-store', credentials: 'omit', redirect: 'error' })
  if (!response.ok) throw new Error('A library file could not be downloaded. Please retry while online.')
  return response
}
async function complete(cache, manifest) {
  return !!cache && !!manifest && (await Promise.all(manifest.resources.map(url => cache.match(url)))).every(Boolean)
}
async function seed() {
  let manifestResponse
  try { manifestResponse = await download(MANIFEST) }
  catch {
    const active = await currentCache()
    const saved = await (await caches.open(META)).match(MANIFEST)
    if (await complete(active, saved ? await saved.json() : null)) { publish({ phase: 'ready', completed: 100, total: 100 }); return }
    throw new Error('Connect once to save the exercise library on this device.')
  }
  const manifest = await manifestResponse.clone().json()
  if (manifest.count !== 100 || !/^[a-f0-9]{20}$/.test(manifest.version) || !Array.isArray(manifest.resources)) throw new Error('Invalid offline catalog manifest.')
  const allowed = url => typeof url === 'string' && (/^\/exercises\/[a-z0-9-]+\.(gif|webp)$/.test(url) || ['/offline/exercises.json', '/mascot/fox-logo.png'].includes(url))
  if (!manifest.resources.every(allowed)) throw new Error('Unexpected resource in offline catalog.')
  const cache = await caches.open(PREFIX + manifest.version)
  const meta = await caches.open(META)
  const prior = await meta.match(MANIFEST)
  const priorVersion = prior ? (await prior.json()).version : null
  if (priorVersion === manifest.version) {
    if (await complete(cache, manifest)) { publish({ phase: 'ready', completed: 100, total: 100 }); return }
  }
  let cursor = 0, completed = 0
  const total = manifest.resources.length
  publish({ phase: 'saving', completed, total })
  const downloads = await Promise.allSettled(Array.from({ length: 4 }, async () => {
    while (cursor < total) {
      const url = manifest.resources[cursor++]
      if (!await cache.match(url)) await cache.put(url, await download(url))
      publish({ phase: 'saving', completed: ++completed, total })
    }
  }))
  const failed = downloads.find(result => result.status === 'rejected')
  if (failed) throw failed.reason
  // Commit only when every data file, media file and shell asset is saved.
  await meta.put(MANIFEST, manifestResponse)
  for (const name of await caches.keys()) if (name.startsWith(PREFIX) && name !== PREFIX + manifest.version) await caches.delete(name)
  publish({ phase: 'ready', completed: 100, total: 100 })
}
self.addEventListener('message', event => {
  if (event.data?.type !== 'SEED_EXERCISE_LIBRARY' || !event.ports[0]) return
  listeners.add(event.ports[0])
  if (seeding) { event.ports[0].postMessage(lastProgress); return }
  seeding = seed().catch(error => publish({ phase: 'error', message: error.message })).finally(() => { seeding = null; listeners.clear() })
  event.waitUntil(seeding)
})
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return
  const publicResource = url.pathname.startsWith('/exercises/') || url.pathname.startsWith('/offline/') || ['/mascot/fox-logo.png', '/mascot/fox-opening.jpg'].includes(url.pathname)
  if (publicResource) {
    event.respondWith((async () => {
      const cache = await currentCache()
      return await cache?.match(event.request) || fetch(event.request)
    })())
  } else if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(fetch(event.request).catch(async () => {
      const cache = await currentCache()
      return await cache?.match(event.request) || Response.error()
    }))
  }
})
