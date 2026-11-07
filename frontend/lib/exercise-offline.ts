import { queryExercises, type ExerciseSearchRecord } from '../../shared/exercise-query'
import seeded from '../public/offline/exercises.json'

export type ExerciseGoal = 'general_fitness' | 'fat_loss' | 'muscle_gain' | 'strength' | 'endurance' | 'mobility'
export type ExerciseEstimates = {
  prescription: string;
  estimatedMinutes: [number, number]; activeSeconds: [number, number]; restSeconds: [number, number]; activeMet: [number, number];
  estimatedBurnKcalAt70Kg: [number, number];
  goals: Record<ExerciseGoal, { label: string; benefit: string }>;
  estimatedMuscleGainKg: null;
}

export type SeedExercise = ExerciseSearchRecord & {
  body_part: string; secondary_muscles: string[]; instructions: string[];
  image_url: string; media_urls: string[]; source_media_url: string;
  defaultTarget: string; coachTip: string;
  estimates: ExerciseEstimates;
}
type Seed = { data: SeedExercise[]; source: { groups: Record<string, number> } }
export const seedExerciseById = (id: string) => (seeded.data as unknown as SeedExercise[]).find(exercise => exercise.id === id)
let catalog: Promise<Seed> | undefined

// The public seed is the primary data source online and offline. Load it once;
// subsequent searches, filters and pagination run entirely on the device.
export async function loadExerciseCatalog(params: URLSearchParams, signal: AbortSignal) {
  if (signal.aborted) throw new DOMException('Request cancelled', 'AbortError')
  if (!catalog) {
    catalog = fetch('/offline/exercises.json').then(async response => {
      if (!response.ok) throw new Error('The library is not saved on this device yet. Connect and finish its offline download.')
      const seed = await response.json() as Seed
      if (!Array.isArray(seed.data) || seed.data.length !== 100 || !seed.source?.groups) throw new Error('The exercise catalog is incomplete. Reconnect and retry.')
      return seed
    }).catch(error => { catalog = undefined; throw error })
  }
  const seed = await catalog
  if (signal.aborted) throw new DOMException('Request cancelled', 'AbortError')
  return { ...queryExercises(seed.data, params), source: seed.source }
}
