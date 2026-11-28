import assert from 'node:assert/strict'
import { build } from 'esbuild'

const bundle = await build({ stdin: { contents: "export * from './shared/onboarding'; export * from './shared/daily-plans'; export * from './shared/workout-program'; export * from './frontend/lib/daily-plans';", resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, format: 'esm', platform: 'node', plugins: [{ name: 'account-fixture', setup(build) {
  build.onResolve({ filter: /^\.\/account-request$/ }, () => ({ path: 'account', namespace: 'fixture' }))
  build.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export async function accountRequest(url, options) { return globalThis.accountFixture(url, options) }', loader: 'js' }))
} }] })
const e = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'))
const profile = { ...e.emptyOnboarding, goal: 'general_fitness', age: '28', gender: 'Prefer not to say', heightCm: '175', weightKg: '75', targetWeightKg: '75', activity: 'Lightly active', nutritionContext: 'standard', exerciseReadiness: 'ready', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], workoutStartDate: '2026-12-04', experience: 'Beginner', sessionMinutes: '45', equipment: ['Bodyweight', 'Dumbbells'], diet: 'No preference', allergiesReviewed: true, mealsPerDay: '3', cookingMinutes: '30', budget: 'Flexible', firstMealTime: '07:30', lastMealTime: '20:30', version: 2, completedAt: '2026-11-28T00:00:00Z' }
assert.deepEqual(e.validateOnboarding(profile, undefined, false, true, true), [])
assert.deepEqual(e.validateOnboarding({ ...profile, days: [] }, 1, false, true, true), [], 'Page two must not require a training schedule from page three')
assert(e.validateOnboarding({ ...profile, workoutStartDate: '' }, 2, false, true, true).length)
assert(e.validateOnboarding({ ...profile, firstMealTime: '21:00', lastMealTime: '08:00' }, 3).length)
assert(e.validateOnboarding({ ...profile, energySex: 'invalid' }, 1).length)
assert(e.validateOnboarding({ ...profile, nutritionContext: '' }, 3, false, true, true).length)
assert.equal(e.planTargets({ ...profile, nutritionContext: 'review' }).energy, null)
assert.equal(e.workoutWeightOutlook({ ...profile, nutritionContext: 'review', targetWeightKg: '70' }).date, null)
assert.equal(e.formulateDay({ ...profile, exerciseReadiness: 'review' }, 'workout', 4, 1, [], false, '2026-12-04').schedule.items.length, 0)
const female = e.planTargets({ ...profile, energySex: 'female' }), male = e.planTargets({ ...profile, energySex: 'male' }), range = e.planTargets(profile)
assert(female.energy < male.energy)
assert.deepEqual(range.energyRange, [female.energy, male.energy])
assert.equal(e.formulateDay(profile, 'nutrition', 3, 1, [], false, '2026-12-03').schedule.items.length, 0)
assert(e.formulateDay(profile, 'nutrition', 5, 1, [], false, '2026-12-05').schedule.items.length, 'Meals must continue on rest days')
const mealTimes = [...new Set(e.formulateDay(profile, 'nutrition', 4, 1, [], false, '2026-12-04').schedule.items.map(item => item.time))]
assert.deepEqual(mealTimes, ['07:30', '14:00', '20:30'])
for (let mask = 1; mask < 128; mask++) {
  const days = e.days.filter((_, i) => mask & (1 << i)), strength = e.strengthTrainingDays(days)
  assert(strength.length <= 3)
  assert(!strength.some(day => strength.includes((day + 1) % 7)), 'Strength days must permit recovery across the week boundary')
}
const storage = new Map()
globalThis.localStorage = { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) }
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } })
const remote = new Map()
globalThis.accountFixture = async (url, options) => {
  if (options.method === 'PUT') { const document = JSON.parse(options.body); document.revision++; remote.set(document.week, document); return { userId: 'member', data: document } }
  return { userId: 'member', data: remote.get(new URL(url, 'https://fixture.test').searchParams.get('week')) || null }
}
const result = await e.prepareInitialPlans('member', profile)
assert.equal(result.planned, 48, 'The no-target fallback covers 28 meal days and 20 training days')
assert.equal(result.end, '2026-12-31')
assert.equal(result.days, 28)
assert.equal(remote.size, 5)
assert.equal(e.cachedWeek('member', '2026-11-30').document.days[3].nutrition.source, 'Not planned', 'Never generate before the shared start')
assert(e.cachedWeek('member', '2026-11-30').document.days[5].workout.rest)
const before = JSON.stringify([...remote])
assert.equal((await e.prepareInitialPlans('member', profile)).planned, 0)
assert.equal(JSON.stringify([...remote]), before, 'Retries preserve generated plans and revisions')
const scenario = { ...profile, goal: 'fat_loss', targetWeightKg: '74', targetWeightPace: '0.5', completedAt: '2026-11-29T00:00:00Z' }
storage.clear(); remote.clear()
const progress = []
const full = await e.prepareInitialPlans('member', scenario, value => progress.push(value))
assert.equal(full.end, '2026-12-18')
assert.equal(full.days, 15)
assert.equal(full.planned, 26)
assert.equal(progress.at(-1).completed, 15)
assert.equal(progress.at(-1).through, '2026-12-18')
assert.equal(e.cachedWeek('member', '2026-12-14').document.days[5].nutrition.source, 'Not planned', 'Never generate past the inclusive end date')
assert(e.cachedWeek('member', '2026-12-14').document.days[4].nutrition.items.length, 'Include the end date itself')
const first = e.cachedWeek('member', '2026-11-30').document.days[4].nutrition
const next = e.cachedWeek('member', '2026-12-07').document.days[4].nutrition
assert.notDeepEqual(first.items.map(item => item.foodId), next.items.map(item => item.foodId), 'Vary the menu between weeks')
assert.equal(e.initialPlanRange({ ...profile, age: '17' }).basis, 'review')
assert.equal(e.initialPlanRange({ ...profile, workoutStartDate: '2200-12-25' }), null, 'Fallback must stay in the supported calendar')

