import exercises from '../backend/data/exercises.json'
import foods from '../backend/data/foods.json'
import { defaultMealTime, newPlaylistItem, parsePlaylist, type PlaylistItem, type PlaylistKind } from './playlists'
import type { OnboardingProfile } from './onboarding'

export type PlanTask = PlaylistItem & { done: boolean }
export type DaySchedule = { items: PlanTask[]; rest: boolean; source: string; variation: number }
export type PlanDay = { workout: DaySchedule; nutrition: DaySchedule; water: { time: string; done: boolean }[] }
export type PlanWeek = { version: 1; week: string; days: PlanDay[]; revision: number }
export type PlanTargets = { minutes: number; energy: number | null; energyRange: [number, number] | null; protein: number | null; carbs: number | null; fat: number | null; notes: string[] }
export const workoutCatalog = exercises
export const foodCatalog = foods
const clock = (n: number) => `${String(Math.floor(Math.min(1439, n) / 60)).padStart(2, '0')}:${String(Math.min(1439, n) % 60).padStart(2, '0')}`
export function currentWeek(date = new Date()) {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
  const utc = new Date(day + 'T12:00:00Z'); utc.setUTCDate(utc.getUTCDate() - (utc.getUTCDay() + 6) % 7)
  return utc.toISOString().slice(0, 10)
}
export function currentDay() { return (['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', weekday: 'short' }).format(new Date())) + 6) % 7 }
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
      if (!parsed.data || schedule.items.some(item => typeof item.done !== 'boolean')) return null
      result.days[day][kind] = { source: schedule.source, variation: schedule.variation, rest: kind === 'workout' && schedule.rest, items: parsed.data.items.map((item, i) => ({ ...item, done: schedule.items[i].done })) }
    }
  }
  result.revision = Number.isSafeInteger(raw.revision) && raw.revision >= 0 ? raw.revision : 0
  return result
}
export function planTargets(profile: OnboardingProfile | null, rest = false): PlanTargets {
  const targets: PlanTargets = { minutes: rest ? 0 : Number(profile?.sessionMinutes) || 0, energy: null, energyRange: null, protein: null, carbs: null, fat: null, notes: [] }
  const age = Number(profile?.age), height = Number(profile?.heightCm), weight = Number(profile?.weightKg)
  if (!profile || !Number.isFinite(age) || age < 18 || age > 120 || !Number.isFinite(height) || height < 100 || height > 250 || !Number.isFinite(weight) || weight < 20 || weight > 350) { targets.notes.push('Add valid age, height and weight in onboarding to calculate nourishment targets.'); return targets }
  const bmi = weight / (height / 100) ** 2
  if (bmi < 18.5 || bmi >= 40 || profile.adjustments.includes('Need professional guidance')) { targets.notes.push('Personal nourishment targets need professional review for this profile. You can still create a manual schedule.'); return targets }
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
export function taskMinutes(item: PlaylistItem) { if ('foodId' in item) return 0; return Math.round((item.sets * (item.targetType === 'time' ? item.target : item.target * 3) + Math.max(0, item.sets - 1) * item.restSeconds) / 60 * 10) / 10 }
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
    if (profile.adjustments.includes('Need professional guidance')) return { schedule, notes: ['Get a professional review before generating exercises. Manual planning remains available.'] }
    const prefer = profile.goal === 'mobility' ? 'stretching' : ['endurance','fat_loss'].includes(profile.goal) ? 'cardio' : 'strength'
    const candidates = shuffle(eligibleExercises(profile).filter(e => !exclude.includes(e.id)), day * 997 + variation * 31).sort((a,b) => Number(b.category === prefer) - Number(a.category === prefer))
    const duration = Number(profile.sessionMinutes), count = Math.min(6, Math.max(2, Math.floor(duration / 6)))
    let used = 0
    const patterns = new Set<string>()
    const balanced = [...candidates.filter(e => { if (patterns.has(e.movementPattern)) return false; patterns.add(e.movementPattern); return true }), ...candidates]
    for (const exercise of balanced) {
      if (schedule.items.length >= count) break
      if (schedule.items.some(item => 'exerciseId' in item && item.exerciseId === exercise.id)) continue
      const item = newPlaylistItem('workout', exercise.id, day)
      if (!('exerciseId' in item)) continue
      item.sets = profile.experience === 'Beginner' ? 2 : 3; item.target = profile.goal === 'strength' ? 6 : profile.goal === 'endurance' ? 15 : 10
      item.restSeconds = profile.goal === 'strength' ? 90 : 60
      if (exercise.category === 'cardio' || exercise.category === 'stretching') { item.sets = 1; item.targetType = 'time'; item.target = exercise.category === 'stretching' ? 30 : Math.min(300, duration * 20); item.restSeconds = 0 }
      const minutes = taskMinutes(item)
      if (used + minutes > duration) continue
      item.time = clock(480 + Math.ceil(used)); used += minutes
      schedule.items.push({ ...item, done: false })
    }
    if (!schedule.items.length) notes.push('No eligible alternatives match your equipment, focus and movement preferences. Adjust onboarding or pick manually.')
    notes.push('Time estimates exclude warm-up and cool-down. This is a computed starting routine, not AI or a medical prescription.')
  } else {
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
