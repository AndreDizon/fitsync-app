import assert from 'node:assert/strict'
import { build } from 'esbuild'

const bundle = await build({ stdin: { contents: "export * from './shared/daily-plans'; export * from './shared/onboarding'; export * from './shared/workout-warmup';", resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, platform: 'node', format: 'esm' })
const engine = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'))
const item = { id: 'timing', exerciseId: 'push-up', day: 0, time: '14:00', sets: 3, targetType: 'reps', target: 10, secondsPerRep: 4, restSeconds: 125, preparation: { warmupSeconds: 300, cooldownSeconds: 0, transitionSeconds: 60 } }
assert.deepEqual(engine.taskTimeBreakdown(item), { workSeconds: 120, restSeconds: 250, warmupSeconds: 300, stretchingSeconds: 0, cooldownSeconds: 0, transitionSeconds: 60, totalSeconds: 730 })
assert.equal(engine.taskMinutes(item), 730 / 60)
assert.equal(engine.taskBlockMinutes(item), 430 / 60, 'Separate pre-start warm-up must not delay the next exercise block')
for (const option of engine.warmupExercises) assert(engine.workoutCatalog.some(exercise => exercise.id === option.id && exercise.category === 'cardio'), 'Warm-up examples must refer to actual catalog exercises')
assert.equal(engine.stretchingExercises.length, 5)
for (const option of engine.stretchingExercises) assert(engine.workoutCatalog.some(exercise => exercise.id === option.id && exercise.category === 'stretching'))
assert.deepEqual(engine.stretchingTime(['rear-deltoid-stretch'], 2), { holdSeconds: 120, preparationSeconds: 30, totalSeconds: 150 })
assert.deepEqual(engine.stretchingTime(['chest-and-front-of-shoulder-stretch'], 2), { holdSeconds: 60, preparationSeconds: 30, totalSeconds: 90 }, 'A simultaneous stretch must not count both sides twice')
const allIds = engine.stretchingExercises.map(exercise => exercise.id)
assert.deepEqual(engine.stretchingTime(allIds, 4), { holdSeconds: 960, preparationSeconds: 150, totalSeconds: 1110 })
const saved = engine.blankWeek('2026-11-30')
saved.days[0].workout.items = [{ ...item, id: '11111111-1111-4111-8111-111111111111', done: false, preparation: { ...item.preparation, warmupSeconds: 0, stretchingSeconds: 120, stretchExerciseId: 'rear-deltoid-stretch', stretchingStatus: 'completed' } }]
assert.deepEqual(engine.parsePlanWeek(saved).days[0].workout.items[0].preparation, saved.days[0].workout.items[0].preparation, 'Stretch selection and completion survive sync/offline round trips')
const withWarmup = structuredClone(saved.days[0].workout.items[0])
withWarmup.preparation.warmupSeconds = 300
assert.equal(engine.taskBlockMinutes(withWarmup), engine.taskBlockMinutes(saved.days[0].workout.items[0]), 'Optional warm-up must not move the exercise block')
assert.equal(engine.taskMinutes(withWarmup), engine.taskMinutes(saved.days[0].workout.items[0]) + 5, 'Optional warm-up adds exactly five pre-start minutes')
for (const [warmupSeconds, stretchingSeconds, leadMinutes] of [[0, 120, 2], [300, 0, 5], [300, 120, 7]]) {
  const choice = structuredClone(saved)
  const task = choice.days[0].workout.items[0]
  task.preparation = { ...task.preparation, warmupSeconds, stretchingSeconds, stretchingStatus: undefined }
  const parsed = engine.parsePlanWeek(JSON.parse(JSON.stringify(choice)))
  assert(parsed)
  assert.equal(parsed.days[0].workout.items[0].preparation.warmupSeconds, warmupSeconds)
  assert.equal(parsed.days[0].workout.items[0].preparation.stretchingSeconds, stretchingSeconds, 'Zero stretching must remain zero in warm-up-only mode')
  assert.equal(Math.round((engine.taskMinutes(task) - engine.taskBlockMinutes(task)) * 60), leadMinutes * 60)
  assert.equal(task.time, '14:00', 'Preparation choice leaves the workout block start unchanged')
}
for (const patch of [{ stretchingSeconds: -1 }, { stretchingSeconds: 3601 }, { stretchExerciseId: 'forged' }, { stretchingStatus: 'forged' }]) {
  const invalid = structuredClone(saved)
  Object.assign(invalid.days[0].workout.items[0].preparation, patch)
  assert.equal(engine.parsePlanWeek(invalid), null)
}
const structured = structuredClone(saved)
Object.assign(structured.days[0].workout.items[0].preparation, { stretchExerciseIds: allIds, stretchRepetitions: 4, stretchSetupSeconds: 30, stretchingSeconds: 1110 })
assert(engine.parsePlanWeek(structured), 'Longer multi-stretch selections survive storage')
for (const patch of [{ stretchExerciseIds: [] }, { stretchExerciseIds: [allIds[0], allIds[0]] }, { stretchExerciseIds: ['forged'] }, { stretchRepetitions: 1 }, { stretchRepetitions: 5 }, { stretchSetupSeconds: -1 }, { stretchingSeconds: 1000 }]) {
  const invalid = structuredClone(structured)
  Object.assign(invalid.days[0].workout.items[0].preparation, patch)
  assert.equal(engine.parsePlanWeek(invalid), null)
}
assert.equal(engine.taskSeconds(item), 370, 'Work plus two rests, with no rest after the final set')
assert.equal(engine.taskTimeBreakdown({ ...item, sets: 1 }).restSeconds, 0)
assert.equal(engine.taskTimeBreakdown({ ...item, targetType: 'time', target: 30 }).workSeconds, 90)
assert.equal(engine.taskMinutes({ ...item, preparation: undefined }), 370 / 60)
assert.equal(engine.taskTimeBreakdown({ foodId: 'apple', grams: 100 }).totalSeconds, 0)

const profile = { ...engine.emptyOnboarding, goal: 'strength', experience: 'Beginner', age: '28', gender: 'Man', heightCm: '175', weightKg: '75', targetWeightKg: '75', days: ['Mon', 'Wed', 'Fri'], workoutStartDate: '2026-11-30', equipment: ['Bodyweight', 'Dumbbells', 'Barbell'], workoutStartTime: '14:00' }
let checked = 0
for (const experience of ['Beginner', 'Intermediate', 'Advanced']) for (const sessionMinutes of ['30', '45', '60', '90']) for (const workoutRestSeconds of ['auto', '120', '300']) {
  const schedule = engine.formulateDay({ ...profile, experience, sessionMinutes, workoutRestSeconds }, 'workout', 0, 3, [], false, '2026-11-30').schedule
  assert(schedule.items.length)
  assert.equal(schedule.items[0].preparation.stretchingSeconds, 0)
  assert.equal(schedule.items.reduce((sum, task) => sum + task.preparation.warmupSeconds, 0), 300, 'New plans include a five-minute warm-up without blocking user choices')
  let total = 0
  for (const task of schedule.items) {
    const parts = engine.taskTimeBreakdown(task)
    const independentTotal = task.sets * (task.targetType === 'time' ? task.target : task.target * task.secondsPerRep) + (task.sets - 1) * task.restSeconds + task.preparation.warmupSeconds + (task.preparation.stretchingSeconds || 0) + task.preparation.cooldownSeconds + task.preparation.transitionSeconds
    assert.equal(parts.totalSeconds, independentTotal)
    assert.equal(task.time, `${String(14 + Math.floor(total / 3600)).padStart(2, '0')}:${String(Math.floor(total / 60) % 60).padStart(2, '0')}`, 'Next block includes all previous work, rests and preparation')
    total += parts.totalSeconds - parts.warmupSeconds - parts.stretchingSeconds
    checked++
  }
  assert(total <= Number(sessionMinutes) * 60, 'Full session must stay inside the available time')
  assert(schedule.items.reduce((sum, task) => sum + engine.taskMinutes(task) * 60, 0) <= Number(sessionMinutes) * 60, 'Preparation is counted once within the generated time budget')
}
console.log(`PASS workout timing: exact rep/time arithmetic, one-set recovery, legacy tasks, preparation counted once, and ${checked} generated blocks across expertise, rest and session choices.`)