if (process.argv.includes('--long')) {
  storage.clear(); remote.clear()
  const basicSet = globalThis.localStorage.setItem
  globalThis.localStorage.setItem = (key, value) => {
    const size = [...storage.entries()].reduce((sum, [name, data]) => sum + (name === key ? 0 : data.length * 2), 0) + value.length * 2
    if (size > 300000) throw new DOMException('Fixture quota', 'QuotaExceededError')
    basicSet(key, value)
  }
  const longProfile = { ...profile, goal: 'fat_loss', weightKg: '95', targetWeightKg: '69', targetWeightPace: '0.25', completedAt: '2026-11-30T00:00:00Z' }
  const longResult = await e.prepareInitialPlans('member', longProfile)
  assert.equal(longResult.days, 729)
  assert.equal(longResult.end, e.workoutWeightOutlook(longProfile).date)
  assert.equal(remote.size, 105, 'All weeks must reach account storage, even under device quota pressure')
  for (const document of remote.values()) assert(e.parsePlanWeek(document))
  assert(longResult.attention.some(note => note.includes('without a device copy')))
  globalThis.localStorage.setItem = basicSet
}
globalThis.accountFixture = async () => { throw new Error('Connection unavailable') }
await assert.rejects(e.prepareInitialPlans('other', profile), /Connection unavailable/)
assert.equal(e.cachedWeek('other', '2026-11-30').document.days[4].nutrition.items.length, 0, 'Never overwrite an unknown remote week after failed refresh')
console.log('PASS onboarding planning: shared dates, full-range inclusive generation, four-week fallback, weekly variation, progress and multiweek persistence, idempotency, sync failures, suitability checks, energy coefficients, meal windows and weekly recovery.')
