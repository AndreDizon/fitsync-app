import assert from 'node:assert/strict'
import { build } from 'esbuild'

async function load(entry) {
  const result = await build({ entryPoints: [entry], bundle: true, write: false, format: 'esm', platform: 'node' })
  return import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'))
}
const onboarding = await load('shared/onboarding.ts')
const plans = await load('shared/daily-plans.ts')
const legacy = {
  ...onboarding.emptyOnboarding, goal: 'muscle_gain', age: '28', gender: 'Man', weightKg: '75', heightCm: '175',
  activity: 'Lightly active', experience: 'Beginner', days: ['Mon', 'Wed', 'Fri'], sessionMinutes: '30',
  equipment: ['Bodyweight', 'Dumbbells'], diet: 'No preference', allergiesReviewed: true,
  mealsPerDay: '3', cookingMinutes: '30', budget: 'Flexible', version: 2, completedAt: '2026-11-16T00:00:00Z',
}
delete legacy.workoutStartTime
const oldProfile = onboarding.readCompletedOnboarding(legacy)
assert(oldProfile, 'Older completed accounts remain readable')
assert.equal(oldProfile.workoutStartTime, '08:00')

for (const time of ['00:00', '06:15', '12:00', '18:30', '23:30']) {
  const profile = onboarding.readCompletedOnboarding({ ...legacy, workoutStartTime: time })
  assert(profile, 'Time saves and reads back: ' + time)
  assert.equal(profile.workoutStartTime, time)
  const schedule = plans.formulateDay(profile, 'workout', 0, 1).schedule
  assert(schedule.items.length > 1)
  assert.equal(schedule.items[0].time, time)
  let elapsed = 0
  const [hours, minutes] = time.split(':').map(Number)
  for (const item of schedule.items) {
    const expected = hours * 60 + minutes + Math.floor(elapsed / 60)
    assert.equal(item.time, `${String(Math.floor(expected / 60)).padStart(2, '0')}:${String(expected % 60).padStart(2, '0')}`)
    elapsed += Math.round(plans.taskMinutes(item) * 60)
  }
}
for (const workoutStartTime of ['', '8:00', '24:00', '12:60', '18:30:15', 'not a time']) {
  const draft = onboarding.parseOnboarding({ ...legacy, workoutStartTime })
  assert(onboarding.validateOnboarding(draft, 2).some(message => /start time/.test(message)))
  assert.equal(onboarding.readCompletedOnboarding({ ...legacy, workoutStartTime }), null)
}
for (const workoutStartTime of [null, 900, {}]) assert.equal(onboarding.parseOnboarding({ ...legacy, workoutStartTime }), null)
assert.equal(onboarding.readCompletedOnboarding({ ...legacy, workoutStartTime: '23:45' }), null, 'No clamped or overlapping late-night slots')
assert.equal(plans.formulateDay({ ...oldProfile, workoutStartTime: '23:45' }, 'workout', 0, 1).schedule.items.length, 0)
assert.equal(plans.formulateDay(oldProfile, 'workout', 1, 1).schedule.rest, true)
const foodSchedule = profile => plans.formulateDay(profile, 'nutrition', 0, 1).schedule.items.map(({ id, ...task }) => task)
assert.deepEqual(foodSchedule({ ...oldProfile, workoutStartTime: '18:30' }), foodSchedule(oldProfile))
console.log('PASS workout start time: profile migration, save/read validation, midnight boundaries, generated slot timing, rest days and unchanged nutrition schedules')
