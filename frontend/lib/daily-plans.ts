import { blankWeek, currentWeek, formulateDay, parsePlanWeek, type PlanWeek } from '../../shared/daily-plans'
import { addWorkoutDays, initialPlanRange, validWorkoutDate, workoutDayIndex, workoutDateAllowed } from '../../shared/workout-program'
import { validateOnboarding, type OnboardingProfile } from '../../shared/onboarding'
import { accountRequest } from './account-request'
export type StoredWeek = { document: PlanWeek; pending: boolean; conflict?: boolean; error?: string; token: string }
const prefix = 'fitsync-private-daily-plan:'
let epoch = 0
const key = (owner: string, week: string) => prefix + owner + ':' + week
const announcePlanChange = (owner:string,week:string) => { if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('fitsync-plan-updated',{detail:{owner,week}})) }
export function clearDailyPlanCopies() { epoch++; try { for (const name of Object.keys(localStorage)) if (name.startsWith(prefix)) localStorage.removeItem(name) } catch {} }
export async function requestAiDay(owner: string, kind: 'workout' | 'nutrition', day: number, variation: number, signal: AbortSignal, date?: string) {
  if (owner === 'local-tester') throw new Error('Sign in to a regular account to use AI formulate. System formulate also works offline.')
  if (!navigator.onLine) throw new Error('AI formulate needs internet. Use System formulate while offline.')
  const started = epoch
  const response = await fetch('/api/plans/generate-ai', {
    method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, day, variation, date }), signal: AbortSignal.any([signal, AbortSignal.timeout(50000)]),
  })
  const value = await response.json().catch(() => { throw new Error('AI formulation is temporarily unavailable. Your plan has not changed. Try System formulate.') })
  if (!response.ok) throw new Error(value.error || 'AI formulation is unavailable. Try System formulate.')
  if (started !== epoch || value.userId !== owner) throw new Error('Account changed. Reload before formulating a plan.')
  const document = blankWeek('2026-01-05')
  document.days[day][kind] = value.schedule
  const valid = parsePlanWeek(document)
  if (!valid || value.schedule?.source !== 'AI-formulated' || !value.schedule.items.length || value.schedule.rest || !Array.isArray(value.notes) || value.notes.some((note: unknown) => typeof note !== 'string' || note.length > 2000)) throw new Error('AI returned an invalid day. Your plan has not changed.')
  return { schedule: valid.days[day][kind], notes: value.notes as string[] }
}
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
  localStorage.setItem(key(owner, document.week), JSON.stringify(saved)); announcePlanChange(owner,document.week); return saved
}
async function request(owner: string, week: string, document?: PlanWeek) {
  const value = await accountRequest('/api/plans' + (document ? '' : '?week=' + week), { method: document ? 'PUT' : 'GET', cache: 'no-store', headers: document ? { 'Content-Type': 'application/json' } : undefined, body: document ? JSON.stringify(document) : undefined, signal: AbortSignal.timeout(15000) }, 'Plan refresh')
  if (value.userId !== owner) throw new Error('Account changed. Reload before syncing.')
  if (!Object.hasOwn(value, 'data') || document && !value.data) throw new Error('The account service did not confirm this plan. Your device copy is kept.')
  const parsed = value.data ? parsePlanWeek(value.data) : null
  if (value.data && (!parsed || parsed.week !== week)) throw new Error('The account plan has invalid data. Your device copy is kept.')
  return parsed
}
const pending = new Map<string, Promise<StoredWeek>>()
export type PreparationProgress = { completed: number; total: number; through: string | null }
const preparing = new Map<string, { promise: Promise<{ planned: number; attention: string[]; pending: boolean; start: string; end: string; days: number }>; listeners: Set<(progress: PreparationProgress) => void>; progress: PreparationProgress }>()
/** Prepare the full inclusive draft range, preserving every existing schedule and revision. */
export function prepareInitialPlans(owner: string, profile: OnboardingProfile, onProgress?: (progress: PreparationProgress) => void) {
  const id = owner + ':' + profile.completedAt
  const existing = preparing.get(id)
  if (existing) { if (onProgress) { existing.listeners.add(onProgress); onProgress(existing.progress) } return existing.promise }
  const listeners = new Set<(progress: PreparationProgress) => void>(onProgress ? [onProgress] : [])
  let progress: PreparationProgress = { completed: 0, total: 0, through: null }
  const report = (value: PreparationProgress) => { progress = value; const entry = preparing.get(id); if (entry) entry.progress = value; listeners.forEach(listener => listener(value)) }
  const started = epoch
  const run = async () => {
    const problems = validateOnboarding(profile, undefined, false, true, true)
    if (problems.length) throw new Error(problems[0] + ' Review your onboarding preferences before preparing plans.')
    const start = profile.workoutStartDate || ''
    if (!validWorkoutDate(start) || !workoutDateAllowed(start, profile.days)) throw new Error('Review your shared start date and training days in onboarding.')
    const range = initialPlanRange(profile)
    if (!range) throw new Error('Review your plan dates; the full range must fit within the supported calendar.')
    const dates = Array.from({ length: range.days }, (_, offset) => addWorkoutDays(start, offset))
    report({ completed: 0, total: range.days, through: null })
    const weeks = [...new Set(dates.map(date => currentWeek(new Date(date + 'T12:00:00Z'), 'UTC')))]
    const attention = new Set<string>(); let planned = 0, hasPending = false
    const confirmedWeeks: string[] = []
    const active = () => { if (started !== epoch) throw new Error('Account changed. Sign in again before preparing plans.') }
    for (const [weekIndex, week] of weeks.entries()) {
      active()
      const saved = await syncWeek(owner, week)
      active()
      if (saved.error || saved.conflict) throw new Error(saved.error || 'Resolve the saved-week conflict before preparing plans.')
      const document = structuredClone(saved.document)
      let changed = false
      const weekDates = dates.filter(date => currentWeek(new Date(date + 'T12:00:00Z'), 'UTC') === week)
      for (const date of weekDates) {
        const day = workoutDayIndex(date)
        for (const kind of ['workout', 'nutrition'] as const) {
          const previous = document.days[day][kind]
          if (previous.items.length || previous.source !== 'Not planned') continue
          if (kind === 'workout' && !workoutDateAllowed(date, profile.days)) {
            document.days[day].workout = { ...previous, rest: true, source: 'Scheduled recovery' }; changed = true; continue
          }
          const result = formulateDay(profile, kind, day, weekIndex + 1, [], false, date)
          if (!result.schedule.items.length) { result.notes.forEach(note => attention.add(note)); continue }
          document.days[day][kind] = result.schedule; planned++; changed = true
          result.notes.filter(note => /gap|incomplete|fewer than two|may not cover/.test(note)).forEach(note => attention.add(note.includes('gap') ? 'Some meal drafts have energy, protein, fibre or produce gaps. Review their foods and portions; the generated range is not a verified complete diet.' : note))
        }
      }
      if (changed) {
        active()
        for (;;) {
          try { storeWeek(owner, document, saved.token); break }
          catch (error) {
            if (!(error instanceof DOMException) || error.name !== 'QuotaExceededError') throw error
            const evict = confirmedWeeks.findIndex(candidate => {
              const copy = cachedWeek(owner, candidate)
              return candidate !== weeks[0] && !copy.pending && !copy.conflict && copy.document.revision > 0
            })
            if (owner === 'local-tester' || evict < 0) throw new Error('Device storage is full. Completed weeks are kept; free browser storage and retry to finish the remaining dates.')
            // Only discard a replaceable cache after account storage confirmed that exact week.
            localStorage.removeItem(key(owner, confirmedWeeks.splice(evict, 1)[0]))
            attention.add('Some synced weeks are stored in your account without a device copy. Select those dates online to load them.')
          }
        }
      }
      const synced = changed ? await syncWeek(owner, week) : saved
      active()
      if (synced.conflict) throw new Error('This week changed elsewhere. Your device copy is preserved; reload before continuing.')
      hasPending ||= synced.pending
      if (synced.error) throw new Error('Plans through this week are kept on your device, but sync could not finish. Retry preparation to resume; existing plans will be preserved.')
      if (!synced.pending && changed && synced.document.revision > 0) confirmedWeeks.push(week)
      report({ completed: progress.completed + weekDates.length, total: range.days, through: weekDates[weekDates.length - 1] })
      // Yield between weeks so long-range preparation leaves the page responsive.
      await new Promise(resolve => setTimeout(resolve, 0))
    }
    if (owner === 'local-tester') attention.add('Tester plans are saved only on this device.')
    return { planned, attention: [...attention], pending: hasPending && owner !== 'local-tester', start, end: range.end, days: range.days }
  }
  const work = run().finally(() => preparing.delete(id)); preparing.set(id, { promise: work, listeners, progress }); return work
}
export async function syncWeek(owner: string, week: string): Promise<StoredWeek> {
  const id = key(owner, week)
  const started = epoch, workId = id + ':' + started
  if (pending.has(workId)) return pending.get(workId)!
  const run = async () => {
    let local = cachedWeek(owner, week)
    let sent = local
    if (started !== epoch || !navigator.onLine || owner === 'local-tester') return local
    try {
      for (let pass = 0; pass < 20; pass++) {
        sent = cachedWeek(owner, week)
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
        } else {
          // An authoritative empty response clears a removed remote week and
          // any old network error. New pending edits were handled above.
          const document = blankWeek(week)
          const unchanged = JSON.stringify(local.document) === JSON.stringify(document)
          local = { document, token: unchanged && local.token ? local.token : crypto.randomUUID(), pending: false }
          localStorage.setItem(id, JSON.stringify(local))
        }
        return local
      }
      return local
    } catch (error) {
      if (started !== epoch) return cachedWeek(owner, week)
      local = cachedWeek(owner, week)
      if (local.token !== sent.token) return local
      if ((error as { status?: number }).status === 409) {
        const remote = await request(owner, week).catch(() => null)
        if (started !== epoch) return cachedWeek(owner, week)
        local = cachedWeek(owner, week)
        if (local.token !== sent.token) return local
        if (remote && JSON.stringify({ ...remote, revision: 0 }) === JSON.stringify({ ...local.document, revision: 0 })) { local = { document: remote, pending: false, token: local.token || crypto.randomUUID() } }
        else { local.conflict = true; local.error = (error as Error).message }
      } else local.error = (error as Error).message
      localStorage.setItem(id, JSON.stringify(local)); return local
    }
  }
  const work = (navigator.locks ? navigator.locks.request('daily-plan-' + id, run) : run()).finally(() => {pending.delete(workId);if(started===epoch)announcePlanChange(owner,week)}); pending.set(workId, work); return work
}
export async function reloadWeek(owner: string, week: string) {
  const started = epoch
  const remote = await request(owner, week)
  if (started !== epoch) throw new Error('Account changed. Sign in again before loading this week.')
  const saved = { document: remote ?? blankWeek(week), pending: false, token: crypto.randomUUID() }
  localStorage.setItem(key(owner, week), JSON.stringify(saved)); announcePlanChange(owner,week); return saved
}
