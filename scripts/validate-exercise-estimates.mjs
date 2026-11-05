import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { estimateExercise, estimateMethod } from './exercise-estimates.mjs'

const readJSON = async file => JSON.parse(await readFile(file, 'utf8'))
const catalog = await readJSON('backend/data/exercises.json')
const saved = await readJSON('backend/data/exercises-estimates.json')
const offline = await readJSON('frontend/public/offline/exercises.json')
assert.deepEqual(saved.method, estimateMethod)
assert.deepEqual(offline.estimateMethod, estimateMethod)
assert.equal(Object.keys(saved.exercises).length, 100)
for (const exercise of catalog) {
  const estimate = saved.exercises[exercise.id]
  assert.deepEqual(estimate, estimateExercise(exercise))
  assert.deepEqual(offline.data.find(item => item.id === exercise.id).estimates, estimate)
  for (const field of ['estimatedMinutes', 'estimatedBurnKcalAt70Kg', 'activeSeconds', 'restSeconds', 'activeMet']) {
    const range = estimate[field]
    assert(range.every(value => Number.isFinite(value) && value >= 0), `${exercise.id}: invalid ${field}`)
    assert(range[1] >= range[0], `${exercise.id}: reversed ${field}`)
  }
  assert.equal(Object.keys(estimate.goals).length, 6)
  assert(Object.values(estimate.goals).every(goal => goal.label && goal.benefit.length > 40))
  assert.equal(estimate.estimatedMuscleGainKg, null)
}
// Work/rest units, unilateral repetitions, timed sets and continuous cardio.
const sample = overrides => estimateExercise({ id: 'sample', defaultTarget: '3 Sets × 8-12 Reps', category: 'strength', equipment: 'barbell', target: 'pectorals', movementPattern: 'Push', ...overrides })
assert.deepEqual(sample({}).activeSeconds, [48, 144])
assert.deepEqual(sample({}).restSeconds, [90, 180])
assert.deepEqual(sample({ defaultTarget: '3 Sets × 8-12 Reps per Side' }).activeSeconds, [96, 288])
assert.deepEqual(sample({ defaultTarget: '2 Holds × 20-30 Seconds' }).activeSeconds, [40, 60])
const continuous = sample({ defaultTarget: '5-10 Minutes at an Easy-to-Moderate Pace', category: 'cardio' })
assert.deepEqual(continuous.estimatedMinutes, [5, 10])
assert.deepEqual(continuous.restSeconds, [0, 0])
console.log('PASS: 100 seeded estimates, six goal profiles, offline parity, ranges and time/rest calculations')
