import { foodTotals, parsePlanWeek, planTargets, taskMinutes, workoutCatalog, type PlanWeek } from './daily-plans'
import type { OnboardingProfile } from './onboarding'
import { shiftDate, validDate } from './progress'

export function planAnalytics(weeks: PlanWeek[], visits: string[], profile: OnboardingProfile | null, today: string, range = 28) {
  const start = shiftDate(today, 1 - range)
  const days = Array.from({ length: range }, (_, index) => ({
    date: shiftDate(start, index), workoutTotal: 0, workoutDone: 0, foodTotal: 0, foodDone: 0,
    minutes: 0, plannedMinutes: 0, water: 0, rest: false, loaded: false,
    nutrition: { energy: 0, protein: 0, carbs: 0, fat: 0 }, plannedEnergy: 0,
  }))
  const byDate = new Map(days.map(day => [day.date, day]))
  const unique = new Map<string, PlanWeek>()
  for (const raw of weeks) { const week = parsePlanWeek(raw); if (week) unique.set(week.week, week) }
  const groups = new Map<string, number>()
  const meals = ['Breakfast', 'Lunch', 'Dinner', 'Snack'].map(name => ({ name, total: 0, done: 0, energy: 0 }))
  let actualSets = 0, reps = 0, volume = 0, timedSeconds = 0
  for (const week of unique.values()) week.days.forEach((schedule, index) => {
    const day = byDate.get(shiftDate(week.week, index))
    if (!day) return
    day.loaded = true
    day.rest = schedule.workout.rest && schedule.workout.items.length === 0
    day.workoutTotal = schedule.workout.items.length
    day.workoutDone = schedule.workout.items.filter(item => item.done).length
    day.foodTotal = schedule.nutrition.items.length
    day.foodDone = schedule.nutrition.items.filter(item => item.done).length
    day.water = schedule.water.filter(glass => glass.done).length
    day.nutrition = foodTotals(schedule.nutrition.items.filter(item => item.done))
    day.plannedEnergy = foodTotals(schedule.nutrition.items).energy
    for (const item of schedule.nutrition.items) if ('foodId' in item) {
      const meal = meals.find(meal => meal.name === item.meal)
      if (meal) { meal.total++; if (item.done) { meal.done++; meal.energy += foodTotals([item]).energy } }
    }
    for (const item of schedule.workout.items) if ('exerciseId' in item) {
      day.plannedMinutes += taskMinutes(item)
      if (item.done) {
        day.minutes += taskMinutes(item)
        const group = workoutCatalog.find(exercise => exercise.id === item.exerciseId)?.bodyPart || 'Other'
        groups.set(group, (groups.get(group) || 0) + 1)
      }
      // Actual set logs are records in their own right, even before the task is marked done.
      for (const set of item.actualSets || []) if (set.amount > 0) {
        actualSets++
        if (item.targetType === 'reps') { reps += set.amount; volume += set.amount * set.weightKg }
        else timedSeconds += set.amount
      }
    }
  })
  const sum = (key: 'workoutTotal' | 'workoutDone' | 'foodTotal' | 'foodDone' | 'water' | 'minutes' | 'plannedMinutes') => days.reduce((total, day) => total + day[key], 0)
  const workoutTotal = sum('workoutTotal'), workoutDone = sum('workoutDone'), foodTotal = sum('foodTotal'), foodDone = sum('foodDone')
  const foodDays = days.filter(day => day.foodDone > 0), waterDays = days.filter(day => day.water > 0)
  const nutrition = foodDays.reduce((total, day) => ({ energy: total.energy + day.nutrition.energy, protein: total.protein + day.nutrition.protein, carbs: total.carbs + day.nutrition.carbs, fat: total.fat + day.nutrition.fat }), { energy: 0, protein: 0, carbs: 0, fat: 0 })
  const active = (day: typeof days[number]) => day.workoutDone + day.foodDone > 0
  let best = 0, run = 0
  for (const day of days) { run = active(day) ? run + 1 : 0; best = Math.max(best, run) }
  let streak = 0
  let index = days.length - 1
  if (!active(days[index])) index--
  for (; index >= 0 && active(days[index]); index--) streak++
  const visitSet = new Set(visits.filter(date => validDate(date) && date >= start && date <= today))
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((name, index) => {
    const entries = days.filter(day => (new Date(day.date + 'T12:00:00Z').getUTCDay() + 6) % 7 === index)
    return { name, completed: entries.filter(active).length, scheduled: entries.filter(day => day.workoutTotal + day.foodTotal > 0).length }
  })
  return {
    start, today, days, visitSet, weekdays, meals, nutrition, targets: planTargets(profile),
    workoutTotal, workoutDone, foodTotal, foodDone, total: workoutTotal + foodTotal, done: workoutDone + foodDone,
    activeDays: days.filter(active).length, scheduledDays: days.filter(day => day.workoutTotal + day.foodTotal > 0).length,
    loadedDays: days.filter(day => day.loaded).length, best, streak, foodDays: foodDays.length, waterDays: waterDays.length,
    water: sum('water'), waterGoalDays: waterDays.filter(day => day.water === 8).length,
    minutes: sum('minutes'), plannedMinutes: sum('plannedMinutes'),
    workoutDays: days.filter(day => day.workoutTotal > 0).length,
    finishedDays: days.filter(day => day.workoutTotal > 0 && day.workoutDone === day.workoutTotal).length,
    restDays: days.filter(day => day.rest).length,
    groups: [...groups].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    actualSets, reps, volume, timedSeconds,
  }
}
