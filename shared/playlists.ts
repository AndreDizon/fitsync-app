import exercises from '../backend/data/exercises.json'
import foods from '../backend/data/foods.json'

export type PlaylistKind = 'workout' | 'nutrition'
export type PlaylistDuration = 'day' | 'week'
export const playlistDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
export const playlistMeals = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const
export type WorkoutPlaylistItem = { id: string; exerciseId: string; day: number; time: string; sets: number; targetType: 'reps' | 'time'; target: number; restSeconds: number }
export type NutritionPlaylistItem = { id: string; foodId: string; day: number; time: string; grams: number; meal: typeof playlistMeals[number] }
export type PlaylistItem = WorkoutPlaylistItem | NutritionPlaylistItem
export type PlaylistInput = { id: string; kind: PlaylistKind; duration: PlaylistDuration; selectedDay: number; restDays: number[]; name: string; description: string; items: PlaylistItem[] }
export type Playlist = PlaylistInput & { revision: number; created_at: string; updated_at: string; syncStatus?: 'synced' | 'pending' | 'conflict'; localVersion?: string; syncError?: string }
export const isUUID = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value)
const exerciseIds = new Set(exercises.map(exercise => exercise.id))
const foodIds = new Set(foods.map(food => food.id))
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const integer = (value: unknown, min: number, max: number): value is number => typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max

// Shared allowlist. Neither user IDs, calculated nutrition nor display names come from client items.
export function parsePlaylist(input: unknown): { data: PlaylistInput | null; error: string | null } {
  const fail = (error: string) => ({ data: null, error })
  if (!object(input) || !isUUID(input.id)) return fail('Invalid playlist ID.')
  if (input.kind !== 'workout' && input.kind !== 'nutrition') return fail('Choose workout or nutrition.')
  if (input.duration !== 'day' && input.duration !== 'week') return fail('Choose a one-day or one-week playlist.')
  const selectedDay = input.selectedDay ?? 0
  const restDays = input.kind === 'nutrition' ? [] : input.restDays ?? []
  if (!integer(selectedDay, 0, 6)) return fail('Choose a day from Monday to Sunday.')
  if (!Array.isArray(restDays) || restDays.length > 7 || new Set(restDays).size !== restDays.length || restDays.some(day => !integer(day, 0, 6) || input.duration === 'day' && day !== selectedDay)) return fail('Choose valid, unique rest days within the playlist.')
  if (typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > 80) return fail('Use a playlist name between 1 and 80 characters.')
  if (typeof input.description !== 'string' || input.description.trim().length > 240) return fail('Keep the description within 240 characters.')
  if (!Array.isArray(input.items) || input.items.length > 350) return fail('A playlist can contain up to 350 entries.')
  const ids = new Set<string>()
  const items: PlaylistItem[] = []
  for (const item of input.items) {
    if (!object(item) || !isUUID(item.id) || ids.has(item.id)) return fail('Every entry needs its own unique ID.')
    ids.add(item.id)
    if (!integer(item.day, 0, 6) || input.duration === 'day' && item.day !== selectedDay) return fail('An entry has an invalid day.')
    if (input.kind === 'workout' && restDays.includes(item.day)) return fail('Move exercises off a rest day before saving.')
    const time = item.time ?? (input.kind === 'workout' ? '08:00' : defaultMealTime(item.meal))
    if (typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return fail('Use a valid time in HH:MM format for every entry.')
    if (input.kind === 'workout') {
      if (typeof item.exerciseId !== 'string' || !exerciseIds.has(item.exerciseId)) return fail('Choose exercises from the FitSync library.')
      if (!integer(item.sets, 1, 20) || !integer(item.restSeconds, 0, 600)) return fail('Use 1–20 sets and 0–600 seconds rest.')
      if (item.targetType !== 'reps' && item.targetType !== 'time') return fail('Choose repetitions or timed sets.')
      if (!integer(item.target, 1, item.targetType === 'reps' ? 100 : 3600)) return fail('Use 1–100 repetitions or 1–3,600 seconds per set.')
      items.push({ id: item.id, exerciseId: item.exerciseId, day: item.day, time, sets: item.sets, targetType: item.targetType, target: item.target, restSeconds: item.restSeconds })
    } else {
      if (typeof item.foodId !== 'string' || !foodIds.has(item.foodId)) return fail('Choose foods from the FitSync library.')
      if (typeof item.grams !== 'number' || !Number.isFinite(item.grams) || item.grams < 1 || item.grams > 2000) return fail('Use an edible food portion between 1 and 2,000 g.')
      if (!(playlistMeals as readonly unknown[]).includes(item.meal)) return fail('Choose a valid meal slot.')
      items.push({ id: item.id, foodId: item.foodId, day: item.day, time, grams: Math.round(item.grams * 100) / 100, meal: item.meal as NutritionPlaylistItem['meal'] })
    }
  }
  return { data: { id: input.id, kind: input.kind, duration: input.duration, selectedDay, restDays: [...restDays].sort(), name: input.name.trim(), description: input.description.trim(), items }, error: null }
}

export function defaultMealTime(meal: unknown) { return meal === 'Breakfast' ? '08:00' : meal === 'Dinner' ? '18:00' : meal === 'Snack' ? '15:00' : '12:00' }
export function newPlaylistItem(kind: PlaylistKind, catalogId: string, day = 0, grams = 100, meal: NutritionPlaylistItem['meal'] = 'Lunch'): PlaylistItem {
  return kind === 'workout' ? { id: crypto.randomUUID(), exerciseId: catalogId, day, time: '08:00', sets: 3, targetType: 'reps', target: 10, restSeconds: 60 } : { id: crypto.randomUUID(), foodId: catalogId, day, time: defaultMealTime(meal), grams, meal }
}
export function movePlaylistItem(items: PlaylistItem[], id: string, direction: -1 | 1) {
  const index = items.findIndex(item => item.id === id)
  if (index < 0) return items
  const dayIndices = items.map((item, i) => item.day === items[index].day ? i : -1).filter(i => i >= 0)
  const target = dayIndices[dayIndices.indexOf(index) + direction]
  if (target === undefined) return items
  const next = [...items]; [next[index], next[target]] = [next[target], next[index]]
  return next
}
