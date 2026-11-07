import { isUUID, parsePlaylist, type Playlist, type PlaylistInput, type PlaylistKind } from '../../shared/playlists'
import { offlinePlaylists, playlistContent } from './playlist-offline'

let account: string | null = null
let running: Promise<void> | null = null
export function setPlaylistAccount(id: string | null) { account = id && isUUID(id) ? id : null }
export async function clearOfflinePlaylists() { account = null; await offlinePlaylists.clear() }
class RequestError extends Error { constructor(message: string, readonly status: number) { super(message) } }
export async function playlistRequest(path: string, method = 'GET', body?: unknown) {
  const startedAs = account
  let response: Response
  try { response = await fetch(`/api/playlists${path}`, { method, cache: 'no-store', signal: AbortSignal.timeout(15000), headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined }) }
  catch { throw new RequestError('Offline or unreachable. Your device copy is kept for syncing.', 0) }
  const result = await response.json().catch(() => null)
  if (!response.ok) throw new RequestError(response.status === 401 ? 'Sign in with a real FitSync account to sync playlists. The local admin tester is not a database account.' : result?.error || 'Playlist request failed. Please retry.', response.status)
  if (isUUID(result?.userId)) {
    if (account && account !== result.userId || startedAs && startedAs !== account) throw new RequestError('The signed-in account changed. Reload before continuing.', 401)
    account = result.userId
  }
  return result
}
async function remoteCollection(kind: PlaylistKind): Promise<Playlist[]> {
  const items: Playlist[] = []
  for (let offset = 0; offset <= 10000; offset += 100) {
    const result = await playlistRequest(`?kind=${kind}&offset=${offset}`)
    if (!Array.isArray(result.data) || !isUUID(result.userId)) throw new RequestError('Update the backend to enable account playlist syncing.', 503)
    items.push(...result.data)
    if (result.data.length < 100) return items
  }
  throw new RequestError('This collection is too large to download in one session.', 503)
}
function requireAccount() { if (!account) throw new Error('Sign in with a real FitSync account before saving offline playlists. The local admin tester has no database identity.'); return account }
function sameAccount(owner: string) { if (account !== owner) throw new RequestError('Account changed. Reload before syncing.', 401) }
async function remoteFor(row: { playlist: Playlist }) { return (await remoteCollection(row.playlist.kind)).find(item => item.id === row.playlist.id) ?? null }
export async function syncPlaylists() {
  if (!account || typeof navigator !== 'undefined' && !navigator.onLine) return
  if (running) return running
  const owner = account
  const work = async () => {
    for (let pass = 0; pass < 20; pass++) {
      sameAccount(owner)
      const pending = (await offlinePlaylists.records(owner)).filter(row => row.playlist.syncStatus === 'pending')
      if (!pending.length) break
      for (const row of pending) {
        sameAccount(owner)
        try {
          if (row.deleted) {
            let revision = row.baseRevision
            if (!revision) { const existing = await remoteFor(row); if (!existing) { await offlinePlaylists.acknowledge(row, null); continue } revision = existing.revision }
            await playlistRequest(`/${row.playlist.id}?revision=${revision}`, 'DELETE')
            sameAccount(owner); await offlinePlaylists.acknowledge(row, null)
          } else {
            const parsed = parsePlaylist(row.playlist)
            if (!parsed.data) throw new RequestError(parsed.error!, 400)
            const result = await playlistRequest(row.baseRevision ? `/${row.playlist.id}` : '', row.baseRevision ? 'PUT' : 'POST', { ...parsed.data, ...(row.baseRevision ? { revision: row.baseRevision } : {}) })
            sameAccount(owner); await offlinePlaylists.acknowledge(row, result.data)
          }
        } catch (error) {
          sameAccount(owner)
          const status = error instanceof RequestError ? error.status : 0
          if (status === 409) {
            // A request may have committed just before connectivity was lost. Reconcile that case safely.
            const remote = await remoteFor(row).catch(() => undefined)
            if (remote !== undefined && (row.deleted ? !remote : remote && playlistContent(remote) === playlistContent(row.playlist))) { await offlinePlaylists.acknowledge(row, remote); continue }
          }
          await offlinePlaylists.markError(row, (error as Error).message, status === 409 || status === 400)
          return
        }
      }
    }
  }
  running = (typeof navigator !== 'undefined' && navigator.locks ? navigator.locks.request(`fitsync-playlists-${owner}`, work) : work()).finally(() => { running = null })
  return running
}
export async function listPlaylists(kind: PlaylistKind): Promise<Playlist[]> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return offlinePlaylists.list(requireAccount(), kind)
  try {
    await syncPlaylists()
    const remote = await remoteCollection(kind)
    const owner = requireAccount()
    await offlinePlaylists.merge(owner, kind, remote)
    return offlinePlaylists.list(owner, kind)
  } catch (error) {
    if (error instanceof RequestError && [401, 403].includes(error.status)) throw error
    if (account) { const local = await offlinePlaylists.list(account, kind); if (local.length) return local }
    throw error
  }
}
export async function savePlaylist(input: PlaylistInput, base?: Playlist | null): Promise<Playlist> {
  const owner = requireAccount()
  await offlinePlaylists.save(owner, input, base)
  await syncPlaylists()
  sameAccount(owner)
  const row = await offlinePlaylists.get(owner, input.id)
  if (!row) throw new Error('This playlist is no longer on the device. Reload your collection.')
  if (row.playlist.syncStatus === 'conflict') throw new Error(row.playlist.syncError || 'Sync conflict. Make a copy or reload the account version.')
  return row.playlist
}
export async function deletePlaylist(playlist: Playlist) {
  const owner = requireAccount()
  await offlinePlaylists.remove(owner, playlist)
  await syncPlaylists()
  const row = await offlinePlaylists.get(owner, playlist.id)
  if (row && !row.deleted) throw new Error(row.playlist.syncError || 'Deletion conflicted with a newer account version. Reload and review it.')
  return { pending: !!row }
}
export async function reloadAccountPlaylist(playlist: Playlist) {
  const owner = requireAccount()
  const remote = (await remoteCollection(playlist.kind)).find(item => item.id === playlist.id) ?? null
  sameAccount(owner); await offlinePlaylists.replace(owner, playlist.id, remote)
}
