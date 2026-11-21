import assert from 'node:assert/strict'
import { build } from 'esbuild'

const compiled = await build({ entryPoints: ['shared/onboarding.ts'], bundle: true, write: false, format: 'esm', platform: 'node' })
const { parseOnboarding, validateOnboarding, readCompletedOnboarding } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`)
const valid = {
  goal: 'muscle_gain', adult: true, ageRange: '25–34', age: '28', gender: 'Man', heightCm: '175', weightKg: '80', targetWeightKg: '85', focusAreas: ['Chest', 'Arms'],
  activity: 'Lightly active', experience: 'Beginner', days: ['Mon', 'Wed', 'Fri'],
  sessionMinutes: '30', equipment: ['Dumbbells'], adjustments: [], diet: 'Halal',
  allergiesReviewed: true, allergies: ['Peanuts'], otherAllergy: '', dislikes: '',
  mealsPerDay: '3', cookingMinutes: '30', budget: 'Budget-friendly',
}
assert.deepEqual(validateOnboarding(parseOnboarding(valid)), [])
const fatLoss = { ...valid, goal: 'fat_loss', weightKg: '50', targetWeightKg: '65' }
assert(validateOnboarding(parseOnboarding(fatLoss), 1).some(error => error.includes('must not be higher')), 'Reject a higher target for fat loss at the measurements step')
assert(validateOnboarding(parseOnboarding(fatLoss)).some(error => error.includes('must not be higher')), 'Reject a higher target on final/server validation')
for (const targetWeightKg of ['49.99', '50']) assert.deepEqual(validateOnboarding(parseOnboarding({ ...fatLoss, targetWeightKg })), [], 'Allow a lower or equal fat-loss target')
assert.deepEqual(validateOnboarding(parseOnboarding({ ...fatLoss, goal: 'muscle_gain' })), [], 'Changing the goal revalidates the same target')
assert(validateOnboarding(parseOnboarding({ ...fatLoss, weightKg: '45', targetWeightKg: '49' }), 1).length, 'Recheck the target when current weight changes')
const existingFatLoss = { ...fatLoss, version: 2, completedAt: new Date().toISOString() }
assert(readCompletedOnboarding(existingFatLoss), 'Existing contradictory targets must not invalidate an entire saved profile')
assert(validateOnboarding(parseOnboarding(existingFatLoss)).length, 'Existing contradictory targets require correction on the next save')
assert.equal(parseOnboarding({ ...valid, days: ['Mon', 'Mon'] }), null)
// The retired adult flag is not part of the allowlist; age controls planning eligibility.
assert.equal(parseOnboarding({ ...valid, adult: 'true' }).adult, undefined)
assert.deepEqual(validateOnboarding(parseOnboarding({ ...valid, age: '17', youthActivity: 'Low active' })), [])
assert.deepEqual(validateOnboarding(parseOnboarding({ ...valid, age: '13', youthActivity: 'Active' })), [])
assert(validateOnboarding(parseOnboarding({ ...valid, age: '16' }), 1).some(error => error.includes('total daily activity')))
assert(validateOnboarding(parseOnboarding({ ...valid, age: '16', youthActivity: 'unknown' }), 1).some(error => error.includes('total daily activity')))
for (const age of ['0', '3', '12']) assert(validateOnboarding(parseOnboarding({ ...valid, age }), 1).some(error => error.includes('13')), `Reject age ${age}`)
assert.equal(parseOnboarding({ ...valid, allergies: ['Milk', 123] }), null)
assert.equal(parseOnboarding({ ...valid, dislikes: 'x'.repeat(201) }), null)
for (const change of [
  { goal: 'instant_weight_loss' }, { age: '' }, { age: '28.5' }, { age: '121' }, { gender: 'unknown' },
  { focusAreas: [] }, { focusAreas: ['Overall', 'Arms'] }, { focusAreas: ['unknown'] }, { targetWeightKg: '-1' },
  { weightKg: '-1' }, { weightKg: 'NaN' }, { heightCm: '999' },
  { heightCm: '' }, { weightKg: '' }, { targetWeightKg: '' },
  { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
  { equipment: ['unknown'] }, { sessionMinutes: '999' },
  { allergiesReviewed: false }, { allergies: ['Other'], otherAllergy: '' },
  { diet: 'unknown' }, { mealsPerDay: '0' }, { budget: 'unknown' },
]) assert(validateOnboarding(parseOnboarding({ ...valid, ...change })).length > 0, JSON.stringify(change))
const allowed = parseOnboarding({ ...valid, admin: true, otherAllergy: 'unused' })
assert.equal(allowed.admin, undefined)
assert.equal(allowed.otherAllergy, '')
assert.equal(readCompletedOnboarding(valid), null)
assert.equal(readCompletedOnboarding({ ...valid, version: 1, completedAt: 'invalid' }), null)
assert(readCompletedOnboarding({ ...valid, version: 1, completedAt: new Date().toISOString() }))
assert.equal(parseOnboarding({ ...valid, focusAreas: ['Arms', 'Arms'] }), null)
assert.equal(parseOnboarding({ ...valid, focusAreas: null }), null)
assert.equal(readCompletedOnboarding({ ...valid, version: '2', completedAt: new Date().toISOString() }), null)
const legacy = { ...valid, version: 1, completedAt: new Date().toISOString() }
for (const field of ['age', 'gender', 'targetWeightKg', 'focusAreas']) delete legacy[field]
assert.equal(readCompletedOnboarding(legacy).weightKg, '80')
assert.deepEqual(readCompletedOnboarding(legacy).focusAreas, ['Overall'])
assert.equal(readCompletedOnboarding({ ...legacy, version: 2 }), null)
assert.equal(parseOnboarding({ ...valid, ageRange: 'wrong' }).ageRange, '25–34')
const previouslyCompleted = { ...valid, heightCm: '', weightKg: '', targetWeightKg: '', version: 2, completedAt: new Date().toISOString() }
assert(readCompletedOnboarding(previouslyCompleted), 'Preserve profiles saved before measurements became required')
assert.equal(validateOnboarding(parseOnboarding(previouslyCompleted), 1).length, 3, 'Require all measurements on the next save')
// Exercise the actual target-edit endpoint, including a previously saved conflicting target.
const routeBundle = await build({
  entryPoints: ['backend/app/api/progress/profile/route.ts'], bundle: true, write: false, format: 'esm', platform: 'node',
  plugins: [{ name: 'target-profile-auth-fixture', setup(builder) {
    builder.onLoad({ filter: /backend[\\/]lib[\\/]auth\.ts$/ }, () => ({ loader: 'js', contents: `export async function authenticate() { return { user: { id: 'target-test', user_metadata: { fitsync_onboarding: ${JSON.stringify(existingFatLoss)} } } } }` }))
  } }],
})
const { PATCH } = await import(`data:text/javascript;base64,${Buffer.from(routeBundle.outputFiles[0].text).toString('base64')}`)
const originalFetch = globalThis.fetch
let profileWrites = 0
globalThis.fetch = async (_url, options) => {
  profileWrites++
  const saved = JSON.parse(options.body).data.fitsync_onboarding
  assert(Number(saved.targetWeightKg) <= Number(saved.weightKg), 'Never persist an opposing fat-loss target')
  return Response.json({})
}
try {
  const updateTarget = weight => PATCH(new Request('https://fixture.test/api/progress/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer fixture' }, body: JSON.stringify({ targetWeightKg: weight }) }))
  assert.equal((await updateTarget(65)).status, 400, 'The API rejects a higher target independently of the UI')
  assert.equal(profileWrites, 0, 'Rejected targets never reach persistence')
  assert.equal((await updateTarget(50)).status, 200)
  assert.equal((await updateTarget(49.99)).status, 200)
  assert.equal(profileWrites, 2)
} finally { globalThis.fetch = originalFetch }
console.log('PASS: onboarding allowlist, required measurements, existing-profile compatibility, eligibility, goal/diet constraints, allergy confirmation and completed-profile validation')
