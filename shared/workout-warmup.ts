// Existing catalog movements that can be used at an easy, conversational pace.
export const warmupExercises = [
  { id: 'stationary-bike-walk', name: 'Stationary Bike', cue: 'Use low resistance and pedal easily. Increase your pace gradually.' },
  { id: 'walking-on-incline-treadmill', name: 'Incline Treadmill Walk', cue: 'Start at a slow walk with little or no incline; the catalog demonstration is a variation, not a warm-up intensity target.' },
  { id: 'walk-elliptical-cross-trainer', name: 'Elliptical Cross-Trainer', cue: 'Use low resistance and a comfortable, controlled pace.' },
] as const
export const warmupSource = { label: 'American Heart Association: warm-up guidance', url: 'https://www.heart.org/en/healthy-living/fitness/fitness-basics/warm-up-cool-down' }
