import type { SeedExercise } from './exercise-offline'

export const preparationSource = {
  label: 'Mayo Clinic: warm-up, breathing and recovery',
  url: 'https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/weight-training/art-20045842',
}

// Supplementary editorial notes for each catalog record. These do not replace
// variation-specific instructions or add an unassessed rehabilitation protocol.
export function exercisePracticeNotes(exercise: SeedExercise) {
  const equipment = exercise.equipment.toLowerCase()
  const core = exercise.movementPattern === 'Core'
  const timed = /seconds|minutes/i.test(exercise.defaultTarget)
  const setup = equipment === 'band'
    ? 'Check the band for damage and secure the anchor before applying tension. Keep the return path clear.'
    : equipment === 'cable'
      ? 'Check the attachment and pin, select a manageable stack load and keep clear of the moving cable.'
      : equipment === 'machine' || equipment === 'sled'
        ? 'Adjust the machine to your body and learn its stops or release controls before starting.'
        : equipment === 'barbell' || equipment === 'smith machine'
          ? 'Check the rack, bar and loading. For a supported press or squat, set suitable safeties or arrange qualified spotting.'
          : equipment === 'dumbbell' || equipment === 'ez-bar' || equipment === 'weight plate'
            ? 'Choose weights you can move into and out of position safely. Leave space to set them down under control.'
            : 'Choose a stable support and a clear, nonslip area. Confirm that you can enter and leave the position under control.'
  const warmup = exercise.category === 'stretching'
    ? 'Warm the muscles with easy movement before holding a stretch. Begin with a comfortable reach.'
    : exercise.category === 'cardio'
      ? 'Start with an easier pace before building toward the intended effort.'
      : 'Begin with 5–10 minutes of easy aerobic movement, then rehearse this exercise with an easier variation or light resistance.'
  const breathing = core || exercise.category === 'stretching'
    ? 'Keep breathing while holding or controlling your position. Reduce the reach or hold if you need to strain or hold your breath.'
    : exercise.category === 'cardio' || exercise.category === 'plyometrics'
      ? 'Keep breathing rhythmically. Slow down or pause if breathing or coordination no longer matches the intended effort.'
      : 'For ordinary practice sets, breathe out through the lifting effort and in during the controlled return. Ask a qualified coach about bracing for heavier lifting.'
  const counting = /per side/i.test(exercise.defaultTarget)
    ? timed ? 'Count the hold in seconds on each side. Complete both sides before calling the exercise finished.' : 'Use the target on each side. Follow the steps to see whether you alternate sides or finish one side first.'
    : timed ? 'Count seconds or minutes of controlled movement, not repetitions. A pause is recovery time rather than active work.' : 'One controlled movement and return is one repetition. Keep the range consistent rather than counting partial or rushed attempts.'
  const weeklyRecovery = exercise.category === 'stretching'
    ? 'Use gentle flexibility work without forcing range. More discomfort is not evidence of a better stretch.'
    : exercise.category === 'cardio'
      ? 'Balance demanding bouts with easier activity. Increase time or intensity gradually rather than changing everything together.'
      : 'Allow recovery before another demanding session for the same muscles. Adjust the week if fatigue prevents normal technique; do not use soreness as a target.'
  return { setup, warmup, breathing, counting, weeklyRecovery }
}
