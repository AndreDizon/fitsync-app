import exercises from '../backend/data/exercises.json'
import foods from '../backend/data/foods.json'
import { defaultMealTime, newPlaylistItem, parsePlaylist, type PlaylistItem, type PlaylistKind } from './playlists'
import type { OnboardingProfile } from './onboarding'

export type ActualSet = { amount: number; weightKg: number }
export type SessionPreparation = { warmupSeconds: number; cooldownSeconds: number; transitionSeconds: number }
export type PlanTask = PlaylistItem & { done: boolean; actualSets?: ActualSet[]; preparation?: SessionPreparation; secondsPerRep?: number }
export type DaySchedule = { items: PlanTask[]; rest: boolean; source: string; variation: number }
export type PlanDay = { workout: DaySchedule; nutrition: DaySchedule; water: { time: string; done: boolean }[] }
export type PlanWeek = { version: 1; week: string; days: PlanDay[]; revision: number }
export type PlanTargets = { minutes: number; energy: number | null; energyRange: [number, number] | null; protein: number | null; carbs: number | null; fat: number | null; notes: string[] }
export const workoutCatalog = exercises
export const foodCatalog = foods
const clock = (n: number) => `${String(Math.floor(Math.min(1439, n) / 60)).padStart(2, '0')}:${String(Math.min(1439, n) % 60).padStart(2, '0')}`
export function currentWeek(date = new Date(), timeZone = 'Asia/Manila') {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
  const utc = new Date(day + 'T12:00:00Z'); utc.setUTCDate(utc.getUTCDate() - (utc.getUTCDay() + 6) % 7)
  return utc.toISOString().slice(0, 10)
}
export function currentDay(date = new Date(), timeZone = 'Asia/Manila') { return (['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(date)) + 6) % 7 }
export const weekDays = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
export function blankWeek(week: string): PlanWeek {
  return { version: 1, week, revision: 0, days: weekDays.map(() => ({ workout: { items: [], rest: false, source: 'Not planned', variation: 0 }, nutrition: { items: [], rest: false, source: 'Not planned', variation: 0 }, water: Array.from({ length: 8 }, (_, i) => ({ time: clock(480 + i * 90), done: false })) })) }
}
export function parsePlanWeek(value: unknown): PlanWeek | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as PlanWeek
  if (raw.version !== 1 || !/^\d{4}-\d{2}-\d{2}$/.test(raw.week) || !Number.isFinite(Date.parse(raw.week)) || new Date(raw.week + 'T12:00:00Z').toISOString().slice(0,10) !== raw.week || new Date(raw.week + 'T12:00:00Z').getUTCDay() !== 1 || !Array.isArray(raw.days) || raw.days.length !== 7) return null
  const result = blankWeek(raw.week)
  for (let day = 0; day < 7; day++) {
    const source = raw.days[day]
    if (!source || !Array.isArray(source.water) || source.water.length !== 8 || source.water.some(glass => !glass || typeof glass.done !== 'boolean' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(glass.time))) return null
    result.days[day].water = source.water.map(glass => ({ time: glass.time, done: glass.done }))
    for (const kind of ['workout','nutrition'] as const) {
      const schedule = source[kind]
      if (!schedule || !Array.isArray(schedule.items) || schedule.items.length > 60 || typeof schedule.rest !== 'boolean' || typeof schedule.source !== 'string' || schedule.source.length > 100 || !Number.isInteger(schedule.variation) || schedule.variation < 0 || schedule.variation > 100000) return null
      const parsed = parsePlaylist({ id: '11111111-1111-4111-8111-111111111111', kind, name: 'Daily plan', description: '', duration: 'day', selectedDay: day, restDays: kind === 'workout' && schedule.rest ? [day] : [], items: schedule.items })
      if (!parsed.data || schedule.items.some(item => typeof item.done !== 'boolean' || item.actualSets !== undefined && (kind !== 'workout'))) return null
      for (const task of schedule.items) if (task.actualSets !== undefined && (!Array.isArray(task.actualSets) || task.actualSets.length > 20 || task.actualSets.some(set => !set || !Number.isInteger(set.amount) || set.amount < 0 || set.amount > (('targetType' in task && task.targetType === 'time') ? 3600 : 100) || !Number.isFinite(set.weightKg) || set.weightKg < 0 || set.weightKg > 1000))) return null
      for (const task of schedule.items) if (task.preparation !== undefined && (kind !== 'workout' || !task.preparation || typeof task.preparation !== 'object' || ['warmupSeconds','cooldownSeconds','transitionSeconds'].some(key => { const seconds = task.preparation![key as keyof SessionPreparation]; return !Number.isInteger(seconds) || seconds < 0 || seconds > 600 }))) return null
      for (const task of schedule.items) if (task.secondsPerRep !== undefined && (kind !== 'workout' || !Number.isInteger(task.secondsPerRep) || task.secondsPerRep < 1 || task.secondsPerRep > 10)) return null
      result.days[day][kind] = { source: schedule.source, variation: schedule.variation, rest: kind === 'workout' && schedule.rest, items: parsed.data.items.map((item, i) => ({ ...item, done: schedule.items[i].done, ...(schedule.items[i].secondsPerRep !== undefined ? { secondsPerRep: schedule.items[i].secondsPerRep } : {}), ...(schedule.items[i].preparation ? { preparation: { ...schedule.items[i].preparation! } } : {}), ...(schedule.items[i].actualSets ? { actualSets: schedule.items[i].actualSets!.map(set => ({ amount: set.amount, weightKg: set.weightKg })) } : {}) })) }
    }
  }
  result.revision = Number.isSafeInteger(raw.revision) && raw.revision >= 0 ? raw.revision : 0
  return result
}
export function planTargets(profile: OnboardingProfile | null, rest = false): PlanTargets {
  const targets: PlanTargets = { minutes: rest ? 0 : Number(profile?.sessionMinutes) || 0, energy: null, energyRange: null, protein: null, carbs: null, fat: null, notes: [] }
  const age = Number(profile?.age), height = Number(profile?.heightCm), weight = Number(profile?.weightKg)
  if (profile?.age && Number.isFinite(age) && age > 0 && age < 18) { targets.notes.push('Adult calorie and weight-change estimates do not apply under age 18. You can use the food library and build a manual meal schedule.'); return targets }
  if (!profile || !Number.isFinite(age) || age < 18 || age > 120 || !Number.isFinite(height) || height < 100 || height > 250 || !Number.isFinite(weight) || weight < 20 || weight > 350) { targets.notes.push('Add valid age, height and weight in onboarding to calculate nourishment targets.'); return targets }
  const bmi = weight / (height / 100) ** 2
  if (bmi < 18.5 || bmi >= 40) { targets.notes.push('Personal nourishment targets need professional review for this profile. You can still create a manual schedule.'); return targets }
  const activity = ({ 'Mostly seated': 1.2, 'Lightly active': 1.375, 'Moderately active': 1.55, 'Very active': 1.725 } as Record<string, number>)[profile.activity] ?? 1.2
  let factor = profile.goal === 'fat_loss' ? .9 : profile.goal === 'muscle_gain' ? 1.1 : 1
  const target = Number(profile.targetWeightKg)
  if (target && (profile.goal === 'fat_loss' && target >= weight || profile.goal === 'muscle_gain' && target <= weight)) { factor = 1; targets.notes.push('Target weight and goal point in different directions, so the estimate uses maintenance energy.') }
  // Gender identity is not biological sex. Show the two published equation coefficients as a range.
  const base = 10 * weight + 6.25 * height - 5 * age
  const range = [Math.round((base - 161) * activity * factor), Math.round((base + 5) * activity * factor)] as [number, number]
  if (range[0] < 1200 || range[1] > 4500) { targets.notes.push('The equation is outside this app’s planning range. Review targets with a qualified professional.'); return targets }
  targets.energyRange = range; targets.energy = Math.round((range[0] + range[1]) / 2)
  const proteinShare = ['muscle_gain','strength'].includes(profile.goal) ? .25 : .2
  targets.protein = Math.round(targets.energy * proteinShare / 4); targets.fat = Math.round(targets.energy * .3 / 9); targets.carbs = Math.round(targets.energy * (1 - proteinShare - .3) / 4)
  targets.notes.push('Energy is an estimate from Mifflin–St Jeor with an activity multiplier and a 10% goal adjustment. The displayed range uses both sex coefficients; gender is not treated as biological sex. Macros are planning allocations, not a prescription.')
  return targets
}
export function workoutPhase(item: PlanTask): string {
  const exercise = 'exerciseId' in item ? workoutCatalog.find(e => e.id === item.exerciseId) : null
  if (exercise?.category === 'stretching') return 'Mobility'
  if (exercise?.category === 'cardio') return 'Conditioning'
  if (exercise && ['Squat','Hinge','Push','Pull'].includes(exercise.movementPattern) && !/biceps|triceps|delts|calves|forearms/i.test(exercise.target)) return 'Main movements'
  return 'Accessories & core'
}
export function taskSeconds(item: PlaylistItem & { secondsPerRep?: number }) { if ('foodId' in item) return 0; return item.sets * (item.targetType === 'time' ? item.target : item.target * (item.secondsPerRep ?? 3)) + Math.max(0, item.sets - 1) * item.restSeconds }
export function taskMinutes(item: PlaylistItem & { preparation?: SessionPreparation; secondsPerRep?: number }) {
  if ('foodId' in item) return 0
  const extra = item.preparation
  return (taskSeconds(item) + (extra ? extra.warmupSeconds + extra.cooldownSeconds + extra.transitionSeconds : 0)) / 60
}
export function foodTotals(items: PlanTask[]) {
  return items.reduce((sum, item) => { if ('foodId' in item) { const food = foods.find(food => food.id === item.foodId); if (food) { sum.energy += (food.nutrients.energyKcal ?? 0) * item.grams / 100; sum.protein += (food.nutrients.proteinG ?? 0) * item.grams / 100; sum.carbs += (food.nutrients.carbsG ?? 0) * item.grams / 100; sum.fat += (food.nutrients.fatG ?? 0) * item.grams / 100 } } return sum }, { energy: 0, protein: 0, carbs: 0, fat: 0 })
}
function shuffle<T>(input: T[], seed: number) { const list = [...input]; let n = seed + 1; for (let i = list.length - 1; i > 0; i--) { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; const j = n % (i + 1); [list[i], list[j]] = [list[j], list[i]] } return list }
export function eligibleExercises(profile: OnboardingProfile) {
  const equipment: Record<string, string> = { bodyweight: 'Bodyweight', 'body weight': 'Bodyweight', dumbbell: 'Dumbbells', barbell: 'Barbell', 'ez-bar': 'Barbell', 'weight plate': 'Barbell', band: 'Resistance bands', cable: 'Cable machine', machine: 'Gym machines', kettlebell: 'Kettlebell' }
  const focus: Record<string,string[]> = { Chest:['chest'],Back:['back'],Legs:['upper-legs','lower-legs'],Shoulders:['shoulders'],Arms:['upper-arms','lower-arms'],Core:['waist','core'],Cardio:['cardio'] }
  return exercises.filter(exercise => {
    const allowed = equipment[exercise.equipment]
    if (!allowed || !profile.equipment.includes(allowed)) return false
    if (profile.experience === 'Beginner' && exercise.difficulty !== 'Beginner' || profile.experience === 'Intermediate' && exercise.difficulty === 'Advanced') return false
    if (!profile.focusAreas.includes('Overall') && !profile.focusAreas.some(area => focus[area]?.includes(exercise.bodyPart))) return false
    if (profile.adjustments.includes('Low impact / no jumping') && /jump|burpee|rope|mountain.climber/i.test(exercise.name)) return false
    if (profile.adjustments.includes('Avoid overhead movements') && /overhead|shoulder press|arnold|pull.up|chin.up|pulldown|lat stretch/i.test(exercise.name)) return false
    if (profile.adjustments.includes('Avoid kneeling') && /kneel|push.up|plank|dead.bug|mountain.climber|shoulder.tap/i.test(exercise.name)) return false
    return true
  })
}
export function eligibleFoods(profile: OnboardingProfile) {
  const dislikes = profile.dislikes.toLowerCase().split(/[,;\n]+/).map(v => v.trim()).filter(Boolean)
  if (profile.allergies.includes('Other')) return []
  return foods.filter(food => !food.allergens.some(a => profile.allergies.includes(a)) && !(profile.diet === 'Vegan' && !food.vegan || profile.diet === 'Vegetarian' && !food.vegetarian || profile.diet === 'Pescatarian' && !food.pescatarian || profile.diet === 'Halal' && food.halal !== 'ingredient-compatible') && !dislikes.some(v => (food.name + ' ' + food.aliases.join(' ')).toLowerCase().includes(v)) && food.prepMinutes <= Number(profile.cookingMinutes) && (profile.budget !== 'Budget-friendly' || food.budget === 'Budget-friendly') && !(/raw/i.test(food.state) && ['Protein foods','Legumes'].includes(food.category)))
}
export function formulateDay(profile: OnboardingProfile, kind: PlaylistKind, day: number, variation: number, exclude: string[] = [], alternative = false): { schedule: DaySchedule; notes: string[] } {
  const notes: string[] = [], schedule: DaySchedule = { items: [], rest: false, source: 'System-formulated', variation }
  if (kind === 'workout') {
    schedule.rest = !alternative && !profile.days.some(value => value.slice(0,3).toLowerCase() === weekDays[day].slice(0,3).toLowerCase())
    if (schedule.rest) return { schedule, notes: ['Recovery day from your onboarding schedule.'] }
    const prefer = profile.goal === 'mobility' ? 'stretching' : ['endurance','fat_loss'].includes(profile.goal) ? 'cardio' : 'strength'
    const candidates = shuffle(eligibleExercises(profile).filter(e => !exclude.includes(e.id)), day * 997 + variation * 31).sort((a,b) => Number(b.category === prefer) - Number(a.category === prefer))
    const duration = Number(profile.sessionMinutes)
    const warmup = duration < 30 ? 180 : 300, cooldown = warmup
    let remaining = duration * 60 - warmup - cooldown
    const count = Math.min(10, Math.max(2, Math.ceil(duration / (prefer === 'stretching' ? 5 : 10))))
    const compound = (exercise: typeof exercises[number]) => exercise.category === 'strength' && ['Squat','Hinge','Push','Pull'].includes(exercise.movementPattern) && !/biceps|triceps|delts|calves|forearms/i.test(exercise.target)
    const heavy = (exercise: typeof exercises[number]) => compound(exercise) && exercise.equipment === 'barbell'
    const patterns = new Set<string>()
    const preferred = candidates.filter(exercise => exercise.category === prefer)
    const balanced = [...preferred.filter(exercise => { if (patterns.has(exercise.movementPattern)) return false; patterns.add(exercise.movementPattern); return true }), ...candidates]
    for (const exercise of balanced) {
      if (schedule.items.length >= count) break
      if (schedule.items.some(item => 'exerciseId' in item && item.exerciseId === exercise.id)) continue
      const item = newPlaylistItem('workout', exercise.id, day) as PlanTask
      if (!('exerciseId' in item)) continue
      item.done = false
      item.sets = heavy(exercise) ? 3 : profile.experience === 'Beginner' ? 2 : 3
      item.target = profile.goal === 'strength' ? 6 : /deadlift/i.test(exercise.name) ? 8 : profile.goal === 'endurance' ? 12 : 10
      item.secondsPerRep = heavy(exercise) ? 5 : 4
      item.restSeconds = heavy(exercise) ? 180 : compound(exercise) ? 120 : 75
      let setup = heavy(exercise) ? 120 : compound(exercise) ? 60 : 30
      if (exercise.category === 'cardio' || exercise.category === 'stretching') {
        item.sets = exercise.category === 'stretching' ? 2 : 1; item.targetType = 'time'
        item.target = exercise.category === 'stretching' ? 30 : 300
        item.restSeconds = exercise.category === 'stretching' ? 30 : 0
        setup = 30
      }
      item.preparation = { warmupSeconds: 0, cooldownSeconds: 0, transitionSeconds: setup + (schedule.items.length ? 60 : 0) }
      const cost = Math.round(taskMinutes(item) * 60)
      // Keep natural set/rest prescriptions; choose fewer exercises instead of compressing a lift.
      if (cost > remaining) continue
      schedule.items.push(item); remaining -= cost
    }
    const rank = (item: PlanTask) => ['Main movements','Accessories & core','Conditioning','Mobility'].indexOf(workoutPhase(item))
    schedule.items.sort((a,b) => rank(a)-rank(b))
    if (!alternative && schedule.items.length) {
      schedule.items[0].preparation!.warmupSeconds = warmup
      schedule.items[schedule.items.length - 1].preparation!.cooldownSeconds = cooldown
      // Grow work within bounded prescriptions before using any additional recovery/setup.
      let changed = true
      while (changed) {
        changed = false
        for (const item of schedule.items) {
          if (!('exerciseId' in item)) continue
          const exercise = workoutCatalog.find(exercise => exercise.id === item.exerciseId)!
          const maxSets = exercise.category === 'stretching' ? 4 : profile.experience === 'Beginner' ? 3 : 4
          const cost = (item.targetType === 'time' ? item.target : item.target * (item.secondsPerRep ?? 4)) + item.restSeconds
          if (exercise.category !== 'cardio' && item.sets < maxSets && cost <= remaining) { item.sets++; remaining -= cost; changed = true }
        }
      }
      // Conditioning has a continuous duration; longer sessions can support a longer block.
      const cardio = schedule.items.find(item => 'exerciseId' in item && workoutCatalog.find(e => e.id === item.exerciseId)?.category === 'cardio')
      if (cardio && 'exerciseId' in cardio) { const extra = Math.min(remaining, 1200 - cardio.target); cardio.target += extra; remaining -= extra }
      changed = true
      while (changed) {
        changed = false
        for (const item of schedule.items) {
          if (!('exerciseId' in item) || item.sets < 2) continue
          const exercise = workoutCatalog.find(exercise => exercise.id === item.exerciseId)!
          const cap = exercise.category === 'stretching' ? 30 : heavy(exercise) ? (profile.goal === 'strength' ? 300 : 240) : compound(exercise) ? 180 : 120
          const cost = item.sets - 1
          if (item.restSeconds < cap && remaining >= cost) { item.restSeconds++; remaining -= cost; changed = true }
        }
      }
      // Explicit equipment/loading and preparation, with strict limits, never invented repetitions.
      for (const item of schedule.items) {
        if (!('exerciseId' in item)) continue
        const exercise = workoutCatalog.find(e => e.id === item.exerciseId)!
        const cap = (heavy(exercise) ? 180 : 90) + (item.preparation!.transitionSeconds >= 90 ? 60 : 0)
        const extra = Math.min(remaining, Math.max(0, cap - item.preparation!.transitionSeconds))
        item.preparation!.transitionSeconds += extra; remaining -= extra
      }
      for (const [item,key] of [[schedule.items[0],'warmupSeconds'],[schedule.items[schedule.items.length-1],'cooldownSeconds']] as const) {
        const extra = Math.min(remaining, 600 - item.preparation![key]); item.preparation![key] += extra; remaining -= extra
      }
      if (remaining > 0) notes.push('Your eligible exercise selection supports a shorter session (' + Math.round((duration * 60 - remaining) / 60) + ' minutes). Add suitable exercises or broaden your equipment/focus preferences; extra time is not filled with excessive sets or rest.')
    }
    let elapsed = 0
    for (const item of schedule.items) { item.time = clock(480 + Math.floor(elapsed / 60)); elapsed += Math.round(taskMinutes(item) * 60) }
    notes.push(weekDays[day] + ': ' + duration + '-minute ' + profile.experience.toLowerCase() + ' session for ' + (profile.focusAreas?.join(', ') || 'overall fitness') + ', using ' + profile.equipment.join(', ') + '. Your selected goal guides exercise type, sets and rest.')
    if (!schedule.items.length) notes.push('No eligible alternatives match your equipment, focus and movement preferences. Adjust onboarding or pick manually.')
    notes.push(alternative ? 'Alternative exercises use their own set and rest estimates; replacing an item can change the session total.' : 'Session minutes include work, between-set rests, warm-up, cooldown and setup/transitions. Preparation is credited with its attached task when you mark it done. These are scheduled estimates, not stopwatch measurements; editing or replacing tasks can change the total.')
  } else {
    notes.push('Built around your ' + profile.diet.toLowerCase() + ' eating preference, ' + profile.mealsPerDay + ' meals, available preparation time and saved ingredient exclusions.')
    const target = planTargets(profile).energy
    if (!target) return { schedule, notes: planTargets(profile).notes }
    const pool = shuffle(eligibleFoods(profile).filter(food => !exclude.includes(food.id)), day * 997 + variation * 31)
    const meals = Number(profile.mealsPerDay), slots = meals === 2 ? ['Lunch','Dinner'] : meals === 3 ? ['Breakfast','Lunch','Dinner'] : meals === 4 ? ['Breakfast','Lunch','Snack','Dinner'] : ['Breakfast','Snack','Lunch','Snack','Dinner']
    const groups = [['Grains','Roots & tubers'],['Protein foods','Legumes','Dairy'],['Vegetables'],['Fruits'],['Nuts & seeds','Oils & fats']]
    const shares = [.35,.3,.1,.1,.15]
    for (let m = 0; m < meals; m++) for (let g = 0; g < groups.length; g++) {
      const options = pool.filter(food => groups[g].some(group => food.classifications.groups.includes(group)) && (food.nutrients.energyKcal ?? 0) > 0)
      if (!options.length) { if (m === 0) notes.push('No eligible ' + groups[g].join('/') + ' option; this menu may be incomplete.'); continue }
      const food = options[(m + variation) % options.length], entry = newPlaylistItem('nutrition', food.id, day)
      if (!('foodId' in entry)) continue
      entry.meal = slots[m] as typeof entry.meal; entry.time = meals === 5 && m === 1 ? '10:30' : defaultMealTime(entry.meal)
      const cap = food.category === 'Oils & fats' ? 20 : food.category === 'Nuts & seeds' ? 35 : 450
      entry.grams = Math.max(5, Math.min(cap, Math.round(target / meals * shares[g] / food.nutrients.energyKcal! * 100 / 5) * 5))
      schedule.items.push({ ...entry, done: false })
    }
    if (!pool.length) notes.push('No foods match your preferences. Other allergies require a manual ingredient review.')
    notes.push('Ingredient portions are a menu draft, not recipes or a guaranteed complete diet. Planned nutrients can differ from computed targets. Check preparation states and product labels.')
  }
  return { schedule, notes: [...new Set(notes)] }
}
