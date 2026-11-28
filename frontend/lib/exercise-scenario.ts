import type { SeedExercise } from './exercise-offline'
import type { GuidanceLevel } from './exercise-guidance'
import { exerciseTechnique } from './exercise-technique'

// Transparent educational examples, not official prescriptions by expertise.
export function exerciseScenario(exercise: SeedExercise, level: GuidanceLevel, weightKg: number | null) {
  const index = ['Beginner', 'Intermediate', 'Advanced'].indexOf(level)
  const target = exercise.defaultTarget
  const continuous = target.match(/^(\d+)-(\d+) Minutes/i)
  const timed = /seconds/i.test(target)
  const perSide = /per side/i.test(target)
  const alternating = ['dead-bug', 'shoulder-tap', 'russian-twist'].includes(exercise.id)
  const sides = perSide ? 2 : 1
  const catalogSets = Number(target.match(/^\d+/)?.[0] ?? 3)
  const quantities = target.match(/[×x]\s*(\d+)(?:-(\d+))?/)
  const baseLow = Number(quantities?.[1] ?? 8)
  const baseHigh = Number(quantities?.[2] ?? baseLow)
  const compound = !!exerciseTechnique(exercise.id)?.compound
  const stretching = exercise.category === 'stretching'
  const interval = exercise.category === 'cardio' && !continuous
  const power = exercise.category === 'plyometrics'
  let sets = [Math.min(2, catalogSets), catalogSets, Math.min(4, catalogSets + 1)][index]
  let quantity: [number, number] = index === 0 ? [baseLow, Math.min(baseHigh, baseLow + 2)] : index === 1 ? [baseLow, baseHigh] : [Math.max(baseLow, baseHigh - 2), baseHigh]
  let rest: [number, number] = compound ? [[120, 150], [120, 180], [150, 240]][index] as [number, number] : [[60, 90], [60, 120], [90, 150]][index] as [number, number]
  let transition: [number, number] = compound ? [[90, 120], [120, 180], [150, 240]][index] as [number, number] : [[60, 90], [60, 120], [90, 150]][index] as [number, number]
  let restNote = 'Recover enough to repeat the same controlled movement. These breaks illustrate the selected example, not a rule that advanced users always need more rest.'
  if (timed) quantity = index === 0 ? [Math.min(10, baseLow), Math.min(15, baseHigh)] : index === 1 ? [baseLow, baseHigh] : [baseHigh, Math.min(40, baseHigh + 5)]
  if (stretching) {
    sets = [3, 4, 5][index]
    quantity = [[10, 15], [15, 25], [20, 30]][index] as [number, number]
    rest = [0, 0]; transition = [0, 0]
    restNote = 'Release and relax between holds. No fixed break is prescribed; the estimate counts hold time only. Move to the next stretch when comfortable.'
  } else if (power) {
    sets = [2, 3, 3][index]
    quantity = [[3, 5], [4, 6], [5, 8]][index] as [number, number]
    rest = [[90, 120], [120, 180], [150, 240]][index] as [number, number]
    transition = [...rest]
    restNote = 'Allow full recovery for controlled landings. Stop if movement quality drops. A higher example volume does not establish readiness for jumping.'
  } else if (interval) {
    rest = [[30, 60], [45, 75], [60, 90]][index] as [number, number]
    transition = [...rest]
    restNote = 'These are easy-recovery intervals between short bouts, not a fixed work-to-rest prescription. Extend recovery or slow down until breathing and coordination are controlled.'
  }
  const minutes: [number, number] = continuous ? [[5, 10], [10, 15], [15, 20]][index] as [number, number] : [0, 0]
  if (continuous) { sets = 1; rest = [0, 0]; transition = [[60, 90], [90, 120], [120, 180]][index] as [number, number]; restNote = 'This example is continuous movement with no between-set break. Slow down or pause whenever needed; any pauses increase the actual duration.' }
  const breakCount = continuous || stretching ? 0 : sets * (perSide && !alternating ? 2 : 1) - 1
  const activeSeconds: [number, number] = continuous ? [minutes[0] * 60, minutes[1] * 60] : [sets * quantity[0] * sides * (timed ? 1 : 2), sets * quantity[1] * sides * (timed ? 1 : 4)]
  const restSeconds: [number, number] = [breakCount * rest[0], breakCount * rest[1]]
  const durationMinutes = activeSeconds.map((seconds, i) => (seconds + restSeconds[i]) / 60) as [number, number]
  // Keep the catalog activity-class MET range unchanged across levels. Expertise
  // changes example volume and rest, not an assumed metabolic intensity.
  const activeMet = exercise.estimates.activeMet
  const validWeight = weightKg !== null && Number.isFinite(weightKg) && weightKg >= 20 && weightKg <= 350
  const kcal = validWeight ? activeSeconds.map((seconds, i) => (activeMet[i] * seconds + 1.3 * restSeconds[i]) / 60 * 3.5 * weightKg / 200) as [number, number] : null
  const amount = quantity[0] === quantity[1] ? String(quantity[0]) : quantity.join('-')
  const prescription = continuous ? `${minutes[0]}-${minutes[1]} minutes at a manageable pace` : `${sets} ${interval ? 'rounds' : timed ? 'holds' : 'sets'} × ${amount} ${timed ? 'seconds' : 'reps'}${perSide ? ' per side' : ''}`
  return { prescription, sets, quantity, rest, transition, restNote, breakCount, activeSeconds, restSeconds, durationMinutes, kcal, perSide, alternating, continuous: !!continuous, stretching, timed }
}
