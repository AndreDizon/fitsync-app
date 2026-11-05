// Planning estimates, not measured results for individual exercises.
export const estimateMethod = {
  version: 1,
  source: 'https://pacompendium.com/',
  referenceWeightKg: 70,
  energyType: 'gross_kcal_including_resting_energy',
  formula: 'kcal = MET × 3.5 × weightKg / 200 × minutes; active work and rest calculated separately',
  assumptions: 'Adult reference estimates. Repetitions take 2–4 seconds; rest 45–90 seconds between sets (60–120 for plyometrics). Rest uses 1.3 MET. Setup, warm-up and cool-down are excluded. Activity-class MET ranges are approximate, not exercise-specific measurements.',
}

export function estimateExercise(exercise) {
  const text = exercise.defaultTarget
  const continuous = text.match(/^(\d+)-(\d+) Minutes/)
  const sets = continuous ? 1 : Number(text.match(/^(\d+)/)?.[1] ?? 3)
  const quantities = text.match(/×\s*(\d+)(?:-(\d+))?/)
  const low = Number(quantities?.[1] ?? 8)
  const high = Number(quantities?.[2] ?? low)
  const sides = /per Side/.test(text) ? 2 : 1
  const timed = /Seconds/.test(text)
  const workSeconds = continuous
    ? [Number(continuous[1]) * 60, Number(continuous[2]) * 60]
    : [sets * low * (timed ? 1 : 2) * sides, sets * high * (timed ? 1 : 4) * sides]
  const restSeconds = [(sets - 1) * (exercise.category === 'plyometrics' ? 60 : 45), (sets - 1) * (exercise.category === 'plyometrics' ? 120 : 90)]
  let met = exercise.category === 'stretching' ? [2.3, 2.3]
    : exercise.category === 'plyometrics' ? [3.8, 7.5]
    : exercise.equipment === 'bodyweight' ? [2.8, 3.8] : [3.5, 6]
  // Published activity classes; actual intensity depends on pace/load.
  const cardioMet = {
    'mountain-climber': [3.8, 7.5], 'jack-jump-male': [3.8, 7.5],
    'jump-rope': [8.3, 12.3], 'stationary-bike-walk': [3.5, 6.8],
    'walk-elliptical-cross-trainer': [5, 9], 'walking-on-incline-treadmill': [3.8, 8],
  }
  if (exercise.category === 'cardio') met = cardioMet[exercise.id] ?? [3.8, 7.5]
  const kcal = workSeconds.map((seconds, index) => Math.round((met[index] * seconds + 1.3 * restSeconds[index]) / 60 * 3.5 * 70 / 200))
  const resistance = exercise.category === 'strength'
  const mobility = exercise.category === 'stretching'
  return {
    prescription: text,
    estimatedMinutes: workSeconds.map((seconds, i) => Math.round((seconds + restSeconds[i]) / 60 * 10) / 10),
    activeSeconds: workSeconds, restSeconds, activeMet: met,
    estimatedBurnKcalAt70Kg: kcal,
    goals: {
      general_fitness: { label: 'General fitness', benefit: mobility ? `Supports comfortable range of motion around the ${exercise.target}.` : `Supports ${exercise.target} fitness as part of a balanced routine.` },
      fat_loss: { label: 'Fat loss', benefit: 'Contributes to total activity energy expenditure. Fat loss depends on overall energy balance; this does not predict fat lost.' },
      muscle_gain: { label: 'Build muscle', benefit: resistance ? `Provides a training stimulus for the ${exercise.target}; progress depends on load, effort, recovery and nutrition.` : mobility ? 'Supports movement preparation and recovery rather than a direct muscle-building stimulus.' : 'Primarily supports conditioning or power; use alongside progressive resistance training for muscle-building goals.' },
      strength: { label: 'Build strength', benefit: resistance ? `Practises force production through the ${exercise.movementPattern.toLowerCase()} pattern; increase resistance gradually as technique allows.` : 'Supports a strength routine through mobility or conditioning; it does not estimate strength gained.' },
      endurance: { label: 'Improve endurance', benefit: mobility ? 'Supports range of motion; endurance adaptations require sustained or repeated effort.' : `Repeated ${exercise.movementPattern.toLowerCase()} work can support ${exercise.category === 'cardio' ? 'cardiorespiratory' : 'local muscular'} endurance.` },
      mobility: { label: 'Improve mobility', benefit: mobility ? `Targets comfortable flexibility of the ${exercise.target}; avoid forcing end range.` : 'Use a controlled, comfortable range of motion. This exercise is not a measured flexibility gain.' },
    },
    estimatedMuscleGainKg: null,
  }
}
