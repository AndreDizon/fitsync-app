import assert from 'node:assert/strict'
import { build } from 'esbuild'

const built = await build({ stdin: { contents: "export * from './shared/monitoring-insights'; export * from './shared/daily-plans'; export * from './shared/playlists'", resolveDir: process.cwd() }, bundle: true, write: false, platform: 'node', format: 'esm' })
const { monitoringInsights, blankWeek, newPlaylistItem, foodCatalog, workoutCatalog } = await import('data:text/javascript;base64,' + Buffer.from(built.outputFiles[0].text).toString('base64'))
const today = '2026-11-15'
const weeks = ['2026-11-02', '2026-11-09', '2026-11-16'].map(blankWeek)
const task = (done, day = 0) => ({ ...newPlaylistItem('workout', workoutCatalog[0].id, day), done, actualSets: [{ amount: 8, weightKg: 20 }] })
for (const week of weeks.slice(0, 2)) { week.days[0].workout.items.push(task(true)); week.days[1].workout.items.push(task(false, 1)) }
for (let day = 0; day < 6; day++) weeks[2].days[day].workout.items.push(task(false, day))
weeks[0].days[0].workout.items.push({ ...task(true), actualSets: [{ amount: 4, weightKg: 10 }] })
const food = { ...newPlaylistItem('nutrition', foodCatalog[0].id, 0), done: true, grams: 100 }
weeks[1].days[0].nutrition.items.push(food, { ...food, id: crypto.randomUUID(), grams: 50 }, { ...food, id: crypto.randomUUID(), done: false })
const wellness = (date, sleepHours, created_at = date) => ({ id: crypto.randomUUID(), kind: 'wellness', date, payload: { sleepHours, energy: 3 }, revision: 0, created_at })
const entries = ['2026-11-13', '2026-11-14', '2026-11-15'].map(date => wellness(date, 8))
entries.push(...['2026-11-06', '2026-11-07', '2026-11-08'].map(date => wellness(date, 6)), wellness('2026-11-15', 4, '2026-11-15T01:00:00Z'), wellness('2026-11-15', 8, '2026-11-15T02:00:00Z'), wellness('2026-11-16', 20))
const result = monitoringInsights([...weeks, weeks[1]], entries, today, 28)
assert.equal(result.foodEntries, 2)
assert.equal(result.scheduledFood, 3)
assert.equal(result.foodDays, 1)
assert.equal(result.uniqueFoods, 1)
assert.equal(result.nutrients[0].average, foodCatalog[0].nutrients.fiberG * 1.5)
assert.equal(result.recovery[0].days, 3, 'One value per date; future entries excluded')
assert.equal(result.recovery[0].average, 8)
assert.equal(result.recovery[0].change, 2)
assert.equal(result.exercises[0].sessions.length, 4)
assert.equal(result.exercises[0].sessions.at(-1).amount, 12, 'Same exercise and date combined')
assert.equal(result.exercises[0].sessions.at(-1).volume, 200)
assert.equal(result.outlook.rate, 3 / 5)
assert.equal(result.outlook.expected, 4)
assert.equal(monitoringInsights(weeks, entries, today, 7).outlook.rate, null, 'Short history suppresses extrapolation')
assert.equal(monitoringInsights(weeks, entries, today, 7).recovery[0].change, null, 'Comparison cannot escape selected period')
assert.equal(monitoringInsights(weeks.slice(0, 2), [], today).outlook.expected, null, 'Unloaded future schedule is not a zero projection')
const incomplete = monitoringInsights(weeks, entries.slice(0, 2), today)
assert.equal(incomplete.recovery[0].change, null, 'Sparse ratings do not produce a comparison')
// Unknown and zero nutrients must have different coverage and display states.
const original = foodCatalog[0].nutrients.fiberG
foodCatalog[0].nutrients.fiberG = null
assert.equal(monitoringInsights(weeks, [], today).nutrients[0].average, null)
foodCatalog[0].nutrients.fiberG = 0
assert.equal(monitoringInsights(weeks, [], today).nutrients[0].known, 2)
assert.equal(monitoringInsights(weeks, [], today).nutrients[0].average, 0)
foodCatalog[0].nutrients.fiberG = original
const timed = structuredClone(weeks)
timed[1].days[0].workout.items[0].targetType = 'time'
const timedExercise = monitoringInsights(timed, [], today).exercises.find(exercise => exercise.timed)
assert.equal(timedExercise.sessions[0].volume, 0, 'Timed work is not load volume')
assert.equal(monitoringInsights([], [], today).outlook.expected, null)
assert.equal(monitoringInsights([{ ...weeks[0], week: 'invalid' }], [], today).foodEntries, 0)
console.log('PASS monitoring: portion scaling, known vs missing nutrients, duplicate dates/weeks, period boundaries, actual exercise logs, recovery averages and guarded completion outlook')
