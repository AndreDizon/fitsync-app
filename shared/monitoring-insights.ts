import { foodCatalog, parsePlanWeek, workoutCatalog, type PlanWeek } from './daily-plans'
import { journalTrend } from './progress-journal'
import { shiftDate, type ProgressEntry } from './progress'

export const monitoredNutrients = [
  ['fiberG', 'Fiber', 'g'], ['sodiumMg', 'Sodium', 'mg'], ['saturatedFatG', 'Saturated fat', 'g'],
  ['sugarsG', 'Total sugars', 'g'], ['calciumMg', 'Calcium', 'mg'], ['ironMg', 'Iron', 'mg'],
  ['potassiumMg', 'Potassium', 'mg'], ['vitaminDUg', 'Vitamin D', 'µg'], ['vitaminCMg', 'Vitamin C', 'mg'],
] as const
export const recoveryMetrics = [
  ['sleepHours', 'Sleep duration', 'hours'], ['sleepQuality', 'Sleep quality', '/5'],
  ['energy', 'Energy', '/5'], ['soreness', 'Soreness', '/5'], ['rpe', 'Workout effort', '/10'],
] as const
type Session = { date: string; sets: number; amount: number; maxLoad: number; volume: number }

/** Descriptive monitoring and a recording-pace extrapolation, not a health prediction. */
export function monitoringInsights(weeks: PlanWeek[], entries: ProgressEntry[], today: string, range = 28) {
  const start = shiftDate(today, 1 - range)
  const unique = new Map<string, PlanWeek>()
  for (const raw of weeks) { const week = parsePlanWeek(raw); if (week) unique.set(week.week, week) }
  const nutrientTotals = monitoredNutrients.map(([key, name, unit]) => ({ key, name, unit, total: 0, known: 0 }))
  const foods = new Set<string>(), groups = new Set<string>(), foodDays = new Set<string>()
  const sessions = new Map<string, { id: string; name: string; timed: boolean; dates: Map<string, Session> }>()
  const pastWorkoutDays: string[] = []
  let foodEntries = 0, scheduledFood = 0, pastTotal = 0, pastDone = 0, upcoming = 0, upcomingLoadedDays = 0
  for (const week of unique.values()) week.days.forEach((day, index) => {
    const date = shiftDate(week.week, index)
    if (date > today && date <= shiftDate(today, 7)) { upcomingLoadedDays++; upcoming += day.workout.items.length }
    if (date < start || date > today) return
    // Today may still be in progress, so it never lowers the historical outlook baseline.
    if (date < today && day.workout.items.length) {
      pastWorkoutDays.push(date); pastTotal += day.workout.items.length
      pastDone += day.workout.items.filter(item => item.done).length
    }
    scheduledFood += day.nutrition.items.length
    for (const item of day.nutrition.items) if ('foodId' in item && item.done) {
      foodEntries++; foodDays.add(date)
      const food = foodCatalog.find(food => food.id === item.foodId)
      if (!food) continue
      foods.add(food.id); groups.add(food.category)
      for (const nutrient of nutrientTotals) {
        const value = food.nutrients[nutrient.key]
        // A reported zero counts as known. Null never becomes a reported zero.
        if (typeof value === 'number' && Number.isFinite(value)) { nutrient.total += value * item.grams / 100; nutrient.known++ }
      }
    }
    for (const item of day.workout.items) if ('exerciseId' in item && item.actualSets?.some(set => set.amount > 0)) {
      const timed = item.targetType === 'time', key = item.exerciseId + ':' + item.targetType
      if (!sessions.has(key)) sessions.set(key, { id: key, name: workoutCatalog.find(exercise => exercise.id === item.exerciseId)?.name || 'Exercise', timed, dates: new Map() })
      const exercise = sessions.get(key)!
      const session = exercise.dates.get(date) || { date, sets: 0, amount: 0, maxLoad: 0, volume: 0 }
      for (const set of item.actualSets || []) if (set.amount > 0) {
        session.sets++; session.amount += set.amount
        if (!timed) { session.maxLoad = Math.max(session.maxLoad, set.weightKg); session.volume += set.amount * set.weightKg }
      }
      exercise.dates.set(date, session)
    }
  })
  const journal = entries.filter(entry => entry.kind === 'wellness' && entry.date >= start && entry.date <= today)
  const recovery = recoveryMetrics.map(([key, name, unit]) => {
    const points = journalTrend(journal, key).points
    const recent = points.filter(point => point.date >= shiftDate(today, -6))
    const previous = points.filter(point => point.date >= shiftDate(today, -13) && point.date < shiftDate(today, -6))
    const mean = (values: typeof points) => values.length ? values.reduce((sum, point) => sum + point.value, 0) / values.length : null
    const average = mean(recent), before = mean(previous)
    return { key, name, unit, average, days: recent.length, change: average !== null && before !== null && recent.length >= 3 && previous.length >= 3 ? average - before : null, previousDays: previous.length }
  })
  pastWorkoutDays.sort()
  const enoughHistory = pastWorkoutDays.length >= 4 && pastWorkoutDays.at(-1)! >= shiftDate(pastWorkoutDays[0], 7)
  const rate = enoughHistory && pastTotal ? pastDone / pastTotal : null
  return {
    start, foodEntries, scheduledFood, foodDays: foodDays.size, uniqueFoods: foods.size, foodGroups: groups.size,
    nutrients: nutrientTotals.map(nutrient => ({ ...nutrient, average: nutrient.known && foodDays.size ? nutrient.total / foodDays.size : null })),
    exercises: [...sessions.values()].map(({ dates, ...exercise }) => ({ ...exercise, sessions: [...dates.values()].sort((a, b) => b.date.localeCompare(a.date)) })).sort((a, b) => b.sessions[0].date.localeCompare(a.sessions[0].date) || a.name.localeCompare(b.name)),
    recovery, recoveryDays: new Set(journal.filter(entry => Object.values(entry.payload).some(value => typeof value === 'number')).map(entry => entry.date)).size,
    outlook: { rate, pastTotal, pastDone, historyDays: pastWorkoutDays.length, upcoming, upcomingLoadedDays, expected: rate !== null && upcomingLoadedDays === 7 && upcoming > 0 ? Math.round(upcoming * rate) : null },
  }
}
