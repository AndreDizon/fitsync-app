import { isUUID, parsePlaylist, type Playlist, type PlaylistInput, type PlaylistKind } from '../../shared/playlists'
import { offlinePlaylists, playlistContent } from './playlist-offline'

let account: string | null = null
let session = 0
const running = new Map<number, Promise<void>>()
export function setPlaylistAccount(id: string | null) { const next = id && isUUID(id) ? id : null; if (next !== account) { session++; account = next } }
export async function clearOfflinePlaylists() { session++; account = null; await offlinePlaylists.clear() }
class RequestError extends Error { constructor(message: string, readonly status: number) { super(message) } }
export async function playlistRequest(path: string, method = 'GET', body?: unknown) {
  const startedAs = account
  const startedSession = session
  let response: Response
  try { response = await fetch(`/api/playlists${path}`, { method, cache: 'no-store', signal: AbortSignal.timeout(15000), headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined }) }
  catch { throw new RequestError('Offline or unreachable. Your device copy is kept for syncing.', 0) }
  const result = await response.json().catch(() => null)
  if (startedSession !== session || startedAs !== account) throw new RequestError('The signed-in account changed. Reload before continuing.', 401)
  if (!response.ok) throw new RequestError(response.status === 401 ? 'Sign in to sync playlists.' : result?.error || 'Playlist request failed. Please retry.', response.status)
  if (!isUUID(result?.userId)) throw new RequestError('The account service did not confirm playlist ownership. Your device copy is kept.', 503)
  if (account && account !== result.userId) throw new RequestError('The signed-in account changed. Reload before continuing.', 401)
  account = result.userId
  return result
}
function checkedPlaylist(value: unknown, kind: PlaylistKind, id?: string): Playlist {
  const input = value as Playlist | null, parsed = parsePlaylist(value)
  if (!input || !parsed.data || input.kind !== kind || id && input.id !== id || !Number.isInteger(input.revision) || input.revision < 1 || typeof input.created_at !== 'string' || !Number.isFinite(Date.parse(input.created_at)) || typeof input.updated_at !== 'string' || !Number.isFinite(Date.parse(input.updated_at))) throw new RequestError('The account service returned an incomplete playlist. Your device copy is kept; refresh to retry.', 503)
  return { ...parsed.data, revision: input.revision, created_at: input.created_at, updated_at: input.updated_at }
}
async function remoteCollection(kind: PlaylistKind): Promise<Playlist[]> {
  const owner = requireAccount(), startedSession = session
  const items: Playlist[] = []
  for (let offset = 0; offset <= 10000; offset += 100) {
    sameAccount(owner, startedSession)
    const result = await playlistRequest(`?kind=${kind}&offset=${offset}`)
    sameAccount(owner, startedSession)
    if (!Array.isArray(result.data) || !isUUID(result.userId)) throw new RequestError('Update the backend to enable account playlist syncing.', 503)
    items.push(...result.data.map((value: unknown) => checkedPlaylist(value, kind)))
    if (result.data.length < 100) return items
  }
  throw new RequestError('This collection is too large to download in one session.', 503)
}
function requireAccount() { if (!account) throw new Error('Sign in to save playlists.'); return account }
function sameAccount(owner: string, startedSession: number) { if (account !== owner || session !== startedSession) throw new RequestError('Account changed. Reload before syncing.', 401) }
async function remoteFor(row: { playlist: Playlist }) { return (await remoteCollection(row.playlist.kind)).find(item => item.id === row.playlist.id) ?? null }
export async function syncPlaylists() {
  if (!account || typeof navigator !== 'undefined' && !navigator.onLine) return
  const owner = account, startedSession = session
  if (running.has(startedSession)) return running.get(startedSession)
  const work = async () => {
    for (let pass = 0; pass < 20; pass++) {
      sameAccount(owner, startedSession)
      const pending = (await offlinePlaylists.records(owner)).filter(row => row.playlist.syncStatus === 'pending')
      sameAccount(owner, startedSession)
      if (!pending.length) break
      for (const row of pending) {
        sameAccount(owner, startedSession)
        try {
          if (row.deleted) {
            let revision = row.baseRevision
            if (!revision) { const existing = await remoteFor(row); sameAccount(owner, startedSession); if (!existing) { await offlinePlaylists.acknowledge(row, null); continue } revision = existing.revision }
            await playlistRequest(`/${row.playlist.id}?revision=${revision}`, 'DELETE')
            sameAccount(owner, startedSession); await offlinePlaylists.acknowledge(row, null)
          } else {
            const parsed = parsePlaylist(row.playlist)
            if (!parsed.data) throw new RequestError(parsed.error!, 400)
            const result = await playlistRequest(row.baseRevision ? `/${row.playlist.id}` : '', row.baseRevision ? 'PUT' : 'POST', { ...parsed.data, ...(row.baseRevision ? { revision: row.baseRevision } : {}) })
            sameAccount(owner, startedSession); await offlinePlaylists.acknowledge(row, checkedPlaylist(result.data, row.playlist.kind, row.playlist.id))
          }
        } catch (error) {
          sameAccount(owner, startedSession)
          const status = error instanceof RequestError ? error.status : 0
          if (status === 409) {
            // A request may have committed just before connectivity was lost. Reconcile that case safely.
            const remote = await remoteFor(row).catch(() => undefined)
            sameAccount(owner, startedSession)
            if (remote !== undefined && (row.deleted ? !remote : remote && playlistContent(remote) === playlistContent(row.playlist))) { await offlinePlaylists.acknowledge(row, remote); continue }
          }
          await offlinePlaylists.markError(row, (error as Error).message, status === 409 || status === 400)
          return
        }
      }
    }
  }
  const promise = (typeof navigator !== 'undefined' && navigator.locks ? navigator.locks.request(`fitsync-playlists-${owner}`, work) : work()).finally(() => { running.delete(startedSession) })
  running.set(startedSession, promise)
  return promise
}
export async function listPlaylists(kind: PlaylistKind): Promise<Playlist[]> {
  const owner = requireAccount(), startedSession = session
  if (typeof navigator !== 'undefined' && !navigator.onLine) { const local = await offlinePlaylists.list(owner, kind); sameAccount(owner, startedSession); return local }
  try {
    await syncPlaylists()
    sameAccount(owner, startedSession)
    const remote = await remoteCollection(kind)
    sameAccount(owner, startedSession)
    await offlinePlaylists.merge(owner, kind, remote)
    const local = await offlinePlaylists.list(owner, kind)
    sameAccount(owner, startedSession); return local
  } catch (error) {
    sameAccount(owner, startedSession)
    if (error instanceof RequestError && [401, 403, 409].includes(error.status)) throw error
    const local = await offlinePlaylists.list(owner, kind); sameAccount(owner, startedSession); if (local.length) return local
    throw error
  }
}
export async function savePlaylist(input: PlaylistInput, base?: Playlist | null): Promise<Playlist> {
  const owner = requireAccount(), startedSession = session
  await offlinePlaylists.save(owner, input, base)
  sameAccount(owner, startedSession)
  await syncPlaylists()
  sameAccount(owner, startedSession)
  const row = await offlinePlaylists.get(owner, input.id)
  sameAccount(owner, startedSession)
  if (!row) throw new Error('This playlist is no longer on the device. Reload your collection.')
  if (row.playlist.syncStatus === 'conflict') throw new Error(row.playlist.syncError || 'Sync conflict. Make a copy or reload the account version.')
  return row.playlist
}
export async function deletePlaylist(playlist: Playlist) {
  const owner = requireAccount(), startedSession = session
  await offlinePlaylists.remove(owner, playlist)
  sameAccount(owner, startedSession)
  await syncPlaylists()
  const row = await offlinePlaylists.get(owner, playlist.id)
  sameAccount(owner, startedSession)
  if (row && !row.deleted) throw new Error(row.playlist.syncError || 'Deletion conflicted with a newer account version. Reload and review it.')
  return { pending: !!row }
}
export async function reloadAccountPlaylist(playlist: Playlist) {
  const owner = requireAccount(), startedSession = session
  const remote = (await remoteCollection(playlist.kind)).find(item => item.id === playlist.id) ?? null
  sameAccount(owner, startedSession); await offlinePlaylists.replace(owner, playlist.id, remote)
}

