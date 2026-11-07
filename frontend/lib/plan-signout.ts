import { pendingVisits, syncProgressVisits } from './progress'
import { cachedWeek, syncWeek } from './daily-plans'
import { offlinePlaylists } from './playlist-offline'
import { syncPlaylists } from './playlists'
function pendingWeeks(owner: string) {
  const prefix = 'fitsync-private-daily-plan:' + owner + ':'
  return Object.keys(localStorage).filter(key => key.startsWith(prefix)).map(key => key.slice(prefix.length)).filter(week => { const row = cachedWeek(owner, week); return row.pending || row.conflict })
}
export async function pendingPlanEdits(owner: string | null) {
  if (!owner) return 0
  const playlists = await offlinePlaylists.records(owner)
  return (pendingVisits(owner).length ? 1 : 0) + pendingWeeks(owner).length + playlists.filter(row => row.playlist.syncStatus === 'pending' || row.playlist.syncStatus === 'conflict').length
}
export async function syncBeforeSignout(owner: string) {
  if (!navigator.onLine) throw new Error('Reconnect to sync your changes before signing out.')
  await Promise.all([syncProgressVisits(owner), syncPlaylists(), ...pendingWeeks(owner).map(week => syncWeek(owner, week))])
  if (await pendingPlanEdits(owner)) throw new Error('Some changes could not sync or have a conflict. Stay signed in and resolve them before signing out.')
}
