import assert from 'node:assert/strict'
import { build } from 'esbuild'

const compiled = await build({
  stdin: { contents: `export * from './backend/lib/ai-plan'; export {POST} from './backend/app/api/plans/generate-ai/route'; export * from './shared/daily-plans'; export {readCompletedOnboarding} from './shared/onboarding';`, resolveDir: process.cwd(), loader: 'ts' },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'auth-fixture', setup(build) {
    build.onResolve({ filter: /lib\/auth$/ }, () => ({ path: 'auth', namespace: 'fixture' }))
    build.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export async function authenticate(){return globalThis.__aiPlanAuth}', loader: 'js' }))
  } }],
})
const engine = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].text).toString('base64'))
const profile = engine.readCompletedOnboarding({ goal: 'muscle_gain', ageRange: '', age: '28', gender: 'Man', heightCm: '175', weightKg: '75', targetWeightKg: '80', timeZone: 'Asia/Manila', focusAreas: ['Overall'], activity: 'Lightly active', experience: 'Beginner', days: ['Mon', 'Wed', 'Fri'], workoutStartTime: '08:00', sessionMinutes: '30', equipment: ['Bodyweight', 'Dumbbells'], adjustments: ['Low impact / no jumping'], diet: 'Vegan', allergiesReviewed: true, allergies: ['Peanuts'], otherAllergy: '', dislikes: 'mango', mealsPerDay: '3', cookingMinutes: '60', budget: 'Flexible', version: 2, completedAt: new Date().toISOString() })
assert(profile)
for (const kind of ['workout', 'nutrition']) {
  const candidates = engine.aiPlanCandidates(profile, kind, 0, 99999)
  assert(candidates.length > 0 && candidates.length <= 4)
  for (const { schedule } of candidates) {
    const week = engine.blankWeek('2026-01-05'); week.days[0][kind] = schedule
    assert(engine.parsePlanWeek(week))
    assert(schedule.variation <= 100000)
    assert(schedule.items.every(item => !item.done && !item.actualSets))
    if (kind === 'workout') {
      const eligible = new Set(engine.eligibleExercises(profile).map(item => item.id))
      assert(schedule.items.every(item => eligible.has(item.exerciseId)))
      assert(schedule.items.reduce((sum, item) => sum + engine.taskMinutes(item), 0) <= 30.01)
    } else {
      const eligible = new Set(engine.eligibleFoods(profile).map(item => item.id))
      assert(schedule.items.every(item => eligible.has(item.foodId)))
    }
  }
}
assert.deepEqual(engine.aiPlanCandidates(profile, 'workout', 1, 1), [], 'Never turn a rest day into a workout')
assert.deepEqual(engine.aiPlanCandidates({ ...profile, allergies: ['Other'] }, 'nutrition', 0, 1), [], 'Unresolved allergies cannot be bypassed')
const teen = { ...profile, age: '16', youthActivity: 'Low active', goal: 'fat_loss', targetWeightKg: '70' }
const originalFetch = globalThis.fetch, originalKey = process.env.OPENROUTER_API_KEY
let selection = '{"option":1}', status = 200, calls = [], catalogCalls = 0
globalThis.fetch = async (url, init) => {
  if (String(url).endsWith('/models')) {
    catalogCalls++
    return Response.json({ data: [
      { id: 'paid:free', pricing: { prompt: '1', completion: '0' } },
      { id: 'missing:free' },
      { id: 'fixture:free', pricing: { prompt: '0', completion: '0' } },
    ] })
  }
  const body = JSON.parse(init.body); calls.push(body)
  assert.equal(body.model, 'fixture:free'); assert.equal(body.provider.allow_fallbacks, false)
  return status === 200 ? Response.json({ choices: [{ message: { content: selection } }] }) : Response.json({}, { status })
}
try {
  delete process.env.OPENROUTER_API_KEY
  await assert.rejects(engine.formulateAiDay(profile, 'workout', 0, 1, new AbortController().signal), /OPENROUTER_API_KEY/)
  assert.equal(calls.length, 0)
  process.env.OPENROUTER_API_KEY = 'test-only-placeholder'
  for (const kind of ['workout', 'nutrition']) {
    const result = await engine.formulateAiDay(profile, kind, 0, 1, new AbortController().signal)
    const expected = engine.aiPlanCandidates(profile, kind, 0, 1)[1]
    assert.equal(result.schedule.source, 'AI-formulated')
    assert.deepEqual(result.schedule.items.map(({ id, ...item }) => item), expected.schedule.items.map(({ id, ...item }) => item))
    const context = JSON.parse(calls.at(-1).messages[1].content)
    for (const key of ['age', 'gender', 'heightCm', 'weightKg', 'targetWeightKg', 'allergies', 'otherAllergy', 'dislikes', 'email', 'userId', 'completedAt']) assert(!(key in context), key + ' leaked')
  }
  assert.equal(catalogCalls, 1, 'Cache the verified free model list')
  selection = '{"option":0}'
  await engine.formulateAiDay(teen, 'nutrition', 0, 1, new AbortController().signal)
  const teenContext = JSON.parse(calls.at(-1).messages[1].content)
  assert.equal(teenContext.ageBand, 'teen'); assert.equal(teenContext.goal, 'balanced activity and growth')
  assert.equal(teenContext.energyReference, engine.planTargets(teen).energy)
  for (const bad of ['not json', '{"option":99}', '{"option":-1}', '{"option":"0"}', '{"option":0,"calories":100}', 'null']) {
    selection = bad
    await assert.rejects(engine.formulateAiDay(profile, 'workout', 0, 1, new AbortController().signal), /valid plan choice/)
  }
  status = 429
  await assert.rejects(engine.formulateAiDay(profile, 'workout', 0, 1, new AbortController().signal), /busy/)
  status = 401
  await assert.rejects(engine.formulateAiDay(profile, 'workout', 0, 1, new AbortController().signal), /provider access/)
  status = 200; selection = '{"option":0}'
  const request = body => new Request('https://fitsync.test/api/plans/generate-ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  globalThis.__aiPlanAuth = { response: Response.json({ error: 'Authentication required' }, { status: 401 }) }
  assert.equal((await engine.POST(request({ kind: 'workout', day: 0, variation: 1 }))).status, 401)
  globalThis.__aiPlanAuth = { user: { id: 'fixture-owner', user_metadata: { fitsync_onboarding: profile } } }
  for (const bad of [null, {}, { kind: 'other', day: 0, variation: 0 }, { kind: 'workout', day: 7, variation: 1 }, { kind: 'workout', day: 0, variation: -1 }]) assert.equal((await engine.POST(request(bad))).status, 400)
  for (let i = 0; i < 4; i++) {
    const response = await engine.POST(request({ kind: 'workout', day: 0, variation: 1, profile: { goal: 'endurance' }, userId: 'attacker' }))
    assert.equal(response.status, 200)
    const value = await response.json(); assert.equal(value.userId, 'fixture-owner')
    assert.equal(JSON.parse(calls.at(-1).messages[1].content).goal, 'muscle_gain')
  }
  assert.equal((await engine.POST(request({ kind: 'workout', day: 0, variation: 1 }))).status, 429)
  console.log('PASS AI plans: eligible catalogues, rest days, allergy exclusions, duration limits, teen targets, privacy, strict choices, free-only routing, provider failures, authentication and burst limits.')
} finally {
  globalThis.fetch = originalFetch
  if (originalKey === undefined) delete process.env.OPENROUTER_API_KEY; else process.env.OPENROUTER_API_KEY = originalKey
  delete globalThis.__aiPlanAuth
}
