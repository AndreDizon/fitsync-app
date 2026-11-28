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
assert(e.validateOnboarding({ ...profile, workoutStartDate: '' }, 1, false, true, true).length)
assert(e.validateOnboarding({ ...profile, firstMealTime: '21:00', lastMealTime: '08:00' }, 3).length)
assert(e.validateOnboarding({ ...profile, energySex: 'invalid' }, 1).length)
assert(e.validateOnboarding({ ...profile, nutritionContext: '' }, 1, false, true, true).length)
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
assert.equal(result.planned, 12, 'Seven meal days and five workout days, starting Friday, span two stored weeks')
assert.equal(remote.size, 2)
assert.equal(e.cachedWeek('member', '2026-11-30').document.days[3].nutrition.source, 'Not planned', 'Never generate before the shared start')
assert(e.cachedWeek('member', '2026-11-30').document.days[5].workout.rest)
const before = JSON.stringify([...remote])
assert.equal((await e.prepareInitialPlans('member', profile)).planned, 0)
assert.equal(JSON.stringify([...remote]), before, 'Retries preserve generated plans and revisions')
globalThis.accountFixture = async () => { throw new Error('Connection unavailable') }
await assert.rejects(e.prepareInitialPlans('other', profile), /Connection unavailable/)
assert.equal(e.cachedWeek('other', '2026-11-30').document.days[4].nutrition.items.length, 0, 'Never overwrite an unknown remote week after failed refresh')
console.log('PASS onboarding planning: shared dates, first-week generation, two-week persistence, idempotency, sync failures, suitability checks, energy coefficients, meal windows and weekly recovery.')
