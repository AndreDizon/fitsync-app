import { isUUID, parsePlaylist, type Playlist, type PlaylistInput, type PlaylistKind } from '../../shared/playlists'

export type CachedPlaylist = { key: string; owner: string; playlist: Playlist; baseRevision: number | null; deleted: boolean }
const DB_NAME = 'fitsync-private-playlists-v1'
const keyFor = (owner: string, id: string) => `${owner}:${id}`
const request = <T>(value: IDBRequest<T>) => new Promise<T>((resolve, reject) => { value.onsuccess = () => resolve(value.result); value.onerror = () => reject(value.error) })
let database: Promise<IDBDatabase> | undefined
function db() {
  if (!database) database = new Promise<IDBDatabase>((resolve, reject) => {
    if (!globalThis.indexedDB) return reject(new Error('This browser does not support private offline playlist storage.'))
    const opening = indexedDB.open(DB_NAME, 1)
    opening.onupgradeneeded = () => { const store = opening.result.createObjectStore('records', { keyPath: 'key' }); store.createIndex('owner', 'owner') }
    opening.onsuccess = () => resolve(opening.result)
    opening.onerror = () => { database = undefined; reject(opening.error) }
    opening.onblocked = () => reject(new Error('Close other FitSync tabs to update offline storage.'))
  })
  return database
}
async function transaction<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => Promise<T>) {
  const connection = await db()
  return new Promise<T>((resolve, reject) => {
    const tx = connection.transaction('records', mode)
    let output: T
    let failed: unknown
    tx.oncomplete = () => resolve(output)
    tx.onerror = tx.onabort = () => reject(failed || new Error('Could not save to this device. Check available storage and try again.'))
    run(tx.objectStore('records')).then(value => { output = value }).catch(error => { failed = error; tx.abort() })
  })
}
function requireOwner(owner: string) { if (!isUUID(owner)) throw new Error('Sign in to an account before saving offline playlists.') }
export const playlistContent = (playlist: PlaylistInput) => JSON.stringify(parsePlaylist(playlist).data)
export const offlinePlaylists = {
  async records(owner: string) { requireOwner(owner); return transaction('readonly', store => request<CachedPlaylist[]>(store.index('owner').getAll(owner))) },
  async get(owner: string, id: string) { requireOwner(owner); return transaction('readonly', store => request<CachedPlaylist | undefined>(store.get(keyFor(owner, id)))) },
  async list(owner: string, kind: PlaylistKind) { return (await this.records(owner)).filter(row => !row.deleted && row.playlist.kind === kind).map(row => row.playlist).sort((a, b) => b.updated_at.localeCompare(a.updated_at)) },
  async save(owner: string, input: PlaylistInput, base?: Playlist | null) {
    requireOwner(owner)
    const parsed = parsePlaylist(input)
    if (!parsed.data) throw new Error(parsed.error!)
    const data = parsed.data
    return transaction('readwrite', async store => {
      const key = keyFor(owner, input.id)
      const previous = await request<CachedPlaylist | undefined>(store.get(key))
      if (previous?.playlist.syncStatus === 'conflict') throw new Error('Resolve the sync conflict by reloading the saved version or making a new copy.')
      if (previous && base?.localVersion && base.localVersion !== previous.playlist.localVersion) throw new Error('This playlist changed in another tab. Reload before saving again.')
      if (previous && !base) throw new Error('A playlist with this ID already exists. Reload your collection.')
      const now = new Date().toISOString()
      const playlist: Playlist = { ...data, revision: previous?.playlist.revision ?? base?.revision ?? 0, created_at: previous?.playlist.created_at ?? base?.created_at ?? now, updated_at: now, localVersion: crypto.randomUUID(), syncStatus: 'pending' }
      const row: CachedPlaylist = { key, owner, playlist, baseRevision: previous?.baseRevision ?? (base?.revision ? base.revision : null), deleted: false }
      await request(store.put(row)); return playlist
    })
  },
  async remove(owner: string, playlist: Playlist) {
    requireOwner(owner)
    return transaction('readwrite', async store => {
      const key = keyFor(owner, playlist.id)
      const previous = await request<CachedPlaylist | undefined>(store.get(key))
      if (previous && playlist.localVersion && previous.playlist.localVersion !== playlist.localVersion) throw new Error('This playlist changed in another tab. Reload before deleting.')
      await request(store.put({ key, owner, playlist: { ...playlist, syncStatus: 'pending', localVersion: crypto.randomUUID(), syncError: undefined }, baseRevision: previous?.baseRevision ?? (playlist.revision || null), deleted: true } satisfies CachedPlaylist))
    })
  },
  async acknowledge(sent: CachedPlaylist, remote: Playlist | null) {
    return transaction('readwrite', async store => {
      const current = await request<CachedPlaylist | undefined>(store.get(sent.key))
      if (!current) return
      if (current.playlist.localVersion !== sent.playlist.localVersion) {
        // A newer local edit was made while this request was in flight. Keep its content.
        await request(store.put({ ...current, baseRevision: remote?.revision ?? null, playlist: { ...current.playlist, revision: remote?.revision ?? 0 } }))
      } else if (!remote) await request(store.delete(sent.key))
      else await request(store.put({ ...current, deleted: false, baseRevision: remote.revision, playlist: { ...remote, localVersion: current.playlist.localVersion, syncStatus: 'synced', syncError: undefined } }))
    })
  },
  async markError(sent: CachedPlaylist, message: string, conflict: boolean) {
    return transaction('readwrite', async store => {
      const current = await request<CachedPlaylist | undefined>(store.get(sent.key))
      if (current) await request(store.put({ ...current, deleted: conflict ? false : current.deleted, playlist: { ...current.playlist, syncStatus: conflict ? 'conflict' : 'pending', syncError: message } }))
    })
  },
  async merge(owner: string, kind: PlaylistKind, remote: Playlist[]) {
    requireOwner(owner)
    return transaction('readwrite', async store => {
      const all = await request<CachedPlaylist[]>(store.index('owner').getAll(owner))
      const ids = new Set(remote.map(item => item.id))
      for (const row of all) if (row.playlist.kind === kind && row.playlist.syncStatus === 'synced' && !ids.has(row.playlist.id)) await request(store.delete(row.key))
      for (const playlist of remote) {
        const previous = all.find(row => row.playlist.id === playlist.id)
        if (previous && previous.playlist.syncStatus !== 'synced') continue
        const localVersion = previous && playlistContent(previous.playlist) === playlistContent(playlist) ? previous.playlist.localVersion : crypto.randomUUID()
        await request(store.put({ key: keyFor(owner, playlist.id), owner, baseRevision: playlist.revision, deleted: false, playlist: { ...playlist, syncStatus: 'synced', localVersion } } satisfies CachedPlaylist))
      }
    })
  },
  async replace(owner: string, id: string, remote: Playlist | null) {
    return transaction('readwrite', async store => {
      if (!remote) await request(store.delete(keyFor(owner, id)))
      else await request(store.put({ key: keyFor(owner, id), owner, baseRevision: remote.revision, deleted: false, playlist: { ...remote, localVersion: crypto.randomUUID(), syncStatus: 'synced' } } satisfies CachedPlaylist))
    })
  },
  async clear(owner?: string) {
    return transaction('readwrite', async store => {
      if (!owner) { await request(store.clear()); return }
      const rows = await request<CachedPlaylist[]>(store.index('owner').getAll(owner))
      for (const row of rows) await request(store.delete(row.key))
    })
  },
}
