import assert from 'node:assert/strict'
import { build } from 'esbuild'

const compiled = await build({ entryPoints: ['shared/onboarding.ts'], bundle: true, write: false, format: 'esm', platform: 'node' })
const { parseOnboarding, validateOnboarding, readCompletedOnboarding } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`)
const valid = {
  goal: 'muscle_gain', adult: true, ageRange: '25–34', age: '28', gender: 'Man', heightCm: '', weightKg: '80', targetWeightKg: '85', focusAreas: ['Chest', 'Arms'],
  activity: 'Lightly active', experience: 'Beginner', days: ['Mon', 'Wed', 'Fri'],
  sessionMinutes: '30', equipment: ['Dumbbells'], adjustments: [], diet: 'Halal',
  allergiesReviewed: true, allergies: ['Peanuts'], otherAllergy: '', dislikes: '',
  mealsPerDay: '3', cookingMinutes: '30', budget: 'Budget-friendly',
}
assert.deepEqual(validateOnboarding(parseOnboarding(valid)), [])
assert.equal(parseOnboarding({ ...valid, days: ['Mon', 'Mon'] }), null)
assert.equal(parseOnboarding({ ...valid, adult: 'true' }), null)
assert.equal(parseOnboarding({ ...valid, allergies: ['Milk', 123] }), null)
assert.equal(parseOnboarding({ ...valid, dislikes: 'x'.repeat(201) }), null)
for (const change of [
  { goal: 'instant_weight_loss' }, { adult: false }, { age: '17' }, { age: '28.5' }, { age: '121' }, { gender: 'unknown' },
  { focusAreas: [] }, { focusAreas: ['Overall', 'Arms'] }, { focusAreas: ['unknown'] }, { targetWeightKg: '-1' },
  { weightKg: '-1' }, { weightKg: 'NaN' }, { heightCm: '999' },
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
console.log('PASS: onboarding allowlist, eligibility, goal/diet constraints, optional measurements, allergy confirmation, duplicate rejection and completed-profile validation')
