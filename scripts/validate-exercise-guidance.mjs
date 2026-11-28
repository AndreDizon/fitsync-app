import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { build } from 'esbuild'

const result = await build({ stdin: { contents: "export * from './frontend/lib/exercise-guidance'; export * from './frontend/lib/exercise-technique'; export * from './frontend/lib/exercise-scenario'; export * from './frontend/lib/exercise-practice-notes';", resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, platform: 'node', format: 'esm' })
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
  const practice = guide.exercisePracticeNotes(exercise)
  for (const key of ['setup', 'warmup', 'breathing', 'counting', 'weeklyRecovery']) assert(practice[key]?.length > 35, `${exercise.id}: ${key}`)
  if (exercise.movementPattern === 'Core') assert.match(practice.breathing, /Keep breathing/)
  if (exercise.equipment === 'band') assert.match(practice.setup, /anchor/)
  if (exercise.category === 'stretching') assert.match(practice.warmup, /easy movement/)
  for (const level of guide.guidanceLevels) {
    const guidance = guide.exerciseGuidance(exercise, level)
    assert(guidance.target && guidance.rest && guidance.progression)
    if (exercise.category === 'cardio') assert.match(guidance.restDetail, /no prescribed between-set/)
    if (exercise.category === 'stretching') assert.equal(guidance.rest, 'Release between holds')
    const scenario = guide.exerciseScenario(exercise, level, 80)
    const heavier = guide.exerciseScenario(exercise, level, 160)
    assert(scenario.sets >= 1 && scenario.sets <= 5)
    assert(scenario.quantity[0] <= scenario.quantity[1])
    assert(scenario.rest[0] <= scenario.rest[1])
    for (const i of [0, 1]) {
      assert.equal(scenario.durationMinutes[i], (scenario.activeSeconds[i] + scenario.restSeconds[i]) / 60)
      assert(scenario.durationMinutes[i] > 0 && Number.isFinite(scenario.kcal[i]))
      assert.equal(heavier.kcal[i], scenario.kcal[i] * 2, 'Body weight scales energy, not duration')
      assert.equal(heavier.durationMinutes[i], scenario.durationMinutes[i])
    }
    for (const weight of [null, NaN, Infinity, 0, -10, 19, 351]) assert.equal(guide.exerciseScenario(exercise, level, weight).kcal, null)
  }
  const examples = guide.guidanceLevels.map(level => guide.exerciseScenario(exercise, level, 80))
  assert.equal(new Set(examples.map(e => e.prescription)).size, 3, `${exercise.id}: expertise must update targets`)
  assert.equal(new Set(examples.map(e => e.durationMinutes.join(','))).size, 3, `${exercise.id}: expertise must update duration`)
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
const pallof = guide.exerciseScenario(catalog.find(e => e.id === 'band-horizontal-pallof-press'), 'Intermediate', 80)
assert.equal(pallof.activeSeconds[0], 3 * 8 * 2 * 2, 'Count repetitions on both sides')
assert.equal(pallof.breakCount, 5, 'Three sets each direction have five recovery gaps')
const deadbug = guide.exerciseScenario(catalog.find(e => e.id === 'dead-bug'), 'Intermediate', 80)
assert.equal(deadbug.breakCount, 2, 'Alternating sides recover between full sets')
console.log('PASS: 100 exercises, three dynamic expertise examples, exact work/rest arithmetic, both-side and alternating-side counting, invalid weights, proportional energy scaling and unchanged catalog targets.')
