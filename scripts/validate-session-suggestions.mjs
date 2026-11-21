import assert from 'node:assert/strict'
import { build } from 'esbuild'

const compiled = await build({ entryPoints: ['frontend/lib/health-guidance.ts'], bundle: true, write: false, format: 'esm', platform: 'node' })
const { suggestSessionMinutes } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`)
const adult = { age: '28', experience: 'Advanced', goal: 'strength', days: ['Mon', 'Wed', 'Fri'] }
assert.equal(suggestSessionMinutes(adult).minutes, '60')
assert.equal(suggestSessionMinutes({ ...adult, experience: 'Beginner' }).minutes, '30')
assert.equal(suggestSessionMinutes({ ...adult, experience: 'Intermediate' }).minutes, '45')
assert.equal(suggestSessionMinutes({ ...adult, goal: 'mobility' }).minutes, '30')
assert.equal(suggestSessionMinutes({ ...adult, days: [...adult.days, 'Sat'] }).minutes, '45')
assert.equal(suggestSessionMinutes({ ...adult, days: [...adult.days, 'Mon', 'unknown'] }).minutes, '60')
for (const age of ['12', '', 'NaN', '121']) assert.equal(suggestSessionMinutes({ ...adult, age }), null)
for (const age of ['13','17']) {
  const teen = suggestSessionMinutes({ ...adult, age })
  assert.equal(teen.minutes, '30')
  assert.equal(teen.youth, true)
  assert.match(teen.reason, /supervision/)
}
assert.equal(suggestSessionMinutes({ ...adult, experience: '' }), null)
// Body size and gender must not turn an estimate into a longer/shorter prescription.
assert.deepEqual(suggestSessionMinutes({ ...adult, gender: 'Woman', heightCm: '155', weightKg: '50' }), suggestSessionMinutes({ ...adult, gender: 'Man', heightCm: '190', weightKg: '100' }))
console.log('PASS adult eligibility, experience, goal, frequency, invalid days and independence from body size/gender')
