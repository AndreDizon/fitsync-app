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
console.log('PASS: onboarding allowlist, required measurements, existing-profile compatibility, eligibility, goal/diet constraints, allergy confirmation and completed-profile validation')
