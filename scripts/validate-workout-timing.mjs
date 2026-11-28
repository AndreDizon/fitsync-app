import assert from 'node:assert/strict'
import { build } from 'esbuild'

const bundle = await build({ stdin: { contents: "export * from './shared/daily-plans'; export * from './shared/onboarding'; export * from './shared/workout-warmup';", resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, platform: 'node', format: 'esm' })
const engine = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'))
const item = { id: 'timing', exerciseId: 'push-up', day: 0, time: '14:00', sets: 3, targetType: 'reps', target: 10, secondsPerRep: 4, restSeconds: 125, preparation: { warmupSeconds: 300, cooldownSeconds: 0, transitionSeconds: 60 } }
assert.deepEqual(engine.taskTimeBreakdown(item), { workSeconds: 120, restSeconds: 250, warmupSeconds: 300, cooldownSeconds: 0, transitionSeconds: 60, totalSeconds: 730 })
assert.equal(engine.taskMinutes(item), 730 / 60)
assert.equal(engine.taskBlockMinutes(item), 430 / 60, 'Separate pre-start warm-up must not delay the next exercise block')
for (const option of engine.warmupExercises) assert(engine.workoutCatalog.some(exercise => exercise.id === option.id && exercise.category === 'cardio'), 'Warm-up examples must refer to actual catalog exercises')
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
  let total = 0
  for (const task of schedule.items) {
    const parts = engine.taskTimeBreakdown(task)
    const independentTotal = task.sets * (task.targetType === 'time' ? task.target : task.target * task.secondsPerRep) + (task.sets - 1) * task.restSeconds + task.preparation.warmupSeconds + task.preparation.cooldownSeconds + task.preparation.transitionSeconds
    assert.equal(parts.totalSeconds, independentTotal)
    assert.equal(task.time, `${String(14 + Math.floor(total / 3600)).padStart(2, '0')}:${String(Math.floor(total / 60) % 60).padStart(2, '0')}`, 'Next block includes all previous work, rests and preparation')
    total += parts.totalSeconds - parts.warmupSeconds
    checked++
  }
  assert(total <= Number(sessionMinutes) * 60, 'Full session must stay inside the available time')
}
console.log(`PASS workout timing: exact rep/time arithmetic, one-set recovery, legacy tasks, preparation counted once, and ${checked} generated blocks across expertise, rest and session choices.`)
