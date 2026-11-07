import { blankWeek, parsePlanWeek, type PlanWeek } from '../../shared/daily-plans'
export type StoredWeek = { document: PlanWeek; pending: boolean; conflict?: boolean; error?: string; token: string }
const prefix = 'fitsync-private-daily-plan:'
let epoch = 0
const key = (owner: string, week: string) => prefix + owner + ':' + week
export function clearDailyPlanCopies() { epoch++; try { for (const name of Object.keys(localStorage)) if (name.startsWith(prefix)) localStorage.removeItem(name) } catch {} }
export function cachedWeek(owner: string, week: string): StoredWeek {
  let raw: string | null = null
  try { raw = localStorage.getItem(key(owner, week)) } catch {}
  if (raw) { try { const saved = JSON.parse(raw); const document = parsePlanWeek(saved.document); if (document && document.week === week) return { ...saved, document } } catch {} }
  return { document: blankWeek(week), pending: false, token: '' }
}
export function storeWeek(owner: string, document: PlanWeek, token: string): StoredWeek {
  const current = cachedWeek(owner, document.week)
  if (current.token !== token) throw new Error('This week changed in another tab. Reload before editing.')
  const valid = parsePlanWeek(document)
  if (!valid) throw new Error('Check the times, portions and exercise targets before saving.')
  // Acknowledgement can advance the revision without changing this tab's content token.
  valid.revision = current.document.revision
  const saved: StoredWeek = { document: valid, pending: true, token: crypto.randomUUID() }
  localStorage.setItem(key(owner, document.week), JSON.stringify(saved)); return saved
}
async function request(owner: string, week: string, document?: PlanWeek) {
  const response = await fetch('/api/plans' + (document ? '' : '?week=' + week), { method: document ? 'PUT' : 'GET', cache: 'no-store', headers: document ? { 'Content-Type': 'application/json' } : undefined, body: document ? JSON.stringify(document) : undefined, signal: AbortSignal.timeout(15000) })
  const value = await response.json()
  if (!response.ok) throw Object.assign(new Error(value.error || 'Unable to sync this week.'), { status: response.status })
  if (value.userId !== owner) throw new Error('Account changed. Reload before syncing.')
  if (value.data && !parsePlanWeek(value.data)) throw new Error('The account plan has invalid data. Your device copy is kept.')
  return value.data as PlanWeek | null
}
const pending = new Map<string, Promise<StoredWeek>>()
export async function syncWeek(owner: string, week: string): Promise<StoredWeek> {
  const id = key(owner, week)
  if (pending.has(id)) return pending.get(id)!
  const run = async () => {
    const started = epoch
    let local = cachedWeek(owner, week)
    if (!navigator.onLine || owner === 'local-tester') return local
    try {
      for (let pass = 0; pass < 20; pass++) {
        const sent = cachedWeek(owner, week)
        if (sent.conflict) return sent
        const remote = await request(owner, week, sent.pending ? sent.document : undefined)
        if (started !== epoch) return cachedWeek(owner, week)
        local = cachedWeek(owner, week)
        // A signout may have removed the copy while the request was running.
        if (sent.token && !local.token) return local
        if (local.pending && local.token !== sent.token) {
          if (remote && !sent.pending && remote.revision !== sent.document.revision) { local.conflict = true; local.error = 'The account week changed while you edited. Your device version is preserved.'; localStorage.setItem(id, JSON.stringify(local)); return local }
          if (remote && sent.pending) { local.document.revision = remote.revision; localStorage.setItem(id, JSON.stringify(local)) }
          continue
        }
        if (remote) {
          const sameContent = JSON.stringify({ ...remote, revision: 0 }) === JSON.stringify({ ...local.document, revision: 0 })
          local = { document: remote, token: (sent.pending || sameContent) && local.token ? local.token : crypto.randomUUID(), pending: false }; localStorage.setItem(id, JSON.stringify(local))
        }
        return local
      }
      return local
    } catch (error) {
      if (started !== epoch) return cachedWeek(owner, week)
      local = cachedWeek(owner, week); local.error = (error as Error).message
      if ((error as { status?: number }).status === 409) {
        const remote = await request(owner, week).catch(() => null)
        if (started !== epoch) return cachedWeek(owner, week)
        if (remote && JSON.stringify({ ...remote, revision: 0 }) === JSON.stringify({ ...local.document, revision: 0 })) { local = { document: remote, pending: false, token: local.token || crypto.randomUUID() } }
        else local.conflict = true
      }
      localStorage.setItem(id, JSON.stringify(local)); return local
    }
  }
  const work = (navigator.locks ? navigator.locks.request('daily-plan-' + id, run) : run()).finally(() => pending.delete(id)); pending.set(id, work); return work
}
export async function reloadWeek(owner: string, week: string) {
  const started = epoch
  const remote = await request(owner, week)
  if (started !== epoch) throw new Error('Account changed. Sign in again before loading this week.')
  const saved = { document: remote ?? blankWeek(week), pending: false, token: crypto.randomUUID() }
  localStorage.setItem(key(owner, week), JSON.stringify(saved)); return saved
}
