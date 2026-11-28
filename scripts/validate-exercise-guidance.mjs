import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { build } from 'esbuild'

const result = await build({ stdin: { contents: "export * from './frontend/lib/exercise-guidance'; export * from './frontend/lib/exercise-technique';", resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, platform: 'node', format: 'esm' })
const guide = await import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'))
const catalog = JSON.parse(await readFile('frontend/public/offline/exercises.json', 'utf8')).data
assert.equal(guide.exerciseTechniqueIds.length, 100, 'Exactly 100 explicit technique mappings')
assert.equal(new Set(guide.exerciseTechniqueIds).size, 100, 'No duplicate or conflicting mappings')
assert.deepEqual([...guide.exerciseTechniqueIds].sort(), catalog.map(e => e.id).sort())
for (const exercise of catalog) {
  const original = JSON.stringify(exercise)
  const technique = guide.exerciseTechnique(exercise.id)
  assert(technique, exercise.id)
  assert.equal(technique.checks.length, 2, exercise.id)
  assert(guide.techniqueSources[technique.source]?.url.startsWith('https://'))
  assert(technique.purpose && technique.easier && technique.harder)
  for (const level of guide.guidanceLevels) {
    const guidance = guide.exerciseGuidance(exercise, level)
    assert(guidance.target && guidance.rest && guidance.progression)
    if (exercise.category === 'cardio') assert.match(guidance.restDetail, /no prescribed between-set/)
    if (exercise.category === 'stretching') assert.equal(guidance.rest, 'Release between holds')
  }
  assert.equal(JSON.stringify(exercise), original, 'Viewing guidance must not change catalog prescriptions')
}
const rest = id => guide.exerciseGuidance(catalog.find(e => e.id === id)).rest
for (const id of ['dumbbell-fly', 'lever-leg-extension', 'lever-lying-leg-curl', 'dumbbell-lateral-raise']) assert.equal(rest(id), '1-2 min between sets', id)
for (const id of ['barbell-close-grip-bench-press', 'dumbbell-standing-overhead-press', 'sled-45-leg-press']) assert.equal(rest(id), '2-3 min between sets', id)
assert.match(guide.exerciseTechnique('band-horizontal-pallof-press').label, /Anti-rotation/)
assert.match(guide.exerciseTechnique('dead-bug').label, /Anti-extension/)
assert.match(guide.exerciseTechnique('band-horizontal-pallof-press').counting, /each direction/)
assert.equal(guide.durationLabel(125), '2 min 5 sec')
assert.equal(guide.durationLabel(0), '0 sec')
console.log('PASS: 100 unique technique mappings, all expertise levels, appropriate movement-specific rest, core functions, counting notes and immutable catalog targets.')
