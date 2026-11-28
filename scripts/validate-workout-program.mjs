import assert from 'node:assert/strict'
import { build } from 'esbuild'

const bundle = await build({ stdin: { contents: "export * from './shared/workout-program'; export * from './shared/onboarding'; export * from './shared/daily-plans'; export {aiPlanCandidates} from './backend/lib/ai-plan';", resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, format: 'esm', platform: 'node' })
const engine = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'))
const draft = { ...engine.emptyOnboarding, goal: 'fat_loss', nutritionContext: 'standard', exerciseReadiness: 'ready', age: '28', gender: 'Man', heightCm: '175', weightKg: '75', targetWeightKg: '70', activity: 'Lightly active', experience: 'Intermediate', days: ['Mon', 'Wed', 'Fri'], workoutStartDate: '2026-11-30', sessionMinutes: '45', equipment: ['Bodyweight', 'Dumbbells', 'Barbell'], diet: 'No preference', allergiesReviewed: true, mealsPerDay: '3', cookingMinutes: '30', budget: 'Flexible' }
const profile = engine.readCompletedOnboarding({ ...draft, version: 2, completedAt: '2026-11-28T00:00:00Z' })
assert(profile)
assert.deepEqual(engine.validateOnboarding(profile, undefined, false, true, true), [])
for (const date of ['2026-11-29', '2026-11-31', '2026-02-29', 'not-a-date']) assert(engine.validateOnboarding({ ...draft, workoutStartDate: date }, 2).some(error => error.includes('start date')))
assert(engine.validWorkoutDate('2028-02-29'))
assert.equal(engine.addWorkoutDays('2028-02-28', 1), '2028-02-29')
assert(engine.validateOnboarding({ ...draft, days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] }, 2).some(error => error.includes('two rest days')))
assert(engine.validateOnboarding({ ...draft, workoutStartDate: '' }, 2, false, true, true).some(error => error.includes('start date')))
assert(engine.readCompletedOnboarding({ ...draft, workoutStartDate: undefined, workoutRestSeconds: undefined, targetWeightPace: undefined, version: 2, completedAt: '2026-11-28T00:00:00Z' }), 'Old profiles remain readable')
assert(engine.readCompletedOnboarding({ ...draft, workoutStartDate: undefined, days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], version: 2, completedAt: '2026-11-28T00:00:00Z' }), 'Old six-day profiles remain readable for editing')
assert.equal(engine.workoutWeightOutlook(profile).date, '2027-04-19')
assert.equal(engine.workoutWeightOutlook({ ...profile, targetWeightPace: '0.5' }).date, '2027-02-08')
for (const change of [{ age: '17' }, { targetWeightKg: '75' }, { targetWeightKg: '40' }, { targetWeightKg: '300' }, { weightKg: '' }]) assert.equal(engine.workoutWeightOutlook({ ...profile, ...change }).date, null)
assert.equal(engine.workoutWeightOutlook({ ...profile, days: ['Mon'] }).date, engine.workoutWeightOutlook(profile).date, 'Rest days must not imply proportional weight loss')
assert(engine.workoutDateNote(profile, '2026-11-23').includes('starts'))
assert(engine.workoutDateNote(profile, '2026-12-01').includes('rest day'))
assert.equal(engine.formulateDay(profile, 'workout', 0, 1, [], false, '2026-11-23').schedule.items.length, 0)
assert.equal(engine.formulateDay(profile, 'workout', 0, 1, [], false, '2026-12-01').schedule.items.length, 0)
assert.equal(engine.aiPlanCandidates(profile, 'workout', 0, 1, '2026-11-23').length, 0)
assert(engine.aiPlanCandidates(profile, 'workout', 0, 1, '2026-11-30').length > 0)
for (const goal of ['strength', 'muscle_gain', 'endurance', 'general_fitness']) for (const rest of ['auto', '60', '90', '120', '180', '240', '300']) {
  const p = { ...profile, goal, workoutRestSeconds: rest }
  const schedule = engine.formulateDay(p, 'workout', 0, 2, [], false, '2026-11-30').schedule
  assert(schedule.items.length > 0)
  assert(schedule.items.reduce((sum, item) => sum + engine.taskMinutes(item), 0) <= 45.02, 'Rest must fit inside the chosen session')
  for (const item of schedule.items) {
    const exercise = engine.workoutCatalog.find(exercise => exercise.id === item.exerciseId)
    if (exercise.category !== 'strength') continue
    const compound = ['Squat', 'Hinge', 'Push', 'Pull'].includes(exercise.movementPattern) && !/biceps|triceps|delts|calves|forearms/i.test(exercise.target)
    const bounds = engine.workoutRestPrescription(p, compound && exercise.equipment === 'barbell', compound)
    assert(item.restSeconds >= bounds.min && item.restSeconds <= bounds.max)
    if (rest !== 'auto') assert.equal(item.restSeconds, bounds.seconds, 'Do not pad a chosen rest duration')
  }
}
const apiBundle = await build({ stdin: { contents: "export {POST as systemPost} from './backend/app/api/plans/generate/route'; export {POST as aiPost} from './backend/app/api/plans/generate-ai/route';", resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, format: 'esm', platform: 'node', plugins: [{ name: 'workout-auth-fixture', setup(build) {
  build.onResolve({ filter: /lib[\\/]auth$/ }, () => ({ path: 'auth', namespace: 'fixture' }))
  build.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export async function authenticate(){return {user:{id:"workout-fixture",user_metadata:{fitsync_onboarding:globalThis.__workoutProfile}}}}', loader: 'js' }))
} }] })
const api = await import('data:text/javascript;base64,' + Buffer.from(apiBundle.outputFiles[0].text).toString('base64'))
globalThis.__workoutProfile = profile
try {
  const request = change => new Request('https://fitsync.test/api/plans/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'workout', day: 0, variation: 1, exclude: [], date: '2026-11-30', ...change }) })
  const response = await api.systemPost(request({}))
  assert.equal(response.status, 200)
  assert((await response.json()).schedule.items.length > 0)
  for (const post of [api.systemPost, api.aiPost]) for (const change of [{ date: '2026-11-23' }, { date: '2026-12-01' }, { date: '2026-11-31' }, { date: undefined }, { date: '2026-12-01', day: 1 }]) assert.equal((await post(request(change))).status, 400, 'Server must reject before-start, rest-day and mismatched date requests')
} finally { delete globalThis.__workoutProfile }
console.log('PASS workout program: valid dates/leap years, rest-day conflicts, two-rest-day rule, legacy reads, transparent weight scenarios, dated System/AI candidates and APIs, and goal-aware rest within session budgets.')
